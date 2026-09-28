import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925190000_label_item_ingestion.sql',
), 'utf8').replace(/--.*$/gm, '').toLowerCase();

describe('label item ingestion migration', () => {
  it('adds a service-role-only idempotent ingestion RPC', () => {
    expect(migration).toContain('ingestion_request_id');
    expect(migration).toContain('unique');
    expect(migration).toContain('create or replace function public.ingest_product_ingredient_label');
    expect(migration).toContain("auth.role() <> 'service_role'");
    expect(migration).toContain('revoke all on function');
    expect(migration).toContain('grant execute on function');
  });

  it('replaces only the current label set and preserves ordered items', () => {
    expect(migration).toMatch(/update public\.product_ingredient_label_sets[\s\S]*set is_current = false/);
    expect(migration).toContain('display_order');
    expect(migration).toContain('raw_ingredient_text');
    expect(migration).toContain('parser_metadata');
    expect(migration).not.toMatch(/delete from public\.product_ingredient_label/);
  });

  it('queues unmatched and ambiguous terms and bounds input size', () => {
    expect(migration).toContain("in ('unmatched', 'ambiguous')");
    expect(migration).toContain('canonical_ingredient_review_queue');
    expect(migration).toContain('jsonb_array_length(p_items) > 100');
  });
});
