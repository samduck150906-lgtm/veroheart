/**
 * 검색 자동완성 제안 생성 (순수 함수).
 *
 * 스토어에 로드된 제품(이름·브랜드)과 성분 사전(name_ko)에서
 * 입력어와 일치하는 후보를 브랜드 → 제품 → 성분 순으로 모아 반환한다.
 * 접두 일치(prefix)를 부분 일치보다 우선한다.
 *
 * 중요: 넘기는 products·ingredients 는 검색 결과와 **같은 조건으로 이미 좁혀진**
 * 목록이어야 한다. 결과 조회는 종 필터까지 함께 걸기 때문에, 여기서 전체 목록을
 * 쓰면 고양이 보호자에게 강아지 전용 제품이 제안되고 눌렀을 때 0건이 나온다.
 */
import { isSourceLabelBrand } from './productDisplay';

export type SuggestionKind = 'brand' | 'product' | 'ingredient';

export interface Suggestion {
  kind: SuggestionKind;
  label: string;
  /** product일 때 브랜드명(부가 표시용) */
  brand?: string;
  /** ingredient일 때 위험도(safe|caution|warning|danger 등) */
  risk?: string;
}

export interface SuggestProduct {
  name: string;
  brand?: string;
}

export interface SuggestIngredient {
  name_ko: string;
  risk_level?: string;
}

const norm = (s: string) => s.toLowerCase().trim();

/** 접두 일치=0, 부분 일치=1, 불일치=2 (작을수록 우선) */
function rankScore(hay: string, q: string): number {
  if (hay.startsWith(q)) return 0;
  if (hay.includes(q)) return 1;
  return 2;
}

/**
 * 성분 제안을 "지금 보이는 제품이 실제로 쓰는 성분"으로 좁힌다.
 *
 * 성분 사전에는 제품과 연결되지 않은 성분도 있고, 종 필터가 걸리면 그 성분을
 * 쓰는 제품이 전부 빠지기도 한다. 그대로 제안하면 눌렀을 때 결과가 0건이 되어
 * "검색창에는 있는데 결과에는 없다"는 모순이 생긴다.
 */
export function ingredientsUsedBy(
  products: { ingredients?: { nameKo: string }[] }[],
  ingredients: SuggestIngredient[],
): SuggestIngredient[] {
  const used = new Set<string>();
  for (const product of products) {
    for (const ingredient of product.ingredients ?? []) {
      const name = norm(ingredient.nameKo ?? '');
      if (name) used.add(name);
    }
  }
  if (used.size === 0) return [];
  return ingredients.filter((item) => used.has(norm(item.name_ko)));
}

export function buildSearchSuggestions(
  query: string,
  products: SuggestProduct[],
  ingredients: SuggestIngredient[],
  limit = 8,
): Suggestion[] {
  const q = norm(query);
  if (!q) return [];

  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    const key = `${s.kind}:${s.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };

  // ── 브랜드 (일치 브랜드, 제품 수 많은 순) ──
  const brandCount = new Map<string, number>();
  for (const p of products) {
    // '쿠팡검색' 같은 수집 출처 라벨은 브랜드가 아니므로 제안하지 않는다.
    if (p.brand && !isSourceLabelBrand(p.brand)) {
      brandCount.set(p.brand, (brandCount.get(p.brand) ?? 0) + 1);
    }
  }
  [...brandCount.keys()]
    .filter((b) => norm(b).includes(q))
    .sort(
      (a, b) =>
        rankScore(norm(a), q) - rankScore(norm(b), q) ||
        (brandCount.get(b) ?? 0) - (brandCount.get(a) ?? 0) ||
        a.localeCompare(b),
    )
    .slice(0, 3)
    .forEach((b) => push({ kind: 'brand', label: b }));

  // ── 제품명 ──
  products
    .filter((p) => norm(p.name).includes(q))
    .sort((a, b) => rankScore(norm(a.name), q) - rankScore(norm(b.name), q))
    .slice(0, 4)
    .forEach((p) => push({ kind: 'product', label: p.name, brand: p.brand }));

  // ── 성분명 ──
  ingredients
    .filter((i) => norm(i.name_ko).includes(q))
    .sort((a, b) => rankScore(norm(a.name_ko), q) - rankScore(norm(b.name_ko), q))
    .slice(0, 3)
    .forEach((i) => push({ kind: 'ingredient', label: i.name_ko, risk: i.risk_level }));

  return out.slice(0, limit);
}

/** 스토어 제품 목록에서 브랜드 필터 옵션(제품 수 많은 순 상위 N)을 만든다. */
export function deriveBrandOptions(products: SuggestProduct[], limit = 16): string[] {
  const count = new Map<string, number>();
  for (const p of products) {
    if (p.brand && !isSourceLabelBrand(p.brand)) count.set(p.brand, (count.get(p.brand) ?? 0) + 1);
  }
  return [...count.keys()]
    .sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, limit);
}
