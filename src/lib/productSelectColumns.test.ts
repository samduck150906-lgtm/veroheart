import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 제품 조회가 매핑에 필요한 컬럼을 빠짐없이, 그리고 그것만 요청하는지 검사한다.
 *
 * select 문자열은 supabase-js 가 응답 타입을 추론하려면 리터럴이어야 해서 상수로
 * 묶지 못하고 쿼리마다 반복해 적는다. 목록이 서로 어긋나거나 `*` 로 되돌아가면
 * (a) 필드가 빠져 조용히 빈 값으로 매핑되거나 (b) 쓰지도 않는 컬럼까지 받아와
 * 초기 로딩 파싱 비용이 다시 커진다. 이 테스트가 두 방향 모두를 막는다.
 */
// vitest 환경(jsdom)에서는 import.meta.url 이 file: 스킴이 아닐 수 있어 경로로 읽는다.
const SOURCE = readFileSync(join(process.cwd(), 'src/lib/supabase.ts'), 'utf8');

/** mapProductFromSupabaseRow 가 읽는 products 컬럼 (SupabaseProductRow 와 1:1). */
const REQUIRED_PRODUCT_COLUMNS = [
  'id',
  'name',
  'brand_name',
  'manufacturer_name',
  'product_type',
  'main_category',
  'sub_category',
  'target_pet_type',
  'target_life_stage',
  'formulation',
  'product_health_concerns',
  'has_risk_factors',
  'verification_status',
  'verified_at',
  'barcode',
  'kcal_per_100g',
  'image_url',
  'review_count',
  'avg_rating',
] as const;

/** `.select(\`...\`)` 안의 문자열만 모아서 본다. */
function selectBlocks(): string[] {
  return [...SOURCE.matchAll(/\.select\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
}

/** 제품 행을 매핑해 쓰는 조회 — products 컬럼이 실려 있어야 하는 select 들. */
function productSelectBlocks(): string[] {
  return selectBlocks().filter((block) => /\bbrand_name\b/.test(block));
}

describe('제품 조회 컬럼', () => {
  it('제품을 매핑하는 select 를 실제로 찾는다', () => {
    // 정규식이 헛돌아 0건을 검사하고 통과하는 상황을 먼저 막는다.
    // getProducts / getProductDetail / getProductByBarcode / getProductsByBrand /
    // getRecentViews / searchProducts / searchDiaryProducts / 급여일지 조인.
    expect(productSelectBlocks().length).toBeGreaterThanOrEqual(7);
  });

  it('어떤 제품 조회도 products 를 `*` 로 받지 않는다', () => {
    for (const block of productSelectBlocks()) {
      // `*` 하나만 덜렁 있는 줄이면 테이블 전체 컬럼을 받는다는 뜻이다.
      const hasWildcard = block.split('\n').some((line) => line.trim().replace(/,$/, '') === '*');
      expect(hasWildcard, `select 에 와일드카드가 남아 있다:\n${block}`).toBe(false);
    }
  });

  it('원료 조인도 `*` 로 받지 않는다', () => {
    // 주석은 옛 형태를 인용할 수 있으므로 실제 select 문자열만 본다.
    for (const block of selectBlocks()) {
      expect(block).not.toContain('ingredients (*)');
      expect(block).not.toContain('ingredients(*)');
    }
  });

  it('제품 전체를 내려받는 조회는 매핑에 필요한 컬럼을 모두 요청한다', () => {
    // 전체 목록·상세·브랜드 조회는 Product 전체를 채워야 한다.
    // (급여일지·최근 본 목록처럼 일부만 쓰는 조인은 자체 컬럼 목록을 가진다.)
    const fullBlocks = productSelectBlocks().filter((block) => /\bverification_status\b/.test(block));
    expect(fullBlocks.length).toBeGreaterThanOrEqual(6);

    for (const block of fullBlocks) {
      for (const column of REQUIRED_PRODUCT_COLUMNS) {
        expect(
          new RegExp(`(^|[\\s,(])${column}([\\s,)]|$)`).test(block),
          `'${column}' 컬럼이 빠졌다:\n${block}`,
        ).toBe(true);
      }
    }
  });

  it('보장성분 조인은 매핑이 읽는 7개 값만 받는다', () => {
    const selects = selectBlocks().join('\n');
    expect(selects).not.toContain('nutritional_profiles (*)');
    const nutrition = [...selects.matchAll(/nutritional_profiles \(([^)]*)\)/g)].map((m) => m[1]);
    expect(nutrition.length).toBeGreaterThan(0);
    for (const columns of nutrition) {
      expect(columns.split(',').map((c) => c.trim()).sort()).toEqual(
        ['calcium', 'crude_ash', 'crude_fat', 'crude_fiber', 'crude_protein', 'moisture', 'phosphorus'],
      );
    }
  });
});
