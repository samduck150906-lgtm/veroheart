import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260925170000_scan_evidence_retention.sql',
), 'utf8').toLowerCase();

describe('scan evidence retention migration', () => {
  it('uses a terminal-state retention timestamp that path cleanup cannot postpone', () => {
    expect(sql).toContain('evidence_retention_at timestamptz');
    expect(sql).toContain("status in ('published', 'rejected', 'cancelled')");
    expect(sql).toContain('before insert or update of status');
    expect(sql).not.toContain('update of front_image_paths');
  });
});
