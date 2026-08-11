import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product, UserPetProfile } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import {
  calculateCompatibilityScore,
  getPhase2AliasResolverScoringProduct,
  getRecommendationBreakdown,
  rankProductsForProfile,
} from '../utils/score';
import {
  isPhase2AliasResolverRuntimeEnabled,
  resolvePhase2AliasResolverRuntimeFlag,
} from './phase2AliasResolverRuntimeFlag';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const flagSource = readFileSync(join(process.cwd(), 'src/lib/phase2AliasResolverRuntimeFlag.ts'), 'utf8');

function product(id: string, ingredientName: string, riskLevel: 'safe' | 'caution' | 'danger' = 'safe'): Product {
  return {
    id,
    brand: 'Flag Fixture Brand',
    name: `Flag Fixture Product ${id}`,
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [
      {
        id: `${id}-ingredient`,
        nameKo: ingredientName,
        nameEn: ingredientName,
        purpose: '',
        riskLevel,
      },
    ],
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

const profile: UserPetProfile = {
  species: 'Dog',
  age: 3,
  weight: 7,
  allergies: [],
  healthConcerns: [],
};

describe('Phase 2 alias resolver disabled runtime flag accessor', () => {
  it('keeps the runtime flag hard-disabled without env/config/secrets', () => {
    // 동작 검증: 인자 없이 호출하는 런타임 경로는 항상 비활성이어야 한다.
    expect(isPhase2AliasResolverRuntimeEnabled()).toBe(false);
    expect(resolvePhase2AliasResolverRuntimeFlag()).toBe(false);
    expect(resolvePhase2AliasResolverRuntimeFlag({})).toBe(false);
    // 살아있는 설정을 읽어 우발적으로 켜지는 경로가 없어야 한다.
    expect(flagSource).not.toContain('process.env');
    expect(flagSource).not.toContain('import.meta.env');
    expect(flagSource).not.toContain('localStorage');
    expect(flagSource).not.toContain('sessionStorage');
    // 무조건 true 를 돌려주는 경로가 없어야 한다(테스트 전용 시드는 예외).
    expect(flagSource).not.toContain('return true');
  });

  it('uses the disabled accessor in score.ts without introducing a true runtime marker', () => {
    expect(scoreSource).toContain('isPhase2AliasResolverRuntimeEnabled()');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
    expect(scoreSource).toContain('flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }');
  });

  it('preserves the scoring product and ingredient references', () => {
    const fixture = product('stable', '비타민 E');
    const scoringProduct = getPhase2AliasResolverScoringProduct(fixture);

    expect(scoringProduct).toBe(fixture);
    expect(scoringProduct.ingredients).toBe(fixture.ingredients);
    expect(scoringProduct.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(['비타민 E']);
  });

  it('keeps score, breakdown, display verdict, and ranking behavior stable', () => {
    const safeProduct = product('safe', '비타민 E');
    const dangerProduct = product('danger', '위험 원료', 'danger');

    const safeScore = calculateCompatibilityScore(safeProduct, profile);
    const safeBreakdown = getRecommendationBreakdown(safeProduct, profile);
    const safeDisplay = resolveProductDisplayVerdict(safeProduct, profile);
    const ranked = rankProductsForProfile([dangerProduct, safeProduct], profile);

    expect(safeScore).toBe(safeBreakdown.total);
    expect(safeDisplay.breakdown.total).toBe(safeBreakdown.total);
    expect(safeDisplay.score).toBeLessThanOrEqual(safeBreakdown.total);
    expect(ranked.map((row) => row.product.id)).toEqual(['safe', 'danger']);
  });
});
