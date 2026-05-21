import { NextResponse } from "next/server";
import { getLoadBalancerStats } from "@/lib/gemini/loadBalancer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = getLoadBalancerStats();
    if (stats.length === 0) {
      return NextResponse.json({ status: "offline", message: "Chưa cấu hình API key" });
    }

    const totalKeys = stats.length;
    const cooldownKeys = stats.filter((s) => s.onCooldown).length;

    let status = "online";
    let message = "Hệ thống AI hoạt động ổn định";

    if (cooldownKeys === totalKeys) {
      status = "overload";
      message = "Hệ thống quá tải tạm thời";
    } else if (cooldownKeys > 0 || stats.some((s) => s.lastMinuteRequests > 12)) {
      status = "high_traffic";
      message = "Lưu lượng truy cập cao";
    }

    return NextResponse.json({ status, message, stats });
  } catch (error: any) {
    return NextResponse.json({ status: "offline", message: error.message }, { status: 500 });
  }
}
