// src/lib/storage.ts

/**
 * Supabase Storage helper functions (server‑side only).
 * Uses the @supabase/supabase-js client initialized with the service role key.
 * All functions return promises that resolve to the expected result or throw.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase'; // adjust path if you have a generated types file

// Initialise a server‑side client (service role) – never expose this to the browser.
const supabaseAdmin: SupabaseClient<Database> = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role'
);

/**
 * Upload a file to a given bucket.
 * @param bucket The bucket id (exact name).
 * @param path   Destination path inside the bucket (e.g. "user123/avatar.png").
 * @param file   The File/Blob to upload.
 * @param options Optional validation options.
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }
): Promise<{ publicURL?: string; signedURL?: string }> {
  // Validation
  if (options?.maxSizeBytes && file.size > options.maxSizeBytes) {
    throw new Error(`File exceeds maximum size of ${options.maxSizeBytes} bytes`);
  }
  if (
    options?.allowedMimeTypes &&
    !options.allowedMimeTypes.includes((file as any).type)
  ) {
    throw new Error('File type not allowed');
  }

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: (file as any).type });

  if (error) {
    throw error;
  }

  // Public bucket – return the public URL directly.
  const bucketInfo = await supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  if (bucketInfo?.data?.publicUrl) {
    return { publicURL: bucketInfo.data.publicUrl };
  }

  // Private bucket – generate a signed URL (default 5 min).
  const signed = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 5 * 60);
  if (signed?.data?.signedUrl) {
    return { signedURL: signed.data.signedUrl };
  }
  throw new Error('Failed to generate URL');
}

/** Generate a signed URL for private assets. */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 5 * 60
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl as string;
}

/** Delete a file from a bucket (admin only). */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw error;
}

/** List files under a prefix – useful for admin moderation UI. */
export async function listFiles(
  bucket: string,
  prefix: string = ''
): Promise<Array<{ name: string; size: number; lastModified: string }>> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(prefix, { limit: 1000, offset: 0, sortBy: { column: 'updated_at', order: 'desc' } });
  if (error) throw error;
  return data?.map((f) => ({
    name: f.name,
    size: f.metadata?.size ?? 0,
    lastModified: f.updated_at ?? ''
  })) ?? [];
}

/**
 * Generate a thumbnail for an image or the first page of a PDF.
 * This function is intended to be called from a Supabase Edge Function
 * (see functions/thumbnail-generator). It simply uploads the generated
 * thumbnail to the `thumbnails` bucket.
 */
export async function uploadThumbnail(
  destinationPath: string,
  buffer: Buffer,
  mime: string = 'image/webp'
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('thumbnails')
    .upload(destinationPath, buffer, { contentType: mime, upsert: true });
  if (error) throw error;
  const { data: urlData } = supabaseAdmin.storage
    .from('thumbnails')
    .getPublicUrl(destinationPath);
  return urlData?.publicUrl as string;
}

export default supabaseAdmin;
