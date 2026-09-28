import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260925140000_scan_rate_limit_rpc.sql'),
  'utf8',
).replace(/--.*$/gm, '').toLowerCase();

describe('scan rate-limit RPC migration', () => {
  it('increments one HMAC bucket atomically and purges expired buckets', () => {
    expect(sql).toContain('create or replace function public.consume_scan_rate_limit');
    expect(sql).toContain('insert into public.scan_rate_limit_buckets');
    expect(sql).toContain('on conflict (bucket_digest, scope, window_start) do update');
    expect(sql).toMatch(/request_count\s*=\s*scan_rate_limit_buckets\.request_count\s*\+\s*1/);
    expect(sql).toContain('delete from public.scan_rate_limit_buckets');
    expect(sql).toContain('expires_at < now()');
  });

  it('is callable only by the service role and stores no raw address', () => {
    expect(sql).toMatch(/revoke all on function public\.consume_scan_rate_limit[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.consume_scan_rate_limit[\s\S]*to service_role/);
    expect(sql).not.toMatch(/\b(raw_ip|ip_address|access_token|refresh_token)\b/);
  });

  it('seeds the explicit community scan kill switch', () => {
    expect(sql).toContain("'community_scan_enabled'");
    expect(sql).toContain("'true'::jsonb");
  });
});
