import { createAdminClient } from "@/lib/supabase/server";
import { putKeyOnCooldown, getBalancedGenAiClient } from "@/lib/gemini/loadBalancer";
import { autoSummarizeChat } from "@/lib/ai/summarizer";

/**
 * Dynamically generates a title for the chat thread using a fast model.
 */
async function generateChatTitle(prompt: string): Promise<string> {
  try {
    const { client } = getBalancedGenAiClient();
    const result = await client.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: [{
        role: "user",
        parts: [{ text: `Dựa trên tin nhắn đầu tiên của người dùng, hãy tạo tiêu đề hội thoại ngắn gọn bằng tiếng Việt. Tối đa 35 ký tự. Không dùng dấu ngoặc kép. Không markdown. Không thêm dấu chấm cuối câu. Viết tự nhiên như tiêu đề ChatGPT.\nTin nhắn đầu tiên: "${prompt.slice(0, 200)}"` }]
      }],
    });
    const title = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return title ? title.replace(/^[".]+|[".\s]+$/g, "").slice(0, 45) : prompt.slice(0, 35);
  } catch {
    return prompt.slice(0, 35);
  }
}

interface StreamResponseParams {
  stream: AsyncIterable<any>;
  rawKey: string;
  chatId: string;
  prompt: string;
  promptBody: string;
  user: any;
  isGuest: boolean;
  isFirstMessage: boolean;
  generateTitle?: boolean;
}

/**
 * Creates a stream Response which yields tokens in real time, and persists the messages
 * and triggers background auto-summarization upon completion.
 */
export function createGeminiStreamResponse(params: StreamResponseParams): Response {
  const {
    stream,
    rawKey,
    chatId,
    prompt,
    promptBody,
    user,
    isGuest,
    isFirstMessage,
    generateTitle,
  } = params;

  const encoder = new TextEncoder();
  let aiText = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text: string = chunk.text || "";
          if (text) {
            aiText += text;
            controller.enqueue(encoder.encode(text));
          }
        }
      } catch (err: any) {
        console.error("[AI Stream] Chunk generation error:", err?.message);
        putKeyOnCooldown(rawKey);
        const fallback = "\n\n*Hệ thống AI đang tối ưu kết nối, vui lòng thử lại sau vài giây.*";
        controller.enqueue(encoder.encode(fallback));
        controller.close();
        return;
      }

      // Process database writes and titles BEFORE closing the stream to avoid client race conditions
      if (!isGuest && user && aiText) {
        try {
          const adminSupabase = await createAdminClient();

          const tasks: Promise<any>[] = [
            adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "user", content: prompt }) as any,
            adminSupabase.from("ai_messages").insert({ chat_id: chatId, role: "model", content: aiText }) as any,
            adminSupabase.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId) as any,
          ];

          // Auto-generate chat title on first message
          if (isFirstMessage || generateTitle) {
            try {
              const title = await generateChatTitle(prompt);
              tasks.push(
                adminSupabase.from("ai_chats").update({ title }).eq("id", chatId) as any
              );
            } catch (titleErr) {
              console.error("[AI Stream] Title generation error:", titleErr);
            }
          }

          // Log request (best effort)
          tasks.push(
            (async () => {
              try {
                await adminSupabase.from("ai_logs")
                  .insert({ user_id: user.id, prompt: promptBody, response: aiText });
              } catch {}
            })()
          );

          await Promise.all(tasks);
          console.log("[AI Stream] Chat messages and logging saved.");

          // Trigger auto-summarization (background non-blocking)
          autoSummarizeChat(chatId).catch((sumErr) => {
            console.error("[AI Stream] Background summarization failed:", sumErr);
          });
        } catch (dbErr) {
          console.error("[AI Stream] DB persist error (non-fatal):", dbErr);
        } finally {
          controller.close();
        }
      } else {
        controller.close();
      }
    },
    cancel() {
      console.log("[AI Stream] Cancelled by client.");
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "X-Content-Type-Options": "nosniff",
      Connection: "keep-alive",
    },
  });
}
