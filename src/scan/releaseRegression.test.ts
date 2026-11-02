import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createScanApiClient } from './scanApi';
import { buildExtractionRequest } from '../../netlify/functions/_shared/extractionSchema';
import { withScanCors } from '../../netlify/functions/_shared/http';
import { createScanPublishHandler, type CommunityPublicationRepository, type PublicationSubmission } from '../../netlify/functions/scan-publish';
import { createScanConfirmHandler } from '../../netlify/functions/scan-confirm';
import { verifyWorkerRequest } from '../../netlify/functions/scan-extract-worker';
import { createScanProcessHandler, type ScanProcessDependencies } from '../../netlify/functions/scan-process';
import { createEvidencePurgeRepository, purgeExpiredScanEvidence, type EvidencePurgeRepository } from '../../netlify/functions/purge-scan-evidence';

const userId = '11111111-1111-4111-8111-111111111111';
const scanId = '22222222-2222-4222-8222-222222222222';
const imageId = '33333333-3333-4333-8333-333333333333';
const paths = { front: [`${userId}/${scanId}/front/${imageId}.jpg`], ingredient: [`${userId}/${scanId}/ingredient/${imageId}.webp`], nutrition: [`${userId}/${scanId}/nutrition/${imageId}.png`] };
const label = { name: 'Food', brand: 'Brand', manufacturer: null, species: 'dog' as const, productType: 'food' as const, ingredients: ['연어'], guaranteedComponents: [], registeredComponents: [] };
function request(action: string) { return new Request(`https://example.test/api/scans/${scanId}/${action}`, { method: 'POST', body: JSON.stringify({ photoPaths: paths }) }); }
function publication(submission: Partial<PublicationSubmission> = {}) {
  const repository: CommunityPublicationRepository = {
    loadOwned: async () => ({ id: scanId, userId, status: 'submitted', scannedBarcode: null, confirmedBarcode: null, printedBarcode: null, processingErrorCode: null, resolvedProductId: null, photoPaths: paths, confirmed: label, evidenceVerified: false, publishedNewProduct: false, ...submission }),
    publish: vi.fn().mockResolvedValue({ status: 'needs_review' }),
    findDuplicateCandidates: vi.fn().mockResolvedValue([{ id: 'existing', barcode: '0036000291452', canonicalProductKey: null }]),
    ingestAnalysis: vi.fn(), markNeedsReview: vi.fn(), confirm: vi.fn(),
  };
  return { authenticate: async () => userId, repository };
}

describe('release scan trust and transport regressions', () => {
  it('rejects a submitted row with invented paths and no server extraction provenance', async () => {
    const deps = publication();
    const response = await createScanPublishHandler(deps)(request('publish'));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: 'untrusted_scan_evidence' });
    expect(deps.repository.publish).not.toHaveBeenCalled();
    expect(deps.repository.ingestAnalysis).not.toHaveBeenCalled();
  });
  it('rejects confirmation without trusted evidence too', async () => {
    const deps = publication({ status: 'needs_confirmation' });
    expect((await createScanConfirmHandler(deps)(request('confirm'))).status).toBe(422);
    expect(deps.repository.confirm).not.toHaveBeenCalled();
  });
  it('preserves duplicate contributions for review without calling current-label ingestion', async () => {
    const deps = publication({ evidenceVerified: true, confirmedBarcode: '0036000291452' });
    const response = await createScanPublishHandler(deps)(request('publish'));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'needs_review', code: 'duplicate_review' });
    expect(deps.repository.publish).toHaveBeenCalledWith(expect.objectContaining({ duplicate: expect.objectContaining({ action: 'link' }) }));
    expect(deps.repository.ingestAnalysis).not.toHaveBeenCalled();
  });
  it('replaying an old duplicate publication cannot replace current ingredients', async () => {
    const deps = publication({ status: 'published', evidenceVerified: true, resolvedProductId: 'existing' });
    expect((await createScanPublishHandler(deps)(request('publish'))).status).toBe(200);
    expect(deps.repository.ingestAnalysis).not.toHaveBeenCalled();
  });
  it('accepts Netlify empty 202 as a polling acknowledgement', async () => {
    const client = createScanApiClient({ getAccessToken: async () => 'token', fetchImpl: vi.fn().mockResolvedValue(new Response(null, { status: 202 })) });
    await expect(client.submitImages(scanId, paths)).resolves.toEqual({ status: 'processing' });
  });
  it('uses an HTTPS origin on native and never sends tokens to an unconfigured local API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ status: 'draft' }));
    await createScanApiClient({ isNative: true, apiBaseUrl: 'https://api.example.test', getAccessToken: async () => 'token', fetchImpl }).createScan(null);
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.example.test/api/scans');
    fetchImpl.mockClear();
    await expect(createScanApiClient({ isNative: true, apiBaseUrl: '', fetchImpl }).createScan(null)).rejects.toMatchObject({ code: 'api_base_url_required' });
    await expect(createScanApiClient({ apiBaseUrl: 'http://untrusted.test', fetchImpl }).createScan(null)).rejects.toMatchObject({ code: 'invalid_api_base_url' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('answers native preflight before authentication and rejects unrelated origins', async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ code: 'auth_required' }, { status: 401 }));
    const cors = withScanCors(handler);
    const preflight = await cors(new Request('https://api.example.test/api/scans', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'POST', 'access-control-request-headers': 'Authorization, Content-Type' } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('access-control-allow-origin')).toBe('capacitor://localhost');
    expect(handler).not.toHaveBeenCalled();
    expect((await cors(new Request('https://api.example.test/api/scans', { headers: { origin: 'https://evil.test' } }))).status).toBe(403);
    const failure = await cors(new Request('https://api.example.test/api/scans', { headers: { origin: 'http://localhost' } }));
    expect(failure.status).toBe(401);
    expect(failure.headers.get('access-control-allow-origin')).toBe('http://localhost');
  });
  it('defines required nested properties and array items, preserving each image MIME', () => {
    const request = buildExtractionRequest(['https://storage.test/a.jpg?token=x', 'https://storage.test/b.png', 'https://storage.test/c.webp']);
    const schema = request.config.responseJsonSchema;
    expect(schema.properties.identity.required).toContain('productType');
    expect(schema.properties.labelPanels.required).toContain('ingredientText');
    expect(schema.properties.ingredients.items.required).toEqual(['position', 'name']);
    expect(schema.properties.guaranteedComponents.items.required).toEqual(['name', 'value', 'unit', 'qualifier']);
    expect(schema.properties.fieldConfidence.required).toContain('components');
    expect(request.contents[0].parts.slice(1).map((part) => 'fileData' in part && part.fileData?.mimeType)).toEqual(['image/jpeg', 'image/png', 'image/webp']);
  });
  it('authenticates worker jobs and rejects tampering or expired replay', () => {
    const submission = { id: scanId, userId, imagePaths: paths, scannedBarcode: null, extractionVersion: 'version:attempt' };
    const body = JSON.stringify({ submission, issuedAt: 1_000 });
    const signature = createHmac('sha256', 'local-secret').update(body).digest('hex');
    expect(verifyWorkerRequest(body, signature, 'local-secret', 2_000)).toEqual(submission);
    expect(verifyWorkerRequest(body.replace(scanId, imageId), signature, 'local-secret', 2_000)).toBeNull();
    expect(verifyWorkerRequest(body, signature, 'local-secret', 400_000)).toBeNull();
  });
  it('launches a worker and returns JSON without waiting for AI extraction', async () => {
    const submission = { id: scanId, userId, imagePaths: paths, scannedBarcode: null, extractionVersion: 'version:attempt' };
    const deps: ScanProcessDependencies = {
      authenticate: async () => userId, dispatch: vi.fn().mockResolvedValue(undefined), lookupExternal: vi.fn(), extract: vi.fn(),
      repository: { claim: vi.fn().mockResolvedValue({ kind: 'claimed', submission }), createSignedReadUrls: vi.fn(), complete: vi.fn(), fail: vi.fn() },
    };
    const response = await createScanProcessHandler(deps)(request('process'));
    expect(await response.json()).toEqual({ status: 'processing' });
    expect(deps.dispatch).toHaveBeenCalledOnce();
    expect(deps.extract).not.toHaveBeenCalled();
    expect(deps.repository.claim).toHaveBeenCalledWith(scanId, userId, paths, expect.stringMatching(/^community-label-v1:/));
  });
  it('marks abandoned empty drafts as drained and retries failed object deletion', async () => {
    const rows = [
      { id: scanId, userId, status: 'draft', retentionAt: '2026-01-01', photoPaths: { front: [], ingredient: [], nutrition: [] } },
      { id: scanId, userId, status: 'failed', retentionAt: '2026-01-01', photoPaths: paths },
    ];
    const repo: EvidencePurgeRepository = { listCandidates: async () => rows, claimCandidate: vi.fn().mockResolvedValue(true), deleteObject: vi.fn().mockResolvedValue(false), updateRemainingPaths: vi.fn() };
    await purgeExpiredScanEvidence(repo, new Date('2026-10-26'));
    expect(repo.updateRemainingPaths).toHaveBeenNthCalledWith(1, scanId, { front: [], ingredient: [], nutrition: [] });
    expect(repo.updateRemainingPaths).toHaveBeenNthCalledWith(2, scanId, paths);
  });
  it('selects only unpurged rows and rotates attempted rows behind never-attempted evidence', async () => {
    const query = { select: vi.fn(), is: vi.fn(), lt: vi.fn(), order: vi.fn(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    query.select.mockReturnValue(query); query.is.mockReturnValue(query); query.lt.mockReturnValue(query); query.order.mockReturnValue(query);
    const client = { from: vi.fn().mockReturnValue(query) };
    await createEvidencePurgeRepository(client as never).listCandidates('2026-09-26');
    expect(query.is).toHaveBeenCalledWith('evidence_purged_at', null);
    expect(query.order).toHaveBeenNthCalledWith(1, 'evidence_purge_attempted_at', { ascending: true, nullsFirst: true });
    expect(query.order).toHaveBeenLastCalledWith('id', { ascending: true });
  });
});
