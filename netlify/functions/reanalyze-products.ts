import { createHash } from 'node:crypto';

import type { Config } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getAnalysisReadiness } from '../../src/analysis/analysisReadiness';
import { getSupabaseServerClient } from './_shared/supabaseServer';

const MAX_BATCH = 100;
const ANALYSIS_SCHEMA_VERSION = 'ingredient-match-v1';

export interface ReanalysisJob {
  id: string;
  productId: string;
  engineVersionId: string;
  attemptCount: number;
}

export interface ReanalysisLabelItem {
  order: number;
  rawText: string;
  normalizedText: string | null;
  matchStatus: 'unreviewed' | 'matched' | 'ambiguous' | 'unmatched' | 'ignored';
  canonicalIngredientId: string | null;
}

export interface ReanalysisInput {
  labelSetId: string | null;
  items: ReanalysisLabelItem[];
}

export interface DeterministicReanalysisResult {
  schemaVersion: string;
  engineVersionId: string;
  labelSetId: string | null;
  readiness: ReturnType<typeof getAnalysisReadiness>;
  unknownTerms: string[];
  ambiguousTerms: string[];
  matchedCanonicalIngredientIds: string[];
  safeConclusion: null;
}

export interface ReanalysisRepository {
  claim(limit: number): Promise<ReanalysisJob[]>;
  load(job: ReanalysisJob): Promise<ReanalysisInput>;
  complete(
    job: ReanalysisJob,
    result: DeterministicReanalysisResult,
    checksum: string,
  ): Promise<void>;
  fail(job: ReanalysisJob, errorCode: string): Promise<void>;
}

interface QueueRow {
  id: string;
  product_id: string;
  engine_version_id: string;
  attempt_count: number;
}

interface LabelItemRow {
  display_order: number;
  raw_ingredient_text: string;
  normalized_ingredient_text: string | null;
  match_status: ReanalysisLabelItem['matchStatus'];
  canonical_ingredient_id: string | null;
}

interface LabelSetRow {
  id: string;
  product_ingredient_label_items?: LabelItemRow[];
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function analyzeReanalysisInput(
  job: Pick<ReanalysisJob, 'engineVersionId'>,
  input: ReanalysisInput,
): { result: DeterministicReanalysisResult; checksum: string } {
  const items = input.items.slice().sort((a, b) => a.order - b.order);
  const readiness = getAnalysisReadiness(items);
  const result: DeterministicReanalysisResult = {
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    engineVersionId: job.engineVersionId,
    labelSetId: input.labelSetId,
    readiness,
    unknownTerms: items
      .filter((item) => item.matchStatus === 'unmatched' || item.matchStatus === 'unreviewed')
      .map((item) => item.rawText),
    ambiguousTerms: items
      .filter((item) => item.matchStatus === 'ambiguous')
      .map((item) => item.rawText),
    matchedCanonicalIngredientIds: [...new Set(items
      .filter((item) => item.matchStatus === 'matched' && item.canonicalIngredientId)
      .map((item) => item.canonicalIngredientId as string))].sort(),
    // The match worker never invents an overall safety finding. Reviewed deterministic
    // risk rules can add findings in a later engine stage.
    safeConclusion: null,
  };
  return {
    result,
    checksum: createHash('sha256').update(stableStringify(result)).digest('hex'),
  };
}

export function createReanalysisRepository(client: SupabaseClient): ReanalysisRepository {
  return {
    async claim(limit) {
      const { data, error } = await client.rpc('claim_ingredient_reanalysis_batch', {
        p_limit: Math.min(MAX_BATCH, Math.max(1, limit)),
        p_lease_seconds: 300,
      });
      if (error) throw new Error('queue_claim_failed');
      return ((data ?? []) as QueueRow[]).map((row) => ({
        id: row.id,
        productId: row.product_id,
        engineVersionId: row.engine_version_id,
        attemptCount: row.attempt_count,
      }));
    },

    async load(job) {
      const { data, error } = await client
        .from('product_ingredient_label_sets')
        .select([
          'id',
          'product_ingredient_label_items(display_order,raw_ingredient_text,normalized_ingredient_text,match_status,canonical_ingredient_id)',
        ].join(','))
        .eq('product_id', job.productId)
        .eq('is_current', true)
        .maybeSingle();
      if (error) throw new Error('input_load_failed');
      const row = data as LabelSetRow | null;
      return {
        labelSetId: row?.id ?? null,
        items: (row?.product_ingredient_label_items ?? []).map((item) => ({
          order: item.display_order,
          rawText: item.raw_ingredient_text,
          normalizedText: item.normalized_ingredient_text,
          matchStatus: item.match_status,
          canonicalIngredientId: item.canonical_ingredient_id,
        })),
      };
    },

    async complete(job, result, checksum) {
      const { error } = await client.rpc('complete_ingredient_reanalysis', {
        p_queue_id: job.id,
        p_label_set_id: result.labelSetId,
        p_readiness_status: result.readiness.status,
        p_result: result,
        p_result_checksum: checksum,
      });
      if (error) throw new Error('result_persist_failed');
    },

    async fail(job, errorCode) {
      const { error } = await client.rpc('fail_ingredient_reanalysis', {
        p_queue_id: job.id,
        p_error_code: errorCode,
      });
      if (error) throw new Error('failure_record_failed');
    },
  };
}

function stableErrorCode(error: unknown): string {
  if (error instanceof Error && [
    'input_load_failed', 'result_persist_failed', 'failure_record_failed',
  ].includes(error.message)) return error.message;
  return 'analysis_failed';
}

export async function processReanalysisBatch(
  repository: ReanalysisRepository,
  limit = MAX_BATCH,
): Promise<{ claimed: number; completed: number; failed: number }> {
  const jobs = await repository.claim(Math.min(MAX_BATCH, Math.max(1, limit)));
  let completed = 0;
  let failed = 0;
  for (const job of jobs.slice(0, MAX_BATCH)) {
    try {
      const input = await repository.load(job);
      const { result, checksum } = analyzeReanalysisInput(job, input);
      await repository.complete(job, result, checksum);
      completed += 1;
    } catch (error) {
      failed += 1;
      try {
        await repository.fail(job, stableErrorCode(error));
      } catch {
        // Keep the bounded batch moving. The expired processing lease makes the job
        // reclaimable even when the failure marker itself cannot be stored.
      }
    }
  }
  return { claimed: jobs.length, completed, failed };
}

export default async function reanalyzeProducts(): Promise<Response> {
  try {
    const result = await processReanalysisBatch(
      createReanalysisRepository(getSupabaseServerClient()),
    );
    return Response.json(result);
  } catch {
    return Response.json({ code: 'reanalysis_unavailable' }, { status: 503 });
  }
}

export const config: Config = { schedule: '*/10 * * * *' };
