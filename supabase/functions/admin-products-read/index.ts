import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-products-read — 관리자 화면의 제품 조회 (service_role).
 *
 * products 의 공개 SELECT 정책을 "앱에 실제로 보이는 제품"으로 좁히면서 필요해진
 * 함수다. 그 전까지 관리자 화면도 anon 키로 products 를 직접 읽었는데, 정책을
 * 좁히는 순간 관리자가 비노출·검수대기 제품을 볼 수 없게 된다. 정작 그 제품들을
 * 관리하는 것이 관리자 화면의 일이다.
 *
 * 임의 조회 프록시가 되지 않도록 컬럼은 view 이름으로만 고른다. 클라이언트가
 * 보낸 문자열이 select() 에 그대로 들어가는 경로는 없다.
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

/** 화면별로 필요한 컬럼 묶음. 이 목록 밖의 컬럼은 내보내지 않는다. */
const VIEWS: Record<string, string> = {
  list:
    'id, name, brand_name, main_category, sub_category, target_pet_type, target_life_stage, '
    + 'image_url, min_price, barcode, verification_status, created_at, is_visible, is_pinned, '
    + 'pinned_order, product_ingredients(count), nutritional_profiles(count)',
  names: 'id, name, brand_name, main_category, image_url',
  facts:
    'id, name, brand_name, image_url, barcode, kcal_per_100g, coupang_link, '
    + 'nutritional_profiles(crude_protein, crude_fat, crude_fiber, crude_ash, moisture, calcium, phosphorus)',
  categories: 'main_category',
  full: '*',
};

/** 한 번에 내려주는 최대 행 수. names/facts 처럼 전체를 도는 view 의 상한. */
const SCAN_PAGE = 1000;
const MAX_SCAN = 20000;

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

/** 화면에 그대로 보여줄 수 있는 검증 오류. 내부 DB 오류와 구분한다. */
class ValidationError extends Error {}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** PostgREST or() 구문의 구분자를 검색어에서 제거한다. */
function likePattern(value: string): string {
  const cleaned = value.replace(/[(),]/g, ' ').trim();
  return `"%${cleaned.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}%"`;
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
// deno-lint-ignore no-explicit-any
type Filters = Record<string, any>;

/** 목록·통계가 같은 조건을 쓰도록 필터 적용을 한곳에 둔다. */
// deno-lint-ignore no-explicit-any
function applyFilters(builder: any, filters: Filters) {
  const search = optionalText(filters.search, '검색어', 100);
  if (search) {
    const pattern = likePattern(search);
    builder = builder.or(
      `name.ilike.${pattern},brand_name.ilike.${pattern},barcode.ilike.${pattern}`,
    );
  }
  const category = optionalText(filters.category, '카테고리', 40);
  if (category) builder = builder.eq('main_category', category);

  const petType = optionalText(filters.petType, '대상 동물', 10);
  if (petType) builder = builder.eq('target_pet_type', petType);

  const verification = optionalText(filters.verificationStatus, '검수 상태', 20);
  if (verification) builder = builder.eq('verification_status', verification);

  const visibility = optionalText(filters.visibility, '노출 상태', 20);
  if (visibility) builder = builder.eq('is_visible', visibility === 'visible');

  // 데이터 품질 드릴다운 — 대시보드 카드에서 넘어오는 조건.
  if (filters.missingBarcode === true) builder = builder.is('barcode', null);
  if (filters.missingPrice === true) builder = builder.is('min_price', null);
  if (filters.missingImage === true) builder = builder.is('image_url', null);
  return builder;
}

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
    const view = typeof body.view === 'string' ? body.view : '';
    if (!VIEWS[view]) throw new ValidationError('조회 대상이 올바르지 않습니다.');
    const columns = VIEWS[view];
    const filters = (body.filters ?? {}) as Filters;

    // 단건 조회 — 편집 화면이 쓴다.
    if (view === 'full') {
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      if (!UUID_RE.test(id)) throw new ValidationError('제품 ID 형식이 올바르지 않습니다.');
      const { data, error } = await db.from('products').select(columns).eq('id', id).maybeSingle();
      if (error) throw error;
      return json({ ok: true, product: data ?? null }, 200, cors);
    }

    // 페이지 조회 — 관리자 제품 목록.
    if (view === 'list') {
      const pageRaw = Number(body.page);
      const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
      const sizeRaw = Number(body.pageSize);
      const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.min(Math.floor(sizeRaw), 100) : 20;
      const from = (page - 1) * pageSize;

      let builder = db
        .from('products')
        .select(columns, { count: 'exact' })
        .order('is_pinned', { ascending: false })
        .order('pinned_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);
      builder = applyFilters(builder, filters);

      const { data, count, error } = await builder;
      if (error) throw error;
      return json({ ok: true, rows: data ?? [], total: count ?? 0 }, 200, cors);
    }

    // 전체 스캔 — names/facts/categories. 상한을 넘으면 자르지 않고 알린다.
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; offset < MAX_SCAN; offset += SCAN_PAGE) {
      let builder = db
        .from('products')
        .select(columns)
        .order('name', { ascending: true })
        .range(offset, offset + SCAN_PAGE - 1);
      builder = applyFilters(builder, filters);

      const { data, error } = await builder;
      if (error) throw error;
      const batch = (data ?? []) as Record<string, unknown>[];
      rows.push(...batch);
      if (batch.length < SCAN_PAGE) {
        return json({ ok: true, rows, total: rows.length }, 200, cors);
      }
    }
    throw new Error(`제품 수가 조회 한도(${MAX_SCAN})를 초과했습니다.`);
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-products-read failed:', err);
    return json({ error: `제품을 불러오지 못했습니다: ${message}` }, 500, cors);
  }
});
