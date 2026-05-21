import { putKeyOnCooldown } from "@/lib/gemini/loadBalancer";

/**
 * Normalises raw error into a user-friendly message.
 */
export function friendlyError(err: any): string {
  const msg = (err?.message || "").toLowerCase();
  
  if (
    msg.includes("503") || 
    msg.includes("unavailable") ||
    msg.includes("overloaded") || 
    msg.includes("demand") ||
    msg.includes("429") || 
    msg.includes("rate_limit") ||
    msg.includes("quota") || 
    msg.includes("resource_exhausted") ||
    msg.includes("deadline") || 
    msg.includes("timeout")
  ) {
    return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
  }
  
  if (msg.includes("400") || msg.includes("invalid_argument")) {
    return "Nội dung câu hỏi không hợp lệ. Vui lòng thử lại.";
  }
  
  return "Hệ thống AI đang tối ưu kết nối, vui lòng chờ vài giây...";
}

/**
 * Checks if the error indicates a quota or overload issue that warrants putting the API key on cooldown.
 */
export function isQuotaOrOverloadError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("429") || 
    msg.includes("quota") || 
    msg.includes("resource_exhausted") ||
    msg.includes("503") || 
    msg.includes("overloaded") || 
    msg.includes("unavailable")
  );
}

/**
 * Automatically puts a key on cooldown if needed based on the error.
 */
export function handleKeyFailure(rawKey: string, err: any) {
  const isQuota = isQuotaOrOverloadError(err);
  if (isQuota) {
    putKeyOnCooldown(rawKey);
  } else {
    // Other errors: put on short cooldown (60s)
    putKeyOnCooldown(rawKey, 60000);
  }
}
