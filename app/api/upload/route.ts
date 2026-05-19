// app/api/upload/route.ts

import { NextResponse } from 'next/server';
import { authMiddleware } from '@/src/middleware/auth';
import { withUploadValidation } from '@/src/middleware/uploadValidator';
import { uploadFile } from '@/src/lib/storage';
import type { NextRequest } from 'next/server';

/**
 * POST /api/upload
 * Expected multipart body:
 *   - files[] (multiple files)
 *   - public (optional, "true" / "false")
 *   - primaryPreview (optional, file name of the primary file)
 */
export async function POST(request: NextRequest) {
  // Run auth first
  const authReq = await authMiddleware(request);
  if (authReq instanceof Response) return authReq; // Unauthenticated

  const urlParams = new URL(request.url);
  const isPublic = urlParams.searchParams.get('public') === 'true';

  const bucket = isPublic ? 'public-documents' : 'private-documents';

  // Validate and then handle upload
  return await withUploadValidation(
    authReq as NextRequest,
    bucket as any,
    async (req, files) => {
      const { id: userId } = (await import('@/src/middleware/auth')).getUserInfo(req);
      const responses: Array<{ file: string; url: string }> = [];
      for (const file of files) {
        // Build destination path: userId/<timestamp>/<filename>
        const timestamp = Date.now();
        const path = `${userId}/${timestamp}/${file.name}`;
        const result = await uploadFile(bucket, path, file, {
          maxSizeBytes: 100 * 1024 * 1024,
          allowedMimeTypes: undefined,
        });
        const url = result.publicURL ?? result.signedURL ?? '';
        responses.push({ file: file.name, url });
      }
      return NextResponse.json({ success: true, files: responses });
    }
  );
}
