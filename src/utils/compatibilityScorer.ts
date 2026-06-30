/**
 * 베로로 궁합 점수 알고리즘 v2
 *
 * 7개 항목 합산 100점 만점:
 *   알러지 안전성(25) + 건강 고민 적합성(20) + 영양 균형(20)
 *   + 종/연령/체중 적합성(15) + 주의 성분 리스크(10)
 *   + 리뷰·평점 신뢰도(5) + 가성비(5)
 *
 * 등급: A(90-100) / B(80-89) / C(70-79) / D(60-69) / F(비추천, <60)
 * 안전 하드캡: 알러지 충돌 시 → 59점 이하 강제, 위험 성분 시 → 79점 이하 강제
 */

import { toDryMatter, calculateCalories, checkCalciumPhosphorusRatio } from '../analysis/nutrition';
import type {
  CompatibilityPetProfile,
  CompatibilityProduct,
  CompatibilityResult,
  CompatibilityGrade,
  ScoreBreakdown,
  AllergyCheckResult,
  HealthConcernCheckResult,
  NutritionCheckResult,
  PetFitCheckResult,
  WarningRiskResult,
} from '../types/compatibility';

// ── 하드캡 상수 ──────────────────────────────────────────────────────────────
const ALLERGEN_CAP = 59;
const DANGER_CAP = 79;

// ── 알러지 확장 사전 (알러지 키워드 → 유사 성분명 배열) ─────────────────────
const ALLERGEN_ALIASES: Record<string, string[]> = {
  '닭': ['닭고기', '닭가슴살', '닭다리', '닭분말', '닭지방', '닭간', '계육', '치킨', '치킨밀', 'chicken', 'poultry', '가금류', '가금육'],
  '닭고기': ['닭', '닭분말', '닭지방', '닭간', '계육', '치킨', '치킨밀', 'chicken', 'poultry', '가금류'],
  '소고기': ['우육', '쇠고기', '소고기분말', '소내장', 'beef', '소고기지방'],
  '연어': ['연어오일', '연어분말', '연어유', '연어살', 'salmon'],
  '참치': ['참치분말', '참치살', 'tuna', '가다랑어', '다랑어'],
  '밀': ['밀가루', '소맥분', '밀글루텐', '밀기울', 'wheat', 'wheat gluten'],
  '옥수수': ['옥수수전분', '옥수수글루텐', '콘글루텐', 'corn', 'corn starch', 'corn gluten'],
  '대두': ['두부', '대두분말', '콩', '대두유', 'soy', 'soybean', 'soy protein'],
  '양고기': ['양', '양고기분말', 'lamb', 'mutton'],
  '오리': ['오리고기', '오리분말', '오리지방', 'duck'],
  '돼지고기': ['돼지고기분말', '돈육', '돼지지방', 'pork', 'swine'],
  '생선': ['어분', '생선오일', '생선유', '어류', 'fish', 'fish meal', 'fish oil'],
};

// ── 건강 고민 → 기능성 성분·태그 매핑 ──────────────────────────────────────
interface ConcernRule {
  ingredientKeywords: string[];
  productTagKeywords: string[];
  positiveMsg: string;
  maxBonus: number;
}

const HEALTH_CONCERN_RULES: Record<string, ConcernRule> = {
  '관절': {
    ingredientKeywords: ['글루코사민', 'glucosamine', '콘드로이틴', 'chondroitin', 'msm', '초록입홍합', '홍합추출물', '초록홍합'],
    productTagKeywords: ['관절', 'joint', '관절건강'],
    positiveMsg: '글루코사민·콘드로이틴 등 관절 지지 성분이 포함되어 있어요.',
    maxBonus: 12,
  },
  '피부': {
    ingredientKeywords: ['오메가3', 'omega-3', 'omega3', '연어오일', '연어유', '아마씨', 'flaxseed', '아마인유', 'dha', 'epa', '아마씨유'],
    productTagKeywords: ['피부', 'skin', '모질', '피부모질'],
    positiveMsg: '오메가3 등 피부·모질 개선 성분이 포함되어 있어요.',
    maxBonus: 12,
  },
  '눈물흔': {
    ingredientKeywords: [],
    productTagKeywords: ['눈물', '눈물흔', '저알러지', 'single protein', 'limited ingredient', '단일단백', '단백질단일'],
    positiveMsg: '저알러지 단일 단백 구성으로 눈물흔 관리에 도움이 돼요.',
    maxBonus: 8,
  },
  '신장': {
    ingredientKeywords: ['오메가3', 'omega-3'],
    productTagKeywords: ['신장', 'kidney', '저인', '저단백', '신장건강'],
    positiveMsg: '신장 건강을 고려한 저인·저단백 설계예요.',
    maxBonus: 10,
  },
  '체중': {
    ingredientKeywords: ['l-카르니틴', 'l-carnitine', '식이섬유'],
    productTagKeywords: ['체중', 'weight', '다이어트', '저칼로리', '체중관리', '체중조절'],
    positiveMsg: '체중 관리를 위한 저지방·고섬유 구성이에요.',
    maxBonus: 10,
  },
  '소화': {
    ingredientKeywords: ['프리바이오틱', '프로바이오틱', 'probiotic', 'prebiotic', '유산균', '치커리', '이눌린'],
    productTagKeywords: ['소화', 'digestive', '장건강', '장'],
    positiveMsg: '프로바이오틱스 등 소화 건강 성분이 포함되어 있어요.',
    maxBonus: 10,
  },
  '치석': {
    ingredientKeywords: ['칼슘', 'calcium'],
    productTagKeywords: ['치석', '구강', 'dental', '치아'],
    positiveMsg: '구강 건강을 고려한 성분 구성이에요.',
    maxBonus: 8,
  },
};

// ── 주의 성분 사전 ───────────────────────────────────────────────────────────
const WARNING_INGREDIENT_RULES: Record<string, { label: string; deduction: number }> = {
  'bha': { label: 'BHA(부틸하이드록시아니솔)', deduction: 8 },
  'bht': { label: 'BHT(부틸하이드록시톨루엔)', deduction: 8 },
  '에톡시퀸': { label: '에톡시퀸(Ethoxyquin)', deduction: 8 },
  'ethoxyquin': { label: '에톡시퀸(Ethoxyquin)', deduction: 8 },
  '프로필렌 글리콜': { label: '프로필렌 글리콜', deduction: 7 },
  'propylene glycol': { label: '프로필렌 글리콜', deduction: 7 },
  '카라기난': { label: '카라기난', deduction: 5 },
  'carrageenan': { label: '카라기난', deduction: 5 },
  '멘아디온': { label: '멘아디온(합성 비타민 K3)', deduction: 5 },
  'menadione': { label: '멘아디온(합성 비타민 K3)', deduction: 5 },
};

// ── 유틸: 대소문자·공백 정규화 ──────────────────────────────────────────────
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function ingredientText(ing: CompatibilityProduct['ingredients'][number]): string {
  return `${norm(ing.nameKo)} ${norm(ing.nameEn ?? '')}`;
}

// ── 알러지 확장 목록 생성 ────────────────────────────────────────────────────
function expandAllergen(allergy: string): string[] {
  const key = norm(allergy);
  const terms = new Set<string>([key]);

  for (const [dictKey, aliases] of Object.entries(ALLERGEN_ALIASES)) {
    const nk = norm(dictKey);
    if (nk === key || aliases.some((a) => norm(a) === key)) {
      terms.add(nk);
      aliases.forEach((a) => terms.add(norm(a)));
    }
  }

  return [...terms];
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  1. 알러지 안전성  (0-25점)                                              ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreAllergySafety(product: CompatibilityProduct, pet: CompatibilityPetProfile): AllergyCheckResult {
  if (!pet.allergies || pet.allergies.length === 0) {
    return { directHits: [], aliasHits: [], score: 25 };
  }

  const directHits = new Set<string>();
  const aliasHits = new Set<string>();

  for (const allergy of pet.allergies) {
    const allergyNorm = norm(allergy);
    const expanded = expandAllergen(allergy);

    for (const ing of product.ingredients) {
      const text = ingredientText(ing);

      if (text.includes(allergyNorm)) {
        directHits.add(ing.nameKo);
      } else {
        for (const alias of expanded) {
          if (alias !== allergyNorm && text.includes(alias)) {
            aliasHits.add(`${ing.nameKo}(${allergy} 유사)`);
            break;
          }
        }
      }
    }
  }

  let score = 25;
  score -= directHits.size * 18;
  score -= aliasHits.size * 8;
  score = Math.max(0, score);

  // 직접 충돌 시 최대 7점 / 유사 충돌만 시 최대 14점
  if (directHits.size > 0) score = Math.min(score, 7);
  else if (aliasHits.size > 0) score = Math.min(score, 14);

  return {
    directHits: [...directHits],
    aliasHits: [...aliasHits],
    score,
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  2. 건강 고민 적합성  (0-20점)                                           ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreHealthConcernFit(product: CompatibilityProduct, pet: CompatibilityPetProfile): HealthConcernCheckResult {
  if (!pet.healthConcerns || pet.healthConcerns.length === 0) {
    // 고민 없으면 기본 8점 (비교 불가 중립)
    return { matchedConcerns: [], matchedIngredients: [], score: 8 };
  }

  let score = 0;
  const matchedConcerns: string[] = [];
  const matchedIngredients: string[] = [];

  for (const concern of pet.healthConcerns) {
    const concernNorm = norm(concern);
    let matched = false;

    // 고민 키워드를 HEALTH_CONCERN_RULES에서 매칭 (부분 일치 허용)
    for (const [ruleKey, rule] of Object.entries(HEALTH_CONCERN_RULES)) {
      if (!concernNorm.includes(norm(ruleKey)) && !norm(ruleKey).includes(concernNorm)) continue;

      // 성분 리스트에서 기능성 키워드 검색
      for (const ing of product.ingredients) {
        const text = ingredientText(ing);
        for (const kw of rule.ingredientKeywords) {
          if (text.includes(norm(kw))) {
            matchedIngredients.push(ing.nameKo);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      // 상품 태그에서 검색
      if (!matched) {
        const allTags = [
          ...(product.healthConcerns ?? []),
          ...(product.hasRiskFactors ?? []),
          product.formulation ?? '',
        ].map(norm);

        for (const tagKw of rule.productTagKeywords) {
          if (allTags.some((t) => t.includes(norm(tagKw)))) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        matchedConcerns.push(concern);
        score += rule.maxBonus;
        break; // 한 concern당 한 번만 가산
      }
    }
  }

  return {
    matchedConcerns,
    matchedIngredients: [...new Set(matchedIngredients)],
    score: Math.min(20, score),
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  3. 영양 균형  (0-20점)                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreNutritionalBalance(product: CompatibilityProduct, pet: CompatibilityPetProfile): NutritionCheckResult {
  const ga = product.guaranteedAnalysis;
  if (!ga || ga.crudeProtein == null || ga.crudeFat == null) {
    return { score: 0, aafcoPassed: false, caPRatioOk: false };
  }

  const moisture = ga.moisture ?? 10;
  const species = pet.species === 'Cat' ? 'cat' : 'dog';
  const minProtein = species === 'cat' ? 26 : 18;
  const minFat = species === 'cat' ? 9 : 5.5;

  const proteinDMB = toDryMatter(ga.crudeProtein, moisture) ?? 0;
  const fatDMB = toDryMatter(ga.crudeFat, moisture) ?? 0;

  let score = 8; // 기본 8점 (보증성분 데이터가 존재하는 것만으로도 가치)

  // 단백질 평가 (0-6점)
  if (proteinDMB >= minProtein + 5) score += 6;
  else if (proteinDMB >= minProtein) score += 4;
  else if (proteinDMB >= minProtein - 2) score += 1;
  else score -= 4;

  // 지방 평가 (0-3점)
  if (fatDMB >= minFat + 2) score += 3;
  else if (fatDMB >= minFat) score += 2;
  else score -= 2;

  // 칼슘:인 비율 (0-3점)
  const caWarning = checkCalciumPhosphorusRatio(ga);
  if (caWarning === null && ga.calcium && ga.phosphorus) {
    score += 3; // 비율 정상
  } else if (caWarning !== null) {
    score -= 2;
  }

  const aafcoPassed = proteinDMB >= minProtein && fatDMB >= minFat;
  const caPRatioOk = caWarning === null;

  return {
    score: Math.max(0, Math.min(20, score)),
    aafcoPassed,
    caPRatioOk,
    proteinDMB: Math.round(proteinDMB * 10) / 10,
    fatDMB: Math.round(fatDMB * 10) / 10,
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  4. 종/연령/체중 적합성  (0-15점)                                         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scorePetFit(product: CompatibilityProduct, pet: CompatibilityPetProfile): PetFitCheckResult {
  const expectedSpecies = pet.species === 'Cat' ? 'cat' : 'dog';
  const speciesMatch =
    !product.targetPetType ||
    product.targetPetType === 'all' ||
    product.targetPetType === expectedSpecies;

  if (!speciesMatch) {
    return { speciesMatch: false, ageMatch: false, score: 0 };
  }

  let score = product.targetPetType === expectedSpecies ? 10 : 7; // 'all'이면 7점

  // 연령 적합성 (0-5점)
  const lifeStages = (product.targetLifeStage ?? []).map(norm);
  let ageMatch = false;

  if (lifeStages.length === 0 || lifeStages.some((s) => s.includes('전연령') || s.includes('올에이지') || s.includes('all age'))) {
    score += 3; // 전연령 = 준호환
    ageMatch = true;
  } else if (pet.age <= 1 && lifeStages.some((s) => s.includes('퍼피') || s.includes('키튼') || s.includes('baby'))) {
    score += 5;
    ageMatch = true;
  } else if (pet.age >= 8 && lifeStages.some((s) => s.includes('시니어') || s.includes('senior'))) {
    score += 5;
    ageMatch = true;
  } else if (pet.age > 1 && pet.age < 8 && lifeStages.some((s) => s.includes('어덜트') || s.includes('성견') || s.includes('성묘') || s.includes('adult'))) {
    score += 5;
    ageMatch = true;
  } else if (lifeStages.length > 0) {
    score -= 2; // 연령 미매칭
  }

  return { speciesMatch: true, ageMatch, score: Math.max(0, Math.min(15, score)) };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  5. 주의 성분 리스크  (0-10점)                                            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreWarningRisk(product: CompatibilityProduct): WarningRiskResult {
  let score = 10;
  const detectedWarnings = new Set<string>();

  for (const ing of product.ingredients) {
    const text = ingredientText(ing);

    // 명명된 주의 성분 사전 검색
    for (const [key, rule] of Object.entries(WARNING_INGREDIENT_RULES)) {
      if (text.includes(key)) {
        detectedWarnings.add(rule.label);
        score -= rule.deduction;
      }
    }

    // riskLevel 기반 추가 감점 (사전에 없는 위험 성분 처리)
    if (ing.riskLevel === 'danger' && !text.match(/bha|bht|에톡시퀸|ethoxyquin|프로필렌|propylene|카라기난|carrageenan|멘아디온|menadione/)) {
      score -= 4;
    } else if (ing.riskLevel === 'caution') {
      score -= 1;
    }
  }

  return {
    detectedWarnings: [...detectedWarnings],
    score: Math.max(0, Math.min(10, score)),
  };
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  6. 리뷰/평점 신뢰도  (0-5점)                                             ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreReviewTrust(product: CompatibilityProduct): number {
  const count = product.reviewsCount ?? 0;
  const rating = Math.min(5, product.averageRating ?? 0);

  if (count === 0) return 0;

  // 로그 기반 리뷰 수 신뢰도 (log10(1001)=3, log10(100+1)=2, log10(10+1)=1)
  const reviewConfidence = Math.min(1, Math.log10(count + 1) / 3);
  const ratingWeight = rating / 5;

  return Math.round((ratingWeight * 0.7 + reviewConfidence * 0.3) * 5);
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  7. 가성비  (0-5점)                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
function scoreValueForMoney(product: CompatibilityProduct, pet: CompatibilityPetProfile): number {
  if (!product.price || product.price === 0) return 3; // 가격 정보 없으면 중립

  const budget = pet.monthlyBudget ?? 80000;
  const weightKg = pet.weightKg ?? 5;
  const packWeightG = product.packagingWeightG;

  // kg당 가격 계산 (포장 중량 정보 없으면 단순 절대가 비교)
  if (packWeightG && packWeightG > 0) {
    const pricePerKg = (product.price / packWeightG) * 1000;
    // 체중 kg당 하루 약 20-30g 급여 가정 → 월 소비량 추정
    const estimatedMonthlyG = weightKg * 25 * 30;
    const estimatedMonthlyCost = (pricePerKg * estimatedMonthlyG) / 1000;

    if (estimatedMonthlyCost <= budget * 0.4) return 5;
    if (estimatedMonthlyCost <= budget * 0.7) return 4;
    if (estimatedMonthlyCost <= budget) return 3;
    if (estimatedMonthlyCost <= budget * 1.3) return 1;
    return 0;
  }

  // 포장 중량 없을 때 절대 가격 기준 (임시 폴백)
  if (product.price <= 20000) return 5;
  if (product.price <= 40000) return 4;
  if (product.price <= 70000) return 3;
  if (product.price <= 100000) return 2;
  return 1;
}

// ── 급여 가이드 생성 ─────────────────────────────────────────────────────────
function buildFeedingGuide(product: CompatibilityProduct, pet: CompatibilityPetProfile): string {
  const weightKg = pet.weightKg;
  if (!weightKg) return '보호자 제품 뒷면의 급여량 표를 참고해 주세요.';

  // 일일 칼로리 요구량 추정 (Modified NRC formula)
  const rer = 70 * Math.pow(weightKg, 0.75); // Resting Energy Requirement
  let der = rer;
  const isNeutered = pet.isNeutered ?? false;
  const activity = pet.activityLevel ?? 'moderate';
  const isCat = pet.species === 'Cat';

  if (isCat) {
    der = rer * (isNeutered ? 1.2 : 1.4);
    if (activity === 'high') der *= 1.2;
    else if (activity === 'low') der *= 0.9;
    if (pet.age >= 8) der *= 0.9;
  } else {
    if (pet.age <= 1) der = rer * 2.5;
    else if (pet.age >= 8) der = rer * (isNeutered ? 1.4 : 1.6);
    else der = rer * (isNeutered ? 1.6 : 1.8);
    if (activity === 'high') der *= 1.2;
    else if (activity === 'low') der *= 0.85;
  }

  // kcal/100g 계산 (제공 값 우선, 없으면 보증성분으로 추정)
  let kcalPer100g = product.kcalPer100g;
  if (!kcalPer100g && product.guaranteedAnalysis) {
    const cal = calculateCalories(product.guaranteedAnalysis);
    kcalPer100g = cal.kcalPer100g;
  }

  if (!kcalPer100g || kcalPer100g === 0) {
    return `예상 일일 급여량은 ${Math.round(der)} kcal 기준으로 계산되며, 제품 급여량 표를 참고하세요.`;
  }

  const dailyGrams = Math.round((der / kcalPer100g) * 100);
  const meals = pet.age <= 1 ? 3 : 2;
  const perMeal = Math.round(dailyGrams / meals);

  return `하루 약 ${dailyGrams}g을 ${meals}회(1회 ${perMeal}g)로 나눠 급여해보세요.`;
}

// ── 등급 변환 ────────────────────────────────────────────────────────────────
function gradeFromScore(score: number): CompatibilityGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ── 긍정 이유 생성 ───────────────────────────────────────────────────────────
function buildPositiveReasons(
  pet: CompatibilityPetProfile,
  allergyResult: AllergyCheckResult,
  healthResult: HealthConcernCheckResult,
  petFitResult: PetFitCheckResult,
  product: CompatibilityProduct,
): string[] {
  const reasons: string[] = [];

  if (allergyResult.directHits.length === 0 && allergyResult.aliasHits.length === 0 && pet.allergies.length > 0) {
    reasons.push(`${pet.allergies.join(', ')} 알러지를 피할 수 있는 안전한 성분 구성이에요.`);
  }

  for (const concern of healthResult.matchedConcerns) {
    const rule = Object.entries(HEALTH_CONCERN_RULES).find(([key]) =>
      norm(concern).includes(norm(key)) || norm(key).includes(norm(concern)),
    );
    if (rule) reasons.push(rule[1].positiveMsg);
    if (reasons.length >= 3) break;
  }

  if (reasons.length < 3 && petFitResult.ageMatch && petFitResult.speciesMatch) {
    const speciesLabel = pet.species === 'Cat' ? '고양이' : '강아지';
    const ageLabel = pet.age <= 1 ? '퍼피·키튼' : pet.age >= 8 ? '시니어' : '어덜트';
    reasons.push(`${speciesLabel} ${ageLabel}에게 적합한 영양 구성이에요.`);
  }

  if (reasons.length < 3 && product.verificationStatus === 'verified') {
    reasons.push('베로로 운영 검수를 완료한 신뢰도 높은 제품 데이터예요.');
  }

  return reasons.slice(0, 3);
}

// ── 주의 이유 생성 ───────────────────────────────────────────────────────────
function buildCautionReasons(
  allergyResult: AllergyCheckResult,
  warningResult: WarningRiskResult,
  nutritionResult: NutritionCheckResult,
): string[] {
  const reasons: string[] = [];

  if (allergyResult.directHits.length > 0) {
    reasons.push(`알러지 원인 성분(${allergyResult.directHits.join(', ')})이 포함되어 있어요.`);
  }
  if (allergyResult.aliasHits.length > 0 && allergyResult.directHits.length === 0) {
    reasons.push(`알러지와 유사한 성분(${allergyResult.aliasHits.join(', ')})이 포함되어 있어요.`);
  }

  if (warningResult.detectedWarnings.length > 0) {
    reasons.push(`${warningResult.detectedWarnings.join(', ')} 성분이 포함되어 민감한 보호자는 확인이 필요해요.`);
  }

  if (!nutritionResult.aafcoPassed) {
    reasons.push('AAFCO 최소 영양 기준을 충족하지 못하는 항목이 있어요.');
  }

  return reasons.slice(0, 3);
}

// ── 대체 추천 조건 ───────────────────────────────────────────────────────────
function buildAlternativeConditions(
  pet: CompatibilityPetProfile,
  allergyResult: AllergyCheckResult,
  warningResult: WarningRiskResult,
): string[] {
  const conditions: string[] = [];

  if (pet.allergies.length > 0) {
    conditions.push(`${pet.allergies.join('·')} 성분을 배제한 단일 단백질 사료`);
  }
  if (warningResult.detectedWarnings.length > 0) {
    conditions.push('합성 산화방지제(BHA·BHT·에톡시퀸) 미포함 제품');
  }
  if (pet.healthConcerns.length > 0) {
    conditions.push(`${pet.healthConcerns.join('·')} 고민 대응 기능성 성분 포함 제품`);
  }

  return conditions;
}

// ── 요약 문구 생성 ───────────────────────────────────────────────────────────
function buildSummary(
  grade: CompatibilityGrade,
  pet: CompatibilityPetProfile,
  allergyResult: AllergyCheckResult,
): string {
  const petName = pet.name ?? '우리 아이';

  if (grade === 'F') {
    if (allergyResult.directHits.length > 0) {
      return `${petName}에게 알러지 성분이 포함되어 있어 추천하기 어려워요.`;
    }
    return `${petName}에게 적합하지 않은 항목이 있어 다른 제품을 먼저 살펴보세요.`;
  }
  if (grade === 'A') {
    return `${petName}에게 안심하고 추천할 수 있는 최적의 사료예요.`;
  }
  if (grade === 'B') {
    return `${petName}에게 전반적으로 잘 맞는 좋은 선택이에요.`;
  }
  if (grade === 'C') {
    return `${petName}에게 괜찮은 제품이지만, 몇 가지 확인하면 좋을 점이 있어요.`;
  }
  return `${petName}에게 맞지 않는 부분이 있어 주의가 필요해요.`;
}

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  메인 함수                                                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
export function calculateCompatibilityScore(
  product: CompatibilityProduct,
  pet: CompatibilityPetProfile,
): CompatibilityResult {
  const allergyResult = scoreAllergySafety(product, pet);
  const healthResult = scoreHealthConcernFit(product, pet);
  const nutritionResult = scoreNutritionalBalance(product, pet);
  const petFitResult = scorePetFit(product, pet);
  const warningResult = scoreWarningRisk(product);
  const reviewScore = scoreReviewTrust(product);
  const valueScore = scoreValueForMoney(product, pet);

  const breakdown: ScoreBreakdown = {
    allergySafety: allergyResult.score,
    healthConcernFit: healthResult.score,
    nutritionalBalance: nutritionResult.score,
    petFit: petFitResult.score,
    warningRisk: warningResult.score,
    reviewTrust: reviewScore,
    valueForMoney: valueScore,
  };

  const rawTotal = Math.round(
    breakdown.allergySafety +
      breakdown.healthConcernFit +
      breakdown.nutritionalBalance +
      breakdown.petFit +
      breakdown.warningRisk +
      breakdown.reviewTrust +
      breakdown.valueForMoney,
  );

  // 안전 하드캡 적용
  let cap = 100;
  const hasAllergenHit = allergyResult.directHits.length > 0 || allergyResult.aliasHits.length > 0;
  const hasDanger = product.ingredients.some((i) => i.riskLevel === 'danger') || warningResult.detectedWarnings.length > 0;

  if (hasAllergenHit) cap = Math.min(cap, ALLERGEN_CAP);
  if (hasDanger) cap = Math.min(cap, DANGER_CAP);

  const matchScore = Math.max(0, Math.min(cap, rawTotal));
  const capped = matchScore < rawTotal;
  const grade = gradeFromScore(matchScore);

  const positiveReasons = buildPositiveReasons(pet, allergyResult, healthResult, petFitResult, product);
  const cautionReasons = buildCautionReasons(allergyResult, warningResult, nutritionResult);
  const feedingGuide = buildFeedingGuide(product, pet);
  const alternativeConditions = buildAlternativeConditions(pet, allergyResult, warningResult);
  const summary = buildSummary(grade, pet, allergyResult);

  return {
    matchScore,
    grade,
    summary,
    positiveReasons,
    cautionReasons,
    feedingGuide,
    alternativeConditions,
    breakdown,
    capped,
  };
}

// ── 다수 상품 랭킹 ───────────────────────────────────────────────────────────
export function rankProductsByCompatibility(
  products: CompatibilityProduct[],
  pet: CompatibilityPetProfile,
  options: { limit?: number; excludeId?: string } = {},
): Array<{ product: CompatibilityProduct; result: CompatibilityResult }> {
  return products
    .filter((p) => p.id !== options.excludeId)
    .map((p) => ({ product: p, result: calculateCompatibilityScore(p, pet) }))
    .sort((a, b) => b.result.matchScore - a.result.matchScore)
    .slice(0, options.limit ?? products.length);
}
