import type { Product, UserPetProfile } from '../types';
import {
  calculateCompatibilityScore,
  getRecommendationBreakdown,
  gradeFromScore,
  type CompatibilityGrade,
} from './score';

/** 카드에 표시할 등급 — 산출 가능한 A~D 또는 아직 분석 전(pending) */
export type DisplayGrade = CompatibilityGrade | 'pending';
export type GradeBasis = 'compatibility' | 'safety' | 'pending';

export interface DisplayGradeInfo {
  grade: DisplayGrade;
  /** 'A등급' | 'B등급' | … | '분석 중' */
  label: string;
  /** 궁합 점수 (반려동물 프로필 기반)일 때만 채워짐 */
  score: number | null;
  basis: GradeBasis;
}

/** 등급별 색상/표기 단일 소스 — 모든 카드/배지가 공유 */
export const GRADE_META: Record<DisplayGrade, { letter: string; bg: string; color: string }> = {
  A: { letter: 'A', bg: 'var(--safe-tint)', color: 'var(--safe)' },
  B: { letter: 'B', bg: 'var(--caution-tint)', color: 'var(--caution)' },
  C: { letter: 'C', bg: 'var(--danger-tint)', color: 'var(--danger)' },
  D: { letter: 'D', bg: 'var(--danger-tint)', color: 'var(--danger)' },
  pending: { letter: '·', bg: 'var(--fill)', color: 'var(--ink-400)' },
};

/** 분석된 성분이 하나라도 있으면 등급 산출 가능 */
export function isAnalyzed(product: Product): boolean {
  return Array.isArray(product.ingredients) && product.ingredients.length > 0;
}

/** 로그인 + 실제 반려동물 프로필이 등록되어 맞춤 궁합 산출이 가능한지 */
export function hasRealPetProfile(
  profile?: UserPetProfile | null,
  isLoggedIn?: boolean,
): boolean {
  return Boolean(isLoggedIn && profile?.name && profile.name !== '우리 아이');
}

/** 프로필 없이 성분 안전도만으로 산출하는 점수 (0–100). */
export function getSafetyScore(product: Product): number {
  const ings = product.ingredients ?? [];
  const danger = ings.filter((i) => i.riskLevel === 'danger').length;
  const caution = ings.filter((i) => i.riskLevel === 'caution').length;
  const safe = ings.filter((i) => i.riskLevel === 'safe').length;

  let score = 88;
  score -= danger * 18;
  score -= caution * 6;
  score += Math.min(6, safe);
  if (product.verificationStatus === 'verified') score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 카드에 표시할 등급을 결정한다.
 * - 성분 미분석 → '분석 중'(pending)
 * - 프로필 있음 → 맞춤 궁합 등급
 * - 프로필 없음 → 성분 안전도 등급
 */
export function getDisplayGrade(
  product: Product,
  profile?: UserPetProfile | null,
  withProfile?: boolean,
): DisplayGradeInfo {
  if (!isAnalyzed(product)) {
    return { grade: 'pending', label: '분석 중', score: null, basis: 'pending' };
  }
  if (withProfile && profile) {
    const score = calculateCompatibilityScore(product, profile);
    const grade = gradeFromScore(score);
    return { grade, label: `${grade}등급`, score, basis: 'compatibility' };
  }
  const grade = gradeFromScore(getSafetyScore(product));
  return { grade, label: `${grade}등급`, score: null, basis: 'safety' };
}

export interface AllergyInfo {
  hits: string[];
  /** 등록된 알러지 성분과 겹치는 게 없음 */
  safe: boolean;
}

/** 프로필에 알러지가 등록되어 있고 상품이 분석된 경우에만 적합 여부를 반환 */
export function getAllergyInfo(
  product: Product,
  profile?: UserPetProfile | null,
  withProfile?: boolean,
): AllergyInfo | null {
  if (!withProfile || !profile || !profile.allergies?.length) return null;
  if (!isAnalyzed(product)) return null;
  const hits = getRecommendationBreakdown(product, profile).allergyHits;
  return { hits, safe: hits.length === 0 };
}

/** 성분 안전도 카운트 (등급 근거 설명용) */
export function getSafetyCounts(product: Product) {
  const ings = product.ingredients ?? [];
  return {
    total: ings.length,
    danger: ings.filter((i) => i.riskLevel === 'danger').length,
    caution: ings.filter((i) => i.riskLevel === 'caution').length,
    safe: ings.filter((i) => i.riskLevel === 'safe').length,
  };
}
