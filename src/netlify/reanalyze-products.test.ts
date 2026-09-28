import { describe, expect, it } from 'vitest';

import {
  analyzeReanalysisInput,
  processReanalysisBatch,
  type ReanalysisInput,
  type ReanalysisJob,
  type ReanalysisRepository,
} from '../../netlify/functions/reanalyze-products';

const job = (id: string, engineVersionId = 'engine-v2'): ReanalysisJob => ({
  id,
  productId: `product-${id}`,
  engineVersionId,
  attemptCount: 1,
});

const partialInput: ReanalysisInput = {
  labelSetId: 'label-1',
  items: [
    { order: 2, rawText: '미확인 원료', normalizedText: '미확인원료', matchStatus: 'unmatched', canonicalIngredientId: null },
    { order: 1, rawText: '닭고기', normalizedText: '닭고기', matchStatus: 'matched', canonicalIngredientId: 'chicken' },
  ],
};

describe('ingredient reanalysis worker', () => {
  it('produces deterministic partial output without a safe conclusion', () => {
    const first = analyzeReanalysisInput(job('1'), partialInput);
    const second = analyzeReanalysisInput(job('1'), partialInput);
    expect(first).toEqual(second);
    expect(first.result).toMatchObject({
      engineVersionId: 'engine-v2',
      readiness: { status: 'partial', unknownCount: 1 },
      unknownTerms: ['미확인 원료'],
      matchedCanonicalIngredientIds: ['chicken'],
      safeConclusion: null,
    });
  });

  it('processes at most 100 claimed jobs and persists the claimed target version', async () => {
    const completed: Array<{ job: ReanalysisJob; checksum: string }> = [];
    const repository: ReanalysisRepository = {
      claim: async (limit) => Array.from({ length: limit }, (_, index) => job(String(index), 'fixed-engine')),
      load: async () => partialInput,
      complete: async (claimedJob, _result, checksum) => { completed.push({ job: claimedJob, checksum }); },
      fail: async () => undefined,
    };
    const result = await processReanalysisBatch(repository, 500);
    expect(result).toEqual({ claimed: 100, completed: 100, failed: 0 });
    expect(new Set(completed.map((entry) => entry.job.engineVersionId))).toEqual(new Set(['fixed-engine']));
    expect(completed.every((entry) => /^[0-9a-f]{64}$/.test(entry.checksum))).toBe(true);
  });

  it('records stable per-job errors without aborting the batch', async () => {
    const failed: Array<[string, string]> = [];
    const completed: string[] = [];
    const repository: ReanalysisRepository = {
      claim: async () => [job('bad'), job('good')],
      load: async (claimedJob) => {
        if (claimedJob.id === 'bad') throw new Error('input_load_failed');
        return { labelSetId: null, items: [] };
      },
      complete: async (claimedJob) => { completed.push(claimedJob.id); },
      fail: async (claimedJob, code) => { failed.push([claimedJob.id, code]); },
    };
    expect(await processReanalysisBatch(repository)).toEqual({ claimed: 2, completed: 1, failed: 1 });
    expect(completed).toEqual(['good']);
    expect(failed).toEqual([['bad', 'input_load_failed']]);
  });
});
