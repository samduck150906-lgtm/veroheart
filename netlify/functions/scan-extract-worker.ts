import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Config } from '@netlify/functions';
import { environmentValue } from './_shared/supabaseServer';
import { createDefaultDependencies, processClaimedScan, type ClaimedSubmission } from './scan-process';

export function verifyWorkerRequest(body: string, signature: string, secret: string, now = Date.now()): ClaimedSubmission | null {
  if (!secret || !/^[a-f0-9]{64}$/.test(signature)) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) return null;
  try {
    const job = JSON.parse(body) as { submission: ClaimedSubmission; issuedAt: number };
    if (!Number.isFinite(job.issuedAt) || job.issuedAt > now || now - job.issuedAt > 5 * 60_000) return null;
    return job.submission;
  } catch { return null; }
}

export default async function extractWorker(request: Request): Promise<void> {
  if (request.method !== 'POST') return;
  const body = await request.text();
  const submission = verifyWorkerRequest(body, request.headers.get('x-scan-signature') ?? '', environmentValue('SCAN_RATE_LIMIT_SECRET'));
  if (!submission) return;
  await processClaimedScan(createDefaultDependencies(), submission);
}

// Only the synchronous /process endpoint authenticates, claims and dispatches jobs.
// Netlify discards background response bodies; clients poll /api/scans/:id.
export const config: Config = { background: true, method: 'POST' };
