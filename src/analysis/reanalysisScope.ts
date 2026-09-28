export interface CurrentLabelMatchReference {
  productId: string;
  labelSetId: string;
  isCurrent: boolean;
  normalizedText: string | null;
  canonicalIngredientId: string | null;
}

export interface IngredientReviewTrigger {
  normalizedTerms?: string[];
  canonicalIngredientIds?: string[];
  engineVersionId: string;
}

export interface ReanalysisQueueTarget {
  productId: string;
  engineVersionId: string;
}

const normalize = (value: string) => value.toLowerCase().normalize('NFKC').replace(/\s+/g, '');

export function selectReanalysisTargets(
  references: CurrentLabelMatchReference[],
  trigger: IngredientReviewTrigger,
): ReanalysisQueueTarget[] {
  const terms = new Set((trigger.normalizedTerms ?? []).map(normalize));
  const canonicalIds = new Set(trigger.canonicalIngredientIds ?? []);
  const productIds = new Set<string>();

  for (const reference of references) {
    if (!reference.isCurrent) continue;
    const termMatch = reference.normalizedText !== null && terms.has(normalize(reference.normalizedText));
    const canonicalMatch = reference.canonicalIngredientId !== null
      && canonicalIds.has(reference.canonicalIngredientId);
    if (termMatch || canonicalMatch) productIds.add(reference.productId);
  }

  return [...productIds].sort().map((productId) => ({
    productId,
    engineVersionId: trigger.engineVersionId,
  }));
}
