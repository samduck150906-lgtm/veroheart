import type { Product, UserPetProfile } from '../types';
import {
  getRecommendationBreakdown,
  resolveDisplayVerdict,
  type CompatibilityGrade,
  type DisplayVerdict,
  type RecommendationBreakdown,
} from './score';

export interface ProductDisplayVerdict {
  breakdown: RecommendationBreakdown;
  verdict: DisplayVerdict;
  score: number;
  grade: CompatibilityGrade;
}

/**
 * Product cards and summary surfaces should show the same safety-capped score as
 * the detail hero. Ranking can still use the personalized score, but public UI
 * must not show a high-looking badge when species, allergy, or danger gates apply.
 */
export function resolveProductDisplayVerdict(product: Product, profile: UserPetProfile): ProductDisplayVerdict {
  const breakdown = getRecommendationBreakdown(product, profile);
  const verdict = resolveDisplayVerdict(breakdown.total, {
    speciesMismatch: breakdown.speciesMismatch,
    allergyHits: breakdown.allergyHits.length,
    dangerCount: breakdown.dangerCount,
  });

  return {
    breakdown,
    verdict,
    score: verdict.score,
    grade: verdict.grade,
  };
}
