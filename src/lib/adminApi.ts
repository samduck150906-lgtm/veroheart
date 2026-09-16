/**
 * 관리자 콘솔 전용 API 계층.
 *
 * 쓰기 규칙: 관리자 쓰기는 **절대** anon Supabase 클라이언트로 직접 하지 않는다.
 *   관리자 화면 → adminWrite(x-admin-token) → admin-write Edge Function(service_role) → DB
 * 읽기 규칙: 공개 SELECT 정책이 있는 테이블(products / ingredients /
 *   unmatched_ingredients)만 anon 으로 읽고, RLS 로 막힌 데이터
 *   (회원 목록 등)는 Edge Function 조회 action 을 쓴다.
 */
import { supabase, adminWrite, callAdminFunction } from './supabase';
import { toOrIlikePattern } from './postgrestPattern';

// ─── 공통 타입 ───────────────────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface AdminIngredient {
  id: string;
  created_at?: string | null;
  name_ko: string;
  name_en: string | null;
  risk_level: RiskLevel;
  description: string | null;
  category: string | null;
  aliases?: string[] | null;
  nutrition_tags?: string[] | null;
  caution_conditions?: string[] | null;
  allergy_triggers?: string[] | null;
  moisture_pct?: number | null;
  crude_protein_pct?: number | null;
  crude_fat_pct?: number | null;
  crude_ash_pct?: number | null;
  crude_fiber_pct?: number | null;
  nutrition_source?: string | null;
}

export interface AdminIngredientInput {
  id?: string;
  name_ko: string;
  name_en?: string | null;
  risk_level: RiskLevel;
  description?: string | null;
  category?: string | null;
  aliases?: string[];
  nutrition_tags?: string[];
  caution_conditions?: string[];
  allergy_triggers?: string[];
  moisture_pct?: number | null;
  crude_protein_pct?: number | null;
  crude_fat_pct?: number | null;
  crude_ash_pct?: number | null;
  crude_fiber_pct?: number | null;
  nutrition_source?: string | null;
}

export interface AdminProductRow {
  id: string;
  name: string;
  brand_name: string;
  main_category: string | null;
  sub_category: string | null;
  target_pet_type: string | null;
  target_life_stage: string[] | null;
  image_url: string | null;
  min_price: number | null;
  barcode?: string | null;
  verification_status?: 'pending' | 'reviewed' | 'verified' | null;
  is_visible: boolean;
  is_pinned: boolean;
  pinned_order: number;
  ingredientCount?: number;
  nutritionCount?: number;
  created_at: string | null;
}

export interface ProductIngredientLink {
  ingredientId: string;
  nameKo: string;
  nameEn: string | null;
  riskLevel: RiskLevel;
  sortOrder: number;
}

export type UnmatchedStatus = 'pending' | 'mapped' | 'resolved' | 'ignored';

export interface UnmatchedIngredientRow {
  id: string;
  raw_name: string;
  normalized_name: string;
  occurrences: number;
  status: UnmatchedStatus;
  created_at: string;
  last_seen_at: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  mapped_ingredient_id: string | null;
  sample_product_id: string | null;
}

export interface DashboardMetrics {
  products: number | null;
  ingredients: number | null;
  productIngredientLinks: number | null;
  users: number | null;
  pets: number | null;
  unmatchedPending: number | null;
  feedingLogsLast7: number | null;
  productsLast7: number | null;
  productsPrev7: number | null;
  usersLast7: number | null;
  usersPrev7: number | null;
  verifiedProducts: number | null;
  productsWithoutIngredients: number | null;
  productsWithoutNutrition: number | null;
  productsWithoutBarcode: number | null;
  dataQualityIssues: number | null;
}

export interface DashboardPayload {
  metrics: DashboardMetrics;
  recentProducts: { id: string; name: string; brand_name: string; created_at: string }[];
  recentIngredients: { id: string; name_ko: string; risk_level: RiskLevel; created_at: string }[];
  recentUnmatched: { id: string; raw_name: string; occurrences: number; last_seen_at: string }[];
}

export interface AdminMember {
  id: string;
  email: string | null;
  loginId: string;
  loginIdKind: string;
  nickname: string;
  provider: string;
  profileMissing: boolean;
  emailConfirmed: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  petCount: number;
  /** 급여 일지 기록 수 — 실제로 앱을 쓰고 있는 회원인지 판단하는 지표. */
  diaryCount: number;
  /** 작성한 리뷰 수. */
  reviewCount: number;
}

export interface AdminMemberPet {
  id: string;
  name: string;
  petType: 'dog' | 'cat';
  ageGroup: 'baby' | 'adult' | 'senior';
  breed: string | null;
  weight: number | null;
  allergies: string[];
  conditions: string[];
}

export interface AdminMemberDetail extends AdminMember {
  pets: AdminMemberPet[];
}

export type MealPeriod = 'morning' | 'lunch' | 'dinner' | 'snack';

export interface AdminDiaryRow {
  id: string;
  feedingDate: string;
  feedingTime: string | null;
  /** 앱 입력 화면의 아침·점심·저녁·간식 구분. 값이 없는 과거 기록도 있다. */
  mealPeriod: MealPeriod | string | null;
  memberNickname: string;
  petName: string;
  petType: 'dog' | 'cat';
  productName: string;
  amount: number | null;
  unit: string | null;
  preferenceLevel: number | null;
  imageUrl: string | null;
  memo: string | null;
  /** 앱의 '특이사항' 칸. 배변·구토 등 급여 후 반응을 적는다. */
  reactionNote: string | null;
  createdAt: string;
}

export interface DiaryListParams {
  page: number;
  pageSize: number;
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  petType?: 'dog' | 'cat' | '';
  hasPhoto?: boolean | null;
}

export interface AdminWaitlistRow {
  id: string;
  email: string;
  phone: string | null;
  source: string;
  marketingConsent: boolean;
  privacyConsent: boolean;
  createdAt: string;
}

export interface WaitlistListParams {
  page: number;
  pageSize: number;
  query?: string;
  source?: string;
  marketingConsent?: boolean | null;
}

export interface Paged<T> {
  rows: T[];
  total: number;
}

/** app_settings 중 관리자 콘솔이 제어하는 키 — Edge Function 화이트리스트와 반드시 일치해야 한다. */
export const SETTING_KEYS = [
  'maintenance_mode',
  'signup_enabled',
  'viral_event_visible',
  'service_notice',
  'phase2_alias_observation_enabled',
  'hide_unverified_products',
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type SettingsMap = Partial<Record<SettingKey, unknown>>;

// ─── 성분 ────────────────────────────────────────────────────────────────────

const INGREDIENT_CORE_COLUMNS =
  'id, created_at, name_ko, name_en, risk_level, description, category, caution_conditions, allergy_triggers';
const INGREDIENT_ENRICHED_COLUMNS =
  `${INGREDIENT_CORE_COLUMNS}, aliases, nutrition_tags, moisture_pct, crude_protein_pct, crude_fat_pct, crude_ash_pct, crude_fiber_pct, nutrition_source`;
const NUTRITION_VALUE_KEYS = [
  'moisture_pct',
  'crude_protein_pct',
  'crude_fat_pct',
  'crude_ash_pct',
  'crude_fiber_pct',
] as const;

function isMissingIngredientNutritionSchema(error: unknown): boolean {
  const value = error as { code?: string; message?: string } | null;
  return Boolean(
    value &&
    (value.code === '42703' || value.code === 'PGRST204') &&
    /aliases|nutrition_tags|moisture_pct|crude_(protein|fat|ash|fiber)_pct|nutrition_source/i.test(value.message ?? ''),
  );
}

export type EnrichmentStatus =
  | 'pending'
  | 'in_progress'
  | 'needs_variant'
  | 'ready_for_review'
  | 'completed'
  | 'blocked';

export interface EnrichmentQueueRow {
  product_id: string;
  status: EnrichmentStatus;
  missing_fields: string[];
  review_note: string | null;
  reviewed_at: string | null;
  updated_at: string;
  products: {
    id: string;
    name: string;
    brand_name: string;
    target_pet_type: string | null;
    main_category: string | null;
    image_url: string | null;
    barcode: string | null;
    verification_status: string | null;
  };
  source_count: number;
}

export async function fetchEnrichmentQueue(input: {
  page: number;
  pageSize: number;
  status?: string;
  missingField?: string;
}): Promise<Paged<EnrichmentQueueRow>> {
  const response = await adminWrite<{ rows: EnrichmentQueueRow[]; total: number }>(
    'listEnrichmentQueue',
    input,
  );
  return { rows: response.rows ?? [], total: response.total ?? 0 };
}

export async function saveProductSource(input: {
  productId: string;
  sourceUrl: string;
  sourceTitle?: string;
  sourceType: string;
  confidence: string;
  fieldsVerified: string[];
  rawIngredientText?: string;
  notes?: string;
}): Promise<void> {
  await adminWrite('saveProductSource', input);
}

export async function updateEnrichmentStatus(input: {
  productId: string;
  status: EnrichmentStatus;
  note?: string;
}): Promise<void> {
  await adminWrite('updateEnrichmentStatus', input);
}

function ingredientWithDefaults(row: Record<string, unknown>): AdminIngredient {
  return {
    ...(row as unknown as AdminIngredient),
    aliases: (row.aliases as string[] | null | undefined) ?? [],
    nutrition_tags: (row.nutrition_tags as string[] | null | undefined) ?? [],
    moisture_pct: (row.moisture_pct as number | null | undefined) ?? null,
    crude_protein_pct: (row.crude_protein_pct as number | null | undefined) ?? null,
    crude_fat_pct: (row.crude_fat_pct as number | null | undefined) ?? null,
    crude_ash_pct: (row.crude_ash_pct as number | null | undefined) ?? null,
    crude_fiber_pct: (row.crude_fiber_pct as number | null | undefined) ?? null,
    nutrition_source: (row.nutrition_source as string | null | undefined) ?? null,
  };
}

export async function fetchIngredients(): Promise<AdminIngredient[]> {
  const enriched = await supabase
    .from('ingredients')
    .select(INGREDIENT_ENRICHED_COLUMNS)
    .order('name_ko', { ascending: true });
  if (enriched.error && isMissingIngredientNutritionSchema(enriched.error)) {
    const fallback = await supabase
      .from('ingredients')
      .select(INGREDIENT_CORE_COLUMNS)
      .order('name_ko', { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message);
    return (fallback.data ?? []).map((row) => ingredientWithDefaults(row as Record<string, unknown>));
  }
  if (enriched.error) throw new Error(enriched.error.message);
  return (enriched.data ?? []).map((row) => ingredientWithDefaults(row as Record<string, unknown>));
}

/** 원재료 편집기용 성분 검색 (한글/영문). */
export async function searchIngredients(query: string, limit = 20): Promise<AdminIngredient[]> {
  const q = query.trim();
  const run = (columns: string) => {
    let builder = supabase
      .from('ingredients')
      .select(columns)
      .order('name_ko', { ascending: true })
      .limit(limit);
    if (q) {
      const pattern = toOrIlikePattern(q);
      builder = builder.or(`name_ko.ilike.${pattern},name_en.ilike.${pattern}`);
    }
    return builder;
  };
  const enriched = await run(INGREDIENT_ENRICHED_COLUMNS);
  if (enriched.error && isMissingIngredientNutritionSchema(enriched.error)) {
    const fallback = await run(INGREDIENT_CORE_COLUMNS);
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data ?? []) as unknown as Record<string, unknown>[]).map(ingredientWithDefaults);
  }
  if (enriched.error) throw new Error(enriched.error.message);
  return ((enriched.data ?? []) as unknown as Record<string, unknown>[]).map(ingredientWithDefaults);
}

export async function saveIngredient(input: AdminIngredientInput): Promise<{ id: string; ingredient: AdminIngredient }> {
  const response = await adminWrite<{ id?: string }>('saveIngredient', { ingredient: input });
  if (!response.id) throw new Error('저장된 성분 ID를 받지 못했습니다.');

  let confirmation = await supabase
    .from('ingredients')
    .select(INGREDIENT_ENRICHED_COLUMNS)
    .eq('id', response.id)
    .single();
  if (confirmation.error && isMissingIngredientNutritionSchema(confirmation.error)) {
    confirmation = await supabase
      .from('ingredients')
      .select(INGREDIENT_CORE_COLUMNS)
      .eq('id', response.id)
      .single() as typeof confirmation;
  }
  if (confirmation.error) throw new Error(`저장 후 성분 조회 확인 실패: ${confirmation.error.message}`);

  const confirmed = confirmation.data
    ? ingredientWithDefaults(confirmation.data as Record<string, unknown>)
    : null;
  const text = (value: string | null | undefined) => value?.trim() || null;
  const terms = (value: string[] | null | undefined) => (value ?? []).map((item) => item.trim()).filter(Boolean);
  const numeric = (value: number | null | undefined) => value === null || value === undefined ? null : Number(value);
  const mismatch = !confirmed ||
    confirmed.name_ko !== input.name_ko.trim() ||
    confirmed.risk_level !== input.risk_level ||
    ('name_en' in input && text(confirmed.name_en) !== text(input.name_en)) ||
    ('description' in input && text(confirmed.description) !== text(input.description)) ||
    ('category' in input && text(confirmed.category) !== text(input.category)) ||
    ('nutrition_source' in input && text(confirmed.nutrition_source) !== text(input.nutrition_source)) ||
    ('aliases' in input && JSON.stringify(terms(confirmed.aliases)) !== JSON.stringify(terms(input.aliases))) ||
    ('nutrition_tags' in input && JSON.stringify(terms(confirmed.nutrition_tags)) !== JSON.stringify(terms(input.nutrition_tags))) ||
    ('caution_conditions' in input && JSON.stringify(terms(confirmed.caution_conditions)) !== JSON.stringify(terms(input.caution_conditions))) ||
    ('allergy_triggers' in input && JSON.stringify(terms(confirmed.allergy_triggers)) !== JSON.stringify(terms(input.allergy_triggers))) ||
    NUTRITION_VALUE_KEYS.some((key) => key in input && numeric(confirmed[key]) !== numeric(input[key]));
  if (mismatch) {
    throw new Error('저장 확인 불일치: 요청한 성분 정보가 운영 DB에 모두 반영되지 않았습니다. DB 마이그레이션과 Edge Function 배포 상태를 확인해 주세요.');
  }
  return { id: response.id, ingredient: confirmed };
}

export async function deleteIngredient(id: string): Promise<void> {
  await adminWrite('deleteIngredient', { id });
}

export async function getIngredientUsage(id: string): Promise<number> {
  const res = await adminWrite<{ linkedProductCount: number }>('ingredientUsage', { id });
  return res.linkedProductCount ?? 0;
}

// ─── 제품 ────────────────────────────────────────────────────────────────────

export interface ProductListParams {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  petType?: string;
  verificationStatus?: string;
  visibility?: 'visible' | 'hidden' | '전체';
}

const ADMIN_PRODUCT_COLUMNS =
  'id, name, brand_name, main_category, sub_category, target_pet_type, target_life_stage, image_url, min_price, barcode, verification_status, created_at, product_ingredients(count), nutritional_profiles(count)';
/** 마이그레이션이 적용된 DB 에서만 붙는 운영 컬럼. */
const ADMIN_PRODUCT_OPERATION_COLUMNS = 'is_visible, is_pinned, pinned_order';

/**
 * 노출·상단고정 컬럼이 아직 없는 DB인지.
 *
 * Git 연동 프런트가 DB 마이그레이션보다 먼저 배포돼도 관리자 목록은 살아 있어야
 * 한다. 두 기능 모두 같은 방식(컬럼 없으면 기본값으로 축소)으로 처리한다.
 */
function isMissingVisibilityColumn(error: unknown): boolean {
  const value = error as { code?: string; message?: string } | null;
  return Boolean(
    value &&
    (value.code === '42703' || value.code === 'PGRST204') &&
    /is_visible|is_pinned|pinned_order/.test(value.message ?? ''),
  );
}

/**
 * 서버 페이지네이션 제품 목록.
 * 목록 렌더에 필요한 컬럼만 select 한다(전건 `select('*')` 금지).
 */
export async function fetchProductsPage({
  page,
  pageSize,
  search,
  category,
  petType,
  verificationStatus,
  visibility,
}: ProductListParams): Promise<Paged<AdminProductRow>> {
  const from = Math.max(0, (page - 1) * pageSize);
  const runQuery = (includeVisibility: boolean) => {
    let builder = supabase
      .from('products')
      .select(
        includeVisibility
          ? `${ADMIN_PRODUCT_COLUMNS}, ${ADMIN_PRODUCT_OPERATION_COLUMNS}`
          : ADMIN_PRODUCT_COLUMNS,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);

    const q = (search ?? '').trim();
    if (q) {
      const pattern = toOrIlikePattern(q);
      builder = builder.or(`name.ilike.${pattern},brand_name.ilike.${pattern},barcode.ilike.${pattern}`);
    }
    if (category && category !== '전체') builder = builder.eq('main_category', category);
    if (petType && petType !== '전체') builder = builder.eq('target_pet_type', petType);
    if (verificationStatus && verificationStatus !== '전체') {
      builder = builder.eq('verification_status', verificationStatus);
    }
    if (includeVisibility && visibility && visibility !== '전체') {
      builder = builder.eq('is_visible', visibility === 'visible');
    }
    return builder;
  };

  let result = await runQuery(true);
  // Git 연동 프런트가 DB 마이그레이션보다 먼저 배포돼도 관리자 목록은 유지한다.
  // 이 경우 모든 기존 행을 노출 상태로 표시하며 토글 시 서버가 명시적 오류를 준다.
  if (isMissingVisibilityColumn(result.error)) result = await runQuery(false);
  const { data, count, error } = result;
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((row) => {
    const raw = row as unknown as AdminProductRow & {
      product_ingredients?: { count: number }[];
      nutritional_profiles?: { count: number }[];
    };
    return {
      ...raw,
      is_visible: raw.is_visible !== false,
      is_pinned: raw.is_pinned === true,
      pinned_order: Number(raw.pinned_order ?? 0),
      ingredientCount: raw.product_ingredients?.[0]?.count ?? 0,
      nutritionCount: raw.nutritional_profiles?.[0]?.count ?? 0,
      product_ingredients: undefined,
      nutritional_profiles: undefined,
    } as AdminProductRow;
  });
  return { rows, total: count ?? 0 };
}

interface ProductIngredientJoinRow {
  ingredient_id: string;
  sort_order: number | null;
  ingredients: { id: string; name_ko: string; name_en: string | null; risk_level: RiskLevel } | null;
}

export async function fetchProductIngredients(productId: string): Promise<ProductIngredientLink[]> {
  const { data, error } = await supabase
    .from('product_ingredients')
    .select('ingredient_id, sort_order, ingredients (id, name_ko, name_en, risk_level)')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as ProductIngredientJoinRow[])
    .filter((row) => Boolean(row.ingredients))
    .map((row, index) => ({
      ingredientId: row.ingredient_id,
      nameKo: row.ingredients?.name_ko ?? '',
      nameEn: row.ingredients?.name_en ?? null,
      riskLevel: (row.ingredients?.risk_level ?? 'safe') as RiskLevel,
      sortOrder: row.sort_order ?? index,
    }));
}

export interface SaveProductPayload {
  product: Record<string, unknown>;
  nutrition: Record<string, number> | null;
  /** 지정하면 제품 저장과 같은 관리자 요청에서 원재료 연결을 교체한다. */
  ingredients?: { ingredient_id: string; sort_order: number }[];
}

export interface SavedProductConfirmation {
  id: string;
  name: string;
  brand_name: string;
  main_category: string | null;
  sub_category: string | null;
  target_pet_type: string | null;
  verification_status: 'pending' | 'reviewed' | 'verified' | null;
  is_visible: boolean;
}

export interface SaveProductResult {
  id: string;
  product: SavedProductConfirmation;
}

/**
 * 제품 저장 뒤 사용자 앱과 동일한 공개 products 조회 경로로 다시 읽는다.
 *
 * Edge Function이 200을 반환했더라도 UPDATE가 실제 행을 바꾸지 못했거나 다른
 * 환경을 바라보면 관리자 화면만 성공처럼 보일 수 있다. 저장 직후 제품명과
 * 브랜드까지 대조해야 "앱 검색에 보이는 DB에 반영됨"을 확인할 수 있다.
 */
export async function saveProduct(payload: SaveProductPayload): Promise<SaveProductResult> {
  const response = await adminWrite<{ id?: string }>(
    'saveProduct',
    payload as unknown as Record<string, unknown>,
  );
  const id = response.id;
  if (!id) throw new Error('저장된 제품 ID를 받지 못했습니다.');

  let confirmation = await supabase
    .from('products')
    .select('id, name, brand_name, main_category, sub_category, target_pet_type, verification_status, is_visible')
    .eq('id', id)
    .single();
  if (isMissingVisibilityColumn(confirmation.error)) {
    const legacy = await supabase
      .from('products')
      .select('id, name, brand_name, main_category, sub_category, target_pet_type, verification_status')
      .eq('id', id)
      .single();
    confirmation = {
      ...legacy,
      data: legacy.data ? { ...legacy.data, is_visible: true } : null,
    } as typeof confirmation;
  }
  const { data, error } = confirmation;
  if (error) throw new Error(`저장 후 사용자 앱 조회 확인 실패: ${error.message}`);

  const confirmed = data as SavedProductConfirmation | null;
  const expectedName = String(payload.product.name ?? '').trim();
  const expectedBrand = String(payload.product.brand_name ?? '').trim();
  const expectedVisibility = payload.product.is_visible;
  if (
    !confirmed ||
    confirmed.name !== expectedName ||
    confirmed.brand_name !== expectedBrand ||
    (typeof expectedVisibility === 'boolean' && confirmed.is_visible !== expectedVisibility)
  ) {
    throw new Error(
      `저장 확인 불일치: 요청한 제품명/브랜드가 사용자 앱 DB에 반영되지 않았습니다. ` +
      `(요청: ${expectedBrand} / ${expectedName}, 실제: ${confirmed?.brand_name ?? '없음'} / ${confirmed?.name ?? '없음'})`,
    );
  }

  return { id, product: confirmed };
}

/** 제품 행은 삭제하지 않고 사용자 앱 노출 여부만 바꾼다. */
export async function setProductVisibility(id: string, isVisible: boolean): Promise<boolean> {
  const response = await adminWrite<{ product?: { id?: string; is_visible?: boolean } }>(
    'setProductVisibility',
    { id, isVisible },
  );
  if (response.product?.id !== id || response.product.is_visible !== isVisible) {
    throw new Error('제품 노출 상태 저장 결과를 확인하지 못했습니다.');
  }
  return response.product.is_visible;
}

/**
 * 제품 상단 고정 토글.
 *
 * 목록에서만 쓰는 광고(sponsor) 슬롯과 달리, 운영자가 직접 특정 제품을 앱
 * 목록·검색 결과 맨 위로 올리기 위한 플래그다.
 */
export async function setProductPinned(
  id: string,
  isPinned: boolean,
  pinnedOrder?: number,
): Promise<{ isPinned: boolean; pinnedOrder: number }> {
  const response = await adminWrite<{ product?: { id?: string; is_pinned?: boolean; pinned_order?: number } }>(
    'setProductPinned',
    { id, isPinned, pinnedOrder: pinnedOrder ?? null },
  );
  if (response.product?.id !== id || response.product.is_pinned !== isPinned) {
    throw new Error('제품 상단 고정 상태 저장 결과를 확인하지 못했습니다.');
  }
  return { isPinned, pinnedOrder: Number(response.product.pinned_order ?? 0) };
}

export async function deleteProduct(id: string): Promise<void> {
  await adminWrite('deleteProduct', { id });
}

export async function saveProductIngredients(
  productId: string,
  items: { ingredient_id: string; sort_order: number }[],
): Promise<number> {
  const res = await adminWrite<{ count: number }>('saveProductIngredients', { productId, items });
  return res.count ?? items.length;
}

// ─── 제품 이미지 업로드 ──────────────────────────────────────────────────────

export const PRODUCT_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 업로드 전 클라이언트에서 긴 변을 maxEdge 로 축소한다.
 * 캔버스를 쓸 수 없는 환경(테스트 등)에서는 원본을 그대로 사용한다.
 */
async function downscaleImage(file: File, maxEdge = 1200): Promise<Blob> {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxEdge) {
      bitmap.close?.();
      return file;
    }
    const scale = maxEdge / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** 업로드 가능한 파일인지 클라이언트에서 1차 검사(서버는 매직 바이트로 재검증한다). */
export function validateProductImage(file: File): string | null {
  if (!PRODUCT_IMAGE_MIME.includes(file.type)) {
    return 'JPG, PNG, WebP 이미지만 업로드할 수 있습니다.';
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return `이미지 용량이 너무 큽니다. (최대 ${Math.floor(PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024)}MB)`;
  }
  return null;
}

export async function uploadProductImage(file: File, productId?: string): Promise<string> {
  const invalid = validateProductImage(file);
  if (invalid) throw new Error(invalid);

  const blob = await downscaleImage(file);
  const fileBase64 = await fileToBase64(blob);
  const res = await adminWrite<{ publicUrl: string | null }>('uploadProductImage', {
    fileBase64,
    productId: productId ?? null,
  });
  if (!res.publicUrl) throw new Error('업로드된 이미지 주소를 받지 못했습니다.');
  return res.publicUrl;
}

// ─── 미매칭 성분 큐 ──────────────────────────────────────────────────────────

export interface UnmatchedListParams {
  page: number;
  pageSize: number;
  status: UnmatchedStatus | 'all';
  search?: string;
}

export async function fetchUnmatchedPage({
  page,
  pageSize,
  status,
  search,
}: UnmatchedListParams): Promise<Paged<UnmatchedIngredientRow>> {
  const from = Math.max(0, (page - 1) * pageSize);
  let builder = supabase
    .from('unmatched_ingredients')
    .select(
      'id, raw_name, normalized_name, occurrences, status, created_at, last_seen_at, review_note, reviewed_by, reviewed_at, mapped_ingredient_id, sample_product_id',
      { count: 'exact' },
    )
    .order('occurrences', { ascending: false })
    .order('last_seen_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (status !== 'all') {
    // 과거 데이터의 'resolved' 도 매핑 완료로 함께 본다.
    builder = status === 'mapped' ? builder.in('status', ['mapped', 'resolved']) : builder.eq('status', status);
  }
  const q = (search ?? '').trim();
  if (q) {
    const pattern = toOrIlikePattern(q);
    builder = builder.or(`raw_name.ilike.${pattern},normalized_name.ilike.${pattern}`);
  }

  const { data, count, error } = await builder;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as UnmatchedIngredientRow[], total: count ?? 0 };
}

export async function mapUnmatchedIngredient(
  id: string,
  ingredientId: string,
  note?: string,
): Promise<void> {
  await adminWrite('mapUnmatchedIngredient', { id, ingredientId, note: note ?? null });
}

export async function ignoreUnmatchedIngredient(id: string, note?: string): Promise<void> {
  await adminWrite('ignoreUnmatchedIngredient', { id, note: note ?? null });
}

export async function reopenUnmatchedIngredient(id: string): Promise<void> {
  await adminWrite('reopenUnmatchedIngredient', { id });
}

// ─── 대시보드 · 회원 ─────────────────────────────────────────────────────────

export async function fetchDashboard(): Promise<DashboardPayload> {
  return adminWrite<DashboardPayload>('dashboardMetrics');
}

export async function fetchMembers(
  page: number,
  pageSize: number,
  query?: string,
): Promise<Paged<AdminMember>> {
  const res = await adminWrite<{ total: number; members: AdminMember[] }>('listMembers', {
    page,
    pageSize,
    query: query ?? null,
  });
  return { rows: res.members ?? [], total: res.total ?? 0 };
}

export async function fetchMemberDetail(id: string): Promise<AdminMemberDetail> {
  return adminWrite<AdminMemberDetail>('getMemberDetail', { id });
}

export interface DeleteMemberResult {
  petCount: number;
  diaryCount: number;
}

/**
 * 관리자에 의한 회원 탈퇴 처리.
 *
 * Auth 계정과 함께 프로필·반려동물·식이 다이어리가 모두 삭제되며 되돌릴 수 없다.
 * 호출 전에 반드시 확인 절차를 거친다.
 */
export async function deleteMember(id: string, reason?: string): Promise<DeleteMemberResult> {
  const res = await adminWrite<{ petCount?: number; diaryCount?: number }>('deleteMember', {
    id,
    reason: reason?.trim() || null,
  });
  return { petCount: res.petCount ?? 0, diaryCount: res.diaryCount ?? 0 };
}

export async function fetchDiaryPage(params: DiaryListParams): Promise<Paged<AdminDiaryRow>> {
  const res = await adminWrite<{ total: number; logs: AdminDiaryRow[] }>('listFeedingLogs', {
    page: params.page,
    pageSize: params.pageSize,
    query: params.query ?? null,
    dateFrom: params.dateFrom ?? null,
    dateTo: params.dateTo ?? null,
    petType: params.petType || null,
    hasPhoto: params.hasPhoto ?? null,
  });
  return { rows: res.logs ?? [], total: res.total ?? 0 };
}

export async function fetchWaitlistPage(params: WaitlistListParams): Promise<Paged<AdminWaitlistRow>> {
  const res = await adminWrite<{ total: number; entries: AdminWaitlistRow[] }>('listWaitlist', {
    page: params.page,
    pageSize: params.pageSize,
    query: params.query ?? null,
    source: params.source ?? null,
    marketingConsent: params.marketingConsent ?? null,
  });
  return { rows: res.entries ?? [], total: res.total ?? 0 };
}

// ─── 판매가 변동 승인 ────────────────────────────────────────────────────────

export type PriceProposalStatus = 'pending' | 'approved' | 'rejected';

export interface PriceProposal {
  id: string;
  productId: string;
  productName: string;
  brandName: string;
  imageUrl: string | null;
  /** 변동을 감지한 시점의 가격. */
  currentPrice: number | null;
  /** 지금 DB 에 들어 있는 가격 — 감지 이후 수동으로 바뀌었을 수 있다. */
  livePrice: number | null;
  proposedPrice: number;
  source: 'coupang' | 'manual';
  sourceUrl: string | null;
  status: PriceProposalStatus;
  detectedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  note: string | null;
}

export interface PriceSyncRun {
  started_at: string;
  finished_at: string | null;
  checked: number;
  changed: number;
  failed: number;
  error: string | null;
}

export async function fetchPriceProposals(params: {
  page: number;
  pageSize: number;
  status?: PriceProposalStatus | 'all';
}): Promise<Paged<PriceProposal> & { lastRun: PriceSyncRun | null }> {
  const res = await callAdminFunction<{
    total: number; proposals: PriceProposal[]; lastRun: PriceSyncRun | null;
  }>('admin-price-review', {
    action: 'listPriceProposals',
    page: params.page,
    pageSize: params.pageSize,
    status: params.status ?? 'pending',
  });
  return { rows: res.proposals ?? [], total: res.total ?? 0, lastRun: res.lastRun ?? null };
}

/** 승인하면 그때 products.min_price 가 바뀐다. 거절하면 제품은 그대로다. */
export async function reviewPriceProposal(
  id: string,
  decision: 'approve' | 'reject',
  note?: string,
): Promise<{ appliedPrice: number | null }> {
  const res = await callAdminFunction<{ appliedPrice?: number | null }>('admin-price-review', {
    action: 'reviewPriceProposal',
    id,
    decision,
    note: note?.trim() || null,
  });
  return { appliedPrice: res.appliedPrice ?? null };
}

/**
 * 쿠팡 판매가 동기화를 지금 실행한다.
 *
 * admin-write 가 아니라 전용 함수(coupang-price-sync)를 호출한다 — 쿠팡 키가
 * 관리자 프록시와 섞이지 않도록 시크릿을 분리해 두었다.
 */
export async function runCoupangPriceSync(): Promise<{
  checked: number; changed: number; failed: number; failures: string[];
}> {
  const res = await callAdminFunction<{
    checked?: number; changed?: number; failed?: number; failures?: string[];
  }>('coupang-price-sync', {});
  return {
    checked: res.checked ?? 0,
    changed: res.changed ?? 0,
    failed: res.failed ?? 0,
    failures: res.failures ?? [],
  };
}

// ─── 제품명 일괄 정리 ────────────────────────────────────────────────────────

/** 정리 대상 후보를 만들기 위해 제품명·브랜드만 가볍게 전건 조회한다. */
export interface ProductNameRow {
  id: string;
  name: string;
  brand_name: string;
  main_category: string | null;
  image_url: string | null;
}

export async function fetchProductNames(): Promise<ProductNameRow[]> {
  const rows: ProductNameRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; offset < 100_000; offset += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand_name, main_category, image_url')
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as ProductNameRow[];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  throw new Error('제품 수가 정리 도구 조회 한도를 초과했습니다.');
}

export interface ProductCleanupItem {
  id: string;
  name: string;
  brandName: string;
}

/** 한 번에 보낼 수 있는 최대 건수 — Edge Function 검증과 같은 값이어야 한다. */
export const PRODUCT_CLEANUP_BATCH = 100;

export async function applyProductCleanup(
  items: ProductCleanupItem[],
): Promise<{ requested: number; applied: number }> {
  if (items.length === 0) return { requested: 0, applied: 0 };
  if (items.length > PRODUCT_CLEANUP_BATCH) {
    throw new Error(`한 번에 최대 ${PRODUCT_CLEANUP_BATCH}개까지 정리할 수 있습니다.`);
  }
  const res = await adminWrite<{ requested?: number; applied?: number }>('applyProductCleanup', {
    items,
  });
  return { requested: res.requested ?? items.length, applied: res.applied ?? 0 };
}

// ─── 휴지통(삭제 복원) ───────────────────────────────────────────────────────

export type TrashEntityType = 'product' | 'ingredient';

export interface AdminTrashItem {
  id: string;
  entityType: TrashEntityType;
  entityId: string;
  label: string;
  subLabel: string | null;
  deletedBy: string;
  deletedAt: string;
  restoredBy: string | null;
  restoredAt: string | null;
}

export interface TrashListParams {
  page: number;
  pageSize: number;
  entityType?: TrashEntityType | '';
  includeRestored?: boolean;
}

export async function fetchTrashPage(params: TrashListParams): Promise<Paged<AdminTrashItem>> {
  const res = await adminWrite<{ total: number; items: AdminTrashItem[] }>('listTrash', {
    page: params.page,
    pageSize: params.pageSize,
    entityType: params.entityType || null,
    includeRestored: params.includeRestored ?? false,
  });
  return { rows: res.items ?? [], total: res.total ?? 0 };
}

/** 스냅샷을 되살려 원래 테이블에 다시 넣는다. 같은 이름/ID가 이미 있으면 실패한다. */
export async function restoreTrashItem(id: string): Promise<void> {
  await adminWrite('restoreTrash', { id });
}

/** 휴지통에서 완전히 지운다. 이 시점부터는 복원할 수 없다. */
export async function purgeTrashItem(id: string): Promise<void> {
  await adminWrite('purgeTrash', { id });
}

// ─── 앱 카테고리 ─────────────────────────────────────────────────────────────

export interface AdminCategory {
  id: string;
  name: string;
  hint: string | null;
  sortOrder: number;
  isActive: boolean;
  /** NULL 이면 메인 카테고리, 값이 있으면 그 카테고리의 서브 카테고리. */
  parentId: string | null;
  parentName: string | null;
  /** 이 분류로 등록된 제품 수 — 비활성·삭제 전 영향 범위 확인용. */
  productCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminCategoryInput {
  id?: string;
  name: string;
  hint?: string | null;
  isActive?: boolean;
  parentId?: string | null;
}

export async function fetchCategories(): Promise<AdminCategory[]> {
  const res = await adminWrite<{ categories: AdminCategory[] }>('listCategories');
  return res.categories ?? [];
}

export async function saveCategory(input: AdminCategoryInput): Promise<{ id: string; movedProducts: number }> {
  const res = await adminWrite<{ id?: string; movedProducts?: number }>('saveCategory', {
    id: input.id ?? null,
    name: input.name,
    hint: input.hint ?? null,
    isActive: input.isActive ?? true,
    parentId: input.parentId ?? null,
  });
  if (!res.id) throw new Error('저장된 카테고리 ID를 받지 못했습니다.');
  return { id: res.id, movedProducts: res.movedProducts ?? 0 };
}

export async function deleteCategory(id: string): Promise<void> {
  await adminWrite('deleteCategory', { id });
}

/** 전달한 배열 순서 그대로 노출 순서를 다시 매긴다. */
export async function reorderCategories(ids: string[]): Promise<number> {
  const res = await adminWrite<{ count?: number }>('reorderCategories', { ids });
  return res.count ?? ids.length;
}

/**
 * 앱이 실제로 노출하는 카테고리(활성 + 순서).
 *
 * 관리자 토큰이 없는 사용자 앱에서도 읽어야 하므로 공개 SELECT 정책이 있는
 * product_categories 를 anon 으로 직접 읽는다.
 */
export interface PublicCategory {
  name: string;
  hint: string | null;
}

export async function fetchPublicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('name, hint, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    name: String((row as { name: string }).name),
    hint: (row as { hint: string | null }).hint ?? null,
  }));
}

// ─── 시스템 설정 ─────────────────────────────────────────────────────────────

interface SettingRow {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

export interface AdminSettingRow {
  key: SettingKey;
  value: unknown;
  description: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function fetchSettings(): Promise<AdminSettingRow[]> {
  const res = await adminWrite<{ settings: SettingRow[] }>('getSettings');

  const known = new Set<string>(SETTING_KEYS);
  return (res.settings ?? [])
    .filter((row) => known.has(row.key))
    .map((row) => ({
      key: row.key as SettingKey,
      value: row.value,
      description: row.description,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    }));
}

export async function saveSettings(settings: SettingsMap): Promise<number> {
  const filtered: SettingsMap = {};
  for (const key of SETTING_KEYS) {
    if (key in settings) filtered[key] = settings[key];
  }
  if (Object.keys(filtered).length === 0) throw new Error('저장할 설정이 없습니다.');
  const res = await adminWrite<{ saved: number }>('saveSettings', { settings: filtered });
  return res.saved ?? 0;
}

// ── 성분 위험도 검수 ────────────────────────────────────────────────────────

/**
 * 검수 화면이 쓰는 성분 전체 + 성분별 사용 제품 수.
 *
 * 제품 수는 anon 키로는 한 번에 집계할 수 없어 전용 함수를 쓴다. 이 값이 있어야
 * "몇 개 제품에 영향이 가는지" 보고 우선순위를 정할 수 있다.
 */
export async function fetchRiskReviewIngredients(): Promise<ReviewedIngredientRow[]> {
  const res = await callAdminFunction<{ ingredients?: ReviewedIngredientRow[] }>(
    'admin-ingredient-review',
    { action: 'listRiskReview' },
  );
  return res.ingredients ?? [];
}

export interface ReviewedIngredientRow {
  id: string;
  name_ko: string;
  name_en: string | null;
  risk_level: RiskLevel;
  category: string | null;
  description: string | null;
  productCount: number;
}

export interface RiskDecisionInput {
  updates: { id: string; riskLevel: RiskLevel }[];
  creates: {
    nameKo: string;
    nameEn: string | null;
    riskLevel: RiskLevel;
    category: string | null;
    description: string | null;
  }[];
}

/** 한 요청에 담을 수 있는 결정 수 — Edge Function 의 상한과 같다. */
export const RISK_DECISION_BATCH = 100;

/** 운영자가 고른 검수 결정을 반영한다. 바뀐 내역은 서버에서 감사 로그에 남는다. */
export async function applyRiskDecisions(
  input: RiskDecisionInput,
): Promise<{ updated: number; created: number; skipped: string[] }> {
  const res = await callAdminFunction<{ updated?: number; created?: number; skipped?: string[] }>(
    'admin-ingredient-review',
    { action: 'applyRiskDecisions', updates: input.updates, creates: input.creates },
  );
  return { updated: res.updated ?? 0, created: res.created ?? 0, skipped: res.skipped ?? [] };
}

// ── 바코드·보장성분 일괄 입력 ───────────────────────────────────────────────

/** 라벨의 보장성분 5종 + 선택 항목 2종. 화면 열 순서와 같다. */
export const NUTRITION_KEYS = [
  'crude_protein', 'crude_fat', 'crude_fiber', 'crude_ash', 'moisture', 'calcium', 'phosphorus',
] as const;

export type NutritionKey = typeof NUTRITION_KEYS[number];

export const NUTRITION_LABELS: Record<NutritionKey, string> = {
  crude_protein: '조단백',
  crude_fat: '조지방',
  crude_fiber: '조섬유',
  crude_ash: '조회분',
  moisture: '수분',
  calcium: '칼슘',
  phosphorus: '인',
};

export interface ProductFactsRow {
  id: string;
  name: string;
  brandName: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  barcode: string | null;
  kcalPer100g: number | null;
  nutrition: Record<NutritionKey, number | null>;
  hasNutrition: boolean;
}

export type ProductFactsFilter = 'missing' | 'missing_barcode' | 'missing_nutrition' | 'all';

interface ProductFactsJoinRow {
  id: string;
  name: string;
  brand_name: string | null;
  image_url: string | null;
  coupang_link: string | null;
  barcode: string | null;
  kcal_per_100g: number | null;
  nutritional_profiles: Record<string, number | null>[] | Record<string, number | null> | null;
}

function emptyNutrition(): Record<NutritionKey, number | null> {
  return Object.fromEntries(NUTRITION_KEYS.map((key) => [key, null])) as Record<NutritionKey, number | null>;
}

/**
 * 입력 화면이 쓸 제품 목록.
 *
 * products 와 nutritional_profiles 는 공개 SELECT 라 anon 키로 직접 읽는다 —
 * 관리자 화면의 다른 목록과 같은 경로다. service_role 이 필요한 것은 쓰기뿐이다.
 *
 * '영양정보 없음'은 조인 결과를 봐야 알 수 있어 서버 필터로 거를 수 없다.
 * 그래서 바코드 조건만 쿼리에 걸고, 영양 조건은 받아 온 뒤 거른다.
 */
export async function fetchProductFacts(params: {
  filter: ProductFactsFilter;
  search?: string;
  limit?: number;
}): Promise<ProductFactsRow[]> {
  const limit = Math.min(params.limit ?? 100, 300);
  let query = supabase
    .from('products')
    .select(
      'id, name, brand_name, image_url, coupang_link, barcode, kcal_per_100g, '
      + 'nutritional_profiles(crude_protein, crude_fat, crude_fiber, crude_ash, moisture, calcium, phosphorus)',
    )
    .order('name', { ascending: true })
    .limit(limit);

  if (params.filter === 'missing' || params.filter === 'missing_barcode') {
    query = query.is('barcode', null);
  }
  const search = params.search?.trim();
  if (search) {
    const pattern = toOrIlikePattern(search);
    query = query.or(`name.ilike.${pattern},brand_name.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`제품을 불러오지 못했습니다: ${error.message}`);

  const rows = ((data ?? []) as unknown as ProductFactsJoinRow[]).map((raw) => {
    const profile = (Array.isArray(raw.nutritional_profiles)
      ? raw.nutritional_profiles[0]
      : raw.nutritional_profiles) ?? null;
    const nutrition = emptyNutrition();
    let hasNutrition = false;
    for (const key of NUTRITION_KEYS) {
      const value = profile?.[key];
      if (value !== null && value !== undefined) {
        nutrition[key] = Number(value);
        hasNutrition = true;
      }
    }
    return {
      id: raw.id,
      name: raw.name,
      brandName: raw.brand_name ?? '',
      imageUrl: raw.image_url,
      sourceUrl: raw.coupang_link,
      barcode: raw.barcode,
      kcalPer100g: raw.kcal_per_100g === null ? null : Number(raw.kcal_per_100g),
      nutrition,
      hasNutrition,
    };
  });

  if (params.filter === 'missing' || params.filter === 'missing_nutrition') {
    return rows.filter((row) => !row.hasNutrition);
  }
  return rows;
}

export interface ProductFactsInput {
  id: string;
  name: string;
  barcode: string | null;
  kcalPer100g: number | null;
  nutrition: Record<NutritionKey, number | null>;
}

/** 한 요청에 담을 수 있는 제품 수 — Edge Function 의 상한과 같다. */
export const PRODUCT_FACTS_BATCH = 100;

/** 바코드·kcal·보장성분만 저장한다. 제품의 다른 값은 건드리지 않는다. */
export async function saveProductFacts(items: ProductFactsInput[]): Promise<{ saved: number }> {
  const res = await callAdminFunction<{ saved?: number }>('admin-product-facts', {
    action: 'saveProductFacts',
    items,
  });
  return { saved: res.saved ?? 0 };
}

// ── 사용자 제품 등록 요청 ───────────────────────────────────────────────────

export type ProductRequestStatus = 'pending' | 'registered' | 'rejected';

export interface AdminProductRequest {
  id: string;
  requestedName: string;
  searchQuery: string | null;
  productUrl: string | null;
  note: string | null;
  status: ProductRequestStatus;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  nickname: string;
  /** 같은 제품을 요청한 대기 건수 — 무엇부터 채울지 정하는 근거. */
  requestCount: number;
}

export async function fetchProductRequests(params: {
  page: number;
  pageSize: number;
  status: ProductRequestStatus | 'all';
}): Promise<Paged<AdminProductRequest>> {
  const res = await callAdminFunction<{ total?: number; requests?: AdminProductRequest[] }>(
    'admin-operations',
    { action: 'listProductRequests', ...params },
  );
  return { rows: res.requests ?? [], total: res.total ?? 0 };
}

export async function reviewProductRequest(
  id: string,
  status: ProductRequestStatus,
  note?: string,
): Promise<void> {
  await callAdminFunction('admin-operations', {
    action: 'reviewProductRequest',
    id,
    status,
    note: note?.trim() || null,
  });
}

// ── 제품 일괄 변경 ──────────────────────────────────────────────────────────

/** 한 요청에 담을 수 있는 제품 수 — Edge Function 의 상한과 같다. */
export const BULK_PRODUCT_LIMIT = 200;

export interface BulkProductPatch {
  isVisible?: boolean;
  verificationStatus?: 'pending' | 'reviewed' | 'verified';
  mainCategory?: string;
}

/**
 * 선택한 제품을 한 번에 바꾼다.
 *
 * 요청 수와 실제 반영 수를 함께 돌려준다 — 둘이 다르면 화면이 "전부 성공"으로
 * 보여 주지 않고 차이를 알려야 한다.
 */
export async function bulkUpdateProducts(
  ids: string[],
  patch: BulkProductPatch,
): Promise<{ requested: number; updated: number }> {
  const res = await callAdminFunction<{ requested?: number; updated?: number }>(
    'admin-operations',
    { action: 'bulkUpdateProducts', ids, ...patch },
  );
  return { requested: res.requested ?? ids.length, updated: res.updated ?? 0 };
}
