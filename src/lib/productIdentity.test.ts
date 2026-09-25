import { describe, expect, it } from 'vitest';
import { buildCanonicalProductKey, normalizeBarcode } from './productIdentity';

describe('product identity', () => {
  it('normalizes UPC-A to the same GTIN-13 representation', () => {
    expect(normalizeBarcode('036000291452')).toBe('0036000291452');
    expect(normalizeBarcode('0036000291452')).toBe('0036000291452');
  });

  it('rejects an invalid check digit', () => {
    expect(normalizeBarcode('0036000291453')).toBeNull();
  });

  it('keeps package size in the fallback key', () => {
    const base = {
      manufacturer: 'A',
      brand: 'B',
      displayName: '연어 사료',
      variant: '성견',
      targetPetType: 'dog',
    };

    expect(buildCanonicalProductKey({ ...base, netWeight: '1kg' }))
      .not.toBe(buildCanonicalProductKey({ ...base, netWeight: '3kg' }));
  });
});
