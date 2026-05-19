// src/middleware/uploadValidator.ts

/**
 * Validate incoming multipart uploads.
 * Used by API routes that accept file uploads.
 */

import type { NextRequest } from 'next/server';
import type { Database } from '../types/supabase';
import { getUserInfo } from './auth';

export interface ValidationResult {
  ok: boolean;
  status?: number;
  message?: string;
}

/**
 * Allowed MIME types per bucket.
 */
const ALLOWED_MIME = {
  'public-documents': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  'private-documents': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  avatars: ['image/jpeg', 'image/png', 'image/webp'],
  'ai-chat-attachments': [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
  ],
};

/**
 * Simple validator – called inside API route after parsing multipart.
 * `files` is an array of File objects (from `form-data`).
 */
export function validateFiles(
  bucket: keyof typeof ALLOWED_MIME,
  files: File[],
  userId: string
): ValidationResult {
  const maxSize = 100 * 1024 * 1024; // 100 MB per file (adjustable)
  const allowed = ALLOWED_MIME[bucket];
  for (const file of files) {
    if (!allowed.includes(file.type)) {
      return { ok: false, status: 400, message: `Unsupported file type ${file.type}` };
    }
    if (file.size > maxSize) {
      return { ok: false, status: 400, message: `File ${file.name} exceeds ${maxSize / 1024 / 1024} MB limit` };
    }
  }
  // Additional per‑user quota checks could be added here.
  return { ok: true };
}

/**
 * Middleware wrapper for Next.js App Router. It extracts the user, then validates.
 */
export async function withUploadValidation(
  request: NextRequest,
  bucket: keyof typeof ALLOWED_MIME,
  handler: (req: NextRequest, files: File[]) => Promise<Response>
): Promise<Response> {
  const { id: userId } = getUserInfo(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401 });
  }
  const form = await request.formData();
  const fileList = form.getAll('files') as unknown as File[]; // expects input name="files"
  const validation = validateFiles(bucket, fileList, userId);
  if (!validation.ok) {
    return new Response(JSON.stringify({ error: validation.message }), { status: validation.status ?? 400 });
  }
  return handler(request, fileList);
}
