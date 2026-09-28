import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createScanConfirmHandler } from '../../netlify/functions/scan-confirm';
import {
  createScanPublishHandler,
  prepareCanonicalScanIngredients,
  type CommunityPublicationRepository,
  type PublicationSubmission,
  type ScanPublishDependencies,
} from '../../netlify/functions/scan-publish';

const userId = '11111111-1111-4111-8111-111111111111';
const scanId = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';

function validLabel() {
  return {
    name: '오리지널 독',
    brand: '베로로',
    manufacturer: null,
    species: 'dog' as const,
    productType: 'food' as const,
    ingredients: ['연어', '쌀'],
    guaranteedComponents: [{ name: '조단백질', value: 24, unit: '%' }],
    registeredComponents: [],
  };
}

function validSubmission(): PublicationSubmission {
  return {
    id: scanId,
    userId,
    status: 'submitted',
    scannedBarcode: '0036000291452',
    confirmedBarcode: '0036000291452',
    printedBarcode: '0036000291452',
    processingErrorCode: null,
    resolvedProductId: null,
    photoPaths: {
      front: ['front.webp'],
      ingredient: ['ingredient.webp'],
      nutrition: ['nutrition.webp'],
    },
    confirmed: validLabel(),
  };
}

class FakeRepository implements CommunityPublicationRepository {
  submission: PublicationSubmission | null = validSubmission();
  publish = vi.fn().mockResolvedValue({ status: 'published', productId });
  markNeedsReview = vi.fn().mockResolvedValue(undefined);
  confirm = vi.fn().mockResolvedValue({ status: 'submitted' });
  ingestAnalysis = vi.fn().mockResolvedValue(undefined);

  async loadOwned() {
    return this.submission;
  }

  async findDuplicateCandidates() {
    return [];
  }
}

function dependencies(repository: FakeRepository, authenticated = true): ScanPublishDependencies {
  return {
    authenticate: async () => authenticated ? userId : null,
    repository,
  };
}

function request(path: string, body?: unknown) {
  return new Request(`https://example.test${path}`, {
    method: 'POST',
    headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('community scan publication', () => {
  let repository: FakeRepository;

  beforeEach(() => {
    repository = new FakeRepository();
  });

  it('returns 401 when unauthenticated', async () => {
    const response = await createScanPublishHandler(dependencies(repository, false))(
      request(`/api/scans/${scanId}/publish`),
    );
    expect(response.status).toBe(401);
  });

  it('returns 409 for an unconfirmed submission', async () => {
    if (repository.submission) repository.submission.status = 'needs_confirmation';
    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );
    expect(response.status).toBe(409);
  });

  it('returns stable 422 codes for missing photos and ingredients', async () => {
    if (repository.submission) repository.submission.photoPaths.ingredient = [];
    let response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: 'missing_photo' });

    repository.submission = validSubmission();
    repository.submission.confirmed.ingredients = [];
    response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: 'missing_ingredients' });
  });

  it('publishes a supplement with active registered components', async () => {
    if (repository.submission) {
      repository.submission.confirmed = {
        ...validLabel(),
        productType: 'supplement',
        ingredients: [],
        guaranteedComponents: [],
        registeredComponents: [{ name: 'EPA+DHA', value: 300, unit: 'mg' }],
      };
    }
    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );

    expect(response.status).toBe(200);
    expect(repository.publish).toHaveBeenCalledWith(expect.objectContaining({
      product: expect.objectContaining({
        catalogSource: 'community_scan',
        verificationStatus: 'pending',
        isVisible: true,
      }),
    }));
    expect(repository.ingestAnalysis).not.toHaveBeenCalled();
  });

  it('preserves confirmed raw terms and queues canonical analysis after publication', async () => {
    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );

    expect(response.status).toBe(200);
    expect(repository.ingestAnalysis).toHaveBeenCalledWith({
      submissionId: scanId,
      productId,
      ingredients: ['연어', '쌀'],
    });
  });

  it('sends unresolved barcode conflicts to needs_review', async () => {
    if (repository.submission) {
      repository.submission.processingErrorCode = 'barcode_conflict';
      repository.submission.confirmedBarcode = null;
      repository.submission.printedBarcode = '8801234567893';
    }
    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );

    expect(response.status).toBe(202);
    expect(repository.markNeedsReview).toHaveBeenCalledWith(scanId, 'barcode_conflict');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('preserves a transactional duplicate-race review result without starting analysis', async () => {
    repository.publish.mockResolvedValueOnce({ status: 'needs_review' });

    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ status: 'needs_review' });
    expect(repository.ingestAnalysis).not.toHaveBeenCalled();
  });

  it('returns the same product for repeated publication', async () => {
    if (repository.submission) {
      repository.submission.status = 'published';
      repository.submission.resolvedProductId = productId;
    }
    const response = await createScanPublishHandler(dependencies(repository))(
      request(`/api/scans/${scanId}/publish`),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'published', productId });
    expect(repository.publish).not.toHaveBeenCalled();
    expect(repository.ingestAnalysis).toHaveBeenCalledWith({
      submissionId: scanId,
      productId,
      ingredients: ['연어', '쌀'],
    });
  });

  it('matches only exact reviewed canonicals and keeps unknown scan terms public', () => {
    expect(prepareCanonicalScanIngredients(
      ['닭고기 20%', '닭고기분말', '새 복합원료'],
      [{ id: 'chicken', canonicalName: '닭고기', aliases: ['치킨'] }],
    )).toEqual([
      expect.objectContaining({ order: 1, rawText: '닭고기 20%', matchStatus: 'matched', canonicalIngredientId: 'chicken' }),
      expect.objectContaining({ order: 2, rawText: '닭고기분말', matchStatus: 'unmatched', canonicalIngredientId: null }),
      expect.objectContaining({ order: 3, rawText: '새 복합원료', matchStatus: 'unmatched', canonicalIngredientId: null }),
    ]);
  });

  it('confirmation trims editable fields while preserving OCR separately', async () => {
    if (repository.submission) repository.submission.status = 'needs_confirmation';
    const handler = createScanConfirmHandler(dependencies(repository));
    const response = await handler(request(`/api/scans/${scanId}/confirm`, {
      confirmedData: { ...validLabel(), name: '  오리지널 독  ' },
      barcode: '036000291452',
      ignoredSafetyScore: 100,
    }));

    expect(response.status).toBe(200);
    expect(repository.confirm).toHaveBeenCalledWith(expect.objectContaining({
      confirmed: expect.objectContaining({ name: '오리지널 독' }),
      confirmedBarcode: '0036000291452',
    }));
    expect(JSON.stringify(repository.confirm.mock.calls)).not.toContain('ignoredSafetyScore');
  });
});
