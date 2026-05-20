import { GoogleGenAI } from "@google/genai";

// Cache for GenAI instances to avoid recreating them on every request
const clientsCache: Record<string, GoogleGenAI> = {};

// Usage tracking statistics for weighted rotation and telemetry
interface KeyStat {
  usageCount: number;
  lastUsed: number;
  cooldownUntil: number;
  errorCount: number;
  requestCount: number;
  lastMinuteRequests: number;
  lastMinuteReset: number;
}

const keyStats: Record<string, KeyStat> = {};

function getAvailableKeys(): string[] {
  const keys: string[] = [];
  
  // 1. Fetch numbered keys
  for (let i = 1; i <= 10; i++) {
    const val = process.env[`GEMINI_API_KEY_${i}`];
    if (val && val.trim()) {
      keys.push(val.trim());
    }
  }
  
  // 2. Fetch from GEMINI_API_KEY (supporting comma-separated value)
  const defaultKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
  if (defaultKey && defaultKey.trim()) {
    if (defaultKey.includes(",")) {
      keys.push(...defaultKey.split(",").map(k => k.trim()).filter(Boolean));
    } else {
      keys.push(defaultKey.trim());
    }
  }
  
  // Remove duplicates while keeping order
  return Array.from(new Set(keys));
}

export interface BalancedClientResponse {
  client: GoogleGenAI;
  rawKey: string;
  keyName: string;
}

export function getBalancedGenAiClient(): BalancedClientResponse {
  const keys = getAvailableKeys();
  if (keys.length === 0) {
    throw new Error("No Gemini API keys configured. Please set GEMINI_API_KEY or GEMINI_API_KEY_1..10.");
  }

  const now = Date.now();
  
  // Initialize stats for any new keys
  keys.forEach((key) => {
    if (!keyStats[key]) {
      keyStats[key] = {
        usageCount: 0,
        lastUsed: 0,
        cooldownUntil: 0,
        errorCount: 0,
        requestCount: 0,
        lastMinuteRequests: 0,
        lastMinuteReset: now,
      };
    }
  });

  // Filter keys not on cooldown
  const availableKeys = keys.filter((key) => keyStats[key].cooldownUntil <= now);
  
  // If all keys are on cooldown, fallback to all keys to avoid complete blackout
  const candidateKeys = availableKeys.length > 0 ? availableKeys : keys;

  // Track & reset requests per minute
  candidateKeys.forEach((key) => {
    const stat = keyStats[key];
    if (now - stat.lastMinuteReset > 60000) {
      stat.lastMinuteRequests = 0;
      stat.lastMinuteReset = now;
    }
  });

  // Priority scoring and sorting:
  // 1. Least usageCount first.
  // 2. Least requests in the last minute (to respect rate limits).
  // 3. Lowest error rate.
  // 4. Least recently used.
  candidateKeys.sort((a, b) => {
    const statA = keyStats[a];
    const statB = keyStats[b];
    
    // Usage count check
    if (statA.usageCount !== statB.usageCount) {
      return statA.usageCount - statB.usageCount;
    }
    
    // Last minute requests check
    if (statA.lastMinuteRequests !== statB.lastMinuteRequests) {
      return statA.lastMinuteRequests - statB.lastMinuteRequests;
    }
    
    // Error rate check
    const rateA = statA.requestCount > 0 ? statA.errorCount / statA.requestCount : 0;
    const rateB = statB.requestCount > 0 ? statB.errorCount / statB.requestCount : 0;
    if (rateA !== rateB) {
      return rateA - rateB;
    }
    
    // Fallback to last used
    return statA.lastUsed - statB.lastUsed;
  });

  const chosenKey = candidateKeys[0];
  const stat = keyStats[chosenKey];
  
  // Update stats
  stat.usageCount += 1;
  stat.requestCount += 1;
  stat.lastMinuteRequests += 1;
  stat.lastUsed = now;

  // Retrieve or create GenAI client
  if (!clientsCache[chosenKey]) {
    clientsCache[chosenKey] = new GoogleGenAI({ apiKey: chosenKey });
  }

  // Find environment variable name if possible for logs
  let keyName = "GEMINI_API_KEY";
  for (let i = 1; i <= 10; i++) {
    if (process.env[`GEMINI_API_KEY_${i}`] === chosenKey) {
      keyName = `GEMINI_API_KEY_${i}`;
      break;
    }
  }

  const maskedKey = `...${chosenKey.slice(-6)}`;
  console.log("[LoadBalancer V2 Selected Key]:", {
    key: maskedKey,
    usage: stat.usageCount,
    requestsPerMinute: stat.lastMinuteRequests,
    errorRate: stat.requestCount > 0 ? stat.errorCount / stat.requestCount : 0,
  });

  return {
    client: clientsCache[chosenKey],
    rawKey: chosenKey,
    keyName
  };
}

/**
 * Places a specific API key on cooldown due to errors or rate limits, and registers the error.
 */
export function putKeyOnCooldown(rawKey: string, durationMs = 300000) {
  const stat = keyStats[rawKey];
  if (stat) {
    stat.cooldownUntil = Date.now() + durationMs;
    stat.errorCount += 1;
    console.warn(`[LoadBalancer] Marked key ending with ...${rawKey.slice(-6)} on cooldown for ${durationMs / 1000}s. Error count: ${stat.errorCount}`);
  }
}
