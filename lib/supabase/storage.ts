import { createAdminClient } from "./server";

export const BUCKET_NAME = "tck-storage";

/**
 * Ensures the target Supabase Storage bucket exists.
 * Runs with admin client to verify/create.
 */
export async function ensureBucketExists() {
  try {
    const supabase = await createAdminClient();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error listing storage buckets:", error);
      return;
    }

    const exists = buckets.some((b) => b.id === BUCKET_NAME);
    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false, // Private bucket as requested
        fileSizeLimit: 52428800, // 50MB file size limit as requested
      });
      if (createError) {
        console.error("Failed to create private storage bucket:", createError);
      } else {
        console.log(`Successfully created private storage bucket: ${BUCKET_NAME}`);
      }
    }
  } catch (err) {
    console.error("ensureBucketExists catch block:", err);
  }
}

/**
 * Generates a signed upload URL for a file in Supabase Storage.
 * The client can perform a PUT request to the returned URL to upload.
 */
export async function generatePresignedUploadUrl(key: string, contentType: string, expiresIn: number = 3600) {
  // Ensure the private bucket exists first
  await ensureBucketExists();

  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(key);

  if (error || !data) {
    console.error("Supabase Storage Upload URL Error:", error);
    throw new Error(`Failed to generate signed upload URL: ${error?.message || "Unknown error"}`);
  }

  // Supabase SDK returns a signedUrl (which allows uploading via PUT directly)
  return data.signedUrl;
}

/**
 * Generates a signed download/preview URL for a file in Supabase Storage.
 */
export async function generatePresignedDownloadUrl(key: string, expiresIn: number = 3600) {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(key, expiresIn);

  if (error || !data) {
    console.error("Supabase Storage Download URL Error:", error);
    throw new Error(`Failed to generate signed download URL: ${error?.message || "Unknown error"}`);
  }

  return data.signedUrl;
}
