import { extractBrandCandidates } from './brandExtraction';

/**
 * 추출한 브랜드 중 실제로 DB 에 반영할 것만 고른다.
 *
 * 판단 기준을 스크립트가 아니라 여기 모아 두는 이유는, 무엇을 덮어쓰고 무엇을 두는지가
 * 되돌리기 어려운 결정이라 테스트로 고정해 두어야 하기 때문이다.
 */

/** 수집 출처가 브랜드 자리에 들어간 값 — 이것만 덮어쓴다. */
const SOURCE_PLACEHOLDERS = new Set(['쿠팡검색', '쿠팡상품', '쿠팡', 'coupang']);

export interface ProductRow {
  id: string;
  name: string;
  brand_name: string | null;
}

export interface BrandChange {
  id: string;
  name: string;
  before: string;
  after: string;
}

export function planChanges(products: ProductRow[]): { changes: BrandChange[]; skipped: number } {
  const candidates = extractBrandCandidates(products.map((p) => p.name));
  const changes: BrandChange[] = [];
  let skipped = 0;

  products.forEach((product, i) => {
    const brand = candidates[i].brand;
    const before = product.brand_name ?? '';
    // 브랜드를 못 뽑았으면 그대로 둔다 — 빈 값으로 덮어쓰면 정보만 잃는다.
    if (!brand) return void (skipped += 1);
    // 이미 진짜 브랜드가 들어 있으면 건드리지 않는다.
    if (!SOURCE_PLACEHOLDERS.has(before)) return void (skipped += 1);
    if (before === brand) return void (skipped += 1);
    changes.push({ id: product.id, name: product.name, before, after: brand });
  });

  return { changes, skipped };
}
