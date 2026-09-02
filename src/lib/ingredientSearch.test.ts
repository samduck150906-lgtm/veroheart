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

function functionBody(name: string): string {
  const start = SOURCE.indexOf(`export async function ${name}(`);
  expect(start, `${name} 를 찾지 못했다`).toBeGreaterThan(-1);
  const next = SOURCE.indexOf('\nexport ', start + 1);
  return SOURCE.slice(start, next === -1 ? undefined : next);
}

describe('원료 기반 제품 검색', () => {
  it('원료명으로 제품 id 를 찾는 함수가 있다', () => {
    const body = functionBody('findProductIdsByIngredientName');
    // 국문·영문 원료명을 모두 본다.
    expect(body).toContain('name_ko.ilike');
    expect(body).toContain('name_en.ilike');
    expect(body).toContain("from('product_ingredients')");
  });

  it('searchProducts 가 제품명·브랜드명에 더해 원료 경로를 or 조건에 넣는다', () => {
    const body = functionBody('searchProducts');
    expect(body).toContain('findProductIdsByIngredientName');
    expect(body).toContain('name.ilike');
    expect(body).toContain('brand_name.ilike');
    expect(body).toContain('id.in.');
  });

  it('원료 경로를 별도 조회로 돌리지 않고 같은 필터에 태운다', () => {
    // 필터(카테고리·종 등)가 두 경로에 따로 적용되면 결과가 갈라진다.
    const body = functionBody('searchProducts');
    const orIndex = body.indexOf('builder.or(');
    const categoryIndex = body.indexOf("eq('main_category'");
    expect(orIndex).toBeGreaterThan(-1);
    expect(categoryIndex).toBeGreaterThan(orIndex);
  });
});
