import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  allergyCautionMatches,
  allergyIngredientNames,
  type AllergyRelationshipKind,
} from '../analysis/allergyFamilyMatcher';
import { getRecommendationBreakdown, resolveDisplayVerdict } from '../utils/score';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';

export type PoultrySyntheticProfileId = 'chicken' | 'duck' | 'turkey' | 'poultry';

export interface PoultrySyntheticProfile {
  id: PoultrySyntheticProfileId;
  allergyLabel: string;
}

export const POULTRY_SYNTHETIC_PROFILES: PoultrySyntheticProfile[] = [
  { id: 'chicken', allergyLabel: '닭' },
  { id: 'duck', allergyLabel: '오리' },
  { id: 'turkey', allergyLabel: '칠면조' },
  { id: 'poultry', allergyLabel: '가금류' },
];

export interface ProductionReadOnlyPoultrySignalRow {
  productId: string;
  productName: string;
  profileId: PoultrySyntheticProfileId;
  allergyLabel: string;
  syntheticSpecies: 'Dog' | 'Cat';
  ingredientNames: string[];
  hardHits: string[];
  cautionKinds: AllergyRelationshipKind[];
  cautionIngredientNames: string[];
  scoreStatus: 'computed' | 'data_incomplete';
  score: number | null;
  displayScore: number | null;
  allergyPenalty: number | null;
  allergyCautionPenalty: number | null;
  rankingPosition: number | null;
}

export interface ProductionReadOnlyPoultrySignalMatrixReport {
  rows: ProductionReadOnlyPoultrySignalRow[];
  summary: {
    productsRead: number;
    profileCount: number;
    matrixRows: number;
    computedRows: number;
    incompleteRows: number;
    hardRows: number;
    cautionOnlyRows: number;
    noneRows: number;
    productsMissingIngredientLinks: number;
    missingLinkedIngredients: number;
    invalidRiskLevelIngredients: number;
  };
  safety: {
    readOnlyOnly: true;
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimePolicy: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
  };
}

const VALID_RISK_LEVELS = new Set<Ingredient['riskLevel']>(['safe', 'caution', 'danger']);

function riskLevelOrNull(value?: string | null): Ingredient['riskLevel'] | null {
  return VALID_RISK_LEVELS.has(value as Ingredient['riskLevel'])
    ? (value as Ingredient['riskLevel'])
    : null;
}

function syntheticSpecies(targetPetType?: string | null): 'Dog' | 'Cat' {
  return targetPetType === 'cat' ? 'Cat' : 'Dog';
}

function productTargetPetType(value?: string | null): Product['targetPetType'] {
  return value === 'dog' || value === 'cat' || value === 'all' ? value : undefined;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function buildProductionReadOnlyPoultrySignalMatrix(
  input: ProductionReadOnlyRows,
): ProductionReadOnlyPoultrySignalMatrixReport {
  const ingredientsById = new Map(input.ingredients.map((row) => [row.id, row]));
  const linksByProductId = new Map<string, typeof input.productIngredients>();

  for (const link of input.productIngredients) {
    const existing = linksByProductId.get(link.productId) ?? [];
    existing.push(link);
    linksByProductId.set(link.productId, existing);
  }

  let productsMissingIngredientLinks = 0;
  let missingLinkedIngredients = 0;
  let invalidRiskLevelIngredients = 0;

  const rows: ProductionReadOnlyPoultrySignalRow[] = [];

  for (const sourceProduct of input.products) {
    const links = [...(linksByProductId.get(sourceProduct.id) ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    if (links.length === 0) productsMissingIngredientLinks += 1;

    const matcherIngredients: Ingredient[] = [];
    let scoreable = links.length > 0;

    for (const link of links) {
      const sourceIngredient = ingredientsById.get(link.ingredientId);
      if (!sourceIngredient) {
        missingLinkedIngredients += 1;
        scoreable = false;
        continue;
      }

      const riskLevel = riskLevelOrNull(sourceIngredient.riskLevel);
      if (!riskLevel) {
        invalidRiskLevelIngredients += 1;
        scoreable = false;
      }

      // Matcher behavior depends on ingredient identity/name, not risk level.
      // For incomplete rows we use a non-safe placeholder only to preserve identity matching;
      // score/display fields remain null until the physical risk level is valid.
      matcherIngredients.push({
        id: sourceIngredient.id,
        nameKo: sourceIngredient.nameKo,
        nameEn: sourceIngredient.nameEn ?? '',
        purpose: '',
        riskLevel: riskLevel ?? 'caution',
      });
    }

    const targetPetType = productTargetPetType(sourceProduct.targetPetType);
    const species = syntheticSpecies(sourceProduct.targetPetType);
    const product: Product = {
      id: sourceProduct.id,
      brand: 'Production read-only export',
      name: sourceProduct.name,
      category: sourceProduct.category ?? '',
      targetPetType,
      imageUrl: '',
      ingredients: matcherIngredients,
      reviewsCount: 0,
      averageRating: 0,
    };

    for (const syntheticProfile of POULTRY_SYNTHETIC_PROFILES) {
      const profile: UserPetProfile = {
        id: `readonly-${syntheticProfile.id}-${sourceProduct.id}`,
        name: '가상 프로필',
        species,
        age: 4,
        healthConcerns: [],
        allergies: [syntheticProfile.allergyLabel],
      };

      const hardHits = dedupe(
        allergyIngredientNames(matcherIngredients, syntheticProfile.allergyLabel),
      );
      const cautionMatches = allergyCautionMatches(
        matcherIngredients,
        profile.allergies,
      );

      let score: number | null = null;
      let displayScore: number | null = null;
      let allergyPenalty: number | null = null;
      let allergyCautionPenalty: number | null = null;

      if (scoreable) {
        const breakdown = getRecommendationBreakdown(product, profile);
        const verdict = resolveDisplayVerdict(breakdown.total, {
          speciesMismatch: breakdown.speciesMismatch,
          allergyHits: breakdown.allergyHits.length,
          dangerCount: breakdown.dangerCount,
        });
        score = breakdown.total;
        displayScore = verdict.score;
        allergyPenalty = breakdown.allergyPenalty;
        allergyCautionPenalty = breakdown.allergyCautionPenalty;
      }

      rows.push({
        productId: sourceProduct.id,
        productName: sourceProduct.name,
        profileId: syntheticProfile.id,
        allergyLabel: syntheticProfile.allergyLabel,
        syntheticSpecies: species,
        ingredientNames: matcherIngredients.map((ingredient) => ingredient.nameKo),
        hardHits,
        cautionKinds: dedupe(cautionMatches.map((match) => match.kind)) as AllergyRelationshipKind[],
        cautionIngredientNames: dedupe(cautionMatches.map((match) => match.ingredientName)),
        scoreStatus: scoreable ? 'computed' : 'data_incomplete',
        score,
        displayScore,
        allergyPenalty,
        allergyCautionPenalty,
        rankingPosition: null,
      });
    }
  }

  for (const syntheticProfile of POULTRY_SYNTHETIC_PROFILES) {
    const ranked = rows
      .filter((row) => row.profileId === syntheticProfile.id && row.score !== null)
      .sort((a, b) => (b.score as number) - (a.score as number) || a.productId.localeCompare(b.productId));
    ranked.forEach((row, index) => {
      row.rankingPosition = index + 1;
    });
  }

  return {
    rows,
    summary: {
      productsRead: input.products.length,
      profileCount: POULTRY_SYNTHETIC_PROFILES.length,
      matrixRows: rows.length,
      computedRows: rows.filter((row) => row.scoreStatus === 'computed').length,
      incompleteRows: rows.filter((row) => row.scoreStatus === 'data_incomplete').length,
      hardRows: rows.filter((row) => row.hardHits.length > 0).length,
      cautionOnlyRows: rows.filter(
        (row) => row.hardHits.length === 0 && row.cautionKinds.length > 0,
      ).length,
      noneRows: rows.filter(
        (row) => row.hardHits.length === 0 && row.cautionKinds.length === 0,
      ).length,
      productsMissingIngredientLinks,
      missingLinkedIngredients,
      invalidRiskLevelIngredients,
    },
    safety: {
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimePolicy: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    },
  };
}
