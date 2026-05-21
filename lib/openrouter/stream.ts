export type StreamChunkType = "content" | "reasoning" | "done" | "error";

export interface StreamChunk {
  type: StreamChunkType;
  data: string;
  metadata?: any;
}

export async function* parseSSEStream(response: Response): AsyncGenerator<StreamChunk> {
  const body = response.body;
  if (!body) {
    throw new Error("No response body to stream");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last partial line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "") continue;

        if (trimmed === "data: [DONE]") {
          yield { type: "done", data: "" };
          continue;
        }

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const data = JSON.parse(jsonStr);

            if (data.error) {
              yield { type: "error", data: data.error.message || "Unknown stream error" };
              continue;
            }

            const choice = data.choices?.[0];
            if (choice) {
              const delta = choice.delta;
              
              if (delta) {
                // Yield reasoning details if present
                if (delta.reasoning_details || delta.reasoning) {
                  yield { 
                    type: "reasoning", 
                    data: delta.reasoning_details || delta.reasoning 
                  };
                }
                
                // Yield standard content
                if (delta.content) {
                  yield { 
                    type: "content", 
                    data: delta.content 
                  };
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse SSE JSON:", jsonStr, e);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
