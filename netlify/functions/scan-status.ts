import type { Config, Context } from '@netlify/functions';

import { jsonResponse } from './_shared/http';
import {
  createDefaultScanDependencies,
  type ScanEndpointContext,
  type ScanEndpointDependencies,
} from './_shared/supabaseServer';

type Handler = (request: Request, context?: ScanEndpointContext) => Promise<Response>;

function submissionIdFrom(request: Request): string | null {
  const match = new URL(request.url).pathname.match(
    /^\/api\/scans\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function createScanStatusHandler(injected?: ScanEndpointDependencies): Handler {
  return async (request) => {
    if (request.method !== 'GET') return jsonResponse(405, { code: 'method_not_allowed' });
    try {
      const deps = injected ?? createDefaultScanDependencies();
      const userId = await deps.authenticate(request);
      if (!userId) return jsonResponse(401, { code: 'auth_required' });
      const submissionId = submissionIdFrom(request);
      if (!submissionId) return jsonResponse(400, { code: 'invalid_scan_id' });
      const submission = await deps.repository.findOwnedSubmission(submissionId, userId);
      if (!submission) return jsonResponse(404, { code: 'scan_not_found' });

      return jsonResponse(200, {
        id: submission.id,
        status: submission.status,
        errorCode: submission.processing_error_code,
        extractedData: submission.extracted_data,
        fieldConfidence: submission.field_confidence,
        resolvedProductId: submission.resolved_product_id,
      });
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
  };
}

export default async function scanStatus(request: Request, context: Context): Promise<Response> {
  return createScanStatusHandler()(request, context);
}

export const config: Config = { path: '/api/scans/:id' };
