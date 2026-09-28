import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(
  process.cwd(),
  'supabase/functions/admin-operations/index.ts',
), 'utf8');

describe('admin scan operations boundary', () => {
  it('returns a redacted queue and signs evidence only on explicit open', () => {
    const list = source.slice(
      source.indexOf("case 'listScanSubmissions'"),
      source.indexOf("case 'getScanEvidence'"),
    );
    expect(list).not.toContain('user_id');
    expect(list).not.toContain('front_image_paths');
    expect(source).toContain("case 'getScanEvidence'");
    expect(source).toContain("createSignedUrl(path, 300)");
  });

  it('requires reasons and audits before/after status for every review mutation', () => {
    const review = source.slice(
      source.indexOf("case 'reviewScanSubmission'"),
      source.indexOf("case 'listProductRequests'"),
    );
    expect(review).toContain("if (!reason) throw new ValidationError");
    expect(review).toContain('beforeStatus: before.status');
    expect(review).toContain('afterStatus: nextStatus');
    expect(review).toContain('reason,');
  });
});
