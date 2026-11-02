import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { buildCorsHeaders } from '../_shared/cors.ts';
import { deleteAccountData, drainPhotoCleanup } from '../_shared/accountStorage.ts';

serve(async (req) => {
  const headers = { ...buildCorsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return json({ error: 'Authentication required' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Server configuration missing' }, 503);
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  try {
    // Validate with Auth; never trust a user_id in the body or decode-only JWTs.
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return json({ error: 'Authentication required' }, 401);
    const body = await req.json();
    if (body.action === 'delete-account' && body.confirmation === 'DELETE') {
      await deleteAccountData(db, data.user.id);
    } else if (body.action === 'cleanup-photos') {
      await drainPhotoCleanup(db, data.user.id);
    } else return json({ error: 'Invalid action or confirmation' }, 400);
    return json({ ok: true });
  } catch (error) {
    console.error('Account operation failed:', error instanceof Error ? error.name : 'backend error');
    return json({ error: '정리를 완료하지 못했습니다. 계정 삭제는 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.' }, 503);
  }
});
