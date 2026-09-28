import { beforeEach, describe, expect, it } from 'vitest';

import { createScanCreateHandler } from '../../netlify/functions/scan-create';
import { createScanStatusHandler } from '../../netlify/functions/scan-status';
import { createScanUploadUrlHandler } from '../../netlify/functions/scan-upload-url';
import type {
  ScanEndpointDependencies,
  ScanRepository,
  StoredScanSubmission,
} from '../../netlify/functions/_shared/supabaseServer';

const userId = '11111111-1111-4111-8111-111111111111';
const submissionId = '22222222-2222-4222-8222-222222222222';

class FakeRepository implements ScanRepository {
  enabled = true;
  recentSubmissionCount = 0;
  ipAllowed = true;
  lastBucketDigest = '';
  submission: StoredScanSubmission | null = {
    id: submissionId,
    user_id: userId,
    status: 'needs_confirmation',
    processing_error_code: null,
    extracted_data: { name: '테스트 사료' },
    field_confidence: { name: 0.9 },
    resolved_product_id: null,
    front_image_paths: ['private/front.webp'],
    ingredient_image_paths: ['private/ingredient.webp'],
    nutrition_image_paths: ['private/nutrition.webp'],
  };
  lastSignedPath = '';

  async isCommunityScanEnabled() {
    return this.enabled;
  }

  async countRecentUserSubmissions() {
    return this.recentSubmissionCount;
  }

  async consumeIpRateLimit(bucketDigest: string) {
    this.lastBucketDigest = bucketDigest;
    return this.ipAllowed;
  }

  async createSubmission(ownerId: string, barcode: string | null) {
    return { id: submissionId, status: 'draft' as const, scannedBarcode: barcode, ownerId };
  }

  async findOwnedSubmission(id: string, ownerId: string) {
    if (!this.submission || id !== this.submission.id || ownerId !== this.submission.user_id) {
      return null;
    }
    return this.submission;
  }

  async createSignedUploadUrl(path: string) {
    this.lastSignedPath = path;
    return { path, token: 'signed-token', signedUrl: 'https://storage.example.test/signed' };
  }
}

function dependencies(repository: FakeRepository): ScanEndpointDependencies {
  return {
    repository,
    authenticate: async (request) =>
      request.headers.get('authorization') === 'Bearer valid-token' ? userId : null,
    rateLimitSecret: 'test-rate-secret',
    now: () => new Date('2026-09-25T12:00:00.000Z'),
    randomUUID: () => '33333333-3333-4333-8333-333333333333',
    clientIp: () => '203.0.113.10',
  };
}

function authenticatedRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('authorization', 'Bearer valid-token');
  if (init.body) headers.set('content-type', 'application/json');
  return new Request(`https://example.test${path}`, { ...init, headers });
}

describe('community scan API', () => {
  let repository: FakeRepository;

  beforeEach(() => {
    repository = new FakeRepository();
  });

  it('returns 401 when the bearer token is missing', async () => {
    const handler = createScanCreateHandler(dependencies(repository));
    const response = await handler(new Request('https://example.test/api/scans', { method: 'POST' }));

    expect(response.status).toBe(401);
  });

  it('returns 503 when the community contribution switch is disabled', async () => {
    repository.enabled = false;
    const handler = createScanCreateHandler(dependencies(repository));
    const response = await handler(authenticatedRequest('/api/scans', { method: 'POST' }));

    expect(response.status).toBe(503);
  });

  it('rate-limits the sixth user submission in one hour', async () => {
    repository.recentSubmissionCount = 5;
    const handler = createScanCreateHandler(dependencies(repository));
    const response = await handler(authenticatedRequest('/api/scans', { method: 'POST' }));

    expect(response.status).toBe(429);
  });

  it('rate-limits an abusive IP bucket without storing the raw address', async () => {
    repository.ipAllowed = false;
    const handler = createScanCreateHandler(dependencies(repository));
    const response = await handler(authenticatedRequest('/api/scans', { method: 'POST' }));

    expect(response.status).toBe(429);
    expect(repository.lastBucketDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(repository.lastBucketDigest).not.toContain('203.0.113.10');
  });

  it('returns 404 for another user\'s submission', async () => {
    const handler = createScanUploadUrlHandler(dependencies(repository));
    const response = await handler(authenticatedRequest(
      '/api/scans/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/upload-url',
      {
        method: 'POST',
        body: JSON.stringify({ category: 'front', mimeType: 'image/webp', size: 1000 }),
      },
    ));

    expect(response.status).toBe(404);
  });

  it.each([
    [{ category: 'other', mimeType: 'image/webp', size: 1000 }],
    [{ category: 'front', mimeType: 'image/jpeg', size: 1000 }],
    [{ category: 'front', mimeType: 'image/webp', size: 6 * 1024 * 1024 }],
  ])('rejects an invalid upload policy request', async (body) => {
    const handler = createScanUploadUrlHandler(dependencies(repository));
    const response = await handler(authenticatedRequest(
      `/api/scans/${submissionId}/upload-url`,
      { method: 'POST', body: JSON.stringify(body) },
    ));

    expect(response.status).toBe(400);
  });

  it('does not issue new upload tokens while a submission is processing', async () => {
    if (repository.submission) repository.submission.status = 'processing';
    const handler = createScanUploadUrlHandler(dependencies(repository));
    const response = await handler(authenticatedRequest(
      `/api/scans/${submissionId}/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify({ category: 'front', mimeType: 'image/webp', size: 1000 }),
      },
    ));

    expect(response.status).toBe(409);
  });

  it('signs only a path owned by the authenticated user and submission', async () => {
    const handler = createScanUploadUrlHandler(dependencies(repository));
    const response = await handler(authenticatedRequest(
      `/api/scans/${submissionId}/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify({ category: 'ingredient', mimeType: 'image/webp', size: 2048 }),
      },
    ));

    expect(response.status).toBe(200);
    expect(repository.lastSignedPath).toBe(
      `${userId}/${submissionId}/ingredient/33333333-3333-4333-8333-333333333333.webp`,
    );
  });

  it('omits private paths and contributor ID from status responses', async () => {
    const handler = createScanStatusHandler(dependencies(repository));
    const response = await handler(authenticatedRequest(`/api/scans/${submissionId}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: submissionId,
      status: 'needs_confirmation',
      errorCode: null,
      extractedData: { name: '테스트 사료' },
      fieldConfidence: { name: 0.9 },
      resolvedProductId: null,
    });
    expect(JSON.stringify(body)).not.toContain(userId);
    expect(JSON.stringify(body)).not.toContain('private/');
  });
});
