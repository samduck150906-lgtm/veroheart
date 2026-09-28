import type { Config, Context } from '@netlify/functions';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  matchCanonicalIngredients,
  type MatchableCanonicalIngredient,
} from '../../src/analysis/canonicalIngredientMatcher';
import { parseIngredientLabelItems } from '../../src/analysis/labelIngredientParser';
import { normalizeIngredientName } from '../../src/analysis/normalize';
import { slugifyProductName } from '../../src/lib/catalogBackfill';
import { buildCanonicalProductKey } from '../../src/lib/productIdentity';
import {
  resolveProductDuplicate,
  type DuplicateCandidate,
  type DuplicateResolution,
} from '../../src/scan/duplicateResolution';
import { evaluatePublicationGate } from '../../src/scan/publicationGate';
import type { ExtractedProductLabel, ScanPhotoPaths } from '../../src/scan/types';
import { authenticateRequest } from './_shared/auth';
import { jsonResponse } from './_shared/http';
import { getSupabaseServerClient } from './_shared/supabaseServer';

export interface PublicationSubmission {
  id: string;
  userId: string;
  status: string;
  scannedBarcode: string | null;
  confirmedBarcode: string | null;
  printedBarcode: string | null;
  processingErrorCode: string | null;
  resolvedProductId: string | null;
  photoPaths: ScanPhotoPaths;
  confirmed: ExtractedProductLabel;
}

export interface PublishTransactionInput {
  submissionId: string;
  userId: string;
  duplicate: DuplicateResolution;
  product: {
    rawName: string;
    displayName: string;
    brandName: string;
    manufacturerName: string | null;
    productType: ExtractedProductLabel['productType'];
    targetPetType: ExtractedProductLabel['species'];
    barcode: string | null;
    canonicalProductKey: string;
    slug: string;
    catalogSource: 'community_scan';
    verificationStatus: 'pending';
    isVisible: true;
    label: ExtractedProductLabel;
  };
}

export type PublicationResult =
  | { status: 'published'; productId: string }
  | { status: 'needs_review' };

export interface CommunityPublicationRepository {
  loadOwned(submissionId: string, userId: string): Promise<PublicationSubmission | null>;
  findDuplicateCandidates(barcode: string | null, canonicalKey: string): Promise<DuplicateCandidate[]>;
  publish(input: PublishTransactionInput): Promise<PublicationResult>;
  ingestAnalysis(input: {
    submissionId: string;
    productId: string;
    ingredients: string[];
  }): Promise<void>;
  markNeedsReview(submissionId: string, reason: string): Promise<void>;
  confirm(input: {
    submissionId: string;
    userId: string;
    confirmed: ExtractedProductLabel;
    confirmedBarcode: string | null;
  }): Promise<{ status: 'submitted' }>;
}

export type CanonicalScanIngredientItem = ReturnType<typeof prepareCanonicalScanIngredients>[number];

export function prepareCanonicalScanIngredients(
  ingredients: string[],
  canonicals: MatchableCanonicalIngredient[],
) {
  const parsed = parseIngredientLabelItems(ingredients.join('\n'));
  return matchCanonicalIngredients(parsed, canonicals).map((item) => ({
    order: item.order,
    rawText: item.rawText,
    normalizedText: normalizeIngredientName(item.baseText),
    amountText: item.amountText,
    percentage: item.percentage,
    canonicalIngredientId: item.canonicalIngredientId,
    candidateCanonicalIds: item.candidateCanonicalIds,
    matchStatus: item.matchStatus,
    parserMetadata: item.parserMetadata,
  }));
}

export interface ScanPublishDependencies {
  authenticate(request: Request): Promise<string | null>;
  repository: CommunityPublicationRepository;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  status: string;
  scanned_barcode: string | null;
  processing_error_code: string | null;
  resolved_product_id: string | null;
  front_image_paths: string[];
  ingredient_image_paths: string[];
  nutrition_image_paths: string[];
  extracted_data: Record<string, unknown>;
  confirmed_data: Record<string, unknown>;
}

function mapSubmission(row: SubmissionRow): PublicationSubmission {
  const wrapper = row.confirmed_data ?? {};
  const confirmed = ('label' in wrapper ? wrapper.label : wrapper) as ExtractedProductLabel;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    scannedBarcode: row.scanned_barcode,
    confirmedBarcode: typeof wrapper.confirmedBarcode === 'string' ? wrapper.confirmedBarcode : null,
    printedBarcode: typeof row.extracted_data?.printedBarcode === 'string'
      ? row.extracted_data.printedBarcode
      : null,
    processingErrorCode: row.processing_error_code,
    resolvedProductId: row.resolved_product_id,
    photoPaths: {
      front: row.front_image_paths ?? [],
      ingredient: row.ingredient_image_paths ?? [],
      nutrition: row.nutrition_image_paths ?? [],
    },
    confirmed,
  };
}

export function createCommunityPublicationRepository(
  client: SupabaseClient,
): CommunityPublicationRepository {
  return {
    async loadOwned(submissionId, userId) {
      const { data, error } = await client
        .from('product_scan_submissions')
        .select('id,user_id,status,scanned_barcode,processing_error_code,resolved_product_id,front_image_paths,ingredient_image_paths,nutrition_image_paths,extracted_data,confirmed_data')
        .eq('id', submissionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw new Error('scan_read_failed');
      return data ? mapSubmission(data as SubmissionRow) : null;
    },

    async findDuplicateCandidates(barcode, canonicalKey) {
      const filters = [`canonical_product_key.eq.${canonicalKey}`];
      if (barcode) filters.push(`barcode.eq.${barcode}`);
      const { data, error } = await client
        .from('products')
        .select('id,barcode,canonical_product_key')
        .or(filters.join(','))
        .limit(20);
      if (error) throw new Error('duplicate_query_failed');
      return (data ?? []).map((row) => ({
        id: row.id,
        barcode: row.barcode,
        canonicalProductKey: row.canonical_product_key,
      }));
    },

    async publish(input) {
      const linkedProductId = input.duplicate.action === 'link'
        ? input.duplicate.productId
        : null;
      const { data, error } = await client.rpc('publish_community_scan', {
        p_submission_id: input.submissionId,
        p_user_id: input.userId,
        p_duplicate_action: input.duplicate.action,
        p_existing_product_id: linkedProductId,
        p_product: input.product,
      });
      if (error || !data || typeof data !== 'object') throw new Error('publication_failed');
      const result = data as Record<string, unknown>;
      if (result.status === 'published' && typeof result.productId === 'string') {
        return { status: 'published', productId: result.productId };
      }
      if (result.status === 'needs_review') return { status: 'needs_review' };
      throw new Error('publication_failed');
    },

    async ingestAnalysis(input) {
      if (input.ingredients.length === 0) return;

      const { data: canonicalRows, error: canonicalError } = await client
        .from('canonical_ingredients')
        .select('id,canonical_name_ko,normalized_key,canonical_ingredient_aliases(alias_text)')
        .eq('status', 'active');
      if (canonicalError) throw new Error('canonical_read_failed');
      const canonicals: MatchableCanonicalIngredient[] = (canonicalRows ?? []).map((row) => ({
        id: row.id,
        canonicalName: row.canonical_name_ko,
        normalizedKey: row.normalized_key,
        aliases: (row.canonical_ingredient_aliases ?? []).map((alias) => alias.alias_text),
      }));
      const items = prepareCanonicalScanIngredients(input.ingredients, canonicals);

      const { error: ingestionError } = await client.rpc('ingest_product_ingredient_label', {
        p_request_id: input.submissionId,
        p_product_id: input.productId,
        p_source_type: 'package_image',
        p_source_reference: `community_scan:${input.submissionId}`,
        p_raw_label_text: input.ingredients.join('\n'),
        p_label_language: 'ko',
        p_items: items,
      });
      if (ingestionError) throw new Error('ingredient_ingestion_failed');

      const { data: engine, error: engineError } = await client
        .from('analysis_engine_versions')
        .select('id')
        .eq('version', 'ingredient-match-v1')
        .eq('status', 'active')
        .maybeSingle();
      if (engineError || !engine?.id) throw new Error('active_engine_required');

      const normalizedTerms = [...new Set(items.map((item) => item.normalizedText).filter(Boolean))];
      const canonicalIngredientIds = [...new Set(items
        .map((item) => item.canonicalIngredientId)
        .filter((id): id is string => Boolean(id)))];
      const { error: enqueueError } = await client.rpc('enqueue_ingredient_reanalysis', {
        p_normalized_terms: normalizedTerms,
        p_canonical_ingredient_ids: canonicalIngredientIds,
        p_engine_version_id: engine.id,
        p_reason: `community_scan:${input.submissionId}`,
      });
      if (enqueueError) throw new Error('reanalysis_enqueue_failed');
    },

    async markNeedsReview(submissionId, reason) {
      const { error } = await client
        .from('product_scan_submissions')
        .update({ status: 'needs_review', processing_error_code: reason })
        .eq('id', submissionId)
        .eq('status', 'submitted');
      if (error) throw new Error('review_transition_failed');
    },

    async confirm(input) {
      const { data, error } = await client.rpc('confirm_scan_submission', {
        p_submission_id: input.submissionId,
        p_user_id: input.userId,
        p_confirmed_label: input.confirmed,
        p_confirmed_barcode: input.confirmedBarcode,
      });
      if (error || data !== true) throw new Error('confirmation_failed');
      return { status: 'submitted' };
    },
  };
}

export function createDefaultPublicationDependencies(): ScanPublishDependencies {
  const client = getSupabaseServerClient();
  return {
    authenticate: (request) => authenticateRequest(request, client),
    repository: createCommunityPublicationRepository(client),
  };
}

function idFromRequest(request: Request, action: 'publish' | 'confirm'): string | null {
  const match = new URL(request.url).pathname.match(new RegExp(
    `^/api/scans/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/${action}$`,
    'i',
  ));
  return match?.[1]?.toLowerCase() ?? null;
}

export { idFromRequest };

type Handler = (request: Request, context?: Context) => Promise<Response>;

export function createScanPublishHandler(injected?: ScanPublishDependencies): Handler {
  return async (request) => {
    if (request.method !== 'POST') return jsonResponse(405, { code: 'method_not_allowed' });
    try {
      const deps = injected ?? createDefaultPublicationDependencies();
      const userId = await deps.authenticate(request);
      if (!userId) return jsonResponse(401, { code: 'auth_required' });
      const submissionId = idFromRequest(request, 'publish');
      if (!submissionId) return jsonResponse(400, { code: 'invalid_scan_id' });
      const submission = await deps.repository.loadOwned(submissionId, userId);
      if (!submission) return jsonResponse(404, { code: 'scan_not_found' });
      if (submission.status === 'published' && submission.resolvedProductId) {
        if (submission.confirmed.ingredients.length > 0) {
          await deps.repository.ingestAnalysis({
            submissionId,
            productId: submission.resolvedProductId,
            ingredients: submission.confirmed.ingredients,
          });
        }
        return jsonResponse(200, { status: 'published', productId: submission.resolvedProductId });
      }
      if (submission.status !== 'submitted') {
        return jsonResponse(409, { code: 'scan_not_confirmed' });
      }
      if (submission.processingErrorCode === 'barcode_conflict' && !submission.confirmedBarcode) {
        await deps.repository.markNeedsReview(submissionId, 'barcode_conflict');
        return jsonResponse(202, { status: 'needs_review', code: 'barcode_conflict' });
      }

      const barcode = submission.confirmedBarcode ?? submission.scannedBarcode;
      const canonicalKey = buildCanonicalProductKey({
        manufacturer: submission.confirmed.manufacturer,
        brand: submission.confirmed.brand,
        displayName: submission.confirmed.name,
        targetPetType: submission.confirmed.species,
      });
      if (!canonicalKey) return jsonResponse(422, { code: 'missing_identity', fields: ['canonicalProductKey'] });
      const candidates = await deps.repository.findDuplicateCandidates(barcode, canonicalKey);
      const duplicate = resolveProductDuplicate({ barcode, canonicalProductKey: canonicalKey }, candidates);
      if (duplicate.action === 'ambiguous' || duplicate.action === 'review') {
        await deps.repository.markNeedsReview(submissionId, 'ambiguous_duplicate');
        return jsonResponse(202, { status: 'needs_review', code: 'ambiguous_duplicate' });
      }

      const gate = evaluatePublicationGate({
        authenticated: true,
        scannedBarcode: barcode,
        printedBarcode: submission.confirmedBarcode ? barcode : submission.printedBarcode,
        duplicateResolution: duplicate.action === 'link' ? 'unique' : 'none',
        photoPaths: submission.photoPaths,
        confirmed: submission.confirmed,
      });
      if (!gate.ok) {
        if (gate.code === 'barcode_conflict' || gate.code === 'ambiguous_duplicate') {
          await deps.repository.markNeedsReview(submissionId, gate.code);
          return jsonResponse(202, { status: 'needs_review', code: gate.code });
        }
        return jsonResponse(422, gate);
      }

      const brandName = submission.confirmed.brand ?? submission.confirmed.manufacturer;
      if (!brandName) {
        return jsonResponse(422, { code: 'missing_identity', fields: ['brandOrManufacturer'] });
      }
      const result = await deps.repository.publish({
        submissionId,
        userId,
        duplicate,
        product: {
          rawName: submission.confirmed.name,
          displayName: submission.confirmed.name,
          brandName,
          manufacturerName: submission.confirmed.manufacturer,
          productType: submission.confirmed.productType,
          targetPetType: submission.confirmed.species,
          barcode,
          canonicalProductKey: canonicalKey,
          slug: slugifyProductName(submission.confirmed.name),
          catalogSource: 'community_scan',
          verificationStatus: 'pending',
          isVisible: true,
          label: submission.confirmed,
        },
      });
      if (result.status === 'needs_review') {
        return jsonResponse(202, result);
      }
      if (submission.confirmed.ingredients.length > 0) {
        await deps.repository.ingestAnalysis({
          submissionId,
          productId: result.productId,
          ingredients: submission.confirmed.ingredients,
        });
      }
      return jsonResponse(200, result);
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
  };
}

export default async function scanPublish(request: Request, context: Context): Promise<Response> {
  return createScanPublishHandler()(request, context);
}

export const config: Config = { path: '/api/scans/:id/publish', method: 'POST' };
