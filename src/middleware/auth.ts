// src/middleware/auth.ts

/**
 * Supabase authentication middleware for API routes.
 * It verifies the JWT sent via the `Authorization: Bearer <token>` header.
 * On success it attaches `req.user` containing `id` (UUID) and `role`.
 */

import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export async function authMiddleware(request: NextRequest) {
  const response = new Response();

  const supabase = createMiddlewareSupabaseClient<Database>({
    request,
    response,
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Attach a tiny payload to the request for downstream handlers.
  // Next.js 15 `next/server` does not allow mutating request.headers directly,
  // so we encode the payload in a custom header.
  const mutatedHeaders = new Headers(request.headers);
  mutatedHeaders.set('x-user-id', user.id);
  // Supabase roles are stored in the `role` claim (if using custom claim).
  // Fallback to `user.role` if present.
  const role = (user?.app_metadata?.role as string) ?? 'authenticated';
  mutatedHeaders.set('x-user-role', role);

  const authRequest = new Request(request, { headers: mutatedHeaders });
  // Pass request downstream – the route handler can read `request.headers.get('x-user-id')`.
  return authRequest;
}

/**
 * Helper to extract user info inside a route handler.
 */
export function getUserInfo(request: Request): { id: string; role: string } {
  const id = request.headers.get('x-user-id') ?? '';
  const role = request.headers.get('x-user-role') ?? '';
  return { id, role };
}
