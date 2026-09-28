import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925210000_ingredient_reanalysis_queue.sql',
), 'utf8').replace(/--.*$/gm, '').toLowerCase();

describe('ingredient reanalysis queue migration', () => {
  it('installs an active deterministic engine version for scan reanalysis', () => {
    expect(sql).toContain("'ingredient-match-v1'");
    expect(sql).toMatch(/insert into public\.analysis_engine_versions[\s\S]*'active'/);
  });

  it('deduplicates products per target engine version and stores stable retries', () => {
    expect(sql).toContain('ingredient_reanalysis_queue');
    expect(sql).toMatch(/unique\s*\(product_id, engine_version_id\)/);
    for (const field of ['attempt_count', 'lease_expires_at', 'error_code', 'status']) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("'pending', 'processing', 'completed', 'failed'");
  });

  it('requeues the same engine only for failed, changed-label, or reviewed-rule work', () => {
    expect(sql).toMatch(/on conflict \(product_id, engine_version_id\) do update set[\s\S]*status = 'pending'/);
    expect(sql).toMatch(/product_ingredient_analysis_results[\s\S]*label_set_id = current_label\.id/);
    expect(sql).toContain("excluded.reason like 'ingredient_review:%'");
    expect(sql).toContain("excluded.reason like 'rule_change:%'");
  });

  it('claims at most 100 jobs using skip locked', () => {
    expect(sql).toContain('for update skip locked');
    expect(sql).toContain('least(greatest(p_limit, 1), 100)');
  });

  it('resolves a review and enqueues affected current products in one database function', () => {
    expect(sql).toContain('resolve_canonical_ingredient_review');
    expect(sql).toMatch(/update public\.canonical_ingredient_review_queue[\s\S]*select public\.enqueue_ingredient_reanalysis/);
    expect(sql).toContain('label_sets.is_current = true');
    expect(sql).toMatch(
      /select public\.enqueue_ingredient_reanalysis\(\s*array\[v_normalized\],\s*array\[\]::uuid\[\]/,
    );
  });

  it('persists a versioned result and product readiness atomically', () => {
    expect(sql).toContain('product_ingredient_analysis_results');
    expect(sql).toContain('complete_ingredient_reanalysis');
    expect(sql).toMatch(/insert into public\.product_ingredient_analysis_results[\s\S]*update public\.products[\s\S]*update public\.ingredient_reanalysis_queue/);
  });

  it('rejects a completion result when its label set is no longer current', () => {
    expect(sql).toMatch(
      /if p_label_set_id is null[\s\S]*product_ingredient_label_sets[\s\S]*is_current = true[\s\S]*raise exception 'stale_label_set'/,
    );
    expect(sql).toMatch(
      /else\s+if not exists \([\s\S]*id = p_label_set_id[\s\S]*product_id = v_product_id[\s\S]*is_current = true[\s\S]*raise exception 'stale_label_set'/,
    );
  });
});
