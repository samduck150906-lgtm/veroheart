import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  ALLOWED_ACTIONS,
  MAX_PAGE_SIZE,
  NUTRITION_COLUMNS,
  ValidationError,
  actorFromToken,
  clampPage,
  clampPageSize,
  decodeBase64,
  detectImage,
  escapeLike,
  normalizeIngredientPayload,
  normalizeProductIngredientItems,
  normalizeProductPayload,
  normalizeSettingsPayload,
  optionalText,
  optionalUuid,
  pick,
  requireUuid,
} from './validation.ts';

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
 * admin-write — 관리자 쓰기/운영 프록시.
 *
 * anon 키로는 products / ingredients / product_ingredients / app_settings 에 쓸 수 없다
 * (RLS: public SELECT만). 이 함수는 service_role 키(서버 전용)로 쓰기를 수행하되,
 * 요청자가 관리자인지 x-admin-token 헤더(=btoa("id:pw"))를 SHA-256 비교로 검증한다.
 * service_role 키는 절대 클라이언트로 노출되지 않는다.
 *
 * verify_jwt = false (config.toml) — 관리자는 Supabase 인증 사용자가 아니므로
 * 자체 토큰 검증을 사용한다.
 *
 * 모든 action은 (1) 인증 → (2) payload 검증 → (3) 허용 컬럼 화이트리스트 →
 * (4) 실행 → (5) 감사 로그 순서를 따른다. 클라이언트가 보낸 테이블명/컬럼명을
 * 그대로 쿼리에 사용하는 경로는 존재하지 않는다.
 */

// 허용 관리자 토큰의 SHA-256 (btoa("id:pw") 문자열의 해시). 평문 자격증명은 두지 않는다.
const ALLOWED_TOKEN_HASHES = new Set([
  '9fa38188b90a4cae4cf3cc7a69e30d8880ff6ed74f3cfb3cff23a0e1d7497fbb',
  'cb360248f2ecd593230ad22a2711ec2bf79ac8bc871922bdfdc78ab756ae77db',
  '070dfb079a7cb48bcd522468d96f17bad97c64341f9eb87fd7683dbba55aff54',
]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// ── 인증 실패 레이트리밋(인스턴스 로컬) ──────────────────────────────────────
// Edge 인스턴스가 살아 있는 동안만 유지되는 경량 방어. 완전한 brute-force 차단은
// 아니지만 단일 인스턴스에 대한 연속 시도를 크게 늦춘다.
const FAIL_WINDOW_MS = 5 * 60_000;
const FAIL_LIMIT = 10;
const failures = new Map<string, { count: number; first: number }>();

function clientKey(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

function isRateLimited(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > FAIL_WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= FAIL_LIMIT;
}

function recordFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.first > FAIL_WINDOW_MS) {
    failures.set(key, { count: 1, first: Date.now() });
    return;
  }
  entry.count += 1;
}

// deno-lint-ignore no-explicit-any
type Db = any;

async function audit(
  db: Db,
  actor: string,
  action: string,
  targetTable: string | null,
  targetId: string | null,
  detail: Record<string, unknown> = {},
) {
  // 감사 로그 실패가 본 작업을 되돌리지 않도록 오류를 삼킨다(서버 로그에만 남긴다).
  const { error } = await db.from('admin_audit_log').insert({
    actor,
    action,
    target_table: targetTable,
    target_id: targetId,
    detail,
  });
  if (error) console.error('audit log failed:', error.message);
}

// ── action 핸들러 ───────────────────────────────────────────────────────────

async function replaceProductIngredients(db: Db, productId: string, rawItems: unknown): Promise<number> {
  const items = normalizeProductIngredientItems(rawItems);
  const { data, error } = await db.rpc('admin_replace_product_ingredients', {
    p_product_id: productId,
    p_items: items,
  });
  if (error) throw error;
  return typeof data === 'number' ? data : items.length;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  // ── 관리자 토큰 검증 (가장 먼저) ──
  const ipKey = clientKey(req);
  if (isRateLimited(ipKey)) {
    return json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, 429, cors);
  }

  const token = req.headers.get('x-admin-token') ?? '';
  if (!token || !ALLOWED_TOKEN_HASHES.has(await sha256Hex(token))) {
    recordFailure(ipKey);
    // 계정 존재 여부를 구분하지 않는 단일 메시지
    return json({ error: '관리자 인증 실패' }, 401, cors);
  }
  const actor = actorFromToken(token);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !serviceKey) return json({ error: '서버 환경변수 누락' }, 500, cors);

  const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: '요청 본문을 해석할 수 없습니다.' }, 400, cors);
  }

  const action = typeof body?.action === 'string' ? body.action : '';

  try {
    switch (action) {
      // ── 인증 확인 ──────────────────────────────────────────────────────
      case 'verifyAdmin':
        return json({ ok: true, actor }, 200, cors);

      // ── 제품 ───────────────────────────────────────────────────────────
      case 'saveProduct': {
        const product = normalizeProductPayload((body.product ?? {}) as Record<string, unknown>);
        const rawProduct = (body.product ?? {}) as Record<string, unknown>;

        let productId = optionalUuid(rawProduct.id, '제품 ID');
        if (productId) {
          const { data: existing, error: findErr } = await db
            .from('products').select('id').eq('id', productId).maybeSingle();
          if (findErr) throw findErr;
          if (!existing) throw new ValidationError('수정할 제품을 찾을 수 없습니다.');
          const { error } = await db.from('products').update(product).eq('id', productId);
          if (error) throw error;
        } else {
          const { data, error } = await db.from('products').insert([product]).select('id').single();
          if (error) throw error;
          productId = data?.id ?? null;
        }
        if (!productId) throw new Error('제품 ID를 확인할 수 없습니다.');

        // 보장성분(선택) — 값이 있을 때만 upsert
        const nutrition = body.nutrition ? pick(body.nutrition as Record<string, unknown>, NUTRITION_COLUMNS) : null;
        if (nutrition && Object.keys(nutrition).length > 0) {
          const { error: npErr } = await db
            .from('nutritional_profiles')
            .upsert({ product_id: productId, ...nutrition }, { onConflict: 'product_id' });
          if (npErr) throw npErr;
        }

        // 원재료 연결(선택) — 제품 저장과 같은 요청에서 원자적으로 교체
        let ingredientCount: number | null = null;
        if (body.ingredients !== undefined) {
          ingredientCount = await replaceProductIngredients(db, productId, body.ingredients);
        }

        await audit(db, actor, 'saveProduct', 'products', productId, {
          name: product.name,
          ingredientCount,
        });
        return json({ ok: true, id: productId, ingredientCount }, 200, cors);
      }

      case 'deleteProduct': {
        const id = requireUuid(body.id, '제품 ID');
        const { error } = await db.from('products').delete().eq('id', id);
        if (error) throw error;
        await audit(db, actor, 'deleteProduct', 'products', id);
        return json({ ok: true }, 200, cors);
      }

      case 'saveProductIngredients': {
        const productId = requireUuid(body.productId ?? body.product_id, '제품 ID');
        const count = await replaceProductIngredients(db, productId, body.items);
        await audit(db, actor, 'saveProductIngredients', 'product_ingredients', productId, { count });
        return json({ ok: true, count }, 200, cors);
      }

      case 'uploadProductImage': {
        const bytes = decodeBase64(body.fileBase64 ?? body.file_base64);
        const { mime, ext } = detectImage(bytes);
        const productId = optionalUuid(body.productId ?? body.product_id, '제품 ID');
        const folder = productId ?? 'unassigned';
        const path = `${folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

        const { error } = await db.storage.from('product-images').upload(path, bytes, {
          contentType: mime,
          cacheControl: '31536000',
          upsert: false,
        });
        if (error) throw error;

        const { data } = db.storage.from('product-images').getPublicUrl(path);
        await audit(db, actor, 'uploadProductImage', 'storage.objects', path, { bytes: bytes.length, mime });
        return json({ ok: true, path, publicUrl: data?.publicUrl ?? null }, 200, cors);
      }

      // ── 성분 ───────────────────────────────────────────────────────────
      case 'saveIngredient': {
        const raw = (body.ingredient ?? body.payload ?? {}) as Record<string, unknown>;
        const ingredient = normalizeIngredientPayload(raw);
        const id = optionalUuid(raw.id, '성분 ID');

        if (id) {
          const { data: existing, error: findErr } = await db
            .from('ingredients').select('id').eq('id', id).maybeSingle();
          if (findErr) throw findErr;
          if (!existing) throw new ValidationError('수정할 성분을 찾을 수 없습니다.');

          // name_ko 는 UNIQUE — 다른 행과 충돌하는지 먼저 확인해 친절한 메시지를 준다.
          const { data: dupe, error: dupErr } = await db
            .from('ingredients').select('id').eq('name_ko', ingredient.name_ko).neq('id', id).maybeSingle();
          if (dupErr) throw dupErr;
          if (dupe) throw new ValidationError('같은 이름의 성분이 이미 있습니다.');

          const { error } = await db.from('ingredients').update(ingredient).eq('id', id);
          if (error) throw error;
          await audit(db, actor, 'saveIngredient', 'ingredients', id, { name_ko: ingredient.name_ko });
          return json({ ok: true, id }, 200, cors);
        }

        const { data: dupe, error: dupErr } = await db
          .from('ingredients').select('id').eq('name_ko', ingredient.name_ko).maybeSingle();
        if (dupErr) throw dupErr;
        if (dupe) throw new ValidationError('같은 이름의 성분이 이미 있습니다.');

        const { data, error } = await db.from('ingredients').insert([ingredient]).select('id').single();
        if (error) throw error;
        await audit(db, actor, 'saveIngredient', 'ingredients', data?.id ?? null, { name_ko: ingredient.name_ko });
        return json({ ok: true, id: data?.id ?? null }, 200, cors);
      }

      case 'deleteIngredient': {
        const id = requireUuid(body.id, '성분 ID');

        // 제품에 연결된 성분은 삭제하지 않는다(cascade 로 링크가 함께 사라지는 것을 막는다).
        const { count, error: linkErr } = await db
          .from('product_ingredients')
          .select('product_id', { count: 'exact', head: true })
          .eq('ingredient_id', id);
        if (linkErr) throw linkErr;

        if ((count ?? 0) > 0) {
          return json(
            {
              error: `이 성분은 ${count}개 제품에 연결되어 있어 삭제할 수 없습니다. 먼저 제품에서 연결을 해제해 주세요.`,
              linkedProductCount: count,
            },
            409,
            cors,
          );
        }

        const { error } = await db.from('ingredients').delete().eq('id', id);
        if (error) throw error;
        await audit(db, actor, 'deleteIngredient', 'ingredients', id);
        return json({ ok: true }, 200, cors);
      }

      case 'ingredientUsage': {
        const id = requireUuid(body.id, '성분 ID');
        const { count, error } = await db
          .from('product_ingredients')
          .select('product_id', { count: 'exact', head: true })
          .eq('ingredient_id', id);
        if (error) throw error;
        return json({ ok: true, linkedProductCount: count ?? 0 }, 200, cors);
      }

      // ── 미매칭 성분 검수 큐 ────────────────────────────────────────────
      case 'mapUnmatchedIngredient': {
        const id = requireUuid(body.id, '큐 항목 ID');
        const ingredientId = optionalUuid(body.ingredientId ?? body.ingredient_id, '성분 ID');
        const canonicalId = optionalUuid(
          body.canonicalIngredientId ?? body.canonical_ingredient_id,
          'canonical 성분 ID',
        );
        if (!ingredientId && !canonicalId) {
          throw new ValidationError('매핑할 성분을 선택해 주세요.');
        }
        if (ingredientId) {
          const { data, error } = await db.from('ingredients').select('id').eq('id', ingredientId).maybeSingle();
          if (error) throw error;
          if (!data) throw new ValidationError('선택한 성분을 찾을 수 없습니다.');
        }

        const { error } = await db
          .from('unmatched_ingredients')
          .update({
            status: 'mapped',
            mapped_ingredient_id: ingredientId,
            mapped_canonical_ingredient_id: canonicalId,
            review_note: optionalText(body.note, '검수 메모'),
            reviewed_by: actor,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;

        await audit(db, actor, 'mapUnmatchedIngredient', 'unmatched_ingredients', id, {
          ingredientId,
          canonicalId,
        });
        return json({ ok: true }, 200, cors);
      }

      case 'ignoreUnmatchedIngredient': {
        const id = requireUuid(body.id, '큐 항목 ID');
        const { error } = await db
          .from('unmatched_ingredients')
          .update({
            status: 'ignored',
            review_note: optionalText(body.note, '검수 메모'),
            reviewed_by: actor,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        await audit(db, actor, 'ignoreUnmatchedIngredient', 'unmatched_ingredients', id);
        return json({ ok: true }, 200, cors);
      }

      case 'reopenUnmatchedIngredient': {
        const id = requireUuid(body.id, '큐 항목 ID');
        const { error } = await db
          .from('unmatched_ingredients')
          .update({
            status: 'pending',
            mapped_ingredient_id: null,
            mapped_canonical_ingredient_id: null,
            reviewed_by: actor,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (error) throw error;
        await audit(db, actor, 'reopenUnmatchedIngredient', 'unmatched_ingredients', id);
        return json({ ok: true }, 200, cors);
      }

      // ── 시스템 설정 ────────────────────────────────────────────────────
      case 'saveSettings': {
        // 허용 키 화이트리스트 + 값 크기 검증. 목록 밖 키가 있으면 전체를 거부한다.
        const entries = normalizeSettingsPayload(body.settings);

        const now = new Date().toISOString();
        for (const [key, value] of entries) {
          const { error } = await db
            .from('app_settings')
            .update({ value, updated_at: now, updated_by: actor })
            .eq('key', key);
          if (error) throw error;
        }

        await audit(db, actor, 'saveSettings', 'app_settings', null, { keys: entries.map(([k]) => k) });
        return json({ ok: true, saved: entries.length }, 200, cors);
      }

      // ── 운영 조회 (RLS 때문에 anon 으로는 볼 수 없는 것만) ───────────────
      case 'dashboardMetrics': {
        const sinceIso = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
        const last7 = sinceIso(7);
        const prev7 = sinceIso(14);

        const countOf = async (
          table: string,
          build?: (q: Db) => Db,
        ): Promise<number | null> => {
          let query = db.from(table).select('*', { count: 'exact', head: true });
          if (build) query = build(query);
          const { count, error } = await query;
          if (error) {
            console.error(`dashboard count ${table} failed:`, error.message);
            return null;
          }
          return count ?? 0;
        };

        const [
          products, ingredients, links, users, unmatchedPending,
          productsLast7, productsPrev7, usersLast7, usersPrev7,
          feedingLogsLast7,
        ] = await Promise.all([
          countOf('products'),
          countOf('ingredients'),
          countOf('product_ingredients'),
          countOf('users'),
          countOf('unmatched_ingredients', (q) => q.eq('status', 'pending')),
          countOf('products', (q) => q.gte('created_at', last7)),
          countOf('products', (q) => q.gte('created_at', prev7).lt('created_at', last7)),
          countOf('users', (q) => q.gte('created_at', last7)),
          countOf('users', (q) => q.gte('created_at', prev7).lt('created_at', last7)),
          countOf('pet_feeding_logs', (q) => q.gte('created_at', last7)),
        ]);

        const { data: recentProducts } = await db
          .from('products')
          .select('id, name, brand_name, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentIngredients } = await db
          .from('ingredients')
          .select('id, name_ko, risk_level, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        const { data: recentUnmatched } = await db
          .from('unmatched_ingredients')
          .select('id, raw_name, occurrences, last_seen_at')
          .eq('status', 'pending')
          .order('last_seen_at', { ascending: false })
          .limit(5);

        return json(
          {
            ok: true,
            metrics: {
              products, ingredients, productIngredientLinks: links, users,
              unmatchedPending, feedingLogsLast7,
              productsLast7, productsPrev7, usersLast7, usersPrev7,
            },
            recentProducts: recentProducts ?? [],
            recentIngredients: recentIngredients ?? [],
            recentUnmatched: recentUnmatched ?? [],
          },
          200,
          cors,
        );
      }

      case 'listMembers': {
        const page = clampPage(body.page);
        const pageSize = clampPageSize(body.pageSize);
        const from = (page - 1) * pageSize;

        let query = db
          .from('users')
          .select('id, nickname, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        const search = optionalText(body.query, '검색어', 100);
        if (search) {
          // ilike 패턴 메타문자는 이스케이프해서 사용자 입력이 패턴이 되지 않게 한다.
          query = query.ilike('nickname', `%${escapeLike(search)}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        // 반려동물 수는 별도 집계(사용자 목록 페이지 크기만큼만 조회)
        const ids = (data ?? []).map((r: { id: string }) => r.id);
        const petCounts = new Map<string, number>();
        if (ids.length > 0) {
          const { data: pets } = await db.from('pets').select('user_id').in('user_id', ids);
          for (const row of pets ?? []) {
            petCounts.set(row.user_id, (petCounts.get(row.user_id) ?? 0) + 1);
          }
        }

        return json(
          {
            ok: true,
            total: count ?? 0,
            members: (data ?? []).map((row: { id: string; nickname: string; created_at: string }) => ({
              id: row.id,
              nickname: row.nickname,
              createdAt: row.created_at,
              petCount: petCounts.get(row.id) ?? 0,
            })),
          },
          200,
          cors,
        );
      }

      default:
        // 허용 목록에 있으나 여기까지 온 경우는 구현 누락이므로 구분해 로그를 남긴다.
        if (ALLOWED_ACTIONS.has(action)) {
          console.error(`admin-write: action "${action}" is allowed but not implemented`);
        }
        return json({ error: '알 수 없는 action' }, 400, cors);
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message }, 400, cors);
    }
    // 내부 오류 전문은 서버 로그에만 남기고, 클라이언트에는 일반 메시지를 준다.
    console.error(`admin-write action=${action} actor=${actor} failed:`, err);
    return json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500, cors);
  }
});
