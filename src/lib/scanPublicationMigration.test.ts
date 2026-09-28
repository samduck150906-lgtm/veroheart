import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260925160000_publish_community_scan.sql'),
  'utf8',
).replace(/--.*$/gm, '').toLowerCase();

describe('community publication transaction migration', () => {
  it('preserves OCR, stores confirmation separately, and records barcode corrections', () => {
    expect(sql).toContain('create or replace function public.confirm_scan_submission');
    expect(sql).toContain('confirmed_data');
    expect(sql).not.toMatch(/set\s+extracted_data\s*=/);
    expect(sql).toContain("'user_correction'");
  });

  it('locks publication, rechecks exact identity, and is idempotent', () => {
    expect(sql).toContain('create or replace function public.publish_community_scan');
    expect(sql).toContain('for update');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain("current_submission.status = 'published'");
    expect(sql).toContain("status = 'needs_review'");
  });

  it('creates public pending community products and ordered label items', () => {
    expect(sql).toContain('create table if not exists public.product_label_sets');
    expect(sql).toContain('create table if not exists public.product_label_items');
    expect(sql).toContain("'community_scan'");
    expect(sql).toContain("'pending'");
    expect(sql).toContain('is_visible');
    expect(sql).toContain('with ordinality');
  });

  it('keeps mutation functions service-role only', () => {
    for (const name of ['confirm_scan_submission', 'publish_community_scan']) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${name}[\\s\\S]*?from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*?to service_role`));
    }
  });
});
