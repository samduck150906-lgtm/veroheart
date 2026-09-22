import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const source = read('src/lib/supabase.ts');
const migration = read('supabase/migrations/20260922060000_rank_products_with_ingredients_first.sql');

const bodyOf = (from: string, to: string) => {
  const start = source.indexOf(from);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf(to, start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
};

/** 정렬 키가 선언된 순서. PostgREST 는 호출 순서대로 order 를 쌓는다. */
const orderKeys = (body: string) =>
  [...body.matchAll(/\.order\('([a-z_]+)'/g)].map((match) => match[1]);

describe('원재료 없는 제품을 목록 뒤로', () => {
  it('목록 조회는 고정 → 원재료 유무 → 최신 순으로 정렬한다', () => {
    // 운영자가 고정한 제품이 먼저라는 규칙은 유지하면서, 그다음 자리를 "분석할 수
    // 있는 제품"에 준다. 최신순만 남으면 수집만 하고 원재료를 못 채운 묶음이
    // 첫 화면을 통째로 차지한다(2026-09-22: 첫 50개 중 45개가 원재료 0건이었다).
    const keys = orderKeys(bodyOf('export async function getProductsPage', 'export async function getProducts()'));
    expect(keys).toEqual(['is_pinned', 'pinned_order', 'has_ingredients', 'created_at']);
  });

  it('검색 결과도 같은 규칙을 쓴다', () => {
    const keys = orderKeys(bodyOf('export async function searchProducts', '// Ingredients'));
    expect(keys.slice(0, 3)).toEqual(['is_pinned', 'pinned_order', 'has_ingredients']);
  });

  it('컬럼이 없던 시절 조회로 되돌아가는 폴백이 새 컬럼도 알아본다', () => {
    // 프런트가 마이그레이션보다 먼저 배포되면 PostgREST 가 컬럼 없음(42703)을
    // 돌려준다. 폴백이 이 이름을 모르면 그 배포 구간 동안 목록이 통째로 빈다.
    const body = bodyOf('function isMissingProductVisibilityColumn', 'async function queryVisibleProducts');
    expect(body).toContain('has_ingredients');
  });
});

describe('원재료 개수 캐시 마이그레이션', () => {
  it('파생 캐시 컬럼과 있다/없다 판정 컬럼을 함께 둔다', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS ingredient_count INTEGER NOT NULL DEFAULT 0');
    // 개수로 정렬하면 원재료가 많은 사료가 늘 간식보다 위로 간다. 정렬 키는
    // 있다/없다여야 해서 생성 컬럼으로 따로 둔다.
    expect(migration).toContain('GENERATED ALWAYS AS (ingredient_count > 0) STORED');
  });

  it('단일 원본(product_ingredients)을 트리거로 따라가고 기존 행을 백필한다', () => {
    expect(migration).toContain('CREATE TRIGGER product_ingredients_sync_ingredient_count');
    expect(migration).toContain('AFTER INSERT OR UPDATE OF product_id OR DELETE ON public.product_ingredients');
    expect(migration).toMatch(/UPDATE public\.products AS p\s+SET ingredient_count = \(/);
  });

  it('동기화 함수는 search_path 를 고정하고 공개 역할에서 회수한다', () => {
    const definitions = migration.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;/g) ?? [];
    expect(definitions).toHaveLength(2);
    for (const definition of definitions) {
      expect(definition).toContain("SET search_path = ''");
    }
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.refresh_product_ingredient_count(UUID) FROM PUBLIC, anon, authenticated');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.sync_product_ingredient_count_from_link() FROM PUBLIC, anon, authenticated');
  });
});
