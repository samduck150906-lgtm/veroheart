import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925210000_ingredient_reanalysis_queue.sql',
), 'utf8').replace(/--.*$/gm, '').toLowerCase();

describe('ingredient reanalysis queue migration', () => {
  it('deduplicates products per target engine version and stores stable retries', () => {
    expect(sql).toContain('ingredient_reanalysis_queue');
    expect(sql).toMatch(/unique\s*\(product_id, engine_version_id\)/);
    for (const field of ['attempt_count', 'lease_expires_at', 'error_code', 'status']) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("'pending', 'processing', 'completed', 'failed'");
  });

  it('claims at most 100 jobs using skip locked', () => {
    expect(sql).toContain('for update skip locked');
    expect(sql).toContain('least(greatest(p_limit, 1), 100)');
  });

  it('resolves a review and enqueues affected current products in one database function', () => {
    expect(sql).toContain('resolve_canonical_ingredient_review');
    expect(sql).toMatch(/update public\.canonical_ingredient_review_queue[\s\S]*select public\.enqueue_ingredient_reanalysis/);
    expect(sql).toContain('label_sets.is_current = true');
  });

  it('persists a versioned result and product readiness atomically', () => {
    expect(sql).toContain('product_ingredient_analysis_results');
    expect(sql).toContain('complete_ingredient_reanalysis');
    expect(sql).toMatch(/insert into public\.product_ingredient_analysis_results[\s\S]*update public\.products[\s\S]*update public\.ingredient_reanalysis_queue/);
  });
});
