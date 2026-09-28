import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 제품 검색이 원료명까지 훑는지 검사한다.
 *
 * 검색 자동완성은 성분명을 제안하는데(예: "귀리", "유기농 귀리"), 검색 자체는
 * 제품명·브랜드명만 훑고 있었다. 그래서 제안을 눌러도 0건이 떴다.
 * 운영 데이터 기준 "귀리"는 제품명 일치 0건, 원료로 쓰는 제품 43건이다.
 *
 * 실제 네트워크 호출 없이, 검색 쿼리가 원료 경로를 포함하도록 조립되는지를 본다.
 */
const SOURCE = readFileSync(join(process.cwd(), 'src/lib/supabase.ts'), 'utf8');
const MIGRATION = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260925110000_ranked_catalog_search.sql'),
  'utf8',
);

function functionBody(name: string): string {
  const start = SOURCE.indexOf(`export async function ${name}(`);
  expect(start, `${name} 를 찾지 못했다`).toBeGreaterThan(-1);
  const next = SOURCE.indexOf('\nexport ', start + 1);
  return SOURCE.slice(start, next === -1 ? undefined : next);
}

describe('원료 기반 제품 검색', () => {
  it('RPC가 국문·영문 원료명을 제품 검색 문서에 합친다', () => {
    expect(MIGRATION).toContain('FROM public.product_ingredients AS link');
    expect(MIGRATION).toContain('JOIN public.ingredients AS ingredient');
    expect(MIGRATION).toContain("ingredient.name_ko");
    expect(MIGRATION).toContain("ingredient.name_en");
  });

  it('searchProducts가 원료 검색을 포함한 랭킹 RPC를 호출한다', () => {
    const body = functionBody('searchProducts');
    expect(body).toContain("rpc('search_catalog_products'");
    expect(body).not.toContain('findProductIdsByIngredientName');
    expect(body).not.toContain('builder.or(');
  });

  it('원료 경로도 제품 노출·카테고리·종 조건과 같은 RPC 안에서 평가한다', () => {
    expect(MIGRATION).toMatch(/p\.is_visible\s*=\s*true/i);
    expect(MIGRATION).toContain('p.main_category = q.category');
    expect(MIGRATION).toContain("p.target_pet_type IN (q.pet_type, 'all')");
    expect(MIGRATION.indexOf('FROM public.product_ingredients AS link')).toBeLessThan(
      MIGRATION.indexOf('p.is_visible = TRUE'),
    );
  });
});
