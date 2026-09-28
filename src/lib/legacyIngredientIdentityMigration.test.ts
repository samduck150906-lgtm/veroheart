import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260928200000_activate_legacy_ingredient_identity.sql',
), 'utf8').replace(/--.*$/gm, '').toLowerCase();

describe('legacy ingredient identity activation migration', () => {
  it('promotes legacy ingredient identities without changing legacy rows', () => {
    expect(migration).toContain('create or replace function public.normalize_ingredient_identity');
    expect(migration).toContain('insert into public.canonical_ingredients');
    expect(migration).toContain("'active'");
    expect(migration).toContain('legacy_ingredient_id');
    expect(migration).not.toMatch(/\b(update|delete|insert into)\s+public\.ingredients\b/);
  });

  it('imports only unambiguous aliases and preserves exact matching', () => {
    expect(migration).toContain('count(distinct canonical_ingredient_id)');
    expect(migration).toContain('insert into public.canonical_ingredient_aliases');
    expect(migration).toContain('owner_count = 1');
    expect(migration).toContain('on conflict (normalized_alias, language_code) do nothing');
  });

  it('records reviewed identity-only evidence without adding risk rules', () => {
    expect(migration).toContain('insert into public.ingredient_evidence_sources');
    expect(migration).toContain('insert into public.canonical_ingredient_evidence');
    expect(migration).toContain("'ingredient_identity'");
    expect(migration).toContain('reviewed_at');
    expect(migration).toContain('does not establish safety, toxicity, allergenicity, or efficacy');
    expect(migration).not.toMatch(/insert into public\.canonical_analysis_rules/);
    expect(migration).not.toMatch(/insert into public\.canonical_ingredient_allergen_map/);
  });
});
