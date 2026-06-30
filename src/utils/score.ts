import type { Product, UserPetProfile } from '../types';
import { toDryMatter, checkCalciumPhosphorusRatio } from '../analysis/nutrition';
import { findIngredientByName } from '../analysis/ingredientDictionary';
import { detectDCMRisk, detectProteinInflation } from '../analysis/ingredientQuality';
import { runBreedDiseaseEngine } from '../analysis/breedDiseaseEngine';

/** 회피(알레르기) 성분 포함 시 궁합 점수 상한 — 추천 등급(C 이상) 불가 */
export const ALLERGEN_SCORE_CAP = 55;
/** 위험 성분 포함 시 궁합 점수 상한 — A 등급 불가 */
export const DANGER_SCORE_CAP = 69;

export type CompatibilityGrade = 'A' | 'B' | 'C' | 'D';

/** 단일 진실 공급원: 궁합 점수 → 등급 */
export function gradeFromScore(score: number): CompatibilityGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export interface RecommendationBreakdown {
  total: number;
  /** 하드캡 적용 전 가중 합산 원점수 */
  rawTotal: number;
  /** 안전 하드캡(알레르기/위험)으로 점수가 깎였는지 */
  capped: boolean;
  grade: CompatibilityGrade;
  safety: number;
  concern: number;
  socialProof: number;
  value: number;
  petFit: number;
  verification: number;
  /** AAFCO/Ca:P 영양 버킷 (0–10). guaranteedAnalysis 없으면 0 */
  nutrition: number;
  allergyHits: string[];
  matchedConcerns: string[];
  dangerCount: number;
  cautionCount: number;
  /** 상위 원료 콩과 식물 과다(DCM 연관) 위험도 */
  legumeRisk: 'none' | 'watch' | 'danger';
  /** 식물성 단백 보강(protein inflation) 의심 여부 */
  proteinInflated: boolean;
  /** 견종 호발 질환 NRC 정량 기준 위반 개수(profile.breed 기반). 미설정 시 0 */
  breedRiskFails: number;
  /** 매칭된 견종명(없으면 null) */
  breedMatched: string | null;
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

  // ── 심화 품질 신호 (엔진과 동일 로직 재사용) ──────────────────────
  // 그레인프리 사료의 콩과 식물 과다(DCM 연관)와 식물성 단백 보강을
  // 추천 점수의 안전 버킷에도 반영해 분석 화면과 일관성을 맞춘다.
  const ingForQuality = product.ingredients.map((ingredient, idx) => ({
    nameKo: ingredient.nameKo,
    dictEntry:
      findIngredientByName(ingredient.nameKo) ??
      (ingredient.nameEn ? findIngredientByName(ingredient.nameEn) : null),
    position: idx + 1,
  }));
  const dcm = detectDCMRisk(ingForQuality);
  const inflation = detectProteinInflation(ingForQuality);

  // ── 견종 호발 질환 정량 기준 위반 (NRC 2006) ──────────────────────
  // profile.breed가 있으면 견종별 질환 임계값을 평가해 위반 개수를 안전 점수에 반영.
  let breedRiskFails = 0;
  let breedMatched: string | null = null;
  if (profile.breed && profile.breed.trim()) {
    const breedResult = runBreedDiseaseEngine(profile.breed.trim(), product);
    breedMatched = breedResult.breedMatched;
    breedRiskFails = breedResult.activeDiseases.reduce((sum, d) => sum + d.failCount, 0);
  }

  let safety = 35;
  safety -= dangerCount * 10;
  safety -= cautionCount * 4;
  safety -= allergyHits.length * 18;
  safety -= Math.min(10, breedRiskFails * 4);
  if (allergyHits.length > 0) safety -= 6;
  if (dcm.riskLevel === 'danger') safety -= 8;
  else if (dcm.riskLevel === 'watch') safety -= 3;
  if (inflation.inflationSignal === 'major') safety -= 5;
  else if (inflation.inflationSignal === 'minor') safety -= 2;
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

  let value = 6;
  if (product.price <= 15000) value += 4;
  else if (product.price <= 30000) value += 2;
  else if (product.price >= 70000) value -= 2;
  value -= Math.max(0, dangerCount - 1);
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

  // ── 영양 버킷 (AAFCO DMB + Ca:P) ──────────────────────────────────
  // guaranteedAnalysis가 없으면 버킷 자체를 0으로 두어 기존 점수에 영향 없음.
  let nutrition = 0;
  const ga = product.guaranteedAnalysis;
  if (ga && ga.crudeProtein != null && ga.crudeFat != null) {
    const moisture = ga.moisture ?? 10;
    const species = profile.species === 'Cat' ? 'cat' : 'dog';
    const minProtein = species === 'cat' ? 26 : 18;
    const minFat = species === 'cat' ? 9 : 5.5;
    const proteinDMB = toDryMatter(ga.crudeProtein, moisture) ?? 0;
    const fatDMB = toDryMatter(ga.crudeFat, moisture) ?? 0;

    nutrition = 5;
    nutrition += proteinDMB >= minProtein ? 2 : -2;
    nutrition += fatDMB >= minFat ? 2 : -1;
    const caRatioWarning = checkCalciumPhosphorusRatio(ga);
    nutrition += caRatioWarning === null ? 1 : -1;
    nutrition = Math.max(0, Math.min(10, nutrition));
  }

  const rawTotal = Math.max(0, Math.min(100, Math.round(safety + concern + socialProof + value + petFit + verification + nutrition)));

  // ── 안전 하드캡 (신뢰 보호) ──────────────────────────────────────
  // 회피(알레르기) 성분이나 위험 성분이 있으면 가중 합산이 아무리 높아도
  // 추천 등급(A/B)에 오르지 못하도록 점수 상한을 강제한다.
  let cap = 100;
  if (allergyHits.length > 0) cap = Math.min(cap, ALLERGEN_SCORE_CAP);
  if (dangerCount > 0) cap = Math.min(cap, DANGER_SCORE_CAP);
  const total = Math.min(rawTotal, cap);
  const capped = total < rawTotal;

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
  if (ga && ga.crudeProtein != null && ga.crudeFat != null) {
    reasons.push(nutrition >= 8 ? 'AAFCO 영양 기준 충족' : nutrition >= 5 ? 'AAFCO 영양 기준 일부 충족' : 'AAFCO 영양 기준 미달 항목 있음');
  }
  if (dcm.riskLevel !== 'none') {
    reasons.push(`상위 원료 콩과 식물 ${dcm.legumesInTop5.length}종 포함 (DCM 참고)`);
  }
  if (inflation.hasInflation) {
    reasons.push('식물성 단백 보강 의심');
  }
  if (breedRiskFails > 0) {
    reasons.push(`${breedMatched ?? '견종'} 호발 질환 영양기준 ${breedRiskFails}개 항목 미충족`);
  }

  return {
    total,
    rawTotal,
    capped,
    grade: gradeFromScore(total),
    safety,
    concern,
    socialProof,
    value,
    petFit,
    verification,
    nutrition,
    allergyHits,
    matchedConcerns,
    dangerCount,
    cautionCount,
    legumeRisk: dcm.riskLevel,
    proteinInflated: inflation.hasInflation,
    breedRiskFails,
    breedMatched,
    reasons,
  };
}

export function calculateCompatibilityScore(product: Product, profile: UserPetProfile): number {
  return getRecommendationBreakdown(product, profile).total;
}

export interface ProductBadge {
  label: string;
  tone: 'good' | 'warn' | 'danger';
}

/**
 * 목록(카드)에서 노출할 분석 배지를 생성한다.
 * 위험 > 주의 > 가점 순으로 우선순위가 높고, 기본 2개까지만 반환한다.
 * 점수 breakdown을 재사용하므로 카드별 추가 연산이 거의 없다.
 */
export function getProductBadges(
  breakdown: RecommendationBreakdown,
  options: { max?: number } = {},
): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (breakdown.allergyHits.length > 0) badges.push({ label: '알러지 포함', tone: 'danger' });
  if (breakdown.dangerCount > 0) badges.push({ label: '위험 성분', tone: 'danger' });
  if (breakdown.breedRiskFails > 0) badges.push({ label: '견종 주의', tone: 'warn' });
  if (breakdown.legumeRisk !== 'none') badges.push({ label: 'DCM 주의', tone: 'warn' });
  if (breakdown.proteinInflated) badges.push({ label: '단백보강 의심', tone: 'warn' });
  if (breakdown.nutrition >= 8) badges.push({ label: 'AAFCO 충족', tone: 'good' });
  else if (breakdown.matchedConcerns.length > 0) badges.push({ label: '맞춤 케어', tone: 'good' });

  return badges.slice(0, options.max ?? 2);
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
    .map((product) => {
      const breakdown = getRecommendationBreakdown(product, profile);
      return { product, breakdown, score: breakdown.total };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, options.limit ?? ranked.length);
}
