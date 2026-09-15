import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * admin-product-facts — 바코드·보장성분 일괄 입력.
 *
 * admin-write 의 saveProduct 는 제품 행 전체를 덮어쓰는 구조라 제품명까지 매번
 * 보내야 하고 한 건이라도 어긋나면 멀쩡한 값이 지워진다. 여기서는 바코드·kcal·
 * 보장성분만 건드린다.
 *
 * 바코드는 서버에서도 체크숫자를 다시 계산한다. 잘못된 바코드는 스캔이 안 되는
 * 것보다 나쁘다 — 엉뚱한 제품이 매칭된다.
 *
 * 목록 조회는 여기 없다. products·nutritional_profiles 는 공개 SELECT 라
 * 관리자 화면이 anon 키로 직접 읽는다. 이 함수는 service_role 이 꼭 필요한
 * 쓰기만 맡는다.
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

/** 한 요청에 담을 수 있는 제품 수. */
const MAX_ITEMS = 100;
/** 보장성분 컬럼 — 전부 백분율이라 0~100 만 받는다. */
const NUTRITION_KEYS = [
  'crude_protein', 'crude_fat', 'crude_fiber', 'crude_ash', 'moisture', 'calcium', 'phosphorus',
];
const VALID_BARCODE_LENGTHS = new Set([8, 12, 13, 14]);

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

function requireUuid(value: unknown, label: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!UUID_RE.test(s)) throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  return s;
}

/** GTIN 체크숫자 — 오른쪽에서 3,1,3,1… 을 곱해 합이 10의 배수여야 한다. */
function checkDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  for (let offset = 0; offset < digitsWithoutCheck.length; offset += 1) {
    const digit = Number(digitsWithoutCheck[digitsWithoutCheck.length - 1 - offset]);
    sum += digit * (offset % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

/** 빈 값은 "지움"(null). 값이 있으면 형식과 체크숫자를 본다. */
function normalizeBarcode(value: unknown, label: string): string | null {
  if (value === undefined || value === null) return null;
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return null;
  if (!VALID_BARCODE_LENGTHS.has(digits.length)) {
    throw new ValidationError(`${label}: 바코드는 8·12·13·14자리여야 합니다. (${digits.length}자리)`);
  }
  if (checkDigit(digits.slice(0, -1)) !== Number(digits[digits.length - 1])) {
    throw new ValidationError(`${label}: 바코드 체크숫자가 맞지 않습니다. 오타를 확인해 주세요.`);
  }
  return digits;
}

function optionalPercent(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new ValidationError(`${label} 값은 0에서 100 사이여야 합니다.`);
  }
  return n;
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

async function audit(db: Db, actor: string, action: string, detail: Record<string, unknown>) {
  // 감사 로그 실패가 본 작업을 되돌리지 않도록 오류를 삼킨다.
  const { error } = await db.from('admin_audit_log').insert({
    actor, action, target_table: 'products', target_id: null, detail,
  });
  if (error) console.error('audit log failed:', error.message);
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
    const action = typeof body.action === 'string' ? body.action : '';

    switch (action) {
      /**
       * 바코드·kcal·보장성분만 저장한다. 다른 컬럼은 건드리지 않는다.
       * 바코드 중복은 DB 의 부분 UNIQUE 인덱스가 막는다 — 그 오류를 그대로
       * 보여 주면 무슨 말인지 알 수 없어 어느 제품이 걸렸는지 알려 준다.
       */
      case 'saveProductFacts': {
        const rawItems = Array.isArray(body.items) ? body.items : [];
        if (rawItems.length === 0) throw new ValidationError('저장할 제품이 없습니다.');
        if (rawItems.length > MAX_ITEMS) {
          throw new ValidationError(`한 번에 최대 ${MAX_ITEMS}개까지 저장할 수 있습니다.`);
        }

        const seen = new Set<string>();
        const items = rawItems.map((raw, index) => {
          const row = (raw ?? {}) as Record<string, unknown>;
          const id = requireUuid(row.id, '제품 ID');
          if (seen.has(id)) throw new ValidationError('같은 제품이 목록에 중복으로 들어 있습니다.');
          seen.add(id);

          const label = typeof row.name === 'string' && row.name.trim()
            ? row.name.trim().slice(0, 40)
            : `${index + 1}번째 항목`;

          const kcalRaw = row.kcalPer100g ?? row.kcal_per_100g;
          let kcal: number | null = null;
          if (kcalRaw !== undefined && kcalRaw !== null && kcalRaw !== '') {
            const n = Number(kcalRaw);
            if (!Number.isFinite(n) || n < 0 || n > 1000) {
              throw new ValidationError(`${label}: 100g당 칼로리는 0에서 1000 사이여야 합니다.`);
            }
            kcal = n;
          }

          const rawNutrition = (row.nutrition ?? {}) as Record<string, unknown>;
          const nutrition: Record<string, number | null> = {};
          let hasNutrition = false;
          for (const key of NUTRITION_KEYS) {
            const value = optionalPercent(rawNutrition[key], `${label}: ${key}`);
            nutrition[key] = value;
            if (value !== null) hasNutrition = true;
          }

          return {
            id,
            label,
            barcode: normalizeBarcode(row.barcode, label),
            kcal,
            nutrition,
            hasNutrition,
            // 통째로 비우는 것은 의도된 삭제일 때만.
            clearNutrition: row.clearNutrition === true,
          };
        });

        // 같은 요청 안의 바코드 중복은 DB 에 가기 전에 막는다.
        const codes = new Map<string, string>();
        for (const item of items) {
          if (!item.barcode) continue;
          const owner = codes.get(item.barcode);
          if (owner) {
            throw new ValidationError(`바코드 ${item.barcode} 가 "${owner}" 와 "${item.label}" 에 중복됩니다.`);
          }
          codes.set(item.barcode, item.label);
        }

        let saved = 0;
        const changes: Record<string, unknown>[] = [];

        for (const item of items) {
          const { error: updateError } = await db
            .from('products')
            .update({ barcode: item.barcode, kcal_per_100g: item.kcal })
            .eq('id', item.id);
          if (updateError) {
            if (String(updateError.code) === '23505') {
              throw new ValidationError(
                `"${item.label}" 의 바코드 ${item.barcode} 는 이미 다른 제품이 쓰고 있습니다.`,
              );
            }
            throw updateError;
          }

          if (item.hasNutrition) {
            const { error: profileError } = await db
              .from('nutritional_profiles')
              .upsert({ product_id: item.id, ...item.nutrition }, { onConflict: 'product_id' });
            if (profileError) throw profileError;
          } else if (item.clearNutrition) {
            const { error: deleteError } = await db
              .from('nutritional_profiles')
              .delete()
              .eq('product_id', item.id);
            if (deleteError) throw deleteError;
          }

          saved += 1;
          changes.push({ id: item.id, name: item.label, barcode: item.barcode, kcal: item.kcal });
        }

        await audit(db, actor, 'saveProductFacts', { saved, changes: changes.slice(0, 50) });
        return json({ ok: true, saved }, 200, cors);
      }

      default:
        return json({ error: `알 수 없는 action: ${action}` }, 400, cors);
    }
  } catch (err) {
    if (err instanceof ValidationError) return json({ error: err.message }, 400, cors);
    const message = err instanceof Error ? err.message : String(err);
    console.error('admin-product-facts failed:', err);
    return json({ error: `처리에 실패했습니다: ${message}` }, 500, cors);
  }
});
