// app/api/download/route.ts

import { NextResponse } from 'next/server';
import { authMiddleware } from '@/src/middleware/auth';
import { getSignedUrl } from '@/src/lib/storage';
import type { NextRequest } from 'next/server';

/**
 * GET /api/download?bucket=...&path=...
 * Returns a 302 redirect to a signed URL (private) or the public URL.
 */
export async function GET(request: NextRequest) {
  const authReq = await authMiddleware(request);
  if (authReq instanceof Response) return authReq; // unauthenticated

  const url = new URL(request.url);
  const bucket = url.searchParams.get('bucket');
  const path = url.searchParams.get('path');
  if (!bucket || !path) {
    return NextResponse.json({ error: 'bucket and path query params required' }, { status: 400 });
  }

  // If the bucket is public we can just redirect to the public URL.
  if (bucket === 'public-documents' || bucket === 'avatars' || bucket === 'thumbnails' || bucket === 'cdn-cache') {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `https://${rawUrl}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURIComponent(path)}`;
    return NextResponse.redirect(publicUrl);
  }

  // Private bucket – generate a signed URL (default 5 min).
  const signed = await getSignedUrl(bucket, path, 5 * 60);
  return NextResponse.redirect(signed);
}
