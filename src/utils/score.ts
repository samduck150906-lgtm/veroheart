import type { Product, UserPetProfile } from '../types';

/** 궁합 등급 — 점수(0~100)를 사용자에게 보여줄 A~F 등급으로 매핑한 단일 진실원천 */
export type CompatibilityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/** 0~100 점수 → A~F 등급. AnalysisResult·AnalysisSummaryHeader가 공유한다. */
export function gradeFromScore(score: number): CompatibilityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/** 하드캡 사유 — 알레르기(회피 성분)가 위험 성분보다 우선한다. */
export type VerdictCapReason = 'allergy' | 'danger' | null;

export interface DisplayVerdict {
  /** 화면에 표시할 점수(하드캡 반영). 랭킹용 원점수와 별개다. */
  score: number;
  grade: CompatibilityGrade;
  /** 상한선이 실제로 원점수를 끌어내렸을 때에만 사유를 채운다. */
  capReason: VerdictCapReason;
}

/**
 * 결과 화면 히어로에 표시할 "판정"을 계산한다.
 *
 * 문제: 궁합 점수는 알레르기·위험 성분이 있어도 부분 감점만 되므로, 회피 성분이
 * 들어 있는데도 "A등급 · 아주 잘 맞아요"(초록)로 표시되어 바로 아래 빨간 경고
 * 배너와 정면으로 모순될 수 있다. (사용자 신뢰를 깨는 대표적 결함)
 *
 * 해결: 랭킹에 쓰이는 원점수(calculateCompatibilityScore)는 그대로 두고,
 * 결과 화면에 "표시"되는 점수/등급만 상한선으로 하드캡한다.
 *  - 회피(알레르기) 성분 존재 → 최대 D("주의가 필요해요"). 알레르기 매칭은
 *    부분일치라 오탐 여지가 있어 F("맞지 않아요")까지 단정하지 않는다.
 *  - 위험 성분 존재(알레르기는 없음) → 최대 C("보통이에요").
 * 원점수가 이미 상한선보다 낮으면 그대로 둔다(점수를 올리지 않는다).
 */
export function resolveDisplayVerdict(
  rawScore: number,
  opts: { allergyHits?: number; dangerCount?: number } = {},
): DisplayVerdict {
  const safeRaw = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const hasAllergy = (opts.allergyHits ?? 0) > 0;
  const hasDanger = (opts.dangerCount ?? 0) > 0;

  const ceiling = hasAllergy ? 54 : hasDanger ? 69 : 100;
  const score = Math.min(safeRaw, ceiling);
  const capReason: VerdictCapReason =
    score < safeRaw ? (hasAllergy ? 'allergy' : 'danger') : null;

  return { score, grade: gradeFromScore(score), capReason };
}

export interface ProductBadge {
  label: string;
  tone: 'good' | 'warn' | 'danger';
}

export interface RecommendationBreakdown {
  total: number;
  safety: number;
  concern: number;
  socialProof: number;
  value: number;
  petFit: number;
  verification: number;
  allergyHits: string[];
  matchedConcerns: string[];
  dangerCount: number;
  cautionCount: number;
  reasons: string[];
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function countConcernMatches(product: Product, profile: UserPetProfile) {
  const matched = new Set<string>();

  for (const concern of profile.healthConcerns) {
    const normalizedConcern = normalize(concern);
    const matchesConcernTag = product.healthConcerns?.some((item) => normalize(item).includes(normalizedConcern));
    const matchesIngredient = product.ingredients.some(
      (ingredient) =>
        normalize(ingredient.purpose).includes(normalizedConcern) ||
        normalize(ingredient.nameKo).includes(normalizedConcern) ||
        normalize(ingredient.nameEn || '').includes(normalizedConcern)
    );

    if (matchesConcernTag || matchesIngredient) {
      matched.add(concern);
    }
  }

  return [...matched];
}

function countAllergyHits(product: Product, profile: UserPetProfile) {
  const hits = new Set<string>();

  for (const allergy of profile.allergies) {
    const normalizedAllergy = normalize(allergy);
    const hasHit = product.ingredients.some(
      (ingredient) =>
        normalize(ingredient.nameKo).includes(normalizedAllergy) ||
        normalize(ingredient.nameEn || '').includes(normalizedAllergy) ||
        normalize(ingredient.purpose).includes(normalizedAllergy)
    );

    if (hasHit) {
      hits.add(allergy);
    }
  }

  return [...hits];
}

export function getRecommendationBreakdown(product: Product, profile: UserPetProfile): RecommendationBreakdown {
  const allergyHits = countAllergyHits(product, profile);
  const matchedConcerns = countConcernMatches(product, profile);
  const dangerCount = product.ingredients.filter((ingredient) => ingredient.riskLevel === 'danger').length;
  const cautionCount = product.ingredients.filter((ingredient) => ingredient.riskLevel === 'caution').length;
  const safeCount = product.ingredients.filter((ingredient) => ingredient.riskLevel === 'safe').length;

  let safety = 35;
  safety -= dangerCount * 10;
  safety -= cautionCount * 4;
  safety -= allergyHits.length * 18;
  if (allergyHits.length > 0) safety -= 6;
  safety += Math.min(6, safeCount);
  safety = Math.max(0, Math.min(35, safety));

  let concern = 8;
  concern += matchedConcerns.length * 7;
  if (product.healthConcerns?.length) {
    concern += Math.min(4, product.healthConcerns.length);
  }
  concern = Math.max(0, Math.min(25, concern));

  const weightedRating = Math.min(5, product.averageRating) / 5;
  const reviewConfidence = Math.min(1, Math.log10((product.reviewsCount || 0) + 1) / 3);
  const socialProof = Math.round((weightedRating * 0.75 + reviewConfidence * 0.25) * 20);

  // 성분 안정성 보정 축(구 "가성비"에서 가격 요소 제거). 위험 성분이 많을수록 감점.
  let value = 8;
  value += Math.min(2, safeCount);
  value -= Math.max(0, dangerCount - 1) * 2;
  value = Math.max(0, Math.min(10, value));

  let petFit = 10;
  const expectedPetType = profile.species === 'Cat' ? 'cat' : 'dog';
  if (product.targetPetType && product.targetPetType !== expectedPetType && product.targetPetType !== 'all') {
    petFit = 0;
  } else if (product.targetPetType === 'all') {
    petFit = 8;
  }

  if (profile.age >= 8 && product.targetLifeStage?.includes('시니어')) {
    petFit = Math.min(10, petFit + 2);
  }

  if (profile.age <= 2 && product.targetLifeStage?.includes('퍼피·키튼')) {
    petFit = Math.min(10, petFit + 2);
  }

  let verification = 4;
  if (product.verificationStatus === 'verified') {
    verification = 10;
  } else if (product.verificationStatus === 'needs_review') {
    verification = 1;
  } else if (product.verificationStatus === 'pending') {
    verification = 0;
  }

  const total = Math.max(0, Math.min(100, Math.round(safety + concern + socialProof + value + petFit + verification)));
  const reasons: string[] = [];

  if (allergyHits.length > 0) {
    reasons.push(`회피 성분 ${allergyHits.join(', ')} 포함`);
  }
  if (matchedConcerns.length > 0) {
    reasons.push(`${matchedConcerns.join(', ')} 고민과 연관`);
  }
  if (dangerCount === 0 && cautionCount === 0) {
    reasons.push('위험/주의 성분이 거의 없음');
  } else if (dangerCount === 0) {
    reasons.push(`주의 성분 ${cautionCount}개`);
  } else {
    reasons.push(`위험 성분 ${dangerCount}개`);
  }
  if (product.reviewsCount > 0) {
    reasons.push(`리뷰 ${product.reviewsCount.toLocaleString()}개`);
  }
  if (product.verificationStatus === 'verified') {
    reasons.push('운영 검수 완료 데이터');
  } else if (product.verificationStatus === 'needs_review') {
    reasons.push('재검토 필요한 데이터');
  } else if (product.verificationStatus === 'pending') {
    reasons.push('검수 대기 데이터');
  }

  return {
    total,
    safety,
    concern,
    socialProof,
    value,
    petFit,
    verification,
    allergyHits,
    matchedConcerns,
    dangerCount,
    cautionCount,
    reasons,
  };
}

export function calculateCompatibilityScore(product: Product, profile: UserPetProfile): number {
  return getRecommendationBreakdown(product, profile).total;
}

export function getCompatibilityBreakdown(product: Product, profile: UserPetProfile): RecommendationBreakdown {
  return getRecommendationBreakdown(product, profile);
}

export function buildRecommendationBreakdown(product: Product, profile: UserPetProfile): RecommendationBreakdown {
  return getRecommendationBreakdown(product, profile);
}

export function getProductRecommendationInsights(product: Product, profile: UserPetProfile) {
  const breakdown = getRecommendationBreakdown(product, profile);
  return { breakdown, reasons: breakdown.reasons };
}

export function rankProductsForProfile(
  products: Product[],
  profile: UserPetProfile,
  options: {
    limit?: number;
    preferredPetType?: 'dog' | 'cat';
    preferredCategory?: string;
    excludeProductId?: string;
  } = {}
) {
  const expectedPetType = options.preferredPetType || (profile.species === 'Cat' ? 'cat' : 'dog');

  const ranked = products
    .filter((product) => product.id !== options.excludeProductId)
    .filter((product) => !product.targetPetType || product.targetPetType === expectedPetType || product.targetPetType === 'all')
    .filter((product) => !options.preferredCategory || !product.mainCategory || product.mainCategory === options.preferredCategory)
    .map((product) => ({
      product,
      breakdown: getRecommendationBreakdown(product, profile),
      score: getRecommendationBreakdown(product, profile).total,
    }))
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, options.limit ?? ranked.length);
}
