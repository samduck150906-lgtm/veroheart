export type AnimalCanonicalKind =
  | 'fresh_meat'
  | 'processed_meal'
  | 'fat'
  | 'organ'
  | 'cartilage'
  | 'generic_byproduct'
  | 'unknown';

export type AnimalScoringReadiness = 'not_ready' | 'needs_diff' | 'review_only';

export interface AnimalIngredientMeaningContract {
  canonicalId: string | null;
  sourceFamily: string | null;
  allergenFamily: string | null;
  kind: AnimalCanonicalKind;
  scoringReadiness: AnimalScoringReadiness;
  collapseIntoOrdinaryMeatAllowed: boolean;
  allergyFamilyOnlyAllowed: boolean;
}

export const ANIMAL_PART_CONTRACT_EXAMPLES: AnimalIngredientMeaningContract[] = [
  {
    canonicalId: 'chicken',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'fresh_meat',
    scoringReadiness: 'needs_diff',
    collapseIntoOrdinaryMeatAllowed: true,
    allergyFamilyOnlyAllowed: false,
  },
  {
    canonicalId: 'chicken_meal',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'processed_meal',
    scoringReadiness: 'needs_diff',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: false,
  },
  {
    canonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'fat',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
  {
    canonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'organ',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
  {
    canonicalId: null,
    sourceFamily: 'poultry',
    allergenFamily: 'poultry',
    kind: 'generic_byproduct',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
];

export function isAnimalContractScoreReady(item: AnimalIngredientMeaningContract): boolean {
  return item.scoringReadiness !== 'review_only' && item.scoringReadiness !== 'not_ready';
}

export function canCollapseIntoOrdinaryMeat(item: AnimalIngredientMeaningContract): boolean {
  return item.kind === 'fresh_meat' && item.collapseIntoOrdinaryMeatAllowed;
}
