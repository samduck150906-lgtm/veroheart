import { describe, expect, it } from 'vitest';

import { resolveProductDuplicate } from './duplicateResolution';

const products = [
  { id: 'p1', barcode: '0036000291452', canonicalProductKey: 'maker|brand|food|||dog', similarity: 0.99 },
  { id: 'p2', barcode: null, canonicalProductKey: 'other|brand|food|||dog', similarity: 0.91 },
];

describe('resolveProductDuplicate', () => {
  it('links one exact normalized barcode match', () => {
    expect(resolveProductDuplicate({ barcode: '036000291452', canonicalProductKey: null }, products))
      .toEqual({ action: 'link', productId: 'p1', matchedBy: 'barcode' });
  });

  it('links a canonical key only when it has one exact candidate', () => {
    expect(resolveProductDuplicate({ barcode: null, canonicalProductKey: 'other|brand|food|||dog' }, products))
      .toEqual({ action: 'link', productId: 'p2', matchedBy: 'canonical' });
  });

  it('returns ambiguous for duplicate canonical keys', () => {
    const duplicated = [...products, { ...products[1], id: 'p3' }];
    expect(resolveProductDuplicate({ barcode: null, canonicalProductKey: 'other|brand|food|||dog' }, duplicated))
      .toEqual({ action: 'ambiguous', candidateIds: ['p2', 'p3'] });
  });

  it('never automatically merges fuzzy-only candidates', () => {
    expect(resolveProductDuplicate({ barcode: null, canonicalProductKey: 'new-key' }, products))
      .toEqual({ action: 'review', candidateIds: ['p1', 'p2'] });
  });

  it('creates when there is no exact or fuzzy candidate', () => {
    expect(resolveProductDuplicate({ barcode: null, canonicalProductKey: 'new-key' }, []))
      .toEqual({ action: 'create' });
  });
});
