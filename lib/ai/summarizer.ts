import { createClient } from "@/lib/supabase/server";
import { openRouterFetch } from "@/lib/openrouter/client";

export async function autoSummarizeChat(chatId: string) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("ai_messages")
    .select("*", { count: "exact", head: true })
    .eq("chat_id", chatId)
    .neq("role", "system");

  if (!count || count < 30) return;

  const { data: recentMsgs } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("chat_id", chatId)
    .neq("role", "system")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!recentMsgs || recentMsgs.length < 10) return;

  const oldestDateInKeep = recentMsgs[recentMsgs.length - 1].created_at;

  const { data: toSummarizeMsgs } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("chat_id", chatId)
    .neq("role", "system")
    .lt("created_at", oldestDateInKeep)
    .order("created_at", { ascending: true })
    .limit(30);

  if (!toSummarizeMsgs || toSummarizeMsgs.length === 0) return;

  const summaryText = toSummarizeMsgs
    .map((m) => `${m.role === "user" ? "Học sinh" : "AI"}: ${m.content}`)
    .join("\\n");

  try {
    const response = await openRouterFetch({
      model: "deepseek/deepseek-v4-flash:free",
      messages: [
        {
          role: "system",
          content: "Bạn là trợ lý tóm tắt. Tóm tắt nội dung cuộc trò chuyện học tập sau. Tập trung vào: Học sinh đang hỏi/học vấn đề gì? AI đã giải quyết đến đâu? Định dạng ngắn gọn bằng gạch đầu dòng, giữ lại từ khóa quan trọng và công thức cốt lõi. KHÔNG dài dòng."
        },
        {
          role: "user",
          content: summaryText
        }
      ],
      stream: false
    });

    if (response.ok) {
      const data = await response.json();
      const newSummary = data.choices?.[0]?.message?.content?.trim();
      
      if (newSummary) {
        await supabase.from("ai_messages").insert({
          chat_id: chatId,
          role: "system",
          content: `[TÓM TẮT LỊCH SỬ TRƯỚC ĐÓ]\\n${newSummary}`,
        });

        const idsToDelete = toSummarizeMsgs.map((m: any) => m.id).filter(Boolean);
        if (idsToDelete.length > 0) {
          await supabase
            .from("ai_messages")
            .delete()
            .in("id", idsToDelete);
        }
      }
    }
  } catch (err) {
    console.error("autoSummarizeChat OpenRouter error:", err);
  }
}
