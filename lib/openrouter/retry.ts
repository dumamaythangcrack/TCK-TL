import { openRouterFetch, OpenRouterChatRequest } from "./client";
import { getFallbackChain, TaskType } from "./fallback";
import { isModelAvailable, recordModelSuccess, recordModelFailure } from "./circuitBreaker";
import { OPENROUTER_MODELS } from "./models";

const MAX_ATTEMPTS_PER_MODEL = 2;
const MAX_TOTAL_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;


export async function executeWithRetry(
  request: OpenRouterChatRequest,
  taskType: TaskType,
  signal?: AbortSignal
): Promise<{ response: Response; modelUsed: string }> {
  // 1. Detect if context is long to adapt routing
  const contextLength = request.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
  const hasLongContext = contextLength > 20000; // > ~5000 tokens

  const fallbackChain = getFallbackChain(taskType, hasLongContext);
  let totalAttempts = 0;

  for (const modelId of fallbackChain) {
    if (!isModelAvailable(modelId)) {
      console.warn(`[OpenRouter] Skipping model ${modelId} (Circuit OPEN)`);
      continue;
    }

    let modelAttempts = 0;
    while (modelAttempts < MAX_ATTEMPTS_PER_MODEL && totalAttempts < MAX_TOTAL_ATTEMPTS) {
      if (signal?.aborted) {
        throw new Error("Request aborted");
      }

      // Establish a local controller to enforce connect/dead stream timeout
      const localController = new AbortController();
      const parentSignal = signal;
      
      const onAbort = () => localController.abort();
      if (parentSignal) {
        parentSignal.addEventListener("abort", onAbort);
      }

      // 12s timeout for connection/first byte
      const connectTimeout = setTimeout(() => {
        localController.abort();
        console.warn(`[OpenRouter] Connection timeout for ${modelId}`);
      }, 12000);

      try {
        const attemptRequest = { ...request, model: modelId };
        
        // Add reasoning configuration if supported
        const modelDef = OPENROUTER_MODELS[modelId];
        if (modelDef?.reasoningSupport) {
          attemptRequest.reasoning = { enabled: true };
        } else {
          delete attemptRequest.reasoning;
        }

        const response = await openRouterFetch(attemptRequest, localController.signal);
        clearTimeout(connectTimeout);

        if (response.ok) {
          recordModelSuccess(modelId);
          return { response, modelUsed: modelId };
        }

        // Handle error responses
        recordModelFailure(modelId);
        if (response.status === 429 || response.status >= 500) {
          const backoff = BASE_BACKOFF_MS * Math.pow(1.5, totalAttempts);
          console.warn(`[OpenRouter] ${modelId} failed with ${response.status}. Retrying in ${backoff}ms...`);
          await new Promise((res) => setTimeout(res, backoff));
        } else {
          break; // Don't retry client errors (400, 401, 403, 404)
        }
      } catch (error: any) {
        clearTimeout(connectTimeout);
        if (error.name === "AbortError" && parentSignal?.aborted) {
          throw error; // Throw if aborted by user
        }
        
        recordModelFailure(modelId);
        const backoff = BASE_BACKOFF_MS * Math.pow(1.5, totalAttempts);
        console.warn(`[OpenRouter] Error connecting to ${modelId}: ${error.message}. Retrying in ${backoff}ms...`);
        await new Promise((res) => setTimeout(res, backoff));
      } finally {
        if (parentSignal) {
          parentSignal.removeEventListener("abort", onAbort);
        }
      }

      modelAttempts++;
      totalAttempts++;
    }

    if (totalAttempts >= MAX_TOTAL_ATTEMPTS) {
      break;
    }
  }

  throw new Error("Hệ thống AI đang quá tải hoặc gặp sự cố kết nối. Vui lòng thử lại sau giây lát.");
}
