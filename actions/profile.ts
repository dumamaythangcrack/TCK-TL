"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Get user profile details and detailed stats for dashboard
export async function getDashboardData() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized.");
  }

  const [
    { data: profile },
    { data: uploads },
    { data: bookmarks },
    { data: downloads }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("document_bundles").select(`
      *,
      category:categories(name),
      grade:grades(name),
      subject:subjects(name)
    `).eq("uploader_id", user.id).order("created_at", { ascending: false }),
    supabase.from("bookmarks").select(`
      bundle:document_bundles(
        id, title, slug, description, view_count, download_count, like_count, created_at,
        uploader:profiles(full_name, avatar_url)
      )
    `).eq("user_id", user.id),
    supabase.from("download_logs").select(`
      created_at,
      bundle:document_bundles(id, title, slug)
    `).eq("user_id", user.id).order("created_at", { ascending: false })
  ]);

  return {
    profile: profile || null,
    uploads: uploads || [],
    bookmarks: bookmarks?.map(b => b.bundle).filter(Boolean) || [],
    downloads: downloads || [],
  };
}

interface UpdateProfileRequest {
  fullName: string;
  bio?: string;
  avatarUrl?: string;
}

export async function updateProfile(data: UpdateProfileRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: data.fullName,
      bio: data.bio || null,
      avatar_url: data.avatarUrl || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("Update Profile Error:", error);
    throw new Error("Failed to update profile.");
  }

  revalidatePath("/dashboard");
  return { success: true };
}
