import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createScanProcessHandler,
  EXTRACTION_VERSION,
  type ScanProcessDependencies,
  type ScanProcessingRepository,
} from '../../netlify/functions/scan-process';
import type { ExtractedProductLabelResult } from '../../netlify/functions/_shared/extractionSchema';

const userId = '11111111-1111-4111-8111-111111111111';
const scanId = '22222222-2222-4222-8222-222222222222';
const paths = {
  front: [`${userId}/${scanId}/front/33333333-3333-4333-8333-333333333333.webp`],
  ingredient: [`${userId}/${scanId}/ingredient/44444444-4444-4444-8444-444444444444.webp`],
  nutrition: [`${userId}/${scanId}/nutrition/55555555-5555-4555-8555-555555555555.webp`],
};

const extraction: ExtractedProductLabelResult = {
  identity: {
    name: '테스트 사료',
    brand: '테스트',
    manufacturer: null,
    species: 'dog',
    productType: 'food',
    variantName: null,
    netWeightText: '2 kg',
  },
  labelPanels: {
    ingredientText: '연어, 쌀',
    nutritionText: '조단백질 24%',
    registrationText: null,
  },
  ingredients: [{ position: 1, name: '연어' }],
  guaranteedComponents: [{ name: '조단백질', value: 24, unit: '%', qualifier: 'min' }],
  registeredComponents: [],
  fieldConfidence: {
    identity: 0.9,
    labelPanels: 0.9,
    ingredients: 0.9,
    components: 0.9,
    printedBarcode: 0.9,
  },
  printedBarcode: '8801234567886',
};

class FakeProcessingRepository implements ScanProcessingRepository {
  claimResult: Awaited<ReturnType<ScanProcessingRepository['claim']>> = {
    kind: 'claimed',
    submission: {
      id: scanId,
      userId,
      scannedBarcode: '8801234567893',
      imagePaths: paths,
    },
  };
  complete = vi.fn().mockResolvedValue(undefined);
  fail = vi.fn().mockResolvedValue(undefined);

  async claim() {
    return this.claimResult;
  }

  async createSignedReadUrls() {
    return ['https://signed.example/front.webp'];
  }
}

function request() {
  return new Request(`https://example.test/api/scans/${scanId}/process`, {
    method: 'POST',
    headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
    body: JSON.stringify({ photoPaths: paths }),
  });
}

describe('scan processing worker', () => {
  let repository: FakeProcessingRepository;
  let extract: ReturnType<typeof vi.fn>;
  let dependencies: ScanProcessDependencies;

  beforeEach(() => {
    repository = new FakeProcessingRepository();
    extract = vi.fn().mockResolvedValue(extraction);
    dependencies = {
      authenticate: async () => userId,
      repository,
      lookupExternal: vi.fn().mockResolvedValue({ found: false }),
      extract,
    };
  });

  it('reuses an existing extraction with the same version', async () => {
    repository.claimResult = { kind: 'reused', status: 'needs_confirmation' };
    const response = await createScanProcessHandler(dependencies)(request());

    expect(response.status).toBe(202);
    expect(extract).not.toHaveBeenCalled();
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('stores a barcode conflict as a stable confirmation warning', async () => {
    const response = await createScanProcessHandler(dependencies)(request());

    expect(response.status).toBe(202);
    expect(repository.complete).toHaveBeenCalledWith(expect.objectContaining({
      submissionId: scanId,
      extractionVersion: EXTRACTION_VERSION,
      warningCode: 'barcode_conflict',
    }));
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it('records a stable failure code when extraction fails', async () => {
    extract.mockRejectedValue(new Error('provider details must not persist'));
    const response = await createScanProcessHandler(dependencies)(request());

    expect(response.status).toBe(202);
    expect(repository.fail).toHaveBeenCalledWith(scanId, EXTRACTION_VERSION, 'extraction_failed');
    expect(JSON.stringify(repository.fail.mock.calls)).not.toContain('provider details');
  });
});
