/**
 * admin-write Edge Function 의 순수 검증 로직.
 *
 * Deno 런타임 API 에 의존하지 않는 함수만 둔다 — 그래야 프론트 테스트 러너(vitest)
 * 에서 그대로 import 해 서버 검증 규칙을 회귀 테스트할 수 있다.
 */

/** 사용자에게 그대로 보여줄 수 있는 검증 오류. 내부 DB 오류와 구분한다. */
export class ValidationError extends Error {}

// 화이트리스트 — 임의 컬럼 주입 방지
export const PRODUCT_COLUMNS = [
  'name', 'brand_name', 'product_type', 'target_pet_type', 'image_url', 'min_price',
  'main_category', 'sub_category', 'target_life_stage', 'formulation',
  'product_health_concerns', 'has_risk_factors', 'manufacturer_name',
  'verification_status', 'coupang_product_id', 'coupang_link', 'barcode',
  'kcal_per_100g', 'packaging_weight_g', 'allergen_free_tags',
  'is_sponsored', 'sponsor_label', 'sponsor_order',
] as const;

export const NUTRITION_COLUMNS = [
  'crude_protein', 'crude_fat', 'crude_fiber', 'crude_ash', 'moisture', 'calcium', 'phosphorus',
] as const;

export const INGREDIENT_COLUMNS = [
  'name_ko', 'name_en', 'risk_level', 'description', 'category',
  'caution_conditions', 'allergy_triggers',
] as const;

export const RISK_LEVELS = new Set(['safe', 'caution', 'danger']);

/** app_settings 에서 관리자 콘솔이 바꿀 수 있는 키. 이 목록 밖의 키는 저장하지 않는다. */
export const SETTINGS_KEYS = new Set([
  'maintenance_mode',
  'signup_enabled',
  'viral_event_visible',
  'service_notice',
  'phase2_alias_observation_enabled',
]);

/** 인증 없이 호출할 수 없는 action 목록 — 여기 없는 action 은 거부된다. */
export const ALLOWED_ACTIONS = new Set([
  'verifyAdmin',
  'saveProduct',
  'deleteProduct',
  'saveProductIngredients',
  'uploadProductImage',
  'saveIngredient',
  'deleteIngredient',
  'ingredientUsage',
  'mapUnmatchedIngredient',
  'ignoreUnmatchedIngredient',
  'reopenUnmatchedIngredient',
  'saveSettings',
  'dashboardMetrics',
  'listMembers',
]);

export const MAX_NAME_LEN = 200;
export const MAX_TEXT_LEN = 2000;
export const MAX_ARRAY_LEN = 50;
export const MAX_INGREDIENT_LINKS = 200;
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_PAGE_SIZE = 100;

export function pick<T extends Record<string, unknown>>(
  src: T,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src && src[k] !== undefined) out[k] = src[k];
  return out;
}

export function requireText(value: unknown, label: string, max = MAX_NAME_LEN): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) throw new ValidationError(`${label}은(는) 필수입니다.`);
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

export function optionalText(value: unknown, label: string, max = MAX_TEXT_LEN): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (s.length > max) throw new ValidationError(`${label}이(가) 너무 깁니다. (최대 ${max}자)`);
  return s;
}

export function textArray(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${label}은(는) 배열이어야 합니다.`);
  if (value.length > MAX_ARRAY_LEN) {
    throw new ValidationError(`${label} 항목이 너무 많습니다. (최대 ${MAX_ARRAY_LEN}개)`);
  }
  return value
    .map((v) => String(v ?? '').trim())
    .filter(Boolean)
    .map((v) => {
      if (v.length > MAX_NAME_LEN) throw new ValidationError(`${label} 항목이 너무 깁니다.`);
      return v;
    });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function requireUuid(value: unknown, label: string): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!UUID_RE.test(s)) throw new ValidationError(`${label} 형식이 올바르지 않습니다.`);
  return s;
}

export function optionalUuid(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  return requireUuid(value, label);
}

export function clampPageSize(value: unknown, fallback = 20): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_PAGE_SIZE);
}

export function clampPage(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** 토큰에서 관리자 아이디만 추출한다(감사 로그용). 비밀번호는 저장하지 않는다. */
export function actorFromToken(token: string): string {
  try {
    const decoded = atob(token);
    const id = decoded.split(':')[0]?.trim();
    return id && id.length <= 64 ? id : 'unknown';
  } catch {
    return 'unknown';
  }
}

/** ilike 패턴 메타문자를 이스케이프해 사용자 입력이 패턴이 되지 않게 한다. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export function normalizeProductPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const product = pick(raw, PRODUCT_COLUMNS);
  product.name = requireText(product.name, '제품명');
  product.brand_name = requireText(product.brand_name, '브랜드');
  return product;
}

export function normalizeIngredientPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const ingredient = pick(raw, INGREDIENT_COLUMNS);

  ingredient.name_ko = requireText(ingredient.name_ko, '한글 성분명');
  ingredient.name_en = optionalText(ingredient.name_en, '영문 성분명', MAX_NAME_LEN);
  ingredient.description = optionalText(ingredient.description, '설명');
  ingredient.category = optionalText(ingredient.category, '성분 분류', MAX_NAME_LEN);

  const risk = typeof ingredient.risk_level === 'string' ? ingredient.risk_level.trim() : 'safe';
  if (!RISK_LEVELS.has(risk)) throw new ValidationError('위험도 값이 올바르지 않습니다.');
  ingredient.risk_level = risk;

  if ('caution_conditions' in ingredient) {
    ingredient.caution_conditions = textArray(ingredient.caution_conditions, '주의 조건');
  }
  if ('allergy_triggers' in ingredient) {
    ingredient.allergy_triggers = textArray(ingredient.allergy_triggers, '알레르기 트리거');
  }

  return ingredient;
}

export interface ProductIngredientItem {
  ingredient_id: string;
  sort_order: number;
}

/** 원재료 연결 목록 정규화 — 중복 성분과 잘못된 id 를 여기서 막는다. */
export function normalizeProductIngredientItems(rawItems: unknown): ProductIngredientItem[] {
  if (!Array.isArray(rawItems)) throw new ValidationError('원재료 목록 형식이 올바르지 않습니다.');
  if (rawItems.length > MAX_INGREDIENT_LINKS) {
    throw new ValidationError(`원재료는 최대 ${MAX_INGREDIENT_LINKS}개까지 연결할 수 있습니다.`);
  }

  const seen = new Set<string>();
  return rawItems.map((item, index) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const ingredientId = requireUuid(row.ingredient_id ?? row.ingredientId, '원재료 ID');
    if (seen.has(ingredientId)) throw new ValidationError('같은 원재료를 중복으로 연결할 수 없습니다.');
    seen.add(ingredientId);
    const order = Number(row.sort_order ?? row.sortOrder ?? index);
    return {
      ingredient_id: ingredientId,
      sort_order: Number.isFinite(order) ? Math.max(0, Math.floor(order)) : index,
    };
  });
}

/** 저장 가능한 설정만 남긴다. 허용되지 않은 키가 하나라도 있으면 전체를 거부한다. */
export function normalizeSettingsPayload(raw: unknown): [string, unknown][] {
  const settings = (raw ?? {}) as Record<string, unknown>;
  const entries = Object.entries(settings);
  if (entries.length === 0) throw new ValidationError('저장할 설정이 없습니다.');
  if (entries.length > SETTINGS_KEYS.size) throw new ValidationError('설정 항목이 너무 많습니다.');

  const rejected = entries.filter(([key]) => !SETTINGS_KEYS.has(key)).map(([key]) => key);
  if (rejected.length > 0) {
    throw new ValidationError(`허용되지 않은 설정 키입니다: ${rejected.join(', ')}`);
  }

  for (const [key, value] of entries) {
    if (JSON.stringify(value ?? null).length > 4000) {
      throw new ValidationError(`설정 값이 너무 큽니다: ${key}`);
    }
  }
  return entries;
}

// ── 이미지 검증 ─────────────────────────────────────────────────────────────

const IMAGE_SIGNATURES: { mime: string; ext: string; test: (b: Uint8Array) => boolean }[] = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

/** 확장자·Content-Type 을 믿지 않고 매직 바이트로 실제 포맷을 판별한다. */
export function detectImage(bytes: Uint8Array): { mime: string; ext: string } {
  if (bytes.length < 12) throw new ValidationError('이미지 파일이 올바르지 않습니다.');
  const hit = IMAGE_SIGNATURES.find((sig) => sig.test(bytes));
  if (!hit) throw new ValidationError('JPG, PNG, WebP 이미지만 업로드할 수 있습니다.');
  return { mime: hit.mime, ext: hit.ext };
}

export function decodeBase64(input: unknown): Uint8Array {
  if (typeof input !== 'string' || !input) throw new ValidationError('이미지 데이터가 없습니다.');
  // data URL 접두사가 있으면 제거
  const raw = input.includes(',') ? input.slice(input.indexOf(',') + 1) : input;
  let binary: string;
  try {
    binary = atob(raw);
  } catch {
    throw new ValidationError('이미지 데이터를 읽을 수 없습니다.');
  }
  if (binary.length > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `이미지 용량이 너무 큽니다. (최대 ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB)`,
    );
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
