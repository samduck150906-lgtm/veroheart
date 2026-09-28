import type { Config, Context } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeBarcode } from '../../src/lib/productIdentity';
import { authenticateRequest } from './_shared/auth';
import {
  ExtractionValidationError,
  extractProductLabelFromImages,
  type ExtractedProductLabelResult,
} from './_shared/extractionSchema';
import { jsonResponse, readJsonObject } from './_shared/http';
import { lookupOpenPetFoodFacts } from './_shared/openPetFoodFacts';
import { getSupabaseServerClient } from './_shared/supabaseServer';

export const EXTRACTION_VERSION = 'community-label-v1';

interface ScanImagePaths {
  front: string[];
  ingredient: string[];
  nutrition: string[];
}

interface ClaimedSubmission {
  id: string;
  userId: string;
  scannedBarcode: string | null;
  imagePaths: ScanImagePaths;
}

type ClaimResult =
  | { kind: 'claimed'; submission: ClaimedSubmission }
  | { kind: 'reused'; status: string }
  | { kind: 'busy'; status: string }
  | { kind: 'missing' };

interface CompleteExtractionInput {
  submissionId: string;
  extractionVersion: string;
  extraction: ExtractedProductLabelResult;
  externalObservation: unknown;
  warningCode: string | null;
}

export interface ScanProcessingRepository {
  claim(
    submissionId: string,
    userId: string,
    imagePaths: ScanImagePaths,
    extractionVersion: string,
  ): Promise<ClaimResult>;
  createSignedReadUrls(paths: ScanImagePaths): Promise<string[]>;
  complete(input: CompleteExtractionInput): Promise<void>;
  fail(submissionId: string, extractionVersion: string, errorCode: string): Promise<void>;
}

export interface ScanProcessDependencies {
  authenticate(request: Request): Promise<string | null>;
  repository: ScanProcessingRepository;
  lookupExternal(barcode: string): Promise<unknown>;
  extract(imageUrls: string[], externalContext?: unknown): Promise<ExtractedProductLabelResult>;
}

function idFromRequest(request: Request): string | null {
  const match = new URL(request.url).pathname.match(
    /^\/api\/scans\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/process$/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

function validatePhotoPaths(value: unknown, userId: string, submissionId: string): ScanImagePaths | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  if (Object.keys(root).sort().join(',') !== 'front,ingredient,nutrition') return null;
  const result = {} as ScanImagePaths;
  for (const category of ['front', 'ingredient', 'nutrition'] as const) {
    const paths = root[category];
    if (!Array.isArray(paths) || paths.length < 1 || paths.length > 10) return null;
    const pattern = new RegExp(
      `^${userId}/${submissionId}/${category}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.webp$`,
      'i',
    );
    if (!paths.every((path) => typeof path === 'string' && pattern.test(path))) return null;
    result[category] = paths;
  }
  return result;
}

export function createScanProcessingRepository(client: SupabaseClient): ScanProcessingRepository {
  return {
    async claim(submissionId, userId, imagePaths, extractionVersion) {
      const { data, error } = await client.rpc('claim_scan_processing', {
        p_submission_id: submissionId,
        p_user_id: userId,
        p_front_paths: imagePaths.front,
        p_ingredient_paths: imagePaths.ingredient,
        p_nutrition_paths: imagePaths.nutrition,
        p_extraction_version: extractionVersion,
      });
      if (error || !data || typeof data !== 'object') throw new Error('claim_failed');
      return data as ClaimResult;
    },

    async createSignedReadUrls(imagePaths) {
      const paths = [
        ...imagePaths.front,
        ...imagePaths.ingredient,
        ...imagePaths.nutrition,
      ];
      const urls: string[] = [];
      for (const path of paths) {
        const { data, error } = await client.storage
          .from('product-scan-evidence')
          .createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw new Error('evidence_read_failed');
        urls.push(data.signedUrl);
      }
      return urls;
    },

    async complete(input) {
      const { error } = await client.rpc('complete_scan_extraction', {
        p_submission_id: input.submissionId,
        p_extraction_version: input.extractionVersion,
        p_extraction: input.extraction,
        p_external_observation: input.externalObservation,
        p_warning_code: input.warningCode,
      });
      if (error) throw new Error('complete_failed');
    },

    async fail(submissionId, extractionVersion, errorCode) {
      const { error } = await client.rpc('fail_scan_extraction', {
        p_submission_id: submissionId,
        p_extraction_version: extractionVersion,
        p_error_code: errorCode,
      });
      if (error) throw new Error('failure_record_failed');
    },
  };
}

function createDefaultDependencies(): ScanProcessDependencies {
  const client = getSupabaseServerClient();
  return {
    authenticate: (request) => authenticateRequest(request, client),
    repository: createScanProcessingRepository(client),
    lookupExternal: lookupOpenPetFoodFacts,
    extract: extractProductLabelFromImages,
  };
}

type Handler = (request: Request, context?: Context) => Promise<Response>;

export function createScanProcessHandler(injected?: ScanProcessDependencies): Handler {
  return async (request) => {
    if (request.method !== 'POST') return jsonResponse(405, { code: 'method_not_allowed' });
    let deps: ScanProcessDependencies;
    try {
      deps = injected ?? createDefaultDependencies();
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
    const userId = await deps.authenticate(request);
    if (!userId) return jsonResponse(401, { code: 'auth_required' });
    const submissionId = idFromRequest(request);
    const body = await readJsonObject(request);
    const photoPaths = submissionId
      ? validatePhotoPaths(body?.photoPaths, userId, submissionId)
      : null;
    if (!submissionId || !photoPaths) return jsonResponse(400, { code: 'invalid_request' });

    let claim: ClaimResult;
    try {
      claim = await deps.repository.claim(submissionId, userId, photoPaths, EXTRACTION_VERSION);
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
    if (claim.kind === 'missing') return jsonResponse(404, { code: 'scan_not_found' });
    if (claim.kind === 'reused' || claim.kind === 'busy') {
      return jsonResponse(202, { status: claim.status });
    }

    try {
      let externalObservation: unknown = { found: false };
      if (claim.submission.scannedBarcode) {
        try {
          externalObservation = await deps.lookupExternal(claim.submission.scannedBarcode);
        } catch {
          externalObservation = { found: false };
        }
      }
      const imageUrls = await deps.repository.createSignedReadUrls(claim.submission.imagePaths);
      const extraction = await deps.extract(imageUrls, externalObservation);
      const scannedBarcode = claim.submission.scannedBarcode
        ? normalizeBarcode(claim.submission.scannedBarcode)
        : null;
      const printedBarcode = extraction.printedBarcode
        ? normalizeBarcode(extraction.printedBarcode)
        : null;
      const warningCode = extraction.printedBarcode && !printedBarcode
        ? 'printed_barcode_invalid'
        : scannedBarcode && printedBarcode && scannedBarcode !== printedBarcode
          ? 'barcode_conflict'
          : null;
      await deps.repository.complete({
        submissionId,
        extractionVersion: EXTRACTION_VERSION,
        extraction,
        externalObservation,
        warningCode,
      });
    } catch (error) {
      const code = error instanceof ExtractionValidationError
        ? 'invalid_extraction'
        : 'extraction_failed';
      try {
        await deps.repository.fail(submissionId, EXTRACTION_VERSION, code);
      } catch {
        // The background retry remains safe because claim/complete are idempotent.
      }
    }

    return jsonResponse(202, { status: 'processing' });
  };
}

export default async function scanProcess(request: Request, context: Context): Promise<Response> {
  return createScanProcessHandler()(request, context);
}

export const config: Config = {
  path: '/api/scans/:id/process',
  method: 'POST',
  background: true,
};
