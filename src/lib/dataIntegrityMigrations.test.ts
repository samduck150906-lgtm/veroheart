import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function migration(name: string): string {
  return readFileSync(resolve(process.cwd(), 'supabase', 'migrations', name), 'utf8').toLowerCase();
}

describe('파생 데이터 정합성 마이그레이션', () => {
  it('리뷰 생성·수정·삭제와 기존 데이터 백필을 모두 처리한다', () => {
    const sql = migration('20260911110000_sync_product_review_aggregates.sql');
    expect(sql).toContain('after insert or update of product_id, rating or delete');
    expect(sql).toContain('count(r.id)::integer');
    expect(sql).toContain('round(avg(r.rating)::numeric, 2)');
    expect(sql).toContain('revoke all on function');
  });

  it('위험성분은 연결 테이블과 성분 위험도를 기준으로 자동 계산한다', () => {
    const sql = migration('20260911111000_sync_product_risk_factors.sql');
    expect(sql).toContain("i.risk_level in ('caution', 'danger')");
    expect(sql).toContain('product_ingredients_sync_risk_factors');
    expect(sql).toContain('ingredients_sync_product_risk_factors');
    expect(sql).toContain('update public.products as p');
  });
});
