"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper to create notifications in PostgreSQL
async function createNotification(
  userId: string,
  type: string,
  senderId: string,
  bundleId?: string,
  commentId?: string
) {
  const supabase = await createClient();
  
  // Don't notify self
  if (userId === senderId) return;

  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    sender_id: senderId,
    bundle_id: bundleId || null,
    comment_id: commentId || null,
  });
}

// 1. LIKE / UNLIKE
export async function toggleLike(bundleId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to like this document.");
  }

  // Check if liked
  const { data: like } = await supabase
    .from("document_likes")
    .select("*")
    .eq("user_id", user.id)
    .eq("bundle_id", bundleId)
    .maybeSingle();

  const { data: bundle } = await supabase
    .from("document_bundles")
    .select("uploader_id, like_count")
    .eq("id", bundleId)
    .single();

  if (!bundle) throw new Error("Document bundle not found.");

  if (like) {
    // Unlike
    await supabase
      .from("document_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("bundle_id", bundleId);

    await supabase
      .from("document_bundles")
      .update({ like_count: Math.max((bundle.like_count || 0) - 1, 0) })
      .eq("id", bundleId);
  } else {
    // Like
    await supabase.from("document_likes").insert({
      user_id: user.id,
      bundle_id: bundleId,
    });

    await supabase
      .from("document_bundles")
      .update({ like_count: (bundle.like_count || 0) + 1 })
      .eq("id", bundleId);

    // Notify uploader
    if (bundle.uploader_id) {
      await createNotification(bundle.uploader_id, "like", user.id, bundleId);
    }
  }

  revalidatePath(`/document/${bundleId}`);
  return { liked: !like };
}

// 2. BOOKMARK / UNBOOKMARK
export async function toggleBookmark(bundleId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to bookmark this document.");
  }

  const { data: bookmark } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .eq("bundle_id", bundleId)
    .maybeSingle();

  const { data: bundle } = await supabase
    .from("document_bundles")
    .select("uploader_id")
    .eq("id", bundleId)
    .single();

  if (!bundle) throw new Error("Document bundle not found.");

  if (bookmark) {
    // Unbookmark
    await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("bundle_id", bundleId);
  } else {
    // Bookmark
    await supabase.from("bookmarks").insert({
      user_id: user.id,
      bundle_id: bundleId,
    });

    // Notify uploader
    if (bundle.uploader_id) {
      await createNotification(bundle.uploader_id, "bookmark", user.id, bundleId);
    }
  }

  revalidatePath(`/document/${bundleId}`);
  return { bookmarked: !bookmark };
}

// 3. COMMENTS
interface AddCommentRequest {
  bundleId: string;
  content: string;
  parentId?: string;
}

export async function addComment(data: AddCommentRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to comment.");
  }

  // Check if user is muted (profiles column)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_locked") // is_locked doubles as locks & mutes in layout
    .eq("id", user.id)
    .single();

  if (profile?.is_locked) {
    throw new Error("Tài khoản của bạn đã bị khóa hoặc chặn bình luận.");
  }

  const { data: comment, error } = await supabase
    .from("document_comments")
    .insert({
      bundle_id: data.bundleId,
      user_id: user.id,
      content: data.content,
      parent_id: data.parentId || null,
    })
    .select()
    .single();

  if (error || !comment) {
    console.error("Add Comment Error:", error);
    throw new Error("Failed to add comment.");
  }

  // Get bundle details to notify uploader
  const { data: bundle } = await supabase
    .from("document_bundles")
    .select("uploader_id")
    .eq("id", data.bundleId)
    .single();

  if (bundle && bundle.uploader_id) {
    await createNotification(
      bundle.uploader_id,
      data.parentId ? "comment_reply" : "comment",
      user.id,
      data.bundleId,
      comment.id
    );
  }

  revalidatePath(`/document/${data.bundleId}`);
  return { success: true, comment };
}

export async function deleteComment(commentId: string, bundleId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized.");
  }

  // Check ownership or admin role
  const { data: comment } = await supabase
    .from("document_comments")
    .select("user_id")
    .eq("id", commentId)
    .single();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "moderator";

  if (!comment || (comment.user_id !== user.id && !isAdmin)) {
    throw new Error("Unauthorized delete comment request.");
  }

  // Flag deleted instead of hard delete if it has replies to keep tree structured
  await supabase
    .from("document_comments")
    .update({ is_deleted: true, content: "[Bình luận này đã bị xóa]" })
    .eq("id", commentId);

  revalidatePath(`/document/${bundleId}`);
  return { success: true };
}

// 4. FOLLOW / UNFOLLOW
export async function toggleFollow(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to follow creators.");
  }

  if (user.id === targetUserId) {
    throw new Error("You cannot follow yourself.");
  }

  const { data: follow } = await supabase
    .from("followers")
    .select("*")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (follow) {
    // Unfollow
    await supabase
      .from("followers")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId);
  } else {
    // Follow
    await supabase.from("followers").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });

    // Notify uploader
    await createNotification(targetUserId, "follow", user.id);
  }

  return { followed: !follow };
}

// 5. REPORTS
interface FileReportRequest {
  bundleId: string;
  reason: string;
  description?: string;
}

export async function reportDocument(data: FileReportRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to report documents.");
  }

  const { error } = await supabase.from("document_reports").insert({
    bundle_id: data.bundleId,
    user_id: user.id,
    reason: data.reason,
    description: data.description || null,
    status: "pending",
  });

  if (error) {
    console.error("Report Document Error:", error);
    throw new Error("Failed to submit report.");
  }

  return { success: true };
}

// 6. NOTIFICATIONS FETCHING
export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, avatar_url),
      bundle:document_bundles(id, title, slug)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Notifications Error:", error);
    return [];
  }

  return data || [];
}

export async function markNotificationsAsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false };

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  return { success: true };
}
