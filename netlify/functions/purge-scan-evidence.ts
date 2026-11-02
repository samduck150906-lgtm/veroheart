import type { Config } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { ScanPhotoPaths } from '../../src/scan/types';
import { getSupabaseServerClient } from './_shared/supabaseServer';

const TERMINAL = new Set(['published', 'rejected', 'cancelled']);
const RETENTION_DAYS = 30;

export interface PurgeCandidate {
  id: string;
  userId: string;
  status: string;
  retentionAt: string;
  photoPaths: ScanPhotoPaths;
}

export interface EvidencePurgeRepository {
  listCandidates(cutoffIso: string): Promise<PurgeCandidate[]>;
  claimCandidate(id: string, cutoffIso: string): Promise<boolean>;
  deleteObject(path: string): Promise<boolean>;
  updateRemainingPaths(id: string, paths: ScanPhotoPaths): Promise<void>;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  status: string;
  evidence_retention_at: string;
  front_image_paths: string[];
  ingredient_image_paths: string[];
  nutrition_image_paths: string[];
  scan_evidence_uploads?: { path: string; category: keyof ScanPhotoPaths }[];
}

export function createEvidencePurgeRepository(client: SupabaseClient): EvidencePurgeRepository {
  return {
    async listCandidates(cutoffIso) {
      const { data, error } = await client
        .from('product_scan_submissions')
        .select('id,user_id,status,evidence_retention_at,front_image_paths,ingredient_image_paths,nutrition_image_paths,scan_evidence_uploads(path,category)')
        .is('evidence_purged_at', null)
        .lt('evidence_retention_at', cutoffIso)
        .order('evidence_purge_attempted_at', { ascending: true, nullsFirst: true })
        .order('evidence_retention_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(200);
      if (error) throw new Error('retention_read_failed');
      return ((data ?? []) as SubmissionRow[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        status: row.status,
        retentionAt: row.evidence_retention_at,
        photoPaths: {
          front: [...new Set([...(row.front_image_paths ?? []), ...(row.scan_evidence_uploads ?? []).filter((upload) => upload.category === 'front').map((upload) => upload.path)])],
          ingredient: [...new Set([...(row.ingredient_image_paths ?? []), ...(row.scan_evidence_uploads ?? []).filter((upload) => upload.category === 'ingredient').map((upload) => upload.path)])],
          nutrition: [...new Set([...(row.nutrition_image_paths ?? []), ...(row.scan_evidence_uploads ?? []).filter((upload) => upload.category === 'nutrition').map((upload) => upload.path)])],
        },
      }));
    },

    async claimCandidate(id, cutoffIso) {
      const { data, error } = await client.rpc('claim_expired_scan_evidence', { p_submission_id: id, p_cutoff: cutoffIso });
      if (error) throw new Error('retention_claim_failed');
      return data === true;
    },

    async deleteObject(path) {
      const { error } = await client.storage.from('product-scan-evidence').remove([path]);
      return !error;
    },

    async updateRemainingPaths(id, paths) {
      const allPaths = [...paths.front, ...paths.ingredient, ...paths.nutrition];
      const { error } = await client
        .from('product_scan_submissions')
        .update({
          front_image_paths: paths.front,
          ingredient_image_paths: paths.ingredient,
          nutrition_image_paths: paths.nutrition,
          evidence_purged_at: allPaths.length === 0 ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .in('status', [...TERMINAL]);
      if (error) throw new Error('retention_update_failed');
      // Removing manifest rows for already deleted objects is optional for retry
      // correctness; retain failed paths and clear the manifest only at completion.
      if (allPaths.length === 0) {
        const { error: manifestError } = await client.from('scan_evidence_uploads').delete().eq('submission_id', id);
        if (manifestError) throw new Error('retention_manifest_failed');
      }
    },
  };
}

function isOwnedPath(row: PurgeCandidate, category: keyof ScanPhotoPaths, path: string): boolean {
  const escapedUser = row.userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedId = row.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedUser}/${escapedId}/${category}/[0-9a-f-]+\\.(webp|jpg|png)$`, 'i').test(path);
}

export async function purgeExpiredScanEvidence(
  repository: EvidencePurgeRepository,
  now = new Date(),
): Promise<{ scanned: number; deleted: number; retained: number }> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const rows = await repository.listCandidates(cutoff.toISOString());
  let deleted = 0;
  let retained = 0;

  for (const row of rows) {
    if (!Number.isFinite(Date.parse(row.retentionAt)) || new Date(row.retentionAt).getTime() >= cutoff.getTime()) continue;
    if (!(await repository.claimCandidate(row.id, cutoff.toISOString()))) continue;
    const remaining: ScanPhotoPaths = { front: [], ingredient: [], nutrition: [] };
    for (const category of ['front', 'ingredient', 'nutrition'] as const) {
      for (const path of row.photoPaths[category]) {
        if (!isOwnedPath(row, category, path)) {
          remaining[category].push(path);
          retained += 1;
          continue;
        }
        if (await repository.deleteObject(path)) deleted += 1;
        else {
          remaining[category].push(path);
          retained += 1;
        }
      }
    }
    await repository.updateRemainingPaths(row.id, remaining);
  }
  return { scanned: rows.length, deleted, retained };
}

export default async function purgeScanEvidence(): Promise<Response> {
  try {
    const result = await purgeExpiredScanEvidence(
      createEvidencePurgeRepository(getSupabaseServerClient()),
    );
    return Response.json(result);
  } catch {
    return Response.json({ code: 'retention_failed' }, { status: 500 });
  }
}

export const config: Config = { schedule: '0 3 * * *' }; // 03:00 UTC / 12:00 KST daily.
