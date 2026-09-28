import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925200000_allergen_family_relationships.sql',
), 'utf8').replace(/--.*$/gm, '').toLowerCase();

describe('reviewed allergen family migration', () => {
  it('requires source, review, species, relationship, and processing fields', () => {
    for (const field of [
      'source_family', 'allergen_id', 'relationship_type', 'processing_form_condition',
      'species_scope', 'evidence_source_id', 'reviewed_by', 'reviewed_at', 'is_active',
    ]) expect(sql).toContain(field);
    expect(sql).toContain('references public.ingredient_evidence_sources');
  });

  it('allows clients to read active reviewed rows but never write them', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toMatch(/create policy[\s\S]*for select[\s\S]*is_active = true[\s\S]*reviewed_at is not null/);
    expect(sql).toContain('revoke insert, update, delete');
  });
});
