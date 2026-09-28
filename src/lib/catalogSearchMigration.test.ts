import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const migration = read('supabase/migrations/20260925110000_ranked_catalog_search.sql');
const source = read('src/lib/supabase.ts');
const sqlFunctionBody = migration.match(/AS \$\$([\s\S]*?)\$\$;/i)?.[1] ?? '';

function functionBody(name: string): string {
  const start = source.indexOf(`export async function ${name}(`);
  expect(start, `${name} 함수를 찾지 못했다`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf('\nexport ', start + 1);
  return source.slice(start, end === -1 ? undefined : end);
}

describe('ranked catalog search migration', () => {
  it('normalizes parameterized text and creates indexed search columns', () => {
    expect(migration).toMatch(/add column if not exists catalog_search_text\s+text\s+generated always as/i);
    expect(migration).toMatch(/add column if not exists catalog_search_document\s+tsvector\s+generated always as/i);
    expect(migration).toContain('gin_trgm_ops');
    expect(migration).toMatch(/using gin\s*\(catalog_search_document\)/i);
    expect(migration).toMatch(/regexp_replace\(lower\(coalesce\(p_query/i);
    expect(migration).toMatch(/websearch_to_tsquery\('simple'/i);
  });

  it('ranks barcode, name, brand, alias, ingredient, then trigram matches', () => {
    const weights = [...migration.matchAll(/-- weight: (barcode|name|brand|alias|ingredient|trigram)\s+(\d+)/g)]
      .map((match) => ({ field: match[1], value: Number(match[2]) }));
    expect(weights.map(({ field }) => field)).toEqual([
      'barcode',
      'name',
      'brand',
      'alias',
      'ingredient',
      'trigram',
    ]);
    expect(weights.map(({ value }) => value)).toEqual(
      [...weights.map(({ value }) => value)].sort((a, b) => b - a),
    );
  });

  it('limits public results and keeps ordering deterministic', () => {
    expect(migration).toMatch(/p\.is_visible\s*=\s*true/i);
    expect(migration).toMatch(/pa\.is_searchable\s*=\s*true/i);
    expect(migration).toMatch(/least\(coalesce\(p_limit,\s*50\),\s*100\)/i);
    expect(migration).toMatch(/greatest\(coalesce\(p_offset,\s*0\),\s*0\)/i);
    expect(migration).toMatch(/order by[\s\S]*score desc[\s\S]*product_id asc/i);
    expect(migration).toMatch(/security invoker/i);
    expect(migration).toContain("SET search_path = ''");
  });
});

describe('searchProducts RPC client contract', () => {
  const body = functionBody('searchProducts');

  it('passes hostile and mixed queries only as RPC parameters', () => {
    for (const query of ['%', '_', ',', '"', '8801234567890', '오리젠 퍼피', '귀리', '오리잰']) {
      expect(query.length).toBeGreaterThan(0);
    }
    expect(body).toContain("rpc('search_catalog_products'");
    expect(body).toContain('p_query: normalizedQuery');
    expect(body).not.toContain('toOrIlikePattern');
    expect(body).not.toContain('builder.or(');
    expect(sqlFunctionBody).not.toMatch(/\bEXECUTE\b/i);
    expect(sqlFunctionBody).not.toMatch(/\bFORMAT\s*\(/i);
    expect(migration).not.toContain("LIKE '%' || q.query_text");
  });

  it('hydrates ranked IDs and restores RPC order', () => {
    expect(body).toContain("builder.in('id', productIds)");
    expect(body).toContain('buildProductQuery(withVisibilityFilter, rankedIds)');
    expect(body).toContain('rankById');
    expect(body).toContain("rpcError.code === 'PGRST202'");
  });
});
