"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Automatically cleans up chat threads older than 10 days.
 */
export async function cleanupOldChats() {
  try {
    const supabase = await createAdminClient();
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const dateStr = tenDaysAgo.toISOString();

    console.log(`[Cleanup] Auto-cleaning chats older than: ${dateStr}`);
    
    // Delete ai_chats updated_at older than 10 days
    const { error } = await supabase
      .from("ai_chats")
      .delete()
      .lt("updated_at", dateStr);

    if (error) {
      console.error("[Cleanup] Error cleaning up old chats:", error);
    } else {
      console.log("[Cleanup] Old chats cleaned up successfully.");
    }
  } catch (err) {
    console.error("[Cleanup] Unexpected error:", err);
  }
}

/**
 * Creates a new AI chat thread.
 */
export async function createAiChat(title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized. Please log in to start an AI chat.");
  }

  const { data, error } = await supabase
    .from("ai_chats")
    .insert({
      user_id: user.id,
      title: title || "Cuộc hội thoại mới",
    })
    .select()
    .single();

  if (error) {
    console.error("Create AI Chat Error:", error);
    throw new Error("Failed to create chat thread.");
  }

  return data;
}

/**
 * Lists all chat threads for the current user.
 */
export async function getAiChats() {
  // Trigger cleanup of old chats in background
  cleanupOldChats().catch((err) => console.error("[Cleanup Error]", err));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_chats")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Get AI Chats Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Deletes a chat thread.
 */
export async function deleteAiChat(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized.");

  const { error } = await supabase
    .from("ai_chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Delete AI Chat Error:", error);
    throw new Error("Failed to delete chat thread.");
  }

  return { success: true };
}

/**
 * Renames a chat thread.
 */
export async function renameAiChat(chatId: string, title: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized.");

  const { data, error } = await supabase
    .from("ai_chats")
    .update({ title: title || "Cuộc trò chuyện mới", updated_at: new Date().toISOString() })
    .eq("id", chatId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Rename AI Chat Error:", error);
    throw new Error("Failed to rename chat thread.");
  }

  return data;
}

/**
 * Gets messages in a chat thread.
 */
export async function getAiMessages(chatId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Get AI Messages Error:", error);
    return [];
  }

  return data || [];
}

/**
 * Fetches standard historical AI interaction logs for stats display.
 */
export async function getAiHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("ai_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch AI History Error:", error);
    return [];
  }

  return data || [];
}
