"use server";

import { createClient } from "@/lib/supabase/server";
import { generatePresignedDownloadUrl } from "@/lib/supabase/storage";
import { revalidatePath } from "next/cache";

interface SearchFilters {
  query?: string;
  gradeId?: string;
  subjectId?: string;
  categoryId?: string;
  tag?: string;
  fileExtension?: string;
  sortBy?: "newest" | "oldest" | "views" | "downloads" | "likes" | "trending";
  status?: "pending" | "approved" | "rejected";
}

function isPlaceholder() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder");
}

const MOCK_DOCUMENTS: any[] = [];

// Fetch document bundles with advanced search, taxonomy filtering, and sorting
export async function searchDocuments(filters: SearchFilters = {}, limit = 10, offset = 0) {
  if (isPlaceholder()) {
    let filtered = [...MOCK_DOCUMENTS];
    
    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(doc => doc.title.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q));
    }
    if (filters.categoryId && filters.categoryId !== "all") {
      filtered = filtered.filter(doc => doc.category_id === filters.categoryId);
    }
    if (filters.gradeId && filters.gradeId !== "all") {
      filtered = filtered.filter(doc => doc.grade_id === filters.gradeId);
    }
    if (filters.subjectId && filters.subjectId !== "all") {
      filtered = filtered.filter(doc => doc.subject_id === filters.subjectId);
    }
    
    return { data: filtered, count: filtered.length };
  }

  const supabase = await createClient();

  let queryBuilder = supabase
    .from("document_bundles")
    .select(`
      *,
      uploader:profiles(id, full_name, avatar_url, role),
      category:categories(id, name),
      grade:grades(id, name, level),
      subject:subjects(id, name),
      files:document_files(*)
    `, { count: "exact" });

  // Filter by status (default approved for public select)
  const statusFilter = filters.status || "approved";
  queryBuilder = queryBuilder.eq("status", statusFilter);

  // Apply Taxonomy Filters
  if (filters.gradeId) {
    queryBuilder = queryBuilder.eq("grade_id", filters.gradeId);
  }
  if (filters.subjectId) {
    queryBuilder = queryBuilder.eq("subject_id", filters.subjectId);
  }
  if (filters.categoryId) {
    queryBuilder = queryBuilder.eq("category_id", filters.categoryId);
  }

  // Full-Text Search
  if (filters.query && filters.query.trim().length > 0) {
    // Format query for PostgreSQL plainto_tsquery or to_tsquery
    // We'll use wfts websearch_to_tsquery equivalent or similar if available, or just a simple ilike/fts search
    queryBuilder = queryBuilder.textSearch("fts", filters.query.trim().split(" ").join(" & "));
  }

  // Apply Tag filter via joining table
  if (filters.tag) {
    // Sub-select matching tags
    const { data: tagBundles } = await supabase
      .from("document_tags")
      .select("bundle_id")
      .eq("tag_id", filters.tag);
    
    if (tagBundles && tagBundles.length > 0) {
      queryBuilder = queryBuilder.in("id", tagBundles.map(tb => tb.bundle_id));
    } else {
      // Return empty results if no tag match
      return { data: [], count: 0 };
    }
  }

  // Filter by File type (extension)
  if (filters.fileExtension) {
    const { data: extBundles } = await supabase
      .from("document_files")
      .select("bundle_id")
      .eq("file_extension", filters.fileExtension.toLowerCase());

    if (extBundles && extBundles.length > 0) {
      queryBuilder = queryBuilder.in("id", extBundles.map(eb => eb.bundle_id));
    } else {
      return { data: [], count: 0 };
    }
  }

  // Apply Sorting
  const sortBy = filters.sortBy || "newest";
  switch (sortBy) {
    case "oldest":
      queryBuilder = queryBuilder.order("created_at", { ascending: true });
      break;
    case "views":
      queryBuilder = queryBuilder.order("view_count", { ascending: false });
      break;
    case "downloads":
      queryBuilder = queryBuilder.order("download_count", { ascending: false });
      break;
    case "likes":
      queryBuilder = queryBuilder.order("like_count", { ascending: false });
      break;
    case "trending":
      // Trending combines views & download count
      queryBuilder = queryBuilder.order("view_count", { ascending: false }).order("download_count", { ascending: false });
      break;
    case "newest":
    default:
      queryBuilder = queryBuilder.order("created_at", { ascending: false });
      break;
  }

  // Pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1);

  const { data, count, error } = await queryBuilder;

  if (error) {
    console.warn("Search Documents (Handled warning):", error.message);
    return { data: MOCK_DOCUMENTS, count: MOCK_DOCUMENTS.length };
  }

  return { data: data || MOCK_DOCUMENTS, count: count || MOCK_DOCUMENTS.length };
}

// Fetch single document bundle details by slug
export async function getDocumentDetails(slug: string) {
  if (isPlaceholder()) {
    const doc = MOCK_DOCUMENTS.find(d => d.slug === slug);
    return doc || null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_bundles")
    .select(`
      *,
      uploader:profiles(id, full_name, avatar_url, role),
      category:categories(id, name),
      grade:grades(id, name, level),
      subject:subjects(id, name),
      files:document_files(*),
      tags:document_tags(tag:tags(id, name, slug))
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    console.warn("Fetch Document Details (Handled warning):", error?.message || "Not found");
    const doc = MOCK_DOCUMENTS.find(d => d.slug === slug);
    return doc || null;
  }

  return data;
}

// Log a document view action and increment view count
export async function incrementDocumentViews(bundleId: string) {
  const supabase = await createClient();
  
  // Note: We use RPC if possible or standard increment
  // For simplicity, we fetch, increment, and save. In heavy production, an RPC or DB trigger is preferred.
  const { data: bundle } = await supabase
    .from("document_bundles")
    .select("view_count")
    .eq("id", bundleId)
    .single();

  if (bundle) {
    await supabase
      .from("document_bundles")
      .update({ view_count: (bundle.view_count || 0) + 1 })
      .eq("id", bundleId);
  }
}

// Authorize download and generate signed url for R2 object
// Authorize download and generate signed url for R2 object
export async function downloadDocumentFile(fileId: string) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Phiên đăng nhập hết hạn hoặc chưa đăng nhập." };
    }

    // Get file details to verify existence & fetch R2 key
    const { data: file, error: fileError } = await supabase
      .from("document_files")
      .select("*, bundle:document_bundles(id, status, download_count, uploader_id)")
      .eq("id", fileId)
      .single();

    if (fileError || !file) {
      return { success: false, error: "Không tìm thấy file tài liệu." };
    }

    // Ensure bundle is approved before public access, or user is owner/admin
    const bundleUploaderId = file.bundle?.uploader_id || "";
    const bundleStatus = file.bundle?.status || "";
    if (bundleStatus !== "approved" && bundleUploaderId !== user.id) {
      return { success: false, error: "Tài liệu này đang chờ phê duyệt và không thể tải xuống." };
    }

    // Generate expiring Presigned URL for secure download
    let downloadUrl = "";
    try {
      downloadUrl = await generatePresignedDownloadUrl(file.r2_key, 600); // 10 minutes expiration
    } catch (storageErr: any) {
      console.error("Storage download URL generation failed:", storageErr);
      return { success: false, error: "Không thể tạo liên kết tải xuống bảo mật từ dịch vụ lưu trữ." };
    }

    // Log download event
    await supabase.from("download_logs").insert({
      user_id: user.id,
      bundle_id: file.bundle.id,
      file_id: file.id,
    });

    // Increment download counts in DB
    await supabase
      .from("document_bundles")
      .update({ download_count: (file.bundle.download_count || 0) + 1 })
      .eq("id", file.bundle.id);

    // Update profile download stats
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_downloads")
      .eq("id", user.id)
      .single();

    if (profile) {
      await supabase
        .from("profiles")
        .update({ total_downloads: (profile.total_downloads || 0) + 1 })
        .eq("id", user.id);
    }

    return { success: true, downloadUrl };
  } catch (err: any) {
    console.error("downloadDocumentFile action failed:", err);
    return { success: false, error: err.message || "Lỗi hệ thống khi tải tài liệu." };
  }
}
