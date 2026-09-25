import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260925100000_community_catalog_foundation.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const executableSql = migration.replace(/--.*$/gm, '');

describe('community catalog foundation migration', () => {
  it('adds clean catalog fields without replacing the legacy product name', () => {
    for (const column of [
      'display_name',
      'normalized_name',
      'variant_name',
      'net_weight_text',
      'normalized_brand_name',
      'canonical_product_key',
      'slug',
      'catalog_source',
      'analysis_status',
      'last_observed_at',
    ]) {
      expect(executableSql).toMatch(new RegExp(`add column if not exists ${column}\\b`, 'i'));
    }
    expect(executableSql).not.toMatch(/drop\s+column\s+(?:if\s+exists\s+)?name\b/i);
  });

  it('creates aliases and immutable source observations with row-level security', () => {
    expect(executableSql).toMatch(/create table if not exists public\.product_observations\b/i);
    expect(executableSql).toMatch(/create table if not exists public\.product_aliases\b/i);
    expect(executableSql).toMatch(
      /alter table public\.product_observations enable row level security/i,
    );
    expect(executableSql).toMatch(
      /alter table public\.product_aliases enable row level security/i,
    );
    expect(executableSql).toMatch(
      /revoke all on table public\.product_observations from anon, authenticated/i,
    );
  });

  it('exposes only searchable aliases for visible products', () => {
    expect(executableSql).toMatch(/create policy product_aliases_public_read/i);
    expect(executableSql).toMatch(/is_searchable\s*=\s*true/i);
    expect(executableSql).toMatch(/p\.is_visible\s*=\s*true/i);
    expect(executableSql).toMatch(
      /revoke insert, update, delete on table public\.product_aliases from anon, authenticated/i,
    );
  });

  it('is additive and performs no product data rewrite', () => {
    expect(executableSql).not.toMatch(/(?:^|;)\s*(?:insert|update|delete|truncate)\b/im);
  });
});
