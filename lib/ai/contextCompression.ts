import { OpenRouterMessage } from "@/lib/openrouter/client";

// Very naive token estimator: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function compressContext(messages: any[], maxTokens: number = 8000): OpenRouterMessage[] {
  if (messages.length === 0) return [];

  const formattedMessages: OpenRouterMessage[] = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content
  }));

  let currentTokens = 0;
  const keepMessages: OpenRouterMessage[] = [];

  // Always keep the newest messages first
  for (let i = formattedMessages.length - 1; i >= 0; i--) {
    const msg = formattedMessages[i];
    const msgTokens = estimateTokens(msg.content);
    
    if (currentTokens + msgTokens > maxTokens && keepMessages.length > 2) {
      // Reached limit, stop adding old messages (unless we have very few)
      break;
    }
    
    keepMessages.unshift(msg);
    currentTokens += msgTokens;
  }

  // If we truncated, we could theoretically inject a "..." message or 
  // rely on the summarizer to have placed a system summary earlier.
  
  return keepMessages;
}
