import type { Product } from '../types';
import { labelProductIdentity, type LabelSnapshot } from '../analysis/labelCompleteness';

/** Test-only trusted comparison control. Never import into application code.
 * This is not an algorithm that proves completeness from ingredient names. */
export function reviewedLabelFixture(product: Product): Product {
  const labelSetId = `synthetic-label-${product.id}`;
  const current: LabelSnapshot = { productId: product.id, productIdentity: labelProductIdentity(product), labelSetId,
    rawText: product.ingredients.map(i => i.rawLabelText || i.nameKo).join(', '), revision: 'synthetic-revision-1',
    items: product.ingredients.map((i, n) => ({ id: `synthetic-item-${n}`, order: n,
      rawText: i.rawLabelText || i.nameKo, matchStatus: 'matched', legacyId: i.id,
      canonicalId: i.canonicalIngredientId, canonicalStatus: i.canonicalIngredientId ? 'active' : undefined,
      riskLevel: i.riskLevel, resolvedName: i.nameKo, resolvedNameEn: i.nameEn })) };
  return { ...product, ingredientLabelSetId: labelSetId, ingredientLabelEvidence: { current,
    comparison: { scope: 'whole_label', productIdentityConfirmed: true, completeLabelCompared: true,
      sourceEvidenceId: 'synthetic-reviewed-source', reviewedAt: '2026-01-01T00:00:00Z',
      snapshot: structuredClone(current) } } };
}
