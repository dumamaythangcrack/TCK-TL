import { GoogleGenAI } from "@google/genai";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyStat {
  usageCount: number;
  lastUsed: number;
  cooldownUntil: number;
  errorCount: number;
  requestCount: number;
  successCount: number;
  lastMinuteRequests: number;
  lastMinuteReset: number;
  totalResponseMs: number;
  avgResponseMs: number;
  priority: number; // 0–100, higher = more preferred
}

// ─── In-memory state (survives hot reloads in dev via module cache) ────────────

const clientsCache: Record<string, GoogleGenAI> = {};
const keyStats: Record<string, KeyStat> = {};

// ─── Key discovery ─────────────────────────────────────────────────────────────

function getAvailableKeys(): string[] {
  const keys: string[] = [];

  // Support GEMINI_API_KEY_1 … GEMINI_API_KEY_10
  for (let i = 1; i <= 10; i++) {
    const val = process.env[`GEMINI_API_KEY_${i}`];
    if (val?.trim()) keys.push(val.trim());
  }

  // Support comma-separated GEMINI_API_KEY="k1,k2,k3"
  const defaultKey =
    process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (defaultKey.trim()) {
    const parts = defaultKey.includes(",")
      ? defaultKey.split(",").map((k) => k.trim()).filter(Boolean)
      : [defaultKey.trim()];
    keys.push(...parts);
  }

  return Array.from(new Set(keys));
}

// ─── Stat initialiser ─────────────────────────────────────────────────────────

function initStat(now: number): KeyStat {
  return {
    usageCount: 0,
    lastUsed: 0,
    cooldownUntil: 0,
    errorCount: 0,
    requestCount: 0,
    successCount: 0,
    lastMinuteRequests: 0,
    lastMinuteReset: now,
    totalResponseMs: 0,
    avgResponseMs: 0,
    priority: 50, // start neutral
  };
}

// ─── Public interface ──────────────────────────────────────────────────────────

export interface BalancedClientResponse {
  client: GoogleGenAI;
  rawKey: string;
  keyIndex: number;
}

/**
 * Pick the best available Gemini API key using a weighted priority model:
 *  1. Keys on cooldown are skipped (unless ALL are on cooldown → use least-bad).
 *  2. Keys are scored by: priority score, requests/min, error rate, last-used.
 *  3. Stats are updated on every pick.
 */
export function getBalancedGenAiClient(): BalancedClientResponse {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys configured. Set GEMINI_API_KEY or GEMINI_API_KEY_1…10."
    );
  }

  const now = Date.now();

  // Ensure every key has stats
  keys.forEach((key) => {
    if (!keyStats[key]) keyStats[key] = initStat(now);
  });

  // Reset per-minute counter where stale
  keys.forEach((key) => {
    const s = keyStats[key];
    if (now - s.lastMinuteReset > 60_000) {
      s.lastMinuteRequests = 0;
      s.lastMinuteReset = now;
    }
  });

  // Separate available vs cooling-down keys
  const available = keys.filter((k) => keyStats[k].cooldownUntil <= now);
  const candidates = available.length > 0 ? available : keys; // fallback to all

  // Score function: higher = better
  function score(key: string): number {
    const s = keyStats[key];
    const errorRate = s.requestCount > 0 ? s.errorCount / s.requestCount : 0;
    const staleness = now - s.lastUsed; // ms since last used (higher = fresher pick)
    return (
      s.priority * 2 -
      s.lastMinuteRequests * 3 -
      errorRate * 50 +
      Math.min(staleness / 1000, 60) // cap at 60 s worth of bonus
    );
  }

  candidates.sort((a, b) => score(b) - score(a)); // descending (best first)

  const chosenKey = candidates[0];
  const stat = keyStats[chosenKey];

  // Update stats
  stat.usageCount += 1;
  stat.requestCount += 1;
  stat.lastMinuteRequests += 1;
  stat.lastUsed = now;

  // Get or create client
  if (!clientsCache[chosenKey]) {
    clientsCache[chosenKey] = new GoogleGenAI({ apiKey: chosenKey });
  }

  const keyIndex = keys.indexOf(chosenKey) + 1;
  const masked = `...${chosenKey.slice(-6)}`;
  console.log(`[LoadBalancer] key#${keyIndex} ${masked} | priority=${stat.priority} | rpm=${stat.lastMinuteRequests} | errs=${stat.errorCount}`);

  return { client: clientsCache[chosenKey], rawKey: chosenKey, keyIndex };
}

/**
 * Called when a key returns an error. Places it on cooldown and drops priority.
 */
export function putKeyOnCooldown(rawKey: string, durationMs = 300_000) {
  const s = keyStats[rawKey];
  if (!s) return;
  s.cooldownUntil = Date.now() + durationMs;
  s.errorCount += 1;
  s.priority = Math.max(0, s.priority - 20); // penalise
  console.warn(
    `[LoadBalancer] key ...${rawKey.slice(-6)} → cooldown ${durationMs / 1000}s | errors=${s.errorCount} | priority=${s.priority}`
  );
}

/**
 * Called after a successful response. Records latency and boosts priority.
 */
export function markKeySuccess(rawKey: string, elapsedMs: number) {
  const s = keyStats[rawKey];
  if (!s) return;
  s.successCount += 1;
  s.totalResponseMs += elapsedMs;
  s.avgResponseMs = s.totalResponseMs / s.successCount;
  // Boost priority based on speed (fast keys get higher priority)
  const speedBonus = elapsedMs < 2000 ? 5 : elapsedMs < 5000 ? 2 : 0;
  s.priority = Math.min(100, s.priority + speedBonus);
}

/**
 * Returns a summary of all key stats for diagnostics / admin panel.
 */
export function getLoadBalancerStats() {
  return getAvailableKeys().map((key, i) => {
    const s = keyStats[key] || initStat(Date.now());
    return {
      index: i + 1,
      masked: `...${key.slice(-6)}`,
      priority: s.priority,
      usageCount: s.usageCount,
      errorCount: s.errorCount,
      successCount: s.successCount,
      avgResponseMs: Math.round(s.avgResponseMs),
      lastMinuteRequests: s.lastMinuteRequests,
      onCooldown: s.cooldownUntil > Date.now(),
      cooldownSecondsLeft: Math.max(0, Math.round((s.cooldownUntil - Date.now()) / 1000)),
    };
  });
}
