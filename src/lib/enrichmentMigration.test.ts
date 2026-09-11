import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase', 'migrations', '20260911113000_product_enrichment_workflow.sql'),
  'utf8',
).toLowerCase();

describe('제품 데이터 보완 워크플로 마이그레이션', () => {
  it('출처 URL·원문·검증 필드·신뢰도를 보존한다', () => {
    expect(sql).toContain('create table if not exists public.product_data_sources');
    expect(sql).toContain('raw_ingredient_text text');
    expect(sql).toContain('fields_verified text[]');
    expect(sql).toContain('confidence text');
  });

  it('누락 제품을 삭제하지 않고 재실행 가능한 큐에 백필한다', () => {
    expect(sql).toContain('create table if not exists public.product_enrichment_queue');
    expect(sql).toContain('on conflict (product_id) do update');
    expect(sql).toContain('product_ingredients_sync_enrichment_queue');
    expect(sql).toContain('nutritional_profiles_sync_enrichment_queue');
    expect(sql).not.toMatch(/delete\s+from\s+public\.products/);
  });

  it('공개 읽기·쓰기를 허용하지 않는다', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke all on table public.product_data_sources from anon, authenticated');
  });
});
