export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface ModelHealthStatus {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  cooldownUntil: number;
}

const modelHealthRegistry: Record<string, ModelHealthStatus> = {};

const MAX_FAILURES = 3;
const COOLDOWN_MS = 60_000; // 60 seconds

function getOrCreateStatus(modelId: string): ModelHealthStatus {
  if (!modelHealthRegistry[modelId]) {
    modelHealthRegistry[modelId] = {
      state: "CLOSED",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      cooldownUntil: 0,
    };
  }
  return modelHealthRegistry[modelId];
}

export function isModelAvailable(modelId: string): boolean {
  const status = getOrCreateStatus(modelId);
  const now = Date.now();

  if (status.state === "OPEN") {
    if (now >= status.cooldownUntil) {
      status.state = "HALF_OPEN";
      return true;
    }
    return false;
  }

  return true;
}

export function recordModelSuccess(modelId: string) {
  const status = getOrCreateStatus(modelId);
  status.successCount++;
  
  if (status.state === "HALF_OPEN") {
    status.state = "CLOSED";
    status.failureCount = 0;
  }
}

export function recordModelFailure(modelId: string) {
  const status = getOrCreateStatus(modelId);
  status.failureCount++;
  status.lastFailureTime = Date.now();

  if (status.state === "HALF_OPEN" || status.failureCount >= MAX_FAILURES) {
    status.state = "OPEN";
    status.cooldownUntil = Date.now() + COOLDOWN_MS;
  }
}
