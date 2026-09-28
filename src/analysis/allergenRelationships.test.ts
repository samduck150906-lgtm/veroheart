import { describe, expect, it } from 'vitest';
import {
  resolveReviewedAllergenRelationships,
  type CanonicalIngredientForAllergenReview,
  type ReviewedAllergenRelationship,
} from './allergenRelationships';

const ingredient = (
  id: string,
  canonicalName: string,
  processingForm: CanonicalIngredientForAllergenReview['processingForm'],
  sourceFamily = 'chicken',
): CanonicalIngredientForAllergenReview => ({
  canonicalIngredientId: id,
  canonicalName,
  rawLabelText: canonicalName,
  sourceFamily,
  processingForm,
});

const relationship = (
  id: string,
  relationshipType: ReviewedAllergenRelationship['relationshipType'],
  processingFormCondition: ReviewedAllergenRelationship['processingFormCondition'],
): ReviewedAllergenRelationship => ({
  id,
  sourceFamily: 'chicken',
  allergenId: 'allergen-chicken',
  relationshipType,
  processingFormCondition,
  speciesScope: 'both',
  evidenceSourceId: `source-${id}`,
  reviewedAt: '2026-09-25T00:00:00Z',
  isActive: true,
});

const allergy = [{ allergenId: 'allergen-chicken', sourceFamily: 'chicken' }];

describe('reviewed allergen relationships', () => {
  it('distinguishes direct meat from reviewed derived meal', () => {
    const findings = resolveReviewedAllergenRelationships(
      [ingredient('meat', '닭고기', 'raw'), ingredient('meal', '닭고기분', 'meal')],
      allergy,
      [relationship('direct', 'contains', 'raw'), relationship('meal-map', 'derived_from', 'meal')],
      'dog',
    );
    expect(findings.map((finding) => [finding.canonicalIngredientId, finding.relationshipType])).toEqual([
      ['meat', 'contains'], ['meal', 'derived_from'],
    ]);
  });

  it('does not infer chicken fat from a shared family without an explicit reviewed map', () => {
    const findings = resolveReviewedAllergenRelationships(
      [ingredient('fat', '닭지방', 'fat')],
      allergy,
      [relationship('direct', 'contains', 'raw'), relationship('meal-map', 'derived_from', 'meal')],
      'dog',
    );
    expect(findings).toEqual([]);
  });

  it('keeps hydrolyzed protein under its own reviewed condition and evidence', () => {
    const findings = resolveReviewedAllergenRelationships(
      [ingredient('hydro', '가수분해 닭단백질', 'hydrolyzed')],
      allergy,
      [relationship('hydro-map', 'may_contain', 'hydrolyzed')],
      'cat',
    );
    expect(findings[0]).toMatchObject({
      canonicalIngredientId: 'hydro',
      relationshipType: 'may_contain',
      processingForm: 'hydrolyzed',
      evidenceSourceId: 'source-hydro-map',
      confidence: 'reviewed',
    });
  });

  it('ignores inactive, unreviewed, species-mismatched, and family-name-only similarity', () => {
    const inactive = { ...relationship('inactive', 'contains', 'raw'), isActive: false };
    const unreviewed = { ...relationship('unreviewed', 'contains', 'raw'), reviewedAt: '' };
    const catOnly = { ...relationship('cat', 'contains', 'raw'), speciesScope: 'cat' as const };
    expect(resolveReviewedAllergenRelationships(
      [ingredient('duck', '닭처럼 보이는 오리고기', 'raw', 'duck')],
      allergy,
      [inactive, unreviewed, catOnly],
      'dog',
    )).toEqual([]);
  });
});
