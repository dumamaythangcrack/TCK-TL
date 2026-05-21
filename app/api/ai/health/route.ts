import { NextResponse } from "next/server";
import { getHealthStatus } from "@/lib/openrouter/health";
import { getTelemetryStats } from "@/lib/openrouter/telemetry";

export async function GET() {
  const health = getHealthStatus();
  const telemetry = getTelemetryStats();
  
  return NextResponse.json({
    status: health.status,
    message: health.message,
    stats: {
      queue: health.stats,
      telemetry
    }
  });
}
