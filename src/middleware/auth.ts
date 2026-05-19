// src/middleware/auth.ts

/**
 * Supabase authentication middleware for API routes (App Router).
 * Uses the Supabase JS client directly – no extra helper package required.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const getSanitizedUrl = (url: string | undefined): string => {
  if (!url) return 'https://placeholder.supabase.co';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
};

// Initialise a client that can read the auth cookie / bearer token.
const supabase = createClient<Database>(
  getSanitizedUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

/**
 * Middleware function – call at the top of any API route.
 * Returns the original request (augmented with custom headers) on success
 * or a 401 Response on failure.
 */
export async function authMiddleware(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Attach user info via custom headers for downstream handlers.
  const mutatedHeaders = new Headers(request.headers);
  mutatedHeaders.set('x-user-id', user.id);
  const role = (user?.app_metadata?.role as string) ?? 'authenticated';
  mutatedHeaders.set('x-user-role', role);

  // Return a new Request with the extra headers.
  return new Request(request, { headers: mutatedHeaders });
}

/** Helper to extract user info inside a route handler */
export function getUserInfo(request: Request): { id: string; role: string } {
  const id = request.headers.get('x-user-id') ?? '';
  const role = request.headers.get('x-user-role') ?? '';
  return { id, role };
}
