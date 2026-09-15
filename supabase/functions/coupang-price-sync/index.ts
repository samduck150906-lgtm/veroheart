import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * coupang-price-sync — 쿠팡 파트너스에서 판매가를 확인해 "변동 제안"을 쌓는다.
 *
 * 이 함수는 products.min_price 를 직접 바꾸지 않는다. 외부 값이 곧바로 앱에 나가면
 * 잘못된 가격이 그대로 보호자에게 노출되기 때문이다. 변동을 발견하면
 * product_price_proposals 에 status='pending' 으로 남기고, 관리자가 승인한 것만
 * admin-write 의 reviewPriceProposal 이 products 에 반영한다.
 *
 * 인증: 관리자 토큰(x-admin-token)이 있어야 호출할 수 있다. 관리자 콘솔의
 * "지금 동기화" 버튼과 예약 실행이 같은 경로를 쓴다.
 *
 * 필요한 시크릿 (Supabase → Edge Functions → Secrets):
 *   COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY
 * 둘 중 하나라도 없으면 아무것도 조회하지 않고 명시적 오류를 돌려준다.
 */

const COUPANG_HOST = 'https://api-gateway.coupang.com';
const SEARCH_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/products/search';

/** 한 번 호출에서 확인할 제품 수. 파트너스 API 호출 한도를 넘지 않도록 작게 잡는다. */
const BATCH_SIZE = 25;
/** 연속 호출 사이 간격(ms) — 분당 호출 제한에 걸리지 않게 한다. */
const CALL_INTERVAL_MS = 1200;

const ALLOWED_TOKEN_HASHES = new Set([
  '0a6a2e1f8723c72cf8e729d3ea6af059f6c6d3035b589eaf7e53f7a9f10e3f7d',
]);

const CORS = {
  'Access-Control-Allow-Origin': 'https://veroro-admin.netlify.app',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-admin-token',
  Vary: 'Origin',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
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

/**
 * 관리자 토큰 검증 — admin-write 와 같은 규약을 따른다.
 *
 * 로그인한 콘솔은 원본 자격증명이 아니라 `v1.*` 세션 토큰을 들고 있으므로,
 * 두 형태를 모두 받아야 한다. 세션 서명 키도 admin-write 와 같은 값을 쓴다.
 */
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
      if (typeof payload.actor !== 'string' || !payload.actor) return null;
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

/**
 * 쿠팡 Open API 의 CEA 서명.
 *
 * message = signed-date + METHOD + path + query (query 는 '?' 없이)
 * signed-date 는 GMT 기준 `yyMMddTHHmmssZ`.
 * Authorization: CEA algorithm=HmacSHA256, access-key=..., signed-date=..., signature=...
 */
async function authorizationHeader(
  method: string,
  path: string,
  query: string,
  accessKey: string,
  secretKey: string,
): Promise<string> {
  const now = new Date().toISOString()
    .replace(/[-:]/g, '')      // 2026-09-15T01:02:03.000Z -> 20260915T010203.000Z
    .replace(/\.\d{3}/, '')    // -> 20260915T010203Z
    .slice(2);                 // -> 260915T010203Z
  const message = `${now}${method}${path}${query}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  const signature = Array.from(signed).map((b) => b.toString(16).padStart(2, '0')).join('');

  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${now}, signature=${signature}`;
}

/**
 * 계속 돌려도 결과가 같은 오류 — 키가 틀렸거나, 권한이 없거나, 호출 한도를 넘었다.
 *
 * 제품별 실패와 구분해야 한다. 이걸 제품별 실패로 세면 25개 제품에 대해 같은
 * 인증 오류를 30초 동안 반복하고, 운영자는 "실패 25건"만 보게 된다.
 */
class CoupangFatalError extends Error {}

interface CoupangProduct {
  productId?: number | string;
  productName?: string;
  productPrice?: number;
  productUrl?: string;
}

/**
 * 제품명으로 검색해 같은 productId 를 찾아 현재 판매가를 읽는다.
 *
 * 파트너스 공개 API 에는 "productId 로 단건 조회"가 없어 검색으로 찾는다.
 * 같은 productId 를 못 찾으면 값을 지어내지 않고 null 을 돌려준다.
 */
async function fetchCoupangPrice(
  keyword: string,
  coupangProductId: string,
  accessKey: string,
  secretKey: string,
): Promise<{ price: number; url: string | null } | null> {
  const query = `keyword=${encodeURIComponent(keyword.slice(0, 50))}&limit=20`;
  const authorization = await authorizationHeader('GET', SEARCH_PATH, query, accessKey, secretKey);

  const response = await fetch(`${COUPANG_HOST}${SEARCH_PATH}?${query}`, {
    method: 'GET',
    headers: { Authorization: authorization, 'Content-Type': 'application/json;charset=UTF-8' },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 200);
    if (response.status === 401 || response.status === 403) {
      throw new CoupangFatalError(
        `쿠팡 API 인증에 실패했습니다(${response.status}). Supabase → Edge Functions → Secrets 의 `
        + `COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY 와 파트너스 계정 승인 상태를 확인해 주세요. ${detail}`,
      );
    }
    if (response.status === 429) {
      throw new CoupangFatalError('쿠팡 API 호출 한도를 넘었습니다(429). 잠시 뒤에 다시 실행해 주세요.');
    }
    throw new Error(`쿠팡 API ${response.status}: ${detail}`);
  }

  const body = await response.json() as { data?: { productData?: CoupangProduct[] } };
  const match = (body.data?.productData ?? []).find(
    (item) => String(item.productId ?? '') === String(coupangProductId),
  );
  if (!match || typeof match.productPrice !== 'number') return null;
  return { price: Math.round(match.productPrice), url: match.productUrl ?? null };
}

// deno-lint-ignore no-explicit-any
type Db = any;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: '서버 환경변수 누락' }, 500);

  const sessionSecret = Deno.env.get('ADMIN_SESSION_SECRET') ?? serviceKey;
  const token = req.headers.get('x-admin-token') ?? '';
  const actor = token ? await authenticateAdmin(token, sessionSecret) : null;
  if (!actor) return json({ error: '관리자 인증 실패' }, 401);

  const accessKey = Deno.env.get('COUPANG_ACCESS_KEY') ?? '';
  const secretKey = Deno.env.get('COUPANG_SECRET_KEY') ?? '';
  if (!accessKey || !secretKey) {
    return json(
      {
        error: '쿠팡 API 키가 설정되지 않았습니다. Supabase → Edge Functions → Secrets 에 '
          + 'COUPANG_ACCESS_KEY 와 COUPANG_SECRET_KEY 를 등록해 주세요.',
      },
      503,
    );
  }

  const db: Db = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: run, error: runError } = await db
    .from('price_sync_runs')
    .insert({ triggered_by: actor })
    .select('id')
    .single();
  if (runError) return json({ error: runError.message }, 500);

  let checked = 0;
  let changed = 0;
  let failed = 0;
  const failures: string[] = [];

  try {
    // 확인한 지 가장 오래된 제품부터 이어서 본다 — 여러 번 나눠 돌려도 전체를 한 바퀴 돈다.
    const { data: products, error } = await db
      .from('products')
      .select('id, name, min_price, coupang_product_id, coupang_link')
      .not('coupang_product_id', 'is', null)
      .order('price_checked_at', { ascending: true, nullsFirst: true })
      .limit(BATCH_SIZE);
    if (error) throw error;

    for (const product of (products ?? []) as {
      id: string; name: string; min_price: number | null;
      coupang_product_id: string; coupang_link: string | null;
    }[]) {
      const now = new Date().toISOString();
      try {
        const result = await fetchCoupangPrice(product.name, product.coupang_product_id, accessKey, secretKey);
        checked += 1;
        // 조회했다는 사실은 결과와 무관하게 남긴다(같은 제품만 계속 재시도하지 않게).
        await db.from('products').update({ price_checked_at: now }).eq('id', product.id);
        if (!result) continue;

        const current = Number(product.min_price ?? 0);
        if (result.price === current) continue;

        // 같은 제품의 대기 제안이 있으면 최신 값으로 갱신한다(제안이 쌓이지 않게).
        const { error: upsertError } = await db
          .from('product_price_proposals')
          .upsert(
            {
              product_id: product.id,
              current_price: current,
              proposed_price: result.price,
              source: 'coupang',
              source_url: result.url ?? product.coupang_link,
              source_product_id: product.coupang_product_id,
              status: 'pending',
              detected_at: now,
            },
            { onConflict: 'product_id', ignoreDuplicates: false },
          );
        if (upsertError) throw upsertError;
        changed += 1;
      } catch (err) {
        // 키·권한·한도 문제면 남은 제품도 같은 결과다. 여기서 멈춰야 운영자가
        // "실패 25건"이 아니라 무엇을 고쳐야 하는지 본다.
        if (err instanceof CoupangFatalError) throw err;
        failed += 1;
        if (failures.length < 5) {
          failures.push(`${product.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
        await db.from('products').update({ price_checked_at: now }).eq('id', product.id);
      }

      await new Promise((resolve) => setTimeout(resolve, CALL_INTERVAL_MS));
    }

    await db.from('price_sync_runs').update({
      finished_at: new Date().toISOString(),
      checked, changed, failed,
      error: failures.length > 0 ? failures.join(' | ').slice(0, 1000) : null,
    }).eq('id', run.id);

    return json({ ok: true, checked, changed, failed, failures }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.from('price_sync_runs').update({
      finished_at: new Date().toISOString(),
      checked, changed, failed,
      error: message.slice(0, 1000),
    }).eq('id', run.id);
    console.error('coupang-price-sync failed:', err);
    return json({ error: `가격 동기화에 실패했습니다: ${message}` }, 500);
  }
});
