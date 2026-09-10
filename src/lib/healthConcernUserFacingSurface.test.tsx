import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { buildAllergyDisplayState } from '../utils/allergyDisplay';
import { getRecommendationBreakdown } from '../utils/score';

function source(relativeUrl: string): string {
  return readFileSync(fileURLToPath(new URL(relativeUrl, import.meta.url)), 'utf8');
}

function ingredient(nameKo: string): Ingredient {
  return { id: nameKo, nameKo, nameEn: '', purpose: '', riskLevel: 'safe' };
}

describe('health concern user-facing surfaces', () => {
  it('keeps the original cat chicken-allergy regression explicit with chicken and turkey ingredients', () => {
    const profile: UserPetProfile = {
      id: 'cat-chicken-allergy', name: '모카', species: 'Cat', age: 5,
      healthConcerns: ['심장'], allergies: ['닭'],
    };
    const product: Product = {
      id: 'chicken-turkey-food', brand: 'Fixture', name: '닭고기 칠면조 레시피',
      category: 'food', targetPetType: 'cat', imageUrl: '',
      ingredients: [ingredient('닭고기'), ingredient('칠면조고기'), ingredient('타우린')],
      reviewsCount: 0, averageRating: 0,
    };
    const breakdown = getRecommendationBreakdown(product, profile);
    const display = buildAllergyDisplayState(breakdown, profile.name, {
      hasIngredientData: true,
      hasAllergyProfile: true,
    });

    expect(breakdown.allergyHits).toEqual(['닭']);
    expect(display.level).toBe('hard');
    expect(`${display.shortText} ${display.summaryText}`).toContain('닭');
    expect(`${display.shortText} ${display.summaryText}`).not.toContain('해당 없음');
    expect(`${display.shortText} ${display.summaryText}`).not.toContain('미포함');
  });

  it('wires the same structured concern presentation into analysis and detail', () => {
    for (const path of ['../pages/AnalysisResult.tsx', '../pages/Detail.tsx']) {
      const page = source(path);
      expect(page).toContain('buildHealthConcernPresentation');
      expect(page).toContain('<HealthConcernEvidence');
      expect(page).toContain('healthConcernPolicy');
    }
  });

  it('keeps superseded broad claims out of the edited user-facing sources', () => {
    const visibleSources = [
      source('../pages/AnalysisResult.tsx'),
      source('../pages/Detail.tsx'),
      source('../utils/analysis.ts'),
      source('../utils/productConclusion.ts'),
      source('../utils/allergyDisplay.ts'),
    ].join('\n');
    for (const forbidden of [
      '알레르기 성분 미포함',
      '주의·위험 성분 없음',
      '추천합니다.',
      '안심하고 먹을 수',
      '에게 대체로 잘 맞',
      '건강 조건이 매우 잘 맞',
    ]) {
      expect(visibleSources).not.toContain(forbidden);
    }
  });
});
