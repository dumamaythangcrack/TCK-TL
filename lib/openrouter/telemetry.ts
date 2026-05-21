interface TelemetryEvent {
  model: string;
  latencyMs: number;
  success: boolean;
  timestamp: number;
}

const events: TelemetryEvent[] = [];
const MAX_EVENTS = 1000;

export function recordTelemetry(event: Omit<TelemetryEvent, "timestamp">) {
  if (events.length >= MAX_EVENTS) {
    events.shift();
  }
  events.push({ ...event, timestamp: Date.now() });
}

export function getTelemetryStats() {
  const now = Date.now();
  const last5Min = events.filter(e => now - e.timestamp < 5 * 60 * 1000);
  
  const totalRequests = last5Min.length;
  const failures = last5Min.filter(e => !e.success).length;
  const sumLatency = last5Min.filter(e => e.success).reduce((sum, e) => sum + e.latencyMs, 0);
  
  return {
    requestsPerMinute: totalRequests / 5,
    failureRate: totalRequests > 0 ? failures / totalRequests : 0,
    avgLatencyMs: (totalRequests - failures) > 0 ? sumLatency / (totalRequests - failures) : 0,
  };
}
