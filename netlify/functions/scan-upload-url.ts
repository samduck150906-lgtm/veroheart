import type { Config, Context } from '@netlify/functions';

import { digestRateLimitKey } from './_shared/auth';
import { jsonResponse, readJsonObject } from './_shared/http';
import {
  createDefaultScanDependencies,
  type ScanEndpointContext,
  type ScanEndpointDependencies,
} from './_shared/supabaseServer';

const CATEGORIES = new Set(['front', 'ingredient', 'nutrition']);
const UPLOADABLE_STATES = new Set(['draft', 'uploaded', 'needs_confirmation', 'failed']);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
type Handler = (request: Request, context?: ScanEndpointContext) => Promise<Response>;

function submissionIdFrom(request: Request): string | null {
  const match = new URL(request.url).pathname.match(
    /^\/api\/scans\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/upload-url$/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function createScanUploadUrlHandler(injected?: ScanEndpointDependencies): Handler {
  return async (request, context) => {
    if (request.method !== 'POST') return jsonResponse(405, { code: 'method_not_allowed' });
    try {
      const deps = injected ?? createDefaultScanDependencies();
      const userId = await deps.authenticate(request);
      if (!userId) return jsonResponse(401, { code: 'auth_required' });
      if (!(await deps.repository.isCommunityScanEnabled())) {
        return jsonResponse(503, { code: 'community_scan_disabled' });
      }
      if (!deps.rateLimitSecret) return jsonResponse(503, { code: 'scan_unavailable' });

      const submissionId = submissionIdFrom(request);
      const body = await readJsonObject(request);
      const category = body?.category;
      const mimeType = body?.mimeType;
      const size = body?.size;
      if (
        !submissionId ||
        typeof category !== 'string' ||
        !CATEGORIES.has(category) ||
        mimeType !== 'image/webp' ||
        typeof size !== 'number' ||
        !Number.isInteger(size) ||
        size <= 0 ||
        size > MAX_IMAGE_BYTES
      ) {
        return jsonResponse(400, { code: 'invalid_upload' });
      }

      const owned = await deps.repository.findOwnedSubmission(submissionId, userId);
      if (!owned) return jsonResponse(404, { code: 'scan_not_found' });
      if (!UPLOADABLE_STATES.has(owned.status)) {
        return jsonResponse(409, { code: 'scan_closed' });
      }

      const now = deps.now();
      const windowStart = new Date(now);
      windowStart.setUTCMinutes(0, 0, 0);
      const expiresAt = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const addressDigest = digestRateLimitKey(
        `ip:${deps.clientIp(request, context)}`,
        deps.rateLimitSecret,
      );
      const ipAllowed = await deps.repository.consumeIpRateLimit(
        addressDigest,
        windowStart.toISOString(),
        expiresAt.toISOString(),
        20,
      );
      if (!ipAllowed) return jsonResponse(429, { code: 'ip_rate_limited' });

      const path = `${userId}/${submissionId}/${category}/${deps.randomUUID()}.webp`;
      const signed = await deps.repository.createSignedUploadUrl(path);
      return jsonResponse(200, signed);
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
  };
}

export default async function scanUploadUrl(request: Request, context: Context): Promise<Response> {
  return createScanUploadUrlHandler()(request, context);
}

export const config: Config = { path: '/api/scans/:id/upload-url' };
