interface CacheEntry {
  response: string;
  timestamp: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const MAX_ENTRIES = 500;

export function getCachedResponse(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    responseCache.delete(key);
    return null;
  }

  return entry.response;
}

export function setCachedResponse(key: string, response: string): void {
  if (responseCache.size >= MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) {
      responseCache.delete(oldestKey);
    }
  }

  responseCache.set(key, {
    response,
    timestamp: Date.now()
  });
}

export function generateCacheKey(model: string, subject: string, prompt: string): string {
  // Simple hash for text
  return `${model}|${subject}|${prompt.trim()}`;
}
