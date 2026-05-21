import { OPENROUTER_MODELS } from "./models";

export interface OpenRouterMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface OpenRouterChatRequest {
  model: string;
  messages: OpenRouterMessage[];
  stream?: boolean;
  reasoning?: {
    enabled?: boolean;
    effort?: "low" | "medium" | "high";
  };
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  repetition_penalty?: number;
}

export async function openRouterFetch(
  requestData: OpenRouterChatRequest,
  signal?: AbortSignal
): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  // The fallback domain if VEREL_URL or APP_URL is not provided
  const appUrl = process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tck-tailieu.vn";

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": appUrl,
      "X-Title": "TCK Tài Liệu",
    },
    body: JSON.stringify(requestData),
    signal,
  });

  return response;
}
