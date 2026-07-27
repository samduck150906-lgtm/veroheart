import type { Product, UserPetProfile } from '../types';
import { DEFAULT_USER_PET_PROFILE } from '../types';
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
 * 실제 반려동물 프로필인지 판별한다. 로그인 전(또는 펫 미등록) 상태는
 * 기본 프로필(DEFAULT_USER_PET_PROFILE, 종=Dog)로 채워지는데, 이 가짜 프로필로
 * 종 불일치·알레르기 개인화 감점을 적용하면 게스트에게 고양이 제품이 전부
 * 0점으로 보이는 오류가 생긴다.
 */
export function isRealPetProfile(profile: UserPetProfile | null | undefined): boolean {
  return Boolean(profile && profile.id && profile.id !== DEFAULT_USER_PET_PROFILE.id);
}

/**
 * Product cards and summary surfaces should show the same safety-capped score as
 * the detail hero. Ranking can still use the personalized score, but public UI
 * must not show a high-looking badge when species, allergy, or danger gates apply.
 *
 * 게스트(기본 프로필)에게는 개인화 감점(종·알레르기)을 적용하지 않은 객관
 * 점수(baseScore)를 보여준다. 위험 성분 상한(≤69)은 프로필과 무관하게 적용한다.
 */
export function resolveProductDisplayVerdict(product: Product, profile: UserPetProfile): ProductDisplayVerdict {
  const breakdown = getRecommendationBreakdown(product, profile);
  const personalized = isRealPetProfile(profile);
  const verdict = resolveDisplayVerdict(personalized ? breakdown.total : breakdown.baseScore, {
    speciesMismatch: personalized && breakdown.speciesMismatch,
    allergyHits: personalized ? breakdown.allergyHits.length : 0,
    dangerCount: breakdown.dangerCount,
  });

  return {
    breakdown,
    verdict,
    score: verdict.score,
    grade: verdict.grade,
  };
}
