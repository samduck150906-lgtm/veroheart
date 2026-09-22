import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-enrichment-read — 제품 데이터 보완 큐 조회 (service_role).
 *
 * product_enrichment_queue 는 RLS 가 켜져 있고 정책이 하나도 없다. 관리자 화면이
 * anon 으로는 한 줄도 읽을 수 없어 service_role 경로가 필요하다.
 *
 * 조회를 admin-write 에서 떼어 온 이유: 그 함수는 관리자 쓰기가 전부 지나가는
 * 80kB 짜리라, 조회 조건 하나를 고치자고 다시 배포했다가 실패하면 관리자 콘솔이
 * 통째로 멎는다. 읽기는 admin-products-read 처럼 작은 함수로 나눠 둔다.
 *
 * 인증: admin-write 와 같은 x-admin-token 규약.
 */

const ALLOWED_TOKEN_HASHES = new Set([
  '0a6a2e1f8723c72cf8e729d3ea6af059f6c6d3035b589eaf7e53f7a9f10e3f7d',
]);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://veroro-admin.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

/**
 * 큐가 돌려주는 컬럼. 클라이언트가 보낸 문자열이 select() 에 들어가는 경로는 없다.
 *
 * products!inner 라서 제품 쪽 조건으로도 거를 수 있다 — is_visible 필터가 이것에
 * 기댄다.
 */
const QUEUE_COLUMNS =
  'product_id, status, missing_fields, review_note, reviewed_by, reviewed_at, updated_at, '
  + 'products!inner(id, name, brand_name, target_pet_type, main_category, image_url, barcode, '
  + 'verification_status, is_visible)';

class ValidationError extends Error {}

function buildCorsHeaders(req: Request): Record<string, string> {
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
    Vary: 'Origin',
  };
  const raw = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '').trim();
  const allowed = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;
  const origin = req.headers.get('Origin');
  if (origin && allowed.includes(origin)) return { ...base, 'Access-Control-Allow-Origin': origin };
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s || s === '전체') return null;
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

/** 관리자 토큰 검증 — admin-write 와 같은 두 형태를 모두 받는다. */
async function authenticateAdmin(token: string, sessionSecret: string): Promise<string | null> {
  if (token.startsWith('v1.')) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(sessionSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify(
        'HMAC',
        key,
        base64UrlDecode(parts[2]),
        new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
      );
      if (!valid) return null;
      const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as {
        actor?: unknown; exp?: unknown;
      };
      if (typeof payload.actor !== 'string' || !payload.actor || payload.actor.length > 64) return null;
      if (typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
      return payload.actor;
    } catch {
      return null;
    }
  }
  if (!ALLOWED_TOKEN_HASHES.has(await sha256Hex(token))) return null;
  try {
    const id = atob(token).split(':')[0]?.trim();
    return id && id.length <= 64 ? id : 'unknown';
  } catch {
    return 'unknown';
  }
}

// deno-lint-ignore no-explicit-any
type Db = any;

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: '서버 환경변수 누락' }, 500, cors);

  const sessionSecret = Deno.env.get('ADMIN_SESSION_SECRET') ?? serviceKey;
  const token = req.headers.get('x-admin-token') ?? '';
  const actor = token ? await authenticateAdmin(token, sessionSecret) : null;
  if (!actor) return json({ error: '관리자 인증 실패' }, 401, cors);

  const db: Db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    const pageRaw = Number(body.page);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const sizeRaw = Number(body.pageSize);
    const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(Math.floor(sizeRaw), 100) : 20;
    const from = (page - 1) * pageSize;

    const status = optionalText(body.status, '상태', 40);
    const missingField = optionalText(body.missingField, '누락 필드', 40);
    const visibility = optionalText(body.visibility, '노출 상태', 20);

    let query = db
      .from('product_enrichment_queue')
      .select(QUEUE_COLUMNS, { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (status && status !== 'all') query = query.eq('status', status);
    if (missingField && missingField !== 'all') query = query.contains('missing_fields', [missingField]);
    // 큐에는 노출을 내린 제품도 남는다(정보를 채우면 다시 켜야 하므로).
    // 기본 작업 대상은 지금 사용자에게 보이는 제품이다.
    if (visibility === 'visible') query = query.eq('products.is_visible', true);
    else if (visibility === 'hidden') query = query.eq('products.is_visible', false);

    const { data, count, error } = await query;
    if (error) throw error;

    const productIds = (data ?? []).map((row: { product_id: string }) => row.product_id);
    const sourceCounts = new Map<string, number>();
    if (productIds.length > 0) {
      const { data: sources, error: sourceError } = await db
        .from('product_data_sources')
        .select('product_id')
        .in('product_id', productIds);
      if (sourceError) throw sourceError;
      for (const source of sources ?? []) {
        sourceCounts.set(source.product_id, (sourceCounts.get(source.product_id) ?? 0) + 1);
      }
    }

    const rows = (data ?? []).map((row: { product_id: string }) => ({
      ...row,
      source_count: sourceCounts.get(row.product_id) ?? 0,
    }));
    return json({ ok: true, rows, total: count ?? 0 }, 200, cors);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-enrichment-read failed:', err);
    return json({ error: `보완 큐를 불러오지 못했습니다: ${message}` }, 500, cors);
  }
});
