import type { Ingredient, Product, UserPetProfile } from '../types';
import { getRecommendationBreakdown, resolveDisplayVerdict } from '../utils/score';
import {
  buildAnimalIngredientImpactDiffReport,
  type AnimalIngredientImpactSnapshotRow,
} from './animalIngredientImpactDiffHarness';

export type AnimalFamilyId =
  | 'chicken'
  | 'beef'
  | 'pork'
  | 'duck'
  | 'lamb'
  | 'turkey'
  | 'fish'
  | 'egg';

export interface AnimalFamilyFixtureCase {
  id: string;
  family: AnimalFamilyId;
  allergyLabel: string;
  ingredientName: string;
  shouldHitFamilyAllergy: boolean;
  note: string;
}

export const ANIMAL_FAMILY_FIXTURE_CASES: AnimalFamilyFixtureCase[] = [
  { id: 'chicken-meat', family: 'chicken', allergyLabel: '닭', ingredientName: '닭고기', shouldHitFamilyAllergy: true, note: 'fresh named meat' },
  { id: 'chicken-meal', family: 'chicken', allergyLabel: '닭', ingredientName: '계육분', shouldHitFamilyAllergy: true, note: 'named meal' },
  { id: 'chicken-organ', family: 'chicken', allergyLabel: '닭', ingredientName: '닭간', shouldHitFamilyAllergy: true, note: 'named organ' },
  { id: 'chicken-fat', family: 'chicken', allergyLabel: '닭', ingredientName: '닭지방', shouldHitFamilyAllergy: false, note: 'named fat uses processing caution' },
  { id: 'poultry-byproduct', family: 'chicken', allergyLabel: '닭', ingredientName: '가금류부산물', shouldHitFamilyAllergy: false, note: 'generic poultry uses strong caution' },
  { id: 'unknown-animal-byproduct', family: 'chicken', allergyLabel: '닭', ingredientName: '동물성부산물', shouldHitFamilyAllergy: false, note: 'unknown source must not become chicken' },
  { id: 'beef-meat', family: 'beef', allergyLabel: '소', ingredientName: '소고기', shouldHitFamilyAllergy: true, note: 'fresh named meat' },
  { id: 'beef-organ', family: 'beef', allergyLabel: '소', ingredientName: '소간', shouldHitFamilyAllergy: true, note: 'named organ' },
  { id: 'pork-meat', family: 'pork', allergyLabel: '돼지', ingredientName: '돼지고기', shouldHitFamilyAllergy: true, note: 'fresh named meat' },
  { id: 'duck-meat', family: 'duck', allergyLabel: '오리', ingredientName: '오리고기', shouldHitFamilyAllergy: true, note: 'fresh named poultry' },
  { id: 'lamb-meat', family: 'lamb', allergyLabel: '양', ingredientName: '양고기', shouldHitFamilyAllergy: true, note: 'fresh named meat' },
  { id: 'turkey-meat', family: 'turkey', allergyLabel: '칠면조', ingredientName: '칠면조', shouldHitFamilyAllergy: true, note: 'fresh named poultry' },
  { id: 'salmon-meat', family: 'fish', allergyLabel: '생선', ingredientName: '연어', shouldHitFamilyAllergy: true, note: 'named fish protein' },
  { id: 'fish-meal', family: 'fish', allergyLabel: '생선', ingredientName: '어분', shouldHitFamilyAllergy: true, note: 'fish meal' },
  { id: 'fish-oil', family: 'fish', allergyLabel: '생선', ingredientName: '연어오일', shouldHitFamilyAllergy: true, note: 'fish source oil' },
  { id: 'egg-white', family: 'egg', allergyLabel: '계란', ingredientName: '난백', shouldHitFamilyAllergy: true, note: 'egg part' },
];

function ingredient(nameKo: string): Ingredient {
  return {
    id: nameKo,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(testCase: AnimalFamilyFixtureCase): Product {
  return {
    id: testCase.id,
    brand: 'Fixture',
    name: testCase.id,
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [ingredient(testCase.ingredientName)],
    reviewsCount: 0,
    averageRating: 0,
  };
}

function profile(allergyLabel: string): UserPetProfile {
  return {
    id: `profile-${allergyLabel}`,
    name: '테스트견',
    species: 'Dog',
    age: 4,
    healthConcerns: [],
    allergies: [allergyLabel],
  };
}

export function buildCandidateAnimalFamilySnapshotRows(
  cases: AnimalFamilyFixtureCase[] = ANIMAL_FAMILY_FIXTURE_CASES,
): AnimalIngredientImpactSnapshotRow[] {
  return cases.map((testCase, index) => {
    const fixtureProduct = product(testCase);
    const fixtureProfile = profile(testCase.allergyLabel);
    const breakdown = getRecommendationBreakdown(fixtureProduct, fixtureProfile);
    const display = resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    });

    return {
      productId: testCase.id,
      productName: fixtureProduct.name,
      ingredientNames: fixtureProduct.ingredients.map((item) => item.nameKo),
      allergyHits: breakdown.allergyHits,
      score: breakdown.total,
      displayScore: display.score,
      rankingPosition: index + 1,
    };
  });
}

export function buildBaselineAnimalFamilySnapshotRows(
  cases: AnimalFamilyFixtureCase[] = ANIMAL_FAMILY_FIXTURE_CASES,
): AnimalIngredientImpactSnapshotRow[] {
  return cases.map((testCase, index) => {
    const hit = testCase.ingredientName.includes(testCase.allergyLabel);
    const shouldScoreAsAllergy = hit;
    return {
      productId: testCase.id,
      productName: testCase.id,
      ingredientNames: [testCase.ingredientName],
      allergyHits: hit ? [testCase.allergyLabel] : [],
      score: shouldScoreAsAllergy ? 0 : 80,
      displayScore: shouldScoreAsAllergy ? 0 : 80,
      rankingPosition: index + 1,
    };
  });
}

export function buildAnimalFamilyFixtureImpactReport() {
  return buildAnimalIngredientImpactDiffReport({
    hypothesisId: 'representative-animal-family-fixture-impact',
    hypothesisStatement:
      'Representative animal-family fixtures should show where source-family allergy matching changes allergy hits, scores, display, or ranking.',
    before: buildBaselineAnimalFamilySnapshotRows(),
    after: buildCandidateAnimalFamilySnapshotRows(),
  });
}