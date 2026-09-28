import type { IngredientProcessingForm } from '../lib/canonicalIngredientTypes';

export type ReviewedAllergenRelationshipType =
  | 'contains'
  | 'derived_from'
  | 'may_contain'
  | 'cross_contact';

export interface CanonicalIngredientForAllergenReview {
  canonicalIngredientId: string;
  canonicalName: string;
  rawLabelText: string;
  sourceFamily: string;
  processingForm: IngredientProcessingForm;
}

export interface PetAllergenSelection {
  allergenId: string;
  sourceFamily: string;
}

export interface ReviewedAllergenRelationship {
  id: string;
  sourceFamily: string;
  allergenId: string;
  relationshipType: ReviewedAllergenRelationshipType;
  processingFormCondition: IngredientProcessingForm | null;
  speciesScope: 'dog' | 'cat' | 'both';
  evidenceSourceId: string;
  reviewedAt: string;
  isActive: boolean;
}

export interface AllergenRelationshipFinding {
  canonicalIngredientId: string;
  canonicalIngredientName: string;
  rawLabelText: string;
  allergenId: string;
  sourceFamily: string;
  relationshipType: ReviewedAllergenRelationshipType;
  processingForm: IngredientProcessingForm;
  confidence: 'reviewed';
  evidenceSourceId: string;
  relationshipId: string;
}

function normalizeFamily(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/[\s._-]+/g, '');
}

export function resolveReviewedAllergenRelationships(
  ingredients: CanonicalIngredientForAllergenReview[],
  allergies: PetAllergenSelection[],
  relationships: ReviewedAllergenRelationship[],
  species: 'dog' | 'cat',
): AllergenRelationshipFinding[] {
  const allergyIds = new Set(allergies.map((allergy) => allergy.allergenId));
  const selectedFamilies = new Map(
    allergies.map((allergy) => [allergy.allergenId, normalizeFamily(allergy.sourceFamily)]),
  );

  return ingredients.flatMap((ingredient) => relationships
    .filter((relationship) => relationship.isActive && Boolean(relationship.reviewedAt))
    .filter((relationship) => allergyIds.has(relationship.allergenId))
    .filter((relationship) => relationship.speciesScope === 'both' || relationship.speciesScope === species)
    .filter((relationship) => normalizeFamily(relationship.sourceFamily) === normalizeFamily(ingredient.sourceFamily))
    .filter((relationship) => selectedFamilies.get(relationship.allergenId) === normalizeFamily(ingredient.sourceFamily))
    .filter((relationship) => relationship.processingFormCondition === null
      || relationship.processingFormCondition === ingredient.processingForm)
    .map((relationship) => ({
      canonicalIngredientId: ingredient.canonicalIngredientId,
      canonicalIngredientName: ingredient.canonicalName,
      rawLabelText: ingredient.rawLabelText,
      allergenId: relationship.allergenId,
      sourceFamily: ingredient.sourceFamily,
      relationshipType: relationship.relationshipType,
      processingForm: ingredient.processingForm,
      confidence: 'reviewed' as const,
      evidenceSourceId: relationship.evidenceSourceId,
      relationshipId: relationship.id,
    })));
}
