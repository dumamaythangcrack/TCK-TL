"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Ensure admin role middleware helper
async function checkAdminOrModerator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAuthorized = profile?.role === "admin" || profile?.role === "moderator";
  if (!isAuthorized) {
    throw new Error("Unauthorized access. Admin or Moderator role required.");
  }

  return { user, role: profile.role };
}

// 1. ANALYTICS & STATS
export async function getAdminStats() {
  await checkAdminOrModerator();
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: totalBundles },
    { count: totalPending },
    { count: totalReports },
    { data: popularDocs },
    { data: activeUploaders }
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("document_bundles").select("*", { count: "exact", head: true }),
    supabase.from("document_bundles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("document_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
    
    // Top documents
    supabase
      .from("document_bundles")
      .select("id, title, view_count, download_count, like_count")
      .order("view_count", { ascending: false })
      .limit(5),
    
    // Top contributors
    supabase
      .from("profiles")
      .select("id, full_name, email, total_uploads")
      .order("total_uploads", { ascending: false })
      .limit(5)
  ]);

  // Aggregate storage metrics (sum total_size_bytes of approved bundles)
  const { data: sizeData } = await supabase
    .from("document_bundles")
    .select("total_size_bytes");
  
  const totalSizeBytes = sizeData?.reduce((acc, curr) => acc + (curr.total_size_bytes || 0), 0) || 0;

  // Aggregate views & downloads sum
  const { data: interactionData } = await supabase
    .from("document_bundles")
    .select("view_count, download_count");
  
  const totalViews = interactionData?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;
  const totalDownloads = interactionData?.reduce((acc, curr) => acc + (curr.download_count || 0), 0) || 0;

  return {
    totalUsers: totalUsers || 0,
    totalBundles: totalBundles || 0,
    totalPending: totalPending || 0,
    totalReports: totalReports || 0,
    totalViews,
    totalDownloads,
    totalSizeMB: (totalSizeBytes / 1024 / 1024).toFixed(2),
    popularDocs: popularDocs || [],
    activeUploaders: activeUploaders || [],
  };
}

// Fetch traffic charts (views/downloads log counts by day for the last 7 days)
export async function getAdminChartData() {
  await checkAdminOrModerator();
  const supabase = await createClient();

  // For high performance, we select timestamps of download logs
  const { data: downloads } = await supabase
    .from("download_logs")
    .select("created_at")
    .order("created_at", { ascending: true });

  const { data: uploads } = await supabase
    .from("upload_logs")
    .select("created_at")
    .order("created_at", { ascending: true });

  // Map dates to daily counts
  const chartMap: Record<string, { date: string; downloads: number; uploads: number }> = {};

  downloads?.forEach((d) => {
    const dateStr = new Date(d.created_at).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
    if (!chartMap[dateStr]) chartMap[dateStr] = { date: dateStr, downloads: 0, uploads: 0 };
    chartMap[dateStr].downloads++;
  });

  uploads?.forEach((u) => {
    const dateStr = new Date(u.created_at).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" });
    if (!chartMap[dateStr]) chartMap[dateStr] = { date: dateStr, downloads: 0, uploads: 0 };
    chartMap[dateStr].uploads++;
  });

  // Convert to array and take last 7 days
  return Object.values(chartMap).slice(-7);
}

// 2. DOCUMENT MODERATION
export async function getPendingDocuments() {
  await checkAdminOrModerator();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_bundles")
    .select(`
      *,
      uploader:profiles(id, full_name, email),
      files:document_files(*)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Pending Docs Error:", error);
    return [];
  }
  return data || [];
}

export async function moderateDocument(bundleId: string, action: "approve" | "reject") {
  const { user } = await checkAdminOrModerator();
  const supabase = await createClient();

  const statusMap = {
    approve: "approved",
    reject: "rejected",
  };

  const { data: bundle, error } = await supabase
    .from("document_bundles")
    .update({ status: statusMap[action] as any })
    .eq("id", bundleId)
    .select("uploader_id, title")
    .single();

  if (error || !bundle) {
    console.error("Moderate Document Error:", error);
    throw new Error(`Failed to ${action} document.`);
  }

  // If approved, update uploader's total_uploads count
  if (action === "approve" && bundle.uploader_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_uploads")
      .eq("id", bundle.uploader_id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_uploads: (profile.total_uploads || 0) + 1 })
        .eq("id", bundle.uploader_id);
    }

    // Notify user of approval
    await supabase.from("notifications").insert({
      user_id: bundle.uploader_id,
      type: "document_approved",
      sender_id: user.id,
      bundle_id: bundleId,
    });
  } else if (action === "reject" && bundle.uploader_id) {
    // Notify user of rejection
    await supabase.from("notifications").insert({
      user_id: bundle.uploader_id,
      type: "document_rejected",
      sender_id: user.id,
      bundle_id: bundleId,
    });
  }

  // Audit Log
  await supabase.from("audit_logs").insert({
    action: `${action}_document`,
    performed_by: user.id,
    target_id: bundleId,
    details: `Tài liệu: "${bundle.title}"`,
  });

  revalidatePath("/adminpanel");
  revalidatePath("/");
  return { success: true };
}

// 3. USER MODERATION
export async function getUsersList() {
  await checkAdminOrModerator();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Users List Error:", error);
    return [];
  }
  return data || [];
}

export async function toggleUserLock(targetUserId: string, lock: boolean) {
  const { user } = await checkAdminOrModerator();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_locked: lock })
    .eq("id", targetUserId);

  if (error) {
    console.error("User Lock Toggle Error:", error);
    throw new Error("Failed to change lock status.");
  }

  // Audit Log
  await supabase.from("audit_logs").insert({
    action: lock ? "lock_user" : "unlock_user",
    performed_by: user.id,
    target_id: targetUserId,
  });

  revalidatePath("/adminpanel");
  return { success: true };
}

// 4. REPORT SYSTEM MODERATION
export async function getDocumentReports() {
  await checkAdminOrModerator();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_reports")
    .select(`
      *,
      user:profiles(id, full_name, email),
      bundle:document_bundles(id, title, slug)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch Document Reports Error:", error);
    return [];
  }
  return data || [];
}

export async function resolveReport(reportId: string, action: "resolved" | "dismissed") {
  const { user } = await checkAdminOrModerator();
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_reports")
    .update({ status: action })
    .eq("id", reportId);

  if (error) {
    console.error("Resolve Report Error:", error);
    throw new Error("Failed to resolve report.");
  }

  // Audit Log
  await supabase.from("audit_logs").insert({
    action: `${action}_report`,
    performed_by: user.id,
    target_id: reportId,
  });

  revalidatePath("/adminpanel");
  return { success: true };
}
