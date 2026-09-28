import type { Config, Context } from '@netlify/functions';

import { normalizeBarcode } from '../../src/lib/productIdentity';
import { digestRateLimitKey } from './_shared/auth';
import { jsonResponse, readJsonObject } from './_shared/http';
import {
  createDefaultScanDependencies,
  type ScanEndpointContext,
  type ScanEndpointDependencies,
} from './_shared/supabaseServer';

type Handler = (request: Request, context?: ScanEndpointContext) => Promise<Response>;

function rateWindow(now: Date) {
  const windowStart = new Date(now);
  windowStart.setUTCMinutes(0, 0, 0);
  const expiresAt = new Date(windowStart.getTime() + 60 * 60 * 1000);
  return { windowStart: windowStart.toISOString(), expiresAt: expiresAt.toISOString() };
}

export function createScanCreateHandler(injected?: ScanEndpointDependencies): Handler {
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

      const now = deps.now();
      const recentSince = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      if ((await deps.repository.countRecentUserSubmissions(userId, recentSince)) >= 5) {
        return jsonResponse(429, { code: 'user_rate_limited' });
      }

      const addressDigest = digestRateLimitKey(
        `ip:${deps.clientIp(request, context)}`,
        deps.rateLimitSecret,
      );
      const window = rateWindow(now);
      const ipAllowed = await deps.repository.consumeIpRateLimit(
        addressDigest,
        window.windowStart,
        window.expiresAt,
        20,
      );
      if (!ipAllowed) return jsonResponse(429, { code: 'ip_rate_limited' });

      const body = await readJsonObject(request);
      if (!body) return jsonResponse(400, { code: 'invalid_request' });
      const suppliedBarcode = typeof body.barcode === 'string' ? body.barcode : '';
      const barcode = suppliedBarcode.trim() ? normalizeBarcode(suppliedBarcode) : null;
      if (suppliedBarcode.trim() && !barcode) {
        return jsonResponse(400, { code: 'invalid_barcode' });
      }

      const submission = await deps.repository.createSubmission(userId, barcode);
      return jsonResponse(201, {
        id: submission.id,
        status: submission.status,
        scannedBarcode: submission.scannedBarcode,
      });
    } catch {
      return jsonResponse(503, { code: 'scan_unavailable' });
    }
  };
}

export default async function scanCreate(request: Request, context: Context): Promise<Response> {
  return createScanCreateHandler()(request, context);
}

export const config: Config = { path: '/api/scans' };
