/**
 * 관리자 콘솔 전용 API 계층.
 *
 * 쓰기 규칙: 관리자 쓰기는 **절대** anon Supabase 클라이언트로 직접 하지 않는다.
 *   관리자 화면 → adminWrite(x-admin-token) → admin-write Edge Function(service_role) → DB
 * 읽기 규칙: 공개 SELECT 정책이 있는 테이블(products / ingredients /
 *   unmatched_ingredients / app_settings)만 anon 으로 읽고, RLS 로 막힌 데이터
 *   (회원 목록 등)는 Edge Function 조회 action 을 쓴다.
 */
import { supabase, adminWrite } from './supabase';
import { toOrIlikePattern } from './postgrestPattern';

// ─── 공통 타입 ───────────────────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'caution' | 'danger';

export interface AdminIngredient {
  id: string;
  name_ko: string;
  name_en: string | null;
  risk_level: RiskLevel;
  description: string | null;
  category: string | null;
}

export interface AdminIngredientInput {
  id?: string;
  name_ko: string;
  name_en?: string | null;
  risk_level: RiskLevel;
  description?: string | null;
  category?: string | null;
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
  unmatchedPending: number | null;
  feedingLogsLast7: number | null;
  productsLast7: number | null;
  productsPrev7: number | null;
  usersLast7: number | null;
  usersPrev7: number | null;
}

export interface DashboardPayload {
  metrics: DashboardMetrics;
  recentProducts: { id: string; name: string; brand_name: string; created_at: string }[];
  recentIngredients: { id: string; name_ko: string; risk_level: RiskLevel; created_at: string }[];
  recentUnmatched: { id: string; raw_name: string; occurrences: number; last_seen_at: string }[];
}

export interface AdminMember {
  id: string;
  nickname: string;
  createdAt: string;
  petCount: number;
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
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type SettingsMap = Partial<Record<SettingKey, unknown>>;

// ─── 성분 ────────────────────────────────────────────────────────────────────

export async function fetchIngredients(): Promise<AdminIngredient[]> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name_ko, name_en, risk_level, description, category')
    .order('name_ko', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminIngredient[];
}

/** 원재료 편집기용 성분 검색 (한글/영문). */
export async function searchIngredients(query: string, limit = 20): Promise<AdminIngredient[]> {
  const q = query.trim();
  let builder = supabase
    .from('ingredients')
    .select('id, name_ko, name_en, risk_level, description, category')
    .order('name_ko', { ascending: true })
    .limit(limit);
  if (q) {
    const pattern = toOrIlikePattern(q);
    builder = builder.or(`name_ko.ilike.${pattern},name_en.ilike.${pattern}`);
  }
  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminIngredient[];
}

export async function saveIngredient(input: AdminIngredientInput): Promise<{ id: string }> {
  return adminWrite<{ id: string }>('saveIngredient', { ingredient: input });
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
  /** 등록성분이 아직 없는 제품만 — 채워 넣을 대상을 찾을 때 쓴다. */
  missingNutrition?: boolean;
}

/**
 * 서버 페이지네이션 제품 목록.
 * 목록 렌더에 필요한 컬럼만 select 한다(전건 `select('*')` 금지).
 *
 * select 문자열은 반드시 리터럴로 둔다 — supabase-js 는 이 문자열을 타입으로 파싱해서,
 * 템플릿 리터럴로 조합하면 컴파일이 깨진다. 그래서 조건마다 문장을 따로 쓴다.
 */
export async function fetchProductsPage({
  page,
  pageSize,
  search,
  category,
  missingNutrition,
}: ProductListParams): Promise<Paged<AdminProductRow>> {
  const from = Math.max(0, (page - 1) * pageSize);
  let builder = missingNutrition
    ? supabase
        .from('products')
        .select(
          'id, name, brand_name, main_category, sub_category, target_pet_type, target_life_stage, image_url, min_price, created_at, nutritional_profiles!left(product_id)',
          { count: 'exact' },
        )
        // 등록성분 행이 없는 제품만. 왼쪽 조인 뒤 빈 쪽을 거른다.
        .is('nutritional_profiles', null)
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)
    : supabase
        .from('products')
        .select(
          'id, name, brand_name, main_category, sub_category, target_pet_type, target_life_stage, image_url, min_price, created_at',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1);

  const q = (search ?? '').trim();
  if (q) {
    const pattern = toOrIlikePattern(q);
    builder = builder.or(`name.ilike.${pattern},brand_name.ilike.${pattern}`);
  }
  if (category && category !== '전체') {
    builder = builder.eq('main_category', category);
  }

  const { data, count, error } = await builder;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as AdminProductRow[], total: count ?? 0 };
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
  /**
   * 등록성분. 모르는 성분은 null 이다 — 0 이 아니다.
   * 0 으로 보내면 화면이 그걸 제조사 신고값("칼슘 0%")으로 읽는다.
   */
  nutrition: Record<string, number | null> | null;
  /** 지정하면 제품 저장과 같은 트랜잭션에서 원재료 연결을 교체한다. */
  ingredients?: { ingredient_id: string; sort_order: number }[];
}

export async function saveProduct(payload: SaveProductPayload): Promise<{ id: string }> {
  return adminWrite<{ id: string }>('saveProduct', payload as unknown as Record<string, unknown>);
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
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value, description, updated_at, updated_by');
  if (error) throw new Error(error.message);

  const known = new Set<string>(SETTING_KEYS);
  return ((data ?? []) as SettingRow[])
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
