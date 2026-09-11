import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  ALLOWED_ACTIONS,
  MAX_PAGE_SIZE,
  SETTINGS_KEYS,
  ValidationError,
  actorFromToken,
  clampPage,
  clampPageSize,
  decodeBase64,
  detectImage,
  escapeLike,
  normalizeIngredientPayload,
  normalizeNutritionPayload,
  normalizeProductIngredientItems,
  normalizeProductPayload,
  normalizeSettingsPayload,
  optionalText,
  optionalUuid,
  requireUuid,
} from './validation.ts';

/**
 * 관리자 콘솔이 아닌 출처에서 이 함수를 브라우저로 호출하지 못하게 한다.
 *
 * 이전에는 `CORS_ALLOWED_ORIGINS` 가 비어 있으면 `*` 를 돌려줬다. 이 함수는
 * service_role 로 쓰기를 수행하는 관리자 전용 엔드포인트이므로 기본값이
 * "아무 사이트나 허용"이어서는 안 된다(토큰 검증은 별도로 하지만, CORS 는
 * 브라우저에서의 오용을 막는 1차 방어선이다).
 *
 * 그래서 시크릿이 설정돼 있지 않아도 안전하도록 알려진 운영 출처를 기본 허용
 * 목록으로 둔다. `CORS_ALLOWED_ORIGINS`(쉼표 구분)가 설정되면 그 값이 우선한다
 * — 도메인이 바뀌어도 재배포 없이 교체할 수 있다.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'https://veroro-admin.netlify.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

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
  // 목록에 없는 출처에는 허용 목록의 첫 항목을 돌려준다 → 브라우저가 불일치로 차단한다.
  return { ...base, 'Access-Control-Allow-Origin': allowed[0] };
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
  '0a6a2e1f8723c72cf8e729d3ea6af059f6c6d3035b589eaf7e53f7a9f10e3f7d',
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

const SAVED_PRODUCT_COLUMNS =
  'id, name, brand_name, main_category, sub_category, target_pet_type, verification_status';

interface AuthUserRecord {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  is_anonymous?: boolean;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  identities?: Array<{
    id?: string;
    identity_id?: string;
    provider?: string;
    identity_data?: Record<string, unknown>;
  }>;
}

interface PublicUserProfile {
  id: string;
  nickname: string | null;
  created_at: string | null;
}

/**
 * 회원 목록의 원본은 public.users가 아니라 Supabase Auth다.
 *
 * 프로필 트리거가 생기기 전에 가입했거나 트리거가 일시 실패한 계정은
 * auth.users에는 존재하지만 public.users에는 없을 수 있다. 관리자 콘솔에서
 * 이런 실제 가입자를 놓치지 않도록 Auth Admin API를 끝까지 페이지 조회한다.
 */
async function listRegisteredAuthUsers(db: Db): Promise<AuthUserRecord[]> {
  const users: AuthUserRecord[] = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const batch = (data?.users ?? []) as AuthUserRecord[];
    users.push(...batch);

    const total = Number(data?.total ?? 0);
    if (batch.length < perPage || (total > 0 && users.length >= total)) break;
    if (page === 100) throw new Error('회원 수가 관리자 조회 한도를 초과했습니다.');
  }

  return users.filter((user) => {
    const provider = typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : '';
    return !user.is_anonymous && provider !== 'anonymous';
  });
}

async function loadPublicUserProfiles(db: Db, ids: string[]): Promise<Map<string, PublicUserProfile>> {
  const profiles = new Map<string, PublicUserProfile>();
  const chunkSize = 200;

  for (let offset = 0; offset < ids.length; offset += chunkSize) {
    const chunk = ids.slice(offset, offset + chunkSize);
    const { data, error } = await db
      .from('users')
      .select('id, nickname, created_at')
      .in('id', chunk);
    if (error) throw error;
    for (const profile of (data ?? []) as PublicUserProfile[]) profiles.set(profile.id, profile);
  }

  return profiles;
}

function authProvider(user: AuthUserRecord): string {
  const provider = user.app_metadata?.provider;
  if (typeof provider === 'string' && provider.trim()) return provider;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && typeof providers[0] === 'string') return providers[0];
  return 'email';
}

function memberNickname(user: AuthUserRecord, profile?: PublicUserProfile): string {
  const metadata = user.user_metadata ?? {};
  const candidates = [
    profile?.nickname,
    metadata.nickname,
    metadata.name,
    metadata.full_name,
    user.email?.split('@')[0],
  ];
  const found = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof found === 'string' ? found.trim() : '이름 없음';
}

function memberLoginId(user: AuthUserRecord): { loginId: string; loginIdKind: string } {
  if (user.email?.trim()) return { loginId: user.email.trim(), loginIdKind: 'email' };
  if (user.phone?.trim()) return { loginId: user.phone.trim(), loginIdKind: 'phone' };

  const identity = user.identities?.find((item) => item.provider && item.provider !== 'email');
  const identityEmail = identity?.identity_data?.email;
  if (typeof identityEmail === 'string' && identityEmail.trim()) {
    return { loginId: identityEmail.trim(), loginIdKind: 'email' };
  }

  const provider = identity?.provider ?? authProvider(user);
  const providerId = identity?.identity_data?.sub ?? identity?.identity_id ?? identity?.id;
  if ((typeof providerId === 'string' || typeof providerId === 'number') && String(providerId).trim()) {
    return { loginId: `${provider}:${String(providerId).trim()}`, loginIdKind: 'provider' };
  }

  return { loginId: user.id, loginIdKind: 'internal' };
}

function toAdminMember(user: AuthUserRecord, profile?: PublicUserProfile) {
  const login = memberLoginId(user);
  return {
    id: user.id,
    email: user.email ?? null,
    ...login,
    nickname: memberNickname(user, profile),
    provider: authProvider(user),
    profileMissing: !profile,
    emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at ?? profile?.created_at ?? '',
  };
}

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
        let previousName: string | null = null;
        if (productId) {
          const { data: existing, error: findErr } = await db
            .from('products').select('id, name').eq('id', productId).maybeSingle();
          if (findErr) throw findErr;
          if (!existing) throw new ValidationError('수정할 제품을 찾을 수 없습니다.');
          previousName = typeof existing.name === 'string' ? existing.name : null;
          const { data: updated, error } = await db
            .from('products')
            .update(product)
            .eq('id', productId)
            .select(SAVED_PRODUCT_COLUMNS)
            .single();
          if (error) throw error;
          if (!updated || updated.name !== product.name || updated.brand_name !== product.brand_name) {
            throw new Error('제품 수정 결과가 요청한 제품명/브랜드와 일치하지 않습니다.');
          }
        } else {
          const { data, error } = await db
            .from('products')
            .insert([product])
            .select(SAVED_PRODUCT_COLUMNS)
            .single();
          if (error) throw error;
          productId = data?.id ?? null;
          if (!data || data.name !== product.name || data.brand_name !== product.brand_name) {
            throw new Error('제품 등록 결과가 요청한 제품명/브랜드와 일치하지 않습니다.');
          }
        }
        if (!productId) throw new Error('제품 ID를 확인할 수 없습니다.');

        // 보장성분(선택) — 값이 있을 때만 upsert
        const nutrition = body.nutrition
          ? normalizeNutritionPayload(body.nutrition as Record<string, unknown>)
          : null;
        if (nutrition && Object.keys(nutrition).length > 0) {
          const { error: npErr } = await db
            .from('nutritional_profiles')
            .upsert({ product_id: productId, ...nutrition }, { onConflict: 'product_id' });
          if (npErr) throw npErr;
        }

        // 원재료 연결(선택) — 연결 목록 자체는 RPC 한 트랜잭션으로 교체
        let ingredientCount: number | null = null;
        if (body.ingredients !== undefined) {
          ingredientCount = await replaceProductIngredients(db, productId, body.ingredients);
        }

        // 모든 부가 저장이 끝난 뒤 최종 행을 다시 읽어 응답과 감사 로그의 근거로 쓴다.
        const { data: confirmedProduct, error: confirmErr } = await db
          .from('products')
          .select(SAVED_PRODUCT_COLUMNS)
          .eq('id', productId)
          .single();
        if (confirmErr) throw confirmErr;
        if (
          !confirmedProduct ||
          confirmedProduct.name !== product.name ||
          confirmedProduct.brand_name !== product.brand_name
        ) {
          throw new Error('저장 후 제품 조회 결과가 요청한 값과 일치하지 않습니다.');
        }

        await audit(db, actor, 'saveProduct', 'products', productId, {
          previousName,
          name: confirmedProduct.name,
          ingredientCount,
        });
        return json({ ok: true, id: productId, ingredientCount, product: confirmedProduct }, 200, cors);
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
      case 'getSettings': {
        // 관리자 화면은 공개 RLS 상태와 무관하게 현재 저장값을 정확히 읽어야 한다.
        const { data, error } = await db
          .from('app_settings')
          .select('key, value, description, updated_at, updated_by')
          .in('key', [...SETTINGS_KEYS])
          .order('key', { ascending: true });
        if (error) throw error;
        return json({ ok: true, settings: data ?? [] }, 200, cors);
      }

      case 'saveSettings': {
        // 허용 키 화이트리스트 + 값 크기 검증. 목록 밖 키가 있으면 전체를 거부한다.
        const entries = normalizeSettingsPayload(body.settings);

        const now = new Date().toISOString();
        const rows = entries.map(([key, value]) => ({
          key,
          value,
          is_public: true,
          updated_at: now,
          updated_by: actor,
        }));
        // UPDATE만 쓰면 행이 누락된 환경에서 0건이 바뀌어도 성공으로 보인다.
        // UPSERT 후 반환 행 수까지 확인해 관리자에게 거짓 성공을 보여주지 않는다.
        const { data, error } = await db
          .from('app_settings')
          .upsert(rows, { onConflict: 'key' })
          .select('key');
        if (error) throw error;
        if ((data ?? []).length !== entries.length) {
          throw new Error('설정 저장 결과를 확인할 수 없습니다. 다시 시도해 주세요.');
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

        const authUsersPromise = listRegisteredAuthUsers(db).catch((error: Error) => {
          console.error('dashboard auth users failed:', error.message);
          return null;
        });

        const [
          products, ingredients, links, pets, unmatchedPending,
          productsLast7, productsPrev7, feedingLogsLast7, authUsers,
        ] = await Promise.all([
          countOf('products'),
          countOf('ingredients'),
          countOf('product_ingredients'),
          countOf('pets'),
          countOf('unmatched_ingredients', (q) => q.eq('status', 'pending')),
          countOf('products', (q) => q.gte('created_at', last7)),
          countOf('products', (q) => q.gte('created_at', prev7).lt('created_at', last7)),
          countOf('pet_feeding_logs', (q) => q.gte('created_at', last7)),
          authUsersPromise,
        ]);

        const joinedAt = (user: AuthUserRecord) => new Date(user.created_at ?? 0).getTime();
        const users = authUsers?.length ?? null;
        const usersLast7 = authUsers?.filter((user) => joinedAt(user) >= new Date(last7).getTime()).length ?? null;
        const usersPrev7 = authUsers?.filter((user) => {
          const joined = joinedAt(user);
          return joined >= new Date(prev7).getTime() && joined < new Date(last7).getTime();
        }).length ?? null;

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
              products, ingredients, productIngredientLinks: links, users, pets,
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
        const search = optionalText(body.query, '검색어', 100);

        const authUsers = await listRegisteredAuthUsers(db);
        const profileMap = await loadPublicUserProfiles(db, authUsers.map((user) => user.id));
        const normalizedSearch = search?.toLocaleLowerCase('ko-KR') ?? '';
        const members = authUsers
          .map((user) => toAdminMember(user, profileMap.get(user.id)))
          .filter((member) => {
            if (!normalizedSearch) return true;
            return member.nickname.toLocaleLowerCase('ko-KR').includes(normalizedSearch)
              || member.loginId.toLocaleLowerCase('en-US').includes(normalizedSearch);
          })
          .sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));
        const data = members.slice(from, from + pageSize);

        // 반려동물 수는 별도 집계(사용자 목록 페이지 크기만큼만 조회)
        const ids = data.map((row) => row.id);
        const petCounts = new Map<string, number>();
        if (ids.length > 0) {
          const { data: pets, error: petsError } = await db.from('pets').select('user_id').in('user_id', ids);
          if (petsError) throw petsError;
          for (const row of pets ?? []) {
            petCounts.set(row.user_id, (petCounts.get(row.user_id) ?? 0) + 1);
          }
        }

        return json(
          {
            ok: true,
            total: members.length,
            members: data.map((row) => ({
              ...row,
              petCount: petCounts.get(row.id) ?? 0,
            })),
          },
          200,
          cors,
        );
      }

      case 'getMemberDetail': {
        const id = requireUuid(body.id, '회원 ID');
        const [authResult, { data: profile, error: profileError }, { data: pets, error: petsError }, diaryResult] =
          await Promise.all([
            db.auth.admin.getUserById(id),
            db.from('users').select('id, nickname, created_at').eq('id', id).maybeSingle(),
            db
              .from('pets')
              .select('id, name, pet_type, age_group, breed, weight, allergies, conditions')
              .eq('user_id', id)
              .order('created_at', { ascending: true }),
            db
              .from('pet_feeding_logs')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', id),
          ]);
        if (authResult.error) throw authResult.error;
        if (profileError) throw profileError;
        if (petsError) throw petsError;
        if (diaryResult.error) throw diaryResult.error;
        const authUser = authResult.data?.user as AuthUserRecord | undefined;
        if (!authUser) throw new ValidationError('회원을 찾을 수 없습니다.');
        const member = toAdminMember(authUser, (profile ?? undefined) as PublicUserProfile | undefined);

        return json(
          {
            ok: true,
            ...member,
            petCount: (pets ?? []).length,
            diaryCount: diaryResult.count ?? 0,
            pets: (pets ?? []).map((pet: Record<string, unknown>) => ({
              id: pet.id,
              name: pet.name,
              petType: pet.pet_type,
              ageGroup: pet.age_group,
              breed: pet.breed ?? null,
              weight: pet.weight === null || pet.weight === undefined ? null : Number(pet.weight),
              allergies: Array.isArray(pet.allergies) ? pet.allergies : [],
              conditions: Array.isArray(pet.conditions) ? pet.conditions : [],
            })),
          },
          200,
          cors,
        );
      }

      case 'listFeedingLogs': {
        const page = clampPage(body.page);
        const pageSize = clampPageSize(body.pageSize);
        const from = (page - 1) * pageSize;
        const petType = optionalText(body.petType, '대상 동물', 10);
        if (petType && petType !== 'dog' && petType !== 'cat') {
          throw new ValidationError('대상 동물 필터가 올바르지 않습니다.');
        }

        const parseDate = (value: unknown, label: string): string | null => {
          const date = optionalText(value, label, 10);
          if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
          }
          return date;
        };
        const dateFrom = parseDate(body.dateFrom, '시작일');
        const dateTo = parseDate(body.dateTo, '종료일');

        let query = db
          .from('pet_feeding_logs')
          .select(
            `id, feeding_date, feeding_time, amount, unit, preference_level, image_url, memo,
             custom_product_name, created_at,
             users (nickname), pets!inner (name, pet_type), products (name, brand_name)`,
            { count: 'exact' },
          )
          .order('feeding_date', { ascending: false })
          .order('feeding_time', { ascending: false, nullsFirst: false })
          .range(from, from + pageSize - 1);

        if (dateFrom) query = query.gte('feeding_date', dateFrom);
        if (dateTo) query = query.lte('feeding_date', dateTo);
        if (petType) query = query.eq('pets.pet_type', petType);
        if (body.hasPhoto === true) query = query.not('image_url', 'is', null).neq('image_url', '');
        if (body.hasPhoto === false) query = query.is('image_url', null);

        const rawSearch = optionalText(body.query, '검색어', 100);
        if (rawSearch) {
          // PostgREST or() 구문의 구분자를 검색어에서 제거한다.
          const search = rawSearch.replace(/[(),]/g, ' ').trim();
          const like = `%${escapeLike(search)}%`;
          const [{ data: members }, { data: pets }, { data: products }] = await Promise.all([
            db.from('users').select('id').ilike('nickname', like).limit(100),
            db.from('pets').select('id').ilike('name', like).limit(100),
            db.from('products').select('id').or(`name.ilike.${like},brand_name.ilike.${like}`).limit(100),
          ]);
          const filters = [
            `memo.ilike.${like}`,
            `custom_product_name.ilike.${like}`,
            ...((members ?? []).map((row: { id: string }) => `user_id.eq.${row.id}`)),
            ...((pets ?? []).map((row: { id: string }) => `pet_id.eq.${row.id}`)),
            ...((products ?? []).map((row: { id: string }) => `product_id.eq.${row.id}`)),
          ];
          query = query.or(filters.join(','));
        }

        const { data, count, error } = await query;
        if (error) throw error;
        const one = (value: unknown): Record<string, unknown> | null =>
          Array.isArray(value)
            ? ((value[0] as Record<string, unknown> | undefined) ?? null)
            : ((value as Record<string, unknown> | null) ?? null);

        return json(
          {
            ok: true,
            total: count ?? 0,
            logs: (data ?? []).map((row: Record<string, unknown>) => {
              const member = one(row.users);
              const pet = one(row.pets);
              const product = one(row.products);
              return {
                id: row.id,
                feedingDate: row.feeding_date,
                feedingTime: row.feeding_time ?? null,
                memberNickname: member?.nickname ?? '탈퇴 회원',
                petName: pet?.name ?? '삭제된 반려동물',
                petType: pet?.pet_type ?? 'dog',
                productName: product?.name ?? row.custom_product_name ?? '제품 정보 없음',
                amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
                unit: row.unit ?? null,
                preferenceLevel: row.preference_level ?? null,
                imageUrl: row.image_url ?? null,
                memo: row.memo ?? null,
                createdAt: row.created_at,
              };
            }),
          },
          200,
          cors,
        );
      }

      case 'listWaitlist': {
        const page = clampPage(body.page);
        const pageSize = clampPageSize(body.pageSize);
        const from = (page - 1) * pageSize;
        let query = db
          .from('launch_waitlist')
          .select('id, email, phone, source, marketing_consent, privacy_consent, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);

        const search = optionalText(body.query, '검색어', 100);
        if (search) query = query.ilike('email', `%${escapeLike(search)}%`);
        const source = optionalText(body.source, '유입 경로', 100);
        if (source) query = query.eq('source', source);
        if (typeof body.marketingConsent === 'boolean') {
          query = query.eq('marketing_consent', body.marketingConsent);
        }

        const { data, count, error } = await query;
        if (error) throw error;
        return json(
          {
            ok: true,
            total: count ?? 0,
            entries: (data ?? []).map((row: Record<string, unknown>) => ({
              id: row.id,
              email: row.email,
              phone: row.phone ?? null,
              source: row.source,
              marketingConsent: Boolean(row.marketing_consent),
              privacyConsent: Boolean(row.privacy_consent),
              createdAt: row.created_at,
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

    // 외래 키 위반(23503)은 운영자가 바로 조치할 수 있는 상황이다.
    // 일반 500 문구로 뭉개면 "왜 삭제가 안 되는지" 알 수 없어 재시도만 반복하게 된다.
    const code = (err as { code?: string } | null)?.code;
    if (code === '23503') {
      console.error(`admin-write action=${action} actor=${actor} FK violation:`, err);
      return json(
        {
          error:
            '이 항목을 참조하는 데이터가 남아 있어 삭제할 수 없습니다. 연결된 제품·성분·리뷰를 먼저 정리해 주세요.',
        },
        409,
        cors,
      );
    }

    // 내부 오류 전문은 서버 로그에만 남기고, 클라이언트에는 일반 메시지를 준다.
    console.error(`admin-write action=${action} actor=${actor} failed:`, err);
    return json({ error: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500, cors);
  }
});
