import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/** CORS: 비어 있으면 `*`, `CORS_ALLOWED_ORIGINS`(쉼표)가 있으면 요청 Origin이 목록에 있을 때만 반사 */
function buildCorsHeaders(req: Request): Record<string, string> {
  const base = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
  };
  const raw = (Deno.env.get('CORS_ALLOWED_ORIGINS') ?? '').trim();
  if (!raw) return { ...base, 'Access-Control-Allow-Origin': '*' };
  const allowed = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin');
  if (origin && allowed.includes(origin)) return { ...base, 'Access-Control-Allow-Origin': origin };
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] ?? '*' };
}

/**
 * admin-write — 관리자 쓰기 프록시.
 *
 * anon 키로는 products / nutritional_profiles 에 쓸 수 없다(RLS: public SELECT만).
 * 이 함수는 service_role 키(서버 전용)로 쓰기를 수행하되, 요청자가 관리자인지
 * x-admin-token 헤더(=btoa("id:pw"))를 SHA-256 비교로 검증한다.
 * service_role 키는 절대 클라이언트로 노출되지 않는다.
 *
 * verify_jwt = false (config.toml) — 관리자는 Supabase 인증 사용자가 아니므로
 * 자체 토큰 검증을 사용한다.
 */

// 허용 관리자 토큰의 SHA-256 (btoa("id:pw") 문자열의 해시). 평문 자격증명은 두지 않는다.
const ALLOWED_TOKEN_HASHES = new Set([
  '9fa38188b90a4cae4cf3cc7a69e30d8880ff6ed74f3cfb3cff23a0e1d7497fbb',
  'cb360248f2ecd593230ad22a2711ec2bf79ac8bc871922bdfdc78ab756ae77db',
  '070dfb079a7cb48bcd522468d96f17bad97c64341f9eb87fd7683dbba55aff54',
]);

// 화이트리스트 — 임의 컬럼 주입 방지
const PRODUCT_COLUMNS = [
  'name', 'brand_name', 'product_type', 'target_pet_type', 'image_url', 'min_price',
  'main_category', 'sub_category', 'target_life_stage', 'formulation',
  'product_health_concerns', 'has_risk_factors', 'manufacturer_name',
  'verification_status', 'coupang_product_id', 'coupang_link', 'barcode',
  'kcal_per_100g', 'packaging_weight_g', 'allergen_free_tags',
  'is_sponsored', 'sponsor_label', 'sponsor_order',
] as const;

const NUTRITION_COLUMNS = [
  'crude_protein', 'crude_fat', 'crude_fiber', 'crude_ash', 'moisture', 'calcium', 'phosphorus',
] as const;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function pick<T extends Record<string, unknown>>(src: T, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src && src[k] !== undefined) out[k] = src[k];
  return out;
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  // ── 관리자 토큰 검증 ──
  const token = req.headers.get('x-admin-token') ?? '';
  if (!token || !ALLOWED_TOKEN_HASHES.has(await sha256Hex(token))) {
    return json({ error: '관리자 인증 실패' }, 401, cors);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: '서버 환경변수 누락' }, 500, cors);

  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'saveProduct') {
      const product = pick(body.product ?? {}, PRODUCT_COLUMNS);
      if (!product.name || !product.brand_name) {
        return json({ error: '제품명과 브랜드는 필수입니다.' }, 400, cors);
      }

      let productId: string | undefined = body.product?.id;
      if (productId) {
        const { error } = await db.from('products').update(product).eq('id', productId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from('products').insert([product]).select('id').single();
        if (error) throw error;
        productId = data?.id;
      }

      // 보장성분(선택) — 값이 있을 때만 upsert
      const nutrition = body.nutrition ? pick(body.nutrition, NUTRITION_COLUMNS) : null;
      if (nutrition && Object.keys(nutrition).length > 0 && productId) {
        const { error: npErr } = await db
          .from('nutritional_profiles')
          .upsert({ product_id: productId, ...nutrition }, { onConflict: 'product_id' });
        if (npErr) throw npErr;
      }

      return json({ id: productId }, 200, cors);
    }

    if (action === 'deleteProduct') {
      const id = body?.id;
      if (!id) return json({ error: 'id가 필요합니다.' }, 400, cors);
      const { error } = await db.from('products').delete().eq('id', id);
      if (error) throw error;
      return json({ ok: true }, 200, cors);
    }

    return json({ error: '알 수 없는 action' }, 400, cors);
  } catch (err) {
    return json({ error: (err as Error).message ?? String(err) }, 500, cors);
  }
});
