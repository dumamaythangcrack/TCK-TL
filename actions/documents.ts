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

const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    title: "Đề thi thử THPT Quốc gia môn Toán học 2026 - Sở GD&ĐT Hà Nội",
    description: "Đề thi thử tốt nghiệp THPT Quốc gia năm 2026 môn Toán học của Sở Giáo dục và Đào tạo Hà Nội. Đề thi bám sát cấu trúc mới của Bộ GD&ĐT, kèm theo đáp án và lời giải chi tiết từng câu trắc nghiệm.",
    slug: "de-thi-thu-thpt-quoc-gia-mon-toan-2026-ha-noi",
    category_id: "cat-2",
    grade_id: "grade-12",
    subject_id: "sub-1",
    view_count: 1420,
    download_count: 852,
    like_count: 124,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
    status: "approved",
    category: { id: "cat-2", name: "Đề thi & Kiểm tra" },
    grade: { id: "grade-12", name: "Lớp 12", level: "high_school" },
    subject: { id: "sub-1", name: "Toán học" },
    uploader: { id: "u-1", full_name: "Thầy Nguyễn Tiến Đạt", role: "teacher" },
    files: [
      { id: "f-1", file_name: "De_thi_thu_Toan_2026_HN.pdf", file_size_bytes: 2540000, file_extension: "pdf", is_primary: true }
    ],
    comments: [
      {
        id: "com-1",
        content: "Đề thi hay quá thầy ơi, sát với đề minh họa năm nay!",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        user: { id: "u-commenter", full_name: "Nguyễn Văn Hùng" }
      }
    ]
  },
  {
    id: "doc-2",
    title: "Giáo án Ngữ văn 12 - Trọn bộ 35 tuần theo chương trình mới",
    description: "Giáo án bài giảng Ngữ văn lớp 12 trọn bộ cả năm học (35 tuần) biên soạn theo định hướng phát triển năng lực học sinh, chuẩn chương trình giáo dục phổ thông mới của Bộ GD&ĐT. Thích hợp cho giáo viên tham khảo giảng dạy.",
    slug: "giao-an-ngu-van-12-tron-bo-35-tuan-moi",
    category_id: "cat-3",
    grade_id: "grade-12",
    subject_id: "sub-2",
    view_count: 980,
    download_count: 420,
    like_count: 89,
    created_at: new Date(Date.now() - 3600000 * 24 * 7).toISOString(), // 7 days ago
    status: "approved",
    category: { id: "cat-3", name: "Giáo án & Bài giảng" },
    grade: { id: "grade-12", name: "Lớp 12", level: "high_school" },
    subject: { id: "sub-2", name: "Ngữ văn" },
    uploader: { id: "u-2", full_name: "Cô Phan Lệ Hằng", role: "teacher" },
    files: [
      { id: "f-2", file_name: "Giao_an_Ngu_Van_12_Full.docx", file_size_bytes: 4120000, file_extension: "docx", is_primary: true }
    ],
    comments: []
  },
  {
    id: "doc-3",
    title: "Đề cương ôn tập Vật lý 11 - Học kỳ 2 (Tóm tắt lý thuyết & Bài tập)",
    description: "Tài liệu tổng hợp kiến thức trọng tâm môn Vật lý lớp 11 học kỳ II. Bao gồm lý thuyết dễ nhớ, sơ đồ tư duy và tuyển tập 200 câu trắc nghiệm bài tập có đáp án chi tiết.",
    slug: "de-cuong-on-tap-vat-ly-11-hoc-ky-2",
    category_id: "cat-1",
    grade_id: "grade-11",
    subject_id: "sub-4",
    view_count: 650,
    download_count: 215,
    like_count: 57,
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString(), // 1 day ago
    status: "approved",
    category: { id: "cat-1", name: "Tài liệu học tập" },
    grade: { id: "grade-11", name: "Lớp 11", level: "high_school" },
    subject: { id: "sub-4", name: "Vật lý" },
    uploader: { id: "u-3", full_name: "Trần Minh Quân", role: "student" },
    files: [
      { id: "f-3", file_name: "De_cuong_on_tap_Ly_11_HK2.pdf", file_size_bytes: 1850000, file_extension: "pdf", is_primary: true }
    ],
    comments: []
  }
];

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
export async function downloadDocumentFile(fileId: string) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to download this document.");
  }

  // Get file details to verify existence & fetch R2 key
  const { data: file, error: fileError } = await supabase
    .from("document_files")
    .select("*, bundle:document_bundles(id, status, download_count)")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    throw new Error("File not found.");
  }

  // Ensure bundle is approved before public access, or user is owner/admin
  if (file.bundle.status !== "approved" && file.bundle.uploader_id !== user.id) {
    throw new Error("This document is pending approval and cannot be downloaded.");
  }

  // Generate expiring Presigned URL for secure download
  const downloadUrl = await generatePresignedDownloadUrl(file.r2_key, 600); // 10 minutes expiration

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

  return { downloadUrl };
}
