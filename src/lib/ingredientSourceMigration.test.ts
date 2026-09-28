import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925180000_ingredient_source_dimensions.sql',
), 'utf8');
const sql = migration.replace(/--.*$/gm, '').toLowerCase();

describe('ingredient source dimensions migration', () => {
  it('adds identity dimensions without changing the legacy ingredient table', () => {
    for (const column of ['source_family', 'source_species', 'source_part', 'processing_form', 'identity_key']) {
      expect(sql).toContain(`add column if not exists ${column}`);
    }
    expect(sql).not.toMatch(/alter table public\.ingredients\b/);
    expect(sql).not.toMatch(/\b(update|delete|insert into)\s+public\.ingredients\b/);
  });

  it('indexes families and enforces one active row per non-null identity key', () => {
    expect(sql).toContain('idx_canonical_ingredients_source_family');
    expect(sql).toMatch(/create unique index[\s\S]*identity_key[\s\S]*where status = 'active'/);
  });

  it('keeps canonical ingredients behind RLS', () => {
    expect(sql).toContain('alter table public.canonical_ingredients enable row level security');
  });
});
