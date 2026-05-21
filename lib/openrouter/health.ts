import { aiQueue } from "./requestQueue";

export function getHealthStatus() {
  const queueStats = aiQueue.getStats();
  
  let status = "online";
  if (queueStats.queued > 5) {
    status = "high_traffic";
  }
  if (queueStats.queued > 15) {
    status = "overload";
  }

  return {
    status,
    message: status === "online" 
      ? "Hệ thống AI đang hoạt động ổn định" 
      : status === "high_traffic"
        ? "Lượng truy cập đang cao, có thể phản hồi chậm hơn bình thường"
        : "Hệ thống đang quá tải, vui lòng thử lại sau",
    stats: queueStats
  };
}
