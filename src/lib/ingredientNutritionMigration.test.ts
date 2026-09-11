import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8').replace(/\r\n/g, '\n');
const schema = read('supabase/migrations/20260911100000_enrich_ingredient_nutrition_schema.sql');
const enrichment = read('supabase/migrations/20260911102000_enrich_existing_ingredient_dictionary.sql');
const seed = read('supabase/migrations/20260911103000_seed_standard_feed_nutrition.sql');
const source = JSON.parse(read('src/data/standard_feed_data.json')) as Array<Record<string, unknown>>;

describe('성분 영양 DB 마이그레이션', () => {
  it('5개 영양 수치에 0~100 제약과 검색 인덱스를 둔다', () => {
    for (const column of [
      'moisture_pct',
      'crude_protein_pct',
      'crude_fat_pct',
      'crude_ash_pct',
      'crude_fiber_pct',
    ]) {
      expect(schema).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
      expect(schema).toContain(`'${column}'`);
    }
    expect(schema).toContain('USING GIN (aliases)');
    expect(schema).toContain('USING GIN (nutrition_tags)');
  });

  it('번들 표준사료 181개를 누락·중복 없이 그대로 구조화한다', () => {
    const embedded = seed.match(/\$feed\$([\s\S]*?)\$feed\$/)?.[1];
    expect(embedded).toBeTruthy();
    const rows = JSON.parse(embedded!) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(181);
    expect(rows).toEqual(source);
    expect(new Set(rows.map((row) => row.name_ko)).size).toBe(rows.length);
    expect(seed).toContain('ON CONFLICT (name_ko) DO UPDATE SET');
    expect(seed).toContain('nutrition_source = EXCLUDED.nutrition_source');
  });

  it('기존 운영자 데이터는 비어 있을 때만 보강한다', () => {
    expect(enrichment).toContain("WHERE category IS NULL OR btrim(category) = ''");
    expect(enrichment).toContain('WHERE COALESCE(cardinality(allergy_triggers), 0) = 0');
    expect(enrichment).toContain('WHERE COALESCE(cardinality(caution_conditions), 0) = 0');
    expect(seed).toContain('ELSE public.ingredients.nutrition_tags');
    expect(seed).toContain('ELSE public.ingredients.caution_conditions');
    expect(seed).not.toMatch(/risk_level\s*=\s*EXCLUDED\.risk_level/);
  });

  it('축산용 자료를 반려동물 안전으로 일괄 오인하지 않는다', () => {
    expect(seed).toContain("$q$danger$q$::public.risk_level_enum");
    expect(seed).toContain("$q$caution$q$::public.risk_level_enum");
    expect(seed).toContain('수의영양 검토 필요');
    expect(seed).toContain('카페인 잔류 가능성');
  });
});
