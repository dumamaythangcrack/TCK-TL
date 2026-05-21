import { parseUltraSSEStream } from "@/lib/openrouter/ultraStream";
import { createClient } from "@/lib/supabase/server";
import { autoSummarizeChat } from "./summarizer";
import { openRouterFetch } from "@/lib/openrouter/client";
import { stabilizeResponseText } from "./stabilizer";

export async function createStreamResponse(
  chatId: string,
  prompt: string,
  response: Response,
  modelUsed: string,
  userId: string,
  isGuest: boolean
): Promise<Response> {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      let fullReasoning = "";

      try {
        const chunkGenerator = parseUltraSSEStream(response);
        for await (const chunk of chunkGenerator) {
          if (chunk.type === "content") {
            fullContent += chunk.data;
            controller.enqueue(encoder.encode(chunk.data));
          } else if (chunk.type === "reasoning") {
            fullReasoning += chunk.data;
          } else if (chunk.type === "error") {
            console.error("Stream error chunk:", chunk.data);
            controller.enqueue(encoder.encode(`\n\n[Lỗi: ${chunk.data}]`));
          }
        }
      } catch (err: any) {
        console.error("Stream parse error:", err);
        controller.enqueue(encoder.encode("\n\n[Kết nối bị gián đoạn. Vui lòng thử lại.]"));
      } finally {
        controller.close();

        // Stabilize final content before saving to Database
        const stabilizedContent = stabilizeResponseText(fullContent);

        // Background persistence
        if (!isGuest && chatId) {
          const supabase = await createClient();
          
          // Check if first message to generate title
          const { data: existingMsgs } = await supabase
            .from("ai_messages")
            .select("id")
            .eq("chat_id", chatId)
            .limit(1);

          if (!existingMsgs || existingMsgs.length === 0) {
            generateChatTitle(chatId, prompt).catch(console.error);
          }

          // Save User message
          await supabase.from("ai_messages").insert({
            chat_id: chatId,
            role: "user",
            content: prompt,
          });

          // Save AI message (stabilized)
          await supabase.from("ai_messages").insert({
            chat_id: chatId,
            role: "model",
            content: stabilizedContent,
          });

          // Update chat timestamp
          await supabase
            .from("ai_chats")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", chatId);

          // Log usage
          await supabase.from("ai_logs").insert({
            user_id: userId,
            prompt,
            response: stabilizedContent,
            model: modelUsed,
          });

          // Auto summarize
          autoSummarizeChat(chatId).catch(console.error);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function generateChatTitle(chatId: string, prompt: string) {
  const supabase = await createClient();
  
  try {
    const response = await openRouterFetch({
      model: "deepseek/deepseek-v4-flash:free",
      messages: [
        {
          role: "system",
          content: "Tạo một tiêu đề ngắn gọn tiếng Việt (tối đa 4-5 từ) tóm tắt nội dung câu hỏi sau. Trả về trực tiếp tiêu đề, KHÔNG dùng ngoặc kép, KHÔNG giải thích dông dài."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      stream: false,
      max_tokens: 15
    });

    if (response.ok) {
      const data = await response.json();
      let title = data.choices?.[0]?.message?.content?.trim();
      
      if (title) {
        title = title.replace(/^["']|["']$/g, '');
        if (title.length > 35) title = title.slice(0, 35) + "...";
        
        await supabase
          .from("ai_chats")
          .update({ title })
          .eq("id", chatId);
      }
    }
  } catch (e) {
    console.error("Error generating title:", e);
  }
}

