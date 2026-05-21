export class OpenRouterError extends Error {
  public status?: number;
  public code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
    this.code = code;
  }
}

export function parseOpenRouterError(err: any): OpenRouterError {
  if (err instanceof OpenRouterError) return err;
  
  const status = err?.status || 500;
  const message = err?.message || "Lỗi không xác định từ OpenRouter";
  
  return new OpenRouterError(message, status);
}

export function getFriendlyErrorMessage(err: any): string {
  if (err.name === "AbortError") {
    return "Kết nối bị gián đoạn do timeout. Vui lòng thử lại.";
  }
  
  const msg = err.message || "";
  
  if (msg.includes("Tất cả các máy chủ AI đều đang bận")) {
    return msg;
  }
  
  if (msg.includes("rate limit") || err.status === 429) {
    return "Hệ thống đang quá tải. Vui lòng chờ vài giây rồi thử lại.";
  }
  
  if (err.status === 401 || err.status === 403) {
    return "Lỗi xác thực hệ thống AI. Vui lòng liên hệ quản trị viên.";
  }
  
  return "Đã xảy ra lỗi kết nối với máy chủ AI. Vui lòng thử lại.";
}
