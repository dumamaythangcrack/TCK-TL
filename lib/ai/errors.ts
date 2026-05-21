import { getFriendlyErrorMessage } from "@/lib/openrouter/errors";

export function friendlyError(err: any): string {
  return getFriendlyErrorMessage(err);
}

export function isQuotaOrOverloadError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.status === 503 || err.status === 500) return true;
  return false;
}
