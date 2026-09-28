import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260925130000_community_scan_submissions.sql',
);
const migration = readFileSync(migrationPath, 'utf8');
const sql = migration.replace(/--.*$/gm, '').toLowerCase();

describe('community scan submission migration', () => {
  it('creates private submissions with every supported state and extraction field', () => {
    expect(sql).toContain('create table if not exists public.product_scan_submissions');
    for (const state of [
      'draft',
      'uploaded',
      'processing',
      'needs_confirmation',
      'submitted',
      'published',
      'needs_review',
      'failed',
      'cancelled',
      'rejected',
    ]) {
      expect(sql).toContain(`'${state}'`);
    }
    for (const field of [
      'front_image_paths text[]',
      'ingredient_image_paths text[]',
      'nutrition_image_paths text[]',
      'extraction_version text',
      'extracted_data jsonb',
      'confirmed_data jsonb',
      'field_confidence jsonb',
      'processing_error_code text',
      'resolved_product_id uuid',
    ]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain('product_scan_submissions_processing_key');
    expect(sql).toContain('trg_product_scan_submissions_updated_at');
  });

  it('links one immutable observation per submission and source type', () => {
    expect(sql).toMatch(
      /alter table public\.product_observations[\s\S]*add column if not exists scan_submission_id uuid/,
    );
    expect(sql).toContain('product_observations_submission_source_key');
    expect(sql).toContain('(scan_submission_id, source_type)');
    expect(sql).toContain('where scan_submission_id is not null');
  });

  it('allows authenticated users to access only their own pre-publication rows', () => {
    expect(sql).toContain('alter table public.product_scan_submissions enable row level security');
    expect(sql).toContain('create policy product_scan_submissions_owner_select');
    expect(sql).toContain('create policy product_scan_submissions_owner_update');
    expect(sql.match(/user_id\s*=\s*auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sql).toMatch(/product_scan_submissions_owner_select[\s\S]*status\s+not\s+in\s*\('published', 'rejected'\)/);
    expect(sql).toMatch(/product_scan_submissions_owner_update[\s\S]*status\s+in\s*\('draft', 'uploaded', 'needs_confirmation', 'failed'\)/);
  });

  it('keeps evidence storage private and enforces the owned object path shape', () => {
    expect(sql).toMatch(
      /insert into storage\.buckets[\s\S]*'product-scan-evidence'[\s\S]*false/,
    );
    expect(migration.toLowerCase()).toContain('<user-id>/<submission-id>/<category>/<uuid>.webp');
    expect(sql).toContain('scan_evidence_paths_valid');
    expect(sql).toMatch(/grant execute on function public\.scan_evidence_paths_valid[\s\S]*to authenticated/);
    expect(sql).not.toMatch(/create policy[\s\S]*on storage\.objects/);
  });

  it('keeps observations, processing events, and expiring rate buckets service-only', () => {
    expect(sql).toContain('create table if not exists public.scan_processing_events');
    expect(sql).toContain('duration_ms integer');
    expect(sql).toContain('safe_error_code text');
    expect(sql).toContain('create table if not exists public.scan_rate_limit_buckets');
    expect(sql).toContain('bucket_digest text');
    expect(sql).toContain('expires_at timestamptz');
    expect(sql).toContain('idx_scan_rate_limit_buckets_expires_at');

    for (const table of [
      'product_observations',
      'scan_processing_events',
      'scan_rate_limit_buckets',
    ]) {
      expect(sql).toContain(`revoke all on table public.${table} from anon, authenticated`);
    }
    expect(sql).not.toMatch(/\b(raw_ip|ip_address|access_token|refresh_token)\b/);
  });
});
