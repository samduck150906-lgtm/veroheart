import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260925150000_scan_processing_rpc.sql'),
  'utf8',
).replace(/--.*$/gm, '').toLowerCase();

describe('scan processing transaction migration', () => {
  it('locks and idempotently claims only an owned retryable submission', () => {
    expect(sql).toContain('create or replace function public.claim_scan_processing');
    expect(sql).toContain('for update');
    expect(sql).toContain("status = 'processing'");
    expect(sql).toContain("'reused'");
    expect(sql).toContain('extraction_version');
  });

  it('stores immutable observations and completes confirmation in one transaction', () => {
    expect(sql).toContain('create or replace function public.complete_scan_extraction');
    expect(sql).toContain('insert into public.product_observations');
    expect(sql).toContain("'user_scan'");
    expect(sql).toContain('on conflict (scan_submission_id, source_type) where scan_submission_id is not null do nothing');
    expect(sql).toContain("status = 'needs_confirmation'");
  });

  it('exposes claim, complete, and failure functions only to the service role', () => {
    for (const name of ['claim_scan_processing', 'complete_scan_extraction', 'fail_scan_extraction']) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${name}[\\s\\S]*?from public, anon, authenticated`));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${name}[\\s\\S]*?to service_role`));
    }
  });
});
