/**
 * Gemini AI Request Queue
 * Prevents thundering herd / quota exhaustion by rate-limiting concurrent calls.
 *
 * maxConcurrent: 2  → at most 2 simultaneous Gemini requests
 * minTime: 350ms    → at least 350ms between request starts (~2.8 req/s max)
 *
 * In serverless (Vercel) each worker is a separate process, so this limiter
 * applies per-worker. On a standard deployment with 2–4 workers the effective
 * rate cap is ~6–11 req/s, well within Gemini free-tier limits.
 */

import Bottleneck from "bottleneck";

export const aiQueue = new Bottleneck({
  maxConcurrent: 2,
  minTime: 350,
  // Reject jobs queued for more than 25s (matches our request timeout)
  highWater: 20,
  strategy: Bottleneck.strategy.OVERFLOW_PRIORITY,
});

// Log queue stats in development
if (process.env.NODE_ENV !== "production") {
  aiQueue.on("depleted", () => {
    console.log("[Queue] All slots depleted — requests are queuing.");
  });
}
