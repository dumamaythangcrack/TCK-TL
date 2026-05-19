"use server";

import { createClient } from "@/lib/supabase/server";
import { generatePresignedUploadUrl, generatePresignedDownloadUrl } from "@/lib/supabase/storage";
import { revalidatePath } from "next/cache";

interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPrimary: boolean;
  sortOrder: number;
}

// Generate presigned upload URLs for client-side direct upload to R2
export async function getUploadUrls(files: FileUploadRequest[]) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to upload files.");
  }

  const results = [];

  for (const file of files) {
    const fileExtension = file.fileName.split(".").pop() || "";
    // Sanitize and generate unique object key
    const sanitizedName = file.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = crypto.randomUUID();
    const r2Key = `documents/${user.id}/${uniqueId}/${sanitizedName}`;

    // Get presigned URL for upload
    const uploadUrl = await generatePresignedUploadUrl(r2Key, file.mimeType);

    results.push({
      fileName: file.fileName,
      r2Key,
      uploadUrl,
      fileExtension,
    });
  }

  return { success: true, uploads: results };
}

interface BundleCreateRequest {
  title: string;
  description?: string;
  categoryId?: string;
  gradeId?: string;
  subjectId?: string;
  files: {
    fileName: string;
    originalName: string;
    fileSize: number;
    mimeType: string;
    fileExtension: string;
    r2Key: string;
    isPrimary: boolean;
    sortOrder: number;
    thumbnailKey?: string;
  }[];
  tags?: string[];
}

// Commit upload to database
export async function createDocumentBundle(data: BundleCreateRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized. Please log in to complete upload.");
  }

  // Create clean slug
  const slug = `${data.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")}-${Date.now().toString().slice(-4)}`;

  // Calculate total size
  const totalSizeBytes = data.files.reduce((acc, f) => acc + f.fileSize, 0);

  // Insert bundle
  const { data: bundle, error: bundleError } = await supabase
    .from("document_bundles")
    .insert({
      title: data.title,
      slug,
      description: data.description,
      uploader_id: user.id,
      category_id: data.categoryId || null,
      grade_id: data.gradeId || null,
      subject_id: data.subjectId || null,
      status: "pending", // Requires admin approval
      total_size_bytes: totalSizeBytes,
    })
    .select()
    .single();

  if (bundleError || !bundle) {
    console.error("Bundle Insert Error:", bundleError);
    throw new Error("Failed to create document bundle in database.");
  }

  // Insert files
  const filesToInsert = data.files.map((file) => ({
    bundle_id: bundle.id,
    file_name: file.fileName,
    original_name: file.originalName,
    file_size_bytes: file.fileSize,
    mime_type: file.mimeType,
    file_extension: file.fileExtension,
    r2_key: file.r2Key,
    is_primary: file.isPrimary,
    sort_order: file.sortOrder,
    thumbnail_key: file.thumbnailKey || null,
  }));

  const { error: filesError } = await supabase
    .from("document_files")
    .insert(filesToInsert);

  if (filesError) {
    console.error("Files Insert Error:", filesError);
    // Cleanup transaction
    await supabase.from("document_bundles").delete().eq("id", bundle.id);
    throw new Error("Failed to save files. Rollback initiated.");
  }

  // Handle Tags
  if (data.tags && data.tags.length > 0) {
    for (const tagName of data.tags) {
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      
      // Upsert tag
      let { data: tag, error: tagError } = await supabase
        .from("tags")
        .select()
        .eq("slug", tagSlug)
        .maybeSingle();

      if (!tag) {
        const { data: newTag, error: newTagError } = await supabase
          .from("tags")
          .insert({ name: tagName, slug: tagSlug })
          .select()
          .single();
        
        tag = newTag;
      }

      if (tag) {
        await supabase.from("document_tags").insert({
          bundle_id: bundle.id,
          tag_id: tag.id,
        });
      }
    }
  }

  // Log upload action
  await supabase.from("upload_logs").insert({
    user_id: user.id,
    bundle_id: bundle.id,
  });

  revalidatePath("/");
  return { success: true, bundleId: bundle.id, slug };
}
