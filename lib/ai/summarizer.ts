import { createAdminClient } from "@/lib/supabase/server";
import { getBalancedGenAiClient } from "@/lib/gemini/loadBalancer";

/**
 * Checks message count for a chat. If it exceeds 30 non-system messages,
 * compiles older messages, runs a summarizer prompt, saves it as role='system' in DB,
 * and deletes old system messages for that chat.
 */
export async function autoSummarizeChat(chatId: string): Promise<void> {
  try {
    const adminSupabase = await createAdminClient();

    // Fetch all non-system messages in chronological order
    const { data: messages, error: fetchErr } = await adminSupabase
      .from("ai_messages")
      .select("id, role, content")
      .eq("chat_id", chatId)
      .neq("role", "system")
      .order("created_at", { ascending: true });

    if (fetchErr || !messages) {
      console.error("[AI Summarizer] Error fetching messages:", fetchErr);
      return;
    }

    const nonSystemCount = messages.length;
    console.log(`[AI Summarizer] Chat ${chatId} has ${nonSystemCount} messages`);

    // Only summarize if history is long enough
    if (nonSystemCount <= 30) {
      return;
    }

    // Keep the last 10 messages untouched, summarize everything before that
    const messagesToSummarize = messages.slice(0, nonSystemCount - 10);
    const conversationHistoryStr = messagesToSummarize
      .map((m) => `${m.role === "user" ? "Học sinh" : "Gia sư"}: ${m.content}`)
      .join("\n");

    console.log(`[AI Summarizer] Summarizing ${messagesToSummarize.length} messages for chat ${chatId}...`);

    let summaryText = "";
    try {
      const clientInfo = getBalancedGenAiClient();
      const result = await clientInfo.client.models.generateContent({
        model: "gemini-2.0-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Hãy viết tóm tắt ngắn gọn và súc tích (dưới 150 từ, bằng tiếng Việt) về bối cảnh học tập và các chủ đề chính mà học sinh và gia sư đã thảo luận trong cuộc trò chuyện dưới đây. Chỉ trả về bản tóm tắt gọn gàng làm bối cảnh tiếp theo, không thêm lời chào hay giải thích gì khác:\n\n${conversationHistoryStr}`,
              },
            ],
          },
        ],
      });
      summaryText = result?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    } catch (genErr: any) {
      console.warn("[AI Summarizer] Summarize generation failed:", genErr?.message);
      return;
    }

    if (!summaryText) {
      return;
    }

    const formattedSummary = `[Tóm tắt bối cảnh trò chuyện trước đó]: ${summaryText}`;

    // Delete older system summaries for this chat to maintain a single summary point
    const { error: deleteErr } = await adminSupabase
      .from("ai_messages")
      .delete()
      .eq("chat_id", chatId)
      .eq("role", "system");

    if (deleteErr) {
      console.warn("[AI Summarizer] Failed to delete old summaries:", deleteErr);
    }

    // Save the new summary as a system message
    const { error: insertErr } = await adminSupabase.from("ai_messages").insert({
      chat_id: chatId,
      role: "system",
      content: formattedSummary,
    });

    if (insertErr) {
      console.error("[AI Summarizer] Failed to save summary:", insertErr);
    } else {
      console.log(`[AI Summarizer] Successfully saved summary for chat ${chatId}`);
    }
  } catch (err: any) {
    console.error("[AI Summarizer] Unexpected error:", err);
  }
}
