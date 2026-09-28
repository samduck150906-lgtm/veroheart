import { describe, expect, it, vi } from 'vitest';

import {
  purgeExpiredScanEvidence,
  type EvidencePurgeRepository,
  type PurgeCandidate,
} from '../../netlify/functions/purge-scan-evidence';

const old = '2026-08-01T00:00:00.000Z';
const recent = '2026-09-20T00:00:00.000Z';

function candidate(overrides: Partial<PurgeCandidate> = {}): PurgeCandidate {
  const id = '22222222-2222-4222-8222-222222222222';
  const userId = '11111111-1111-4111-8111-111111111111';
  return {
    id, userId, status: 'published', retentionAt: old,
    photoPaths: {
      front: [`${userId}/${id}/front/33333333-3333-4333-8333-333333333333.webp`],
      ingredient: [`${userId}/${id}/ingredient/44444444-4444-4444-8444-444444444444.webp`],
      nutrition: [`${userId}/${id}/nutrition/55555555-5555-4555-8555-555555555555.webp`],
    },
    ...overrides,
  };
}

function repository(rows: PurgeCandidate[], failing = new Set<string>()): EvidencePurgeRepository & { cleared: ReturnType<typeof vi.fn> } {
  return {
    listCandidates: vi.fn().mockResolvedValue(rows),
    deleteObject: vi.fn().mockImplementation((path: string) => Promise.resolve(!failing.has(path))),
    cleared: vi.fn().mockResolvedValue(undefined),
    updateRemainingPaths(id, paths) { return this.cleared(id, paths); },
  };
}

describe('scan evidence retention', () => {
  it('purges only terminal submissions older than 30 days', async () => {
    const active = candidate({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', status: 'processing' });
    const newRow = candidate({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', retentionAt: recent });
    const repo = repository([candidate(), active, newRow]);

    const result = await purgeExpiredScanEvidence(repo, new Date('2026-09-28T00:00:00.000Z'));

    expect(result.deleted).toBe(3);
    expect(repo.deleteObject).toHaveBeenCalledTimes(3);
  });

  it('keeps failed deletions in the row so the next run can retry them', async () => {
    const row = candidate();
    const failed = row.photoPaths.ingredient[0];
    const repo = repository([row], new Set([failed]));

    await purgeExpiredScanEvidence(repo, new Date('2026-09-28T00:00:00.000Z'));

    expect(repo.cleared).toHaveBeenCalledWith(row.id, {
      front: [], ingredient: [failed], nutrition: [],
    });
  });

  it('never deletes a path owned by another user or submission', async () => {
    const row = candidate();
    row.photoPaths.front.push('other-user/other-scan/front/bad.webp');
    const repo = repository([row]);
    await purgeExpiredScanEvidence(repo, new Date('2026-09-28T00:00:00.000Z'));
    expect(repo.deleteObject).not.toHaveBeenCalledWith('other-user/other-scan/front/bad.webp');
  });
});
