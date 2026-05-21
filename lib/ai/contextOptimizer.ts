import { OpenRouterMessage } from "@/lib/openrouter/client";

// Smarter token estimator taking Vietnamese UTF-8 chars into account
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Vietnamese has accents, so standard word count + character calculations
  const words = text.split(/\s+/).length;
  const chars = text.length;
  // Dynamic average: ~3.5 characters per token in English, but ~2.5 per token in Vietnamese due to accents/UTF-8
  return Math.max(Math.ceil(chars / 3), Math.ceil(words * 1.3));
}

export function optimizeContext(
  messages: OpenRouterMessage[],
  maxTokens: number = 8000
): OpenRouterMessage[] {
  let currentTokenCount = 0;
  const keepMessages: OpenRouterMessage[] = [];
  
  // Find system messages and pin them
  const systemMessages = messages.filter((m) => m.role === "system");
  for (const sys of systemMessages) {
    currentTokenCount += estimateTokens(sys.content);
  }

  // Iterate backwards (most recent messages first)
  const conversationMessages = messages.filter((m) => m.role !== "system");
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    const msg = conversationMessages[i];
    const msgTokens = estimateTokens(msg.content);
    
    // Always keep the last 3 messages regardless of size, or check if we are within budget
    if (keepMessages.length < 3 || currentTokenCount + msgTokens <= maxTokens) {
      keepMessages.unshift(msg);
      currentTokenCount += msgTokens;
    } else {
      break;
    }
  }

  return [...systemMessages, ...keepMessages];
}
