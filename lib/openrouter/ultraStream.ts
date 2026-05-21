import { StreamChunk } from "./stream";

export async function* parseUltraSSEStream(
  response: Response,
  options: {
    enableDeduplication?: boolean;
    throttleMs?: number;
    antiFreezeMs?: number;
  } = {}
): AsyncGenerator<StreamChunk> {
  const { enableDeduplication = true, throttleMs = 30, antiFreezeMs = 500 } = options;
  const body = response.body;
  if (!body) {
    throw new Error("No response body to stream");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  
  let contentBuffer = "";
  let reasoningBuffer = "";
  
  let lastYieldTime = Date.now();
  let isFirstToken = true;
  let accumulatedContent = "";

  // Token deduplication helper to avoid repeating words or duplicate chunks
  function isDuplicateToken(newText: string): boolean {
    if (!enableDeduplication || !newText) return false;
    const cleanNew = newText.toLowerCase().trim();
    if (!cleanNew) return false;
    
    // Check if the word is identical to the tail of the accumulated text
    const tail = accumulatedContent.slice(-40).toLowerCase();
    // Standard duplicates matching
    if (tail.endsWith(cleanNew)) {
      return true;
    }
    return false;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          if (contentBuffer) {
            yield { type: "content", data: contentBuffer };
            contentBuffer = "";
          }
          if (reasoningBuffer) {
            yield { type: "reasoning", data: reasoningBuffer };
            reasoningBuffer = "";
          }
          yield { type: "done", data: "" };
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          let data: any;
          try {
            data = JSON.parse(jsonStr);
          } catch (e) {
            // Attempt automatic stream repair on malformed/partial JSON chunks
            const contentMatch = jsonStr.match(/"content"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            const reasoningMatch = jsonStr.match(/"reasoning_details"\s*:\s*"((?:[^"\\]|\\.)*)"/) || jsonStr.match(/"reasoning"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            
            data = { choices: [{ delta: {} }] };
            if (contentMatch) {
              try {
                data.choices[0].delta.content = JSON.parse(`"${contentMatch[1]}"`);
              } catch {}
            }
            if (reasoningMatch) {
              try {
                data.choices[0].delta.reasoning_details = JSON.parse(`"${reasoningMatch[1]}"`);
              } catch {}
            }
          }

          if (data.error) {
            yield { type: "error", data: data.error.message || "Unknown stream error" };
            continue;
          }

          const choice = data.choices?.[0];
          if (choice) {
            const delta = choice.delta;
            if (delta) {
              // Extract reasoning details
              const rawReasoning = delta.reasoning_details || delta.reasoning;
              if (rawReasoning) {
                reasoningBuffer += rawReasoning;
                const now = Date.now();
                if (now - lastYieldTime > throttleMs || now - lastYieldTime > antiFreezeMs) {
                  yield { type: "reasoning", data: reasoningBuffer };
                  reasoningBuffer = "";
                  lastYieldTime = now;
                }
              }

              // Extract standard content
              const rawContent = delta.content;
              if (rawContent) {
                if (!isDuplicateToken(rawContent)) {
                  contentBuffer += rawContent;
                  accumulatedContent += rawContent;
                  
                  const now = Date.now();
                  // Flush immediately for first token, or if we encounter punctuation/newline,
                  // or if our throttle threshold is exceeded.
                  const hasPunctuation = /[\.\?\!\n]/.test(rawContent);
                  
                  if (isFirstToken || hasPunctuation || (now - lastYieldTime > throttleMs)) {
                    yield { type: "content", data: contentBuffer };
                    contentBuffer = "";
                    lastYieldTime = now;
                    isFirstToken = false;
                  }
                }
              }
            }
          }
        }
      }
    }

    // Flush any remaining buffers at the end of the stream
    if (contentBuffer) {
      yield { type: "content", data: contentBuffer };
    }
    if (reasoningBuffer) {
      yield { type: "reasoning", data: reasoningBuffer };
    }
  } finally {
    reader.releaseLock();
  }
}
