import { getBalancedGenAiClient, putKeyOnCooldown, markKeySuccess } from "@/lib/gemini/loadBalancer";
import { handleKeyFailure } from "@/lib/ai/errors";

const MODEL_CHAIN = ["gemini-2.5-flash", "gemini-2.0-flash-lite"] as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export interface GeminiCallParams {
  contents: any[];
  systemInstruction: string;
}

export interface GeminiCallResult {
  stream: AsyncIterable<any>;
  rawKey: string;
}

/**
 * Executes a Gemini streaming call with a load-balanced key fallback, model fallback,
 * and retries with exponential backoff.
 */
export async function callGeminiWithRetry(
  params: GeminiCallParams
): Promise<GeminiCallResult> {
  const { contents, systemInstruction } = params;
  const MAX_KEY_ATTEMPTS = 3;
  const BACKOFF_BASE_MS = 800;

  let lastError: any = null;

  for (let keyAttempt = 1; keyAttempt <= MAX_KEY_ATTEMPTS; keyAttempt++) {
    let clientInfo: { client: any; rawKey: string; keyIndex: number };
    try {
      clientInfo = getBalancedGenAiClient();
    } catch (err: any) {
      throw new Error(err.message || "Không có API key khả dụng.");
    }

    for (const model of MODEL_CHAIN) {
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 28000);
      const t0 = Date.now();

      try {
        console.log(`[AI Retry] Trying Key#${clientInfo.keyIndex} with Model=${model} (Attempt ${keyAttempt}/${MAX_KEY_ATTEMPTS})`);
        
        const responseStream = await clientInfo.client.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction },
        });

        clearTimeout(timeoutId);
        markKeySuccess(clientInfo.rawKey, Date.now() - t0);
        return { stream: responseStream, rawKey: clientInfo.rawKey };
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
        
        console.warn(`[AI Retry] Failed on Key#${clientInfo.keyIndex} with Model=${model}: ${err?.message}`);

        // Cooldown key and handle failure
        handleKeyFailure(clientInfo.rawKey, err);

        // Fallback to second model if on first model, else try next key
        if (model === MODEL_CHAIN[0]) {
          console.log(`[AI Retry] Falling back to secondary model: ${MODEL_CHAIN[1]}...`);
          continue;
        }
        break; // break model loop, go to next key
      }
    }

    // Exponential backoff before checking next key
    if (keyAttempt < MAX_KEY_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, keyAttempt - 1);
      console.log(`[AI Retry] Delaying ${delay}ms before next key attempt...`);
      await sleep(delay);
    }
  }

  throw lastError || new Error("Tất cả các API key của Gemini đều đã vượt hạn ngạch hoặc quá tải.");
}
