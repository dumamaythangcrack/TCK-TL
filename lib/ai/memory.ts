import { createClient } from "@/lib/supabase/server";

export interface ContextResult {
  messages: any[];
  profileName?: string;
  profileBio?: string;
  summaryPrompt?: string;
}

export async function getConversationContext(
  chatId: string | null,
  isGuest: boolean
): Promise<ContextResult> {
  const result: ContextResult = { messages: [] };
  const supabase = await createClient();

  if (!isGuest) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        result.profileName = profile.full_name;
        result.profileBio = profile.bio;
      }
    }
  }

  if (chatId && !isGuest) {
    // Lấy system summary mới nhất
    const { data: sysMsgs } = await supabase
      .from("ai_messages")
      .select("content")
      .eq("chat_id", chatId)
      .eq("role", "system")
      .order("created_at", { ascending: false })
      .limit(1);

    if (sysMsgs && sysMsgs.length > 0) {
      result.summaryPrompt = sysMsgs[0].content;
    }

    // Lấy 20 tin nhắn gần nhất không phải system
    const { data: msgs } = await supabase
      .from("ai_messages")
      .select("role, content, created_at")
      .eq("chat_id", chatId)
      .neq("role", "system")
      .order("created_at", { ascending: false })
      .limit(20);

    if (msgs) {
      result.messages = msgs.reverse();
    }
  }

  return result;
}
