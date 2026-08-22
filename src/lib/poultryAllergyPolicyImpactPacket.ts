import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  classifyAllergyRelationship,
  type AllergyRelationshipKind,
} from '../analysis/allergyFamilyMatcher';
import { getRecommendationBreakdown } from '../utils/score';

export type HistoricalPoultryBaselineKind = 'hard' | 'none';

export interface PoultryPolicyImpactCase {
  id: string;
  allergy: string;
  ingredientName: string;
  historicalBaselineKind: HistoricalPoultryBaselineKind;
}

export interface PoultryPolicyImpactRow extends PoultryPolicyImpactCase {
  candidateKind: AllergyRelationshipKind;
  historicalBaselinePenalty: number;
  candidateHardPenalty: number;
  candidateCautionPenalty: number;
  candidateTotal: number;
}

export interface PoultryPolicyImpactPacket {
  rows: PoultryPolicyImpactRow[];
  summary: {
    total: number;
    hardUnchanged: number;
    hardToCaution: number;
    noneUnchanged: number;
    candidateHard: number;
    candidateCaution: number;
    candidateNone: number;
  };
}

/**
 * Historical baseline is intentionally curated from the pre-v1 blanket-poultry behavior
 * reviewed before #88. It is evidence, not a second runtime matcher.
 */
export const POULTRY_POLICY_IMPACT_CASES: PoultryPolicyImpactCase[] = [
  { id: 'same-chicken', allergy: '닭', ingredientName: '닭고기', historicalBaselineKind: 'hard' },
  { id: 'cross-duck', allergy: '닭', ingredientName: '오리고기', historicalBaselineKind: 'hard' },
  { id: 'cross-turkey', allergy: '닭', ingredientName: '칠면조', historicalBaselineKind: 'hard' },
  { id: 'generic-poultry', allergy: '닭', ingredientName: '가금류부산물', historicalBaselineKind: 'hard' },
  { id: 'poultry-fat', allergy: '닭', ingredientName: '닭지방', historicalBaselineKind: 'hard' },
  { id: 'hydrolyzed-chicken', allergy: '닭', ingredientName: '가수분해 닭 단백질', historicalBaselineKind: 'hard' },
  { id: 'unknown-animal', allergy: '닭', ingredientName: '동물성부산물', historicalBaselineKind: 'none' },
  { id: 'egg-separate', allergy: '닭', ingredientName: '계란', historicalBaselineKind: 'none' },
  { id: 'broad-poultry', allergy: '가금류', ingredientName: '오리고기', historicalBaselineKind: 'hard' },
];

function ingredient(nameKo: string): Ingredient {
  return {
    id: `fixture-${nameKo}`,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(id: string, item: Ingredient): Product {
  return {
    id,
    brand: 'Fixture',
    name: id,
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [item],
    reviewsCount: 0,
    averageRating: 0,
  };
}

function profile(allergy: string): UserPetProfile {
  return {
    id: `profile-${allergy}`,
    name: '테스트견',
    species: 'Dog',
    age: 4,
    healthConcerns: [],
    allergies: [allergy],
  };
}

function isCaution(kind: AllergyRelationshipKind): boolean {
  return [
    'cross_caution',
    'strong_caution',
    'processing_caution',
    'hydrolysis_caution',
  ].includes(kind);
}

export function buildPoultryAllergyPolicyImpactPacket(): PoultryPolicyImpactPacket {
  const rows = POULTRY_POLICY_IMPACT_CASES.map((fixture): PoultryPolicyImpactRow => {
    const item = ingredient(fixture.ingredientName);
    const pet = profile(fixture.allergy);
    const breakdown = getRecommendationBreakdown(product(fixture.id, item), pet);
    const candidateKind = classifyAllergyRelationship(item, fixture.allergy).kind;

    return {
      ...fixture,
      candidateKind,
      historicalBaselinePenalty: fixture.historicalBaselineKind === 'hard' ? 90 : 0,
      candidateHardPenalty: breakdown.allergyPenalty,
      candidateCautionPenalty: breakdown.allergyCautionPenalty,
      candidateTotal: breakdown.total,
    };
  });

  return {
    rows,
    summary: {
      total: rows.length,
      hardUnchanged: rows.filter(
        (row) => row.historicalBaselineKind === 'hard' && row.candidateKind === 'hard',
      ).length,
      hardToCaution: rows.filter(
        (row) => row.historicalBaselineKind === 'hard' && isCaution(row.candidateKind),
      ).length,
      noneUnchanged: rows.filter(
        (row) => row.historicalBaselineKind === 'none' && row.candidateKind === 'none',
      ).length,
      candidateHard: rows.filter((row) => row.candidateKind === 'hard').length,
      candidateCaution: rows.filter((row) => isCaution(row.candidateKind)).length,
      candidateNone: rows.filter((row) => row.candidateKind === 'none').length,
    },
  };
}
