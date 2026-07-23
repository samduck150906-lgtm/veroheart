import type { Product, UserPetProfile } from '../types';
import { analyzeFeed } from '../analysis/feedAnalysis';

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

/** 하드캡 사유 — 종 불일치와 알레르기는 급여 차단 신호로 취급한다. */
export type VerdictCapReason = 'species' | 'allergy' | 'danger' | null;

export interface DisplayVerdict {
  /** 화면에 표시할 점수(하드캡 반영). */
  score: number;
  grade: CompatibilityGrade;
  /** 상한선이 실제로 원점수를 끌어내렸을 때에만 사유를 채운다. */
  capReason: VerdictCapReason;
}

/**
 * 결과 화면의 최종 판정을 계산한다.
 * 원점수에도 종·알레르기 감점이 포함되지만, 잘못된 호출 경로에서도
 * 위험 신호와 높은 등급이 동시에 노출되지 않도록 표시 단계에서 한 번 더 막는다.
 */
export function resolveDisplayVerdict(
  rawScore: number,
  opts: { speciesMismatch?: boolean; allergyHits?: number; dangerCount?: number } = {},
): DisplayVerdict {
  const safeRaw = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0;
  const hasSpeciesMismatch = Boolean(opts.speciesMismatch);
  const hasAllergy = (opts.allergyHits ?? 0) > 0;
  const hasDanger = (opts.dangerCount ?? 0) > 0;

  const ceiling = hasSpeciesMismatch ? 0 : hasAllergy ? 9 : hasDanger ? 69 : 100;
  const score = Math.min(safeRaw, ceiling);
  const capReason: VerdictCapReason =
    score < safeRaw
      ? hasSpeciesMismatch
        ? 'species'
        : hasAllergy
          ? 'allergy'
          : 'danger'
      : null;

  return { score, grade: gradeFromScore(score), capReason };
}

export interface ProductBadge {
  label: string;
  tone: 'good' | 'warn' | 'danger';
}

/**
 * 베로로 적합도 점수 구성
 *
 * 100점 기본 점수는 제품 자체와 우리 아이의 건강 정보만으로 계산한다.
 * - 성분 안전성 50점
 * - 건강 적합성 30점
 * - 사용자 고민 적합성 20점
 *
 * 후기, 가격, 인기, 데이터 검수 상태는 제품 적합도 점수에 포함하지 않는다.
 * 종 불일치·알레르기·과거 기호도는 기본 점수 계산 뒤 개인화 감점으로 적용한다.
 */
export interface RecommendationBreakdown {
  total: number;
  baseScore: number;
  ingredientSafety: number;
  healthSuitability: number;
  concernFit: number;
  allergyPenalty: number;
  preferencePenalty: number;
  preferenceLevel: number | null;
  speciesMismatch: boolean;
  allergyHits: string[];
  matchedConcerns: string[];
  dangerCount: number;
  cautionCount: number;
  reasons: string[];
}

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s()[\]·,./_-]/g, '');
}

function countConcernMatches(product: Product, profile: UserPetProfile) {
  const matched = new Set<string>();

  for (const concern of profile.healthConcerns) {
    const normalizedConcern = normalize(concern);
    if (!normalizedConcern) continue;

    const matchesConcernTag = product.healthConcerns?.some((item) =>
      normalize(item).includes(normalizedConcern),
    );
    const matchesIngredient = product.ingredients.some(
      (ingredient) =>
        normalize(ingredient.purpose).includes(normalizedConcern) ||
        normalize(ingredient.nameKo).includes(normalizedConcern) ||
        normalize(ingredient.nameEn || '').includes(normalizedConcern),
    );

    if (matchesConcernTag || matchesIngredient) matched.add(concern);
  }

  return [...matched];
}

function countAllergyHits(product: Product, profile: UserPetProfile) {
  const hits = new Set<string>();

  for (const allergy of profile.allergies) {
    const normalizedAllergy = normalize(allergy);
    if (!normalizedAllergy) continue;

    const hasHit = product.ingredients.some(
      (ingredient) =>
        normalize(ingredient.nameKo).includes(normalizedAllergy) ||
        normalize(ingredient.nameEn || '').includes(normalizedAllergy) ||
        normalize(ingredient.purpose).includes(normalizedAllergy),
    );

    if (hasHit) hits.add(allergy);
  }

  return [...hits];
}

function isSpeciesMismatch(product: Product, profile: UserPetProfile) {
  if (!product.targetPetType || product.targetPetType === 'all') return false;
  const expectedPetType = profile.species === 'Cat' ? 'cat' : 'dog';
  return product.targetPetType !== expectedPetType;
}

/** 과거 기호도 1~5를 최대 30점 감점으로 변환한다. */
export function preferencePenaltyFromLevel(level: number | null | undefined): number {
  if (level == null || !Number.isFinite(level)) return 0;
  if (level <= 1.5) return 30;
  if (level <= 2.5) return 20;
  if (level <= 3.5) return 10;
  return 0;
}

export function getRecommendationBreakdown(product: Product, profile: UserPetProfile): RecommendationBreakdown {
  const ingredients = product.ingredients ?? [];
  const allergyHits = countAllergyHits(product, profile);
  const matchedConcerns = countConcernMatches(product, profile);
  const dangerCount = ingredients.filter((ingredient) => ingredient.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter((ingredient) => ingredient.riskLevel === 'caution').length;
  const speciesMismatch = isSpeciesMismatch(product, profile);
  const feed = analyzeFeed(product, profile);

  // 1) 성분 안전성 — 50점
  // 성분표가 없으면 안전하다고 간주하지 않고 중립값에서 시작한다.
  let ingredientSafety = ingredients.length > 0 ? 50 : 25;
  ingredientSafety -= dangerCount * 25;
  ingredientSafety -= cautionCount * 7;
  ingredientSafety = Math.max(0, Math.min(50, ingredientSafety));

  // 2) 건강 적합성 — 30점
  // 후기·가격·검수 여부가 아니라 원료 구성과 보장성분 신호만 사용한다.
  let healthSuitability = 15;
  const quality = feed.ingredientQuality;
  if (quality.firstIsAnimalProtein) healthSuitability += 5;
  else if (quality.animalProteins.length > 0) healthSuitability += 2;
  if (quality.animalProteins.length >= 2) healthSuitability += 3;
  healthSuitability += Math.min(4, quality.functional.length * 2);
  healthSuitability -= Math.min(6, quality.fillers.length * 2);
  if (quality.byProducts.length > 0) healthSuitability -= 4;
  healthSuitability -= Math.min(8, quality.artificial.length * 4);
  if (feed.aafco.evaluated) healthSuitability += feed.aafco.passed ? 5 : -8;
  if (feed.caP.note) healthSuitability -= 3;
  healthSuitability = Math.max(0, Math.min(30, healthSuitability));

  // 3) 사용자 고민 적합성 — 20점
  // 특별한 건강 고민이 없으면 감점하지 않는다. 고민이 있으면 매칭 비율을 반영한다.
  const uniqueConcerns = [...new Set(profile.healthConcerns.map(normalize).filter(Boolean))];
  const concernFit =
    uniqueConcerns.length === 0
      ? 20
      : Math.max(0, Math.min(20, Math.round(5 + 15 * (matchedConcerns.length / uniqueConcerns.length))));

  const baseScore = Math.max(
    0,
    Math.min(100, Math.round(ingredientSafety + healthSuitability + concernFit)),
  );

  // 개인화 감점 — 제품의 객관 점수와 분리해서 마지막에 적용한다.
  // 알레르기는 첫 적중만으로 90점, 추가 적중마다 5점씩 최대 100점 감점한다.
  const allergyPenalty =
    allergyHits.length > 0 ? Math.min(100, 90 + Math.max(0, allergyHits.length - 1) * 5) : 0;
  const preferenceLevel = profile.productPreferences?.[product.id] ?? null;
  const preferencePenalty = preferencePenaltyFromLevel(preferenceLevel);

  const total = speciesMismatch
    ? 0
    : Math.max(0, Math.min(100, Math.round(baseScore - allergyPenalty - preferencePenalty)));

  const reasons: string[] = [];
  if (speciesMismatch) {
    const expected = profile.species === 'Cat' ? '고양이' : '강아지';
    const actual = product.targetPetType === 'cat' ? '고양이' : '강아지';
    reasons.push(`${expected}용 제품이 아님 · ${actual}용 제품`);
  }
  if (allergyHits.length > 0) reasons.push(`알레르기·회피 성분 ${allergyHits.join(', ')} 포함`);
  if (preferencePenalty > 0 && preferenceLevel != null) {
    reasons.push(`과거 기호도 ${preferenceLevel.toFixed(1)}점 · ${preferencePenalty}점 감점`);
  }
  if (dangerCount > 0) reasons.push(`위험 성분 ${dangerCount}개`);
  else if (cautionCount > 0) reasons.push(`주의 성분 ${cautionCount}개`);
  else if (ingredients.length > 0) reasons.push('위험·주의 성분이 확인되지 않음');
  else reasons.push('성분 정보가 부족해 안전성을 중립 평가');

  if (matchedConcerns.length > 0) reasons.push(`${matchedConcerns.join(', ')} 고민과 연관`);
  else if (profile.healthConcerns.length > 0) reasons.push('등록한 건강 고민과 직접 매칭되는 정보가 적음');

  if (quality.firstIsAnimalProtein && quality.firstIngredient) {
    reasons.push(`제1원료가 동물성 단백질(${quality.firstIngredient})`);
  }
  if (feed.aafco.evaluated) {
    reasons.push(feed.aafco.passed ? 'AAFCO 최소 영양 기준 충족' : 'AAFCO 최소 영양 기준 확인 필요');
  }

  return {
    total,
    baseScore,
    ingredientSafety,
    healthSuitability,
    concernFit,
    allergyPenalty,
    preferencePenalty,
    preferenceLevel,
    speciesMismatch,
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
  } = {},
) {
  const expectedPetType = options.preferredPetType || (profile.species === 'Cat' ? 'cat' : 'dog');

  const ranked = products
    .filter((product) => product.id !== options.excludeProductId)
    .filter(
      (product) =>
        !product.targetPetType ||
        product.targetPetType === expectedPetType ||
        product.targetPetType === 'all',
    )
    .filter(
      (product) =>
        !options.preferredCategory ||
        !product.mainCategory ||
        product.mainCategory === options.preferredCategory,
    )
    .map((product) => {
      const breakdown = getRecommendationBreakdown(product, profile);
      return { product, breakdown, score: breakdown.total };
    })
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, options.limit ?? ranked.length);
}
