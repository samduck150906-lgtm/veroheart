import {
  allergyTagsForIngredient,
  allergyTagsForLabel,
  isFamilyAllergyIngredient,
} from '../analysis/allergyFamilyMatcher';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { getRecommendationBreakdown, resolveDisplayVerdict } from '../utils/score';

export type NamedPoultryFamily = 'chicken' | 'duck' | 'turkey';

interface NamedPoultryFixture {
  family: NamedPoultryFamily;
  allergyLabel: string;
  ingredientLabel: string;
}

export interface PoultryCrossFamilyAuditRow {
  allergyFamily: NamedPoultryFamily;
  allergyLabel: string;
  ingredientFamily: NamedPoultryFamily;
  ingredientLabel: string;
  allergyTags: string[];
  ingredientTags: string[];
  sharedTags: string[];
  currentMatch: boolean;
  matchKind: 'same_named_source' | 'shared_poultry_crossmatch' | 'no_match';
}

export interface PoultryCrossFamilyScoreImpactRow {
  allergyFamily: NamedPoultryFamily;
  ingredientFamily: NamedPoultryFamily;
  allergyLabel: string;
  ingredientLabel: string;
  allergyHits: string[];
  allergyPenalty: number;
  recommendationScore: number;
  displayScore: number;
}

export interface PoultryCrossFamilySpecificityAudit {
  auditKind: 'poultry_cross_family_specificity_audit';
  namedMatrix: PoultryCrossFamilyAuditRow[];
  crossSpeciesScoreImpact: PoultryCrossFamilyScoreImpactRow[];
  genericPoultryMatches: Array<{
    allergyLabel: '가금류';
    ingredientFamily: NamedPoultryFamily;
    ingredientLabel: string;
    currentMatch: boolean;
  }>;
  unknownAnimalByproductNamedMatches: Array<{
    allergyFamily: NamedPoultryFamily;
    allergyLabel: string;
    ingredientLabel: '동물성부산물';
    currentMatch: boolean;
  }>;
  summary: {
    namedPairs: number;
    sameSourceMatches: number;
    crossSpeciesMatches: number;
    genericPoultryMatches: number;
    unknownAnimalByproductNamedMatches: number;
    crossSpeciesScoreCappedProducts: number;
  };
  safety: {
    changesMatcher: false;
    changesScoreLogic: false;
    changesUi: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    executesSql: false;
    changesEnvOrDeploy: false;
  };
}

const NAMED_POULTRY: NamedPoultryFixture[] = [
  { family: 'chicken', allergyLabel: '닭', ingredientLabel: '닭고기' },
  { family: 'duck', allergyLabel: '오리', ingredientLabel: '오리고기' },
  { family: 'turkey', allergyLabel: '칠면조', ingredientLabel: '칠면조고기' },
];

function ingredient(nameKo: string): Ingredient {
  return {
    id: `audit-${nameKo}`,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(item: Ingredient): Product {
  return {
    id: `audit-product-${item.id}`,
    brand: 'Audit',
    name: `Audit ${item.nameKo}`,
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [item],
    reviewsCount: 0,
    averageRating: 0,
  };
}

function profile(allergyLabel: string): UserPetProfile {
  return {
    id: `audit-profile-${allergyLabel}`,
    name: '감사견',
    species: 'Dog',
    age: 4,
    healthConcerns: [],
    allergies: [allergyLabel],
  };
}

function intersection(left: string[], right: string[]): string[] {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function namedMatrixRow(
  allergy: NamedPoultryFixture,
  candidate: NamedPoultryFixture,
): PoultryCrossFamilyAuditRow {
  const candidateIngredient = ingredient(candidate.ingredientLabel);
  const allergyTags = allergyTagsForLabel(allergy.allergyLabel);
  const ingredientTags = allergyTagsForIngredient(candidateIngredient);
  const sharedTags = intersection(allergyTags, ingredientTags);
  const currentMatch = isFamilyAllergyIngredient(candidateIngredient, [allergy.allergyLabel]);

  let matchKind: PoultryCrossFamilyAuditRow['matchKind'] = 'no_match';
  if (currentMatch && allergy.family === candidate.family) matchKind = 'same_named_source';
  if (currentMatch && allergy.family !== candidate.family) matchKind = 'shared_poultry_crossmatch';

  return {
    allergyFamily: allergy.family,
    allergyLabel: allergy.allergyLabel,
    ingredientFamily: candidate.family,
    ingredientLabel: candidate.ingredientLabel,
    allergyTags,
    ingredientTags,
    sharedTags,
    currentMatch,
    matchKind,
  };
}

function scoreImpactRow(
  allergy: NamedPoultryFixture,
  candidate: NamedPoultryFixture,
): PoultryCrossFamilyScoreImpactRow {
  const candidateProduct = product(ingredient(candidate.ingredientLabel));
  const breakdown = getRecommendationBreakdown(candidateProduct, profile(allergy.allergyLabel));
  const display = resolveDisplayVerdict(breakdown.total, {
    speciesMismatch: breakdown.speciesMismatch,
    allergyHits: breakdown.allergyHits.length,
    dangerCount: breakdown.dangerCount,
  });

  return {
    allergyFamily: allergy.family,
    ingredientFamily: candidate.family,
    allergyLabel: allergy.allergyLabel,
    ingredientLabel: candidate.ingredientLabel,
    allergyHits: breakdown.allergyHits,
    allergyPenalty: breakdown.allergyPenalty,
    recommendationScore: breakdown.total,
    displayScore: display.score,
  };
}

export function buildPoultryCrossFamilySpecificityAudit(): PoultryCrossFamilySpecificityAudit {
  const namedMatrix = NAMED_POULTRY.flatMap((allergy) =>
    NAMED_POULTRY.map((candidate) => namedMatrixRow(allergy, candidate)),
  );
  const crossSpeciesScoreImpact = NAMED_POULTRY.flatMap((allergy) =>
    NAMED_POULTRY.filter((candidate) => candidate.family !== allergy.family).map((candidate) =>
      scoreImpactRow(allergy, candidate),
    ),
  );
  const genericPoultryMatches = NAMED_POULTRY.map((candidate) => ({
    allergyLabel: '가금류' as const,
    ingredientFamily: candidate.family,
    ingredientLabel: candidate.ingredientLabel,
    currentMatch: isFamilyAllergyIngredient(ingredient(candidate.ingredientLabel), ['가금류']),
  }));
  const unknownAnimalByproductNamedMatches = NAMED_POULTRY.map((allergy) => ({
    allergyFamily: allergy.family,
    allergyLabel: allergy.allergyLabel,
    ingredientLabel: '동물성부산물' as const,
    currentMatch: isFamilyAllergyIngredient(ingredient('동물성부산물'), [allergy.allergyLabel]),
  }));

  return {
    auditKind: 'poultry_cross_family_specificity_audit',
    namedMatrix,
    crossSpeciesScoreImpact,
    genericPoultryMatches,
    unknownAnimalByproductNamedMatches,
    summary: {
      namedPairs: namedMatrix.length,
      sameSourceMatches: namedMatrix.filter((row) => row.matchKind === 'same_named_source').length,
      crossSpeciesMatches: namedMatrix.filter(
        (row) => row.matchKind === 'shared_poultry_crossmatch',
      ).length,
      genericPoultryMatches: genericPoultryMatches.filter((row) => row.currentMatch).length,
      unknownAnimalByproductNamedMatches: unknownAnimalByproductNamedMatches.filter(
        (row) => row.currentMatch,
      ).length,
      crossSpeciesScoreCappedProducts: crossSpeciesScoreImpact.filter(
        (row) => row.allergyPenalty > 0 && row.displayScore <= 9,
      ).length,
    },
    safety: {
      changesMatcher: false,
      changesScoreLogic: false,
      changesUi: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      executesSql: false,
      changesEnvOrDeploy: false,
    },
  };
}
