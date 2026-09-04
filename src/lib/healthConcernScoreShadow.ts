import type { Product, UserPetProfile } from '../types';
import {
  calculateCompatibilityScore,
  getRecommendationBreakdown,
  resolveDisplayVerdict,
  type DisplayVerdict,
  type RecommendationBreakdown,
} from '../utils/score';

export interface LegacyHealthConcernShadowBaseline {
  breakdown: RecommendationBreakdown;
  compatibilityScore: number;
  displayVerdict: DisplayVerdict;
}

/** Read-only baseline capture for sidecar comparison. Runtime modules must never import this module. */
export function captureLegacyHealthConcernShadowBaseline(
  product: Product,
  profile: UserPetProfile,
): LegacyHealthConcernShadowBaseline {
  const breakdown = getRecommendationBreakdown(product, profile);
  return {
    breakdown,
    compatibilityScore: calculateCompatibilityScore(product, profile),
    displayVerdict: resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    }),
  };
}
