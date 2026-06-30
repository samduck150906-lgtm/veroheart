import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260630090000_non_destructive_ingredient_schema.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const executableSql = migration.replace(/--.*$/gm, '');

const expectedTables = [
  'analysis_engine_versions',
  'canonical_ingredients',
  'canonical_ingredient_aliases',
  'ingredient_evidence_sources',
  'canonical_ingredient_evidence',
  'canonical_analysis_rules',
  'canonical_analysis_rule_evidence',
  'product_ingredient_label_sets',
  'product_ingredient_label_items',
  'canonical_ingredient_allergen_map',
  'canonical_ingredient_review_queue',
] as const;

const protectedTables = [
  'ingredients',
  'ingredient_synonyms',
  'analysis_rules',
  'ingredient_allergen_map',
  'unmatched_ingredients',
  'analysis_reports',
  'product_ingredients',
] as const;

describe('non-destructive ingredient migration contract', () => {
  it('creates only the expected additive tables', () => {
    const createdTables = [...executableSql.matchAll(/CREATE TABLE IF NOT EXISTS public\.(\w+)/g)]
      .map((match) => match[1]);

    expect(createdTables).toEqual(expectedTables);
  });

  it('does not mutate rows or redefine protected tables', () => {
    expect(executableSql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|TRUNCATE)\b/i);

    for (const table of protectedTables) {
      expect(executableSql).not.toMatch(new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\b`, 'i'));
    }

    expect(executableSql).not.toMatch(/REFERENCES\s+public\.product_ingredients\b/i);
  });

  it('enables RLS for every new table', () => {
    for (const table of expectedTables) {
      expect(executableSql).toMatch(
        new RegExp(`ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, 'i'),
      );
    }
  });

  it('keeps the review queue unavailable to client roles by default', () => {
    expect(executableSql).not.toMatch(
      /CREATE\s+POLICY[\s\S]*?ON\s+public\.canonical_ingredient_review_queue/i,
    );
  });
});
