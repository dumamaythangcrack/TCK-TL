import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface ContextResult {
  contents: any[];
  profileName?: string;
  profileBio?: string;
  summaryPrompt?: string;
}

/**
 * Fetches user profile name/bio, latest chat summary (role='system'),
 * and last 20 messages for Gemini request contents.
 */
export async function getConversationContext(
  chatId: string,
  isGuest: boolean
): Promise<ContextResult> {
  const contents: any[] = [];
  let profileName = "";
  let profileBio = "";
  let summaryPrompt = "";

  if (isGuest || chatId === "guest-session") {
    return { contents };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { contents };
    }

    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, bio")
      .eq("id", user.id)
      .single();

    if (profile) {
      profileName = profile.full_name || "";
      profileBio = profile.bio || "";
    }

    // 2. Fetch latest system summary
    const { data: systemMsg } = await supabase
      .from("ai_messages")
      .select("content")
      .eq("chat_id", chatId)
      .eq("role", "system")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (systemMsg?.content) {
      summaryPrompt = systemMsg.content;
    }

    // 3. Fetch last 20 non-system messages in reverse order (chronological limit)
    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("chat_id", chatId)
      .neq("role", "system")
      .order("created_at", { ascending: false })
      .limit(20);

    if (history?.length) {
      // Reverse history so it's in chronological order for Gemini contents array
      for (const msg of history.reverse()) {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: (msg.content as string).slice(0, 6000) }],
        });
      }
    }
  } catch (err) {
    console.error("[AI Memory] Error loading conversation context:", err);
  }

  return {
    contents,
    profileName,
    profileBio,
    summaryPrompt,
  };
}
