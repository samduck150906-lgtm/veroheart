import { createHmac } from 'node:crypto';

import type { SupabaseClient } from '@supabase/supabase-js';

export function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function authenticateRequest(
  request: Request,
  client: SupabaseClient,
): Promise<string | null> {
  const token = extractBearerToken(request);
  if (!token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export function digestRateLimitKey(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}
