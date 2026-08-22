export type PoultrySpecificityPolicyOptionId =
  | 'keep_current_conservative'
  | 'species_specific_hard_block_plus_related_caution'
  | 'species_specific_only';

export interface PoultrySpecificityPolicyOption {
  id: PoultrySpecificityPolicyOptionId;
  label: string;
  sameNamedSourceHardHit: boolean;
  genericPoultryHardHit: boolean;
  differentNamedPoultryHardHit: boolean;
  differentNamedPoultryCaution: boolean;
  userVisibleChange: boolean;
  strengths: string[];
  tradeoffs: string[];
}

export interface PoultrySpecificityOwnerReviewPacket {
  packetKind: 'poultry_specificity_owner_review_packet';
  currentBehavior: {
    namedPairs: number;
    sameSourceMatches: number;
    crossSpeciesMatches: number;
    crossSpeciesScoreCappedProductsInFixture: number;
    genericPoultryMatches: number;
    unknownAnimalByproductNamedMatches: number;
  };
  evidenceAssessment: {
    immunologicOverlapSupported: true;
    blanketClinicalEquivalenceEstablished: false;
    interpretation: string;
  };
  options: PoultrySpecificityPolicyOption[];
  recommendedOptionId: PoultrySpecificityPolicyOptionId;
  recommendationRationale: string[];
  ownerDecisionRequired: true;
  productionImpact: {
    exactAffectedProductCountKnown: false;
    reason: string;
  };
  safety: {
    appliesMatcherChange: false;
    appliesScoreChange: false;
    appliesUiChange: false;
    usesSupabaseClient: false;
    executesSql: false;
    mutatesProductionRows: false;
    changesEnvOrDeploy: false;
  };
}

const PRE_POLICY_BASELINE = {
  namedPairs: 9,
  sameSourceMatches: 3,
  crossSpeciesMatches: 6,
  crossSpeciesScoreCappedProductsInFixture: 6,
  genericPoultryMatches: 3,
  unknownAnimalByproductNamedMatches: 0,
} as const;

const OPTIONS: PoultrySpecificityPolicyOption[] = [
  {
    id: 'keep_current_conservative',
    label: 'Keep current blanket poultry hard-match',
    sameNamedSourceHardHit: true,
    genericPoultryHardHit: true,
    differentNamedPoultryHardHit: true,
    differentNamedPoultryCaution: false,
    userVisibleChange: false,
    strengths: [
      'maximally conservative avoidance for possible poultry cross-reactivity',
      'requires no runtime or UI change',
    ],
    tradeoffs: [
      'treats uncertain cross-species clinical reactivity as confirmed allergy equivalence',
      'can hard-penalize duck or turkey for a chicken-only allergy and vice versa',
    ],
  },
  {
    id: 'species_specific_hard_block_plus_related_caution',
    label: 'Hard-block the named source and keep related poultry as caution',
    sameNamedSourceHardHit: true,
    genericPoultryHardHit: true,
    differentNamedPoultryHardHit: false,
    differentNamedPoultryCaution: true,
    userVisibleChange: true,
    strengths: [
      'preserves a hard allergy block for the explicitly named source',
      'preserves broad hard avoidance when the allergy itself is generic poultry',
      'keeps clinically plausible poultry cross-reactivity visible without presenting it as confirmed equivalence',
    ],
    tradeoffs: [
      'requires a new related-poultry caution path and visible copy',
      'changes score or recommendation behavior for named cross-species cases',
    ],
  },
  {
    id: 'species_specific_only',
    label: 'Hard-match only the explicitly named poultry species',
    sameNamedSourceHardHit: true,
    genericPoultryHardHit: true,
    differentNamedPoultryHardHit: false,
    differentNamedPoultryCaution: false,
    userVisibleChange: true,
    strengths: [
      'avoids cross-species false-positive hard allergy hits',
      'simpler implementation than a separate caution state',
    ],
    tradeoffs: [
      'removes any warning for a biologically plausible poultry cross-reactivity risk',
      'is less conservative than the available immunologic evidence supports',
    ],
  },
];

/**
 * Historical owner-review packet from before Poultry Allergy Policy v1.0.
 * The baseline is intentionally frozen so later runtime changes do not rewrite the evidence
 * that was used for the owner decision.
 */
export function buildPoultrySpecificityOwnerReviewPacket(): PoultrySpecificityOwnerReviewPacket {
  return {
    packetKind: 'poultry_specificity_owner_review_packet',
    currentBehavior: { ...PRE_POLICY_BASELINE },
    evidenceAssessment: {
      immunologicOverlapSupported: true,
      blanketClinicalEquivalenceEstablished: false,
      interpretation:
        'Poultry cross-reactivity is a credible clinical concern, but available evidence does not establish that every named chicken, duck, and turkey allergy should be treated as the same confirmed hard allergy in every animal.',
    },
    options: OPTIONS,
    recommendedOptionId: 'species_specific_hard_block_plus_related_caution',
    recommendationRationale: [
      'matches the explicitly named allergen source with the strongest hard-block semantics',
      'keeps generic poultry allergy broad',
      'represents uncertain cross-species risk as caution rather than confirmed equivalence',
      'avoids silently removing all cross-poultry warning despite plausible immunologic overlap',
    ],
    ownerDecisionRequired: true,
    productionImpact: {
      exactAffectedProductCountKnown: false,
      reason:
        'The repository does not contain the full current production product-ingredient dataset, so exact production affected-product counts are not available from this repo-only audit.',
    },
    safety: {
      appliesMatcherChange: false,
      appliesScoreChange: false,
      appliesUiChange: false,
      usesSupabaseClient: false,
      executesSql: false,
      mutatesProductionRows: false,
      changesEnvOrDeploy: false,
    },
  };
}