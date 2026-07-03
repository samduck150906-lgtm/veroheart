/**
 * 베로로 — 사료성분 분석 엔진 (규칙 기반 · AI 미사용)
 *
 * 입력: 제품(보장성분 + 원재료 목록) + 반려동물 프로필
 * 처리: 라벨 실측치(보장성분)와 원재료명 키워드를 결정형(deterministic) 규칙으로 판정
 *   1) 영양 계산(건물기준 환산 · Modified Atwater 열량 · AAFCO 최소기준 · Ca:P)
 *   2) 원료 품질 판정(제1원료 동물성 여부 · 충전제/부산물/합성첨가물/기능성 원료)
 *   3) 위 신호를 가중합해 0~100 사료 품질 점수 + 등급 산출
 *   4) 사람이 읽는 좋은 점/주의할 점 문장 생성(템플릿, 생성형 AI 아님)
 *   5) 실제 열량 기반 1일 권장 급여량 계산
 *
 * 모든 함수는 순수(pure)하며 외부 호출/랜덤/시간에 의존하지 않는다.
 */
import type { Product, UserPetProfile } from '../types';
import type { GuaranteedAnalysis } from './types';
import {
  toDryMatter,
  calculateCalories,
  validateAAFCO,
  checkCalciumPhosphorusRatio,
} from './nutrition';

export type FeedGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
export type FeedProductType = 'complete' | 'treat' | 'supplement';

export interface FeedMacros {
  /** as-fed 기준 % */
  protein: number;
  fat: number;
  fiber: number;
  ash: number;
  moisture: number;
  /** 추정 탄수화물(NFE) = 100 - 나머지 */
  carb: number;
}

export interface FeedIngredientQuality {
  total: number;
  firstIngredient: string | null;
  firstIsAnimalProtein: boolean;
  animalProteins: string[];
  fillers: string[];
  byProducts: string[];
  artificial: string[];
  functional: string[];
  safeCount: number;
  cautionCount: number;
  dangerCount: number;
  allergyHits: string[];
}

export interface FeedAnalysis {
  species: 'dog' | 'cat';
  productType: FeedProductType;
  hasNutritionData: boolean;
  /** as-fed 매크로(%) — 보장성분 있을 때만 */
  macros: FeedMacros | null;
  /** 건물기준 매크로(%) — 제품 간 비교용 */
  macrosDMB: { protein: number; fat: number; fiber: number; carb: number } | null;
  calories: { per100g: number; perKg: number; distribution: { protein: number; fat: number; carb: number }; measured: boolean } | null;
  aafco: { evaluated: boolean; passed: boolean; details: string[]; label: string };
  caP: { ratio: number | null; note: string | null };
  ingredientQuality: FeedIngredientQuality;
  score: number;
  grade: FeedGrade;
  summary: string;
  positives: string[];
  cautions: string[];
  /** 1일 권장 급여량(g) — 체중 + 열량 있을 때만 */
  feeding: { gramsPerDay: number; kcalPer100g: number; measured: boolean; derKcal: number } | null;
  disclaimer: string;
}

const DISCLAIMER =
  '본 분석은 라벨 보장성분과 원재료명을 규칙으로 계산한 참고 정보예요. 수의학적 진단을 대체하지 않으며, 건강 이상이 의심되면 수의사와 상담하세요.';

/* ── 원재료명 키워드 사전 (정규화 후 부분일치) ────────────────── */
const ANIMAL_PROTEIN = [
  '닭', '계육', '오리', '칠면조', '소고기', '쇠고기', '우육', '양고기', '양', '돼지', '돈육',
  '연어', '참치', '명태', '북어', '황태', '대구', '청어', '고등어', '정어리', '멸치', '가다랑어',
  '새우', '게', '조개', '홍합', '계란', '난백', '난황', '달걀', '생선', '어류', '캥거루', '사슴',
  '토끼', '메추리', '오리고기', '연어살', 'chicken', 'beef', 'duck', 'turkey', 'lamb', 'pork',
  'salmon', 'tuna', 'fish', 'egg', 'herring', 'mackerel', 'sardine', 'venison', 'rabbit', 'quail',
];
const BY_PRODUCT = ['부산물', '부산분', '4d', 'byproduct', 'by-product', '가금부산', '동물성부산'];
const FILLER = [
  '옥수수', '콘글루텐', '옥수수글루텐', '밀', '소맥', '밀글루텐', '대두', '콩', '글루텐', '쌀겨',
  '밀기울', '설탕', '액상과당', '시럽', 'corn', 'wheat', 'soy', 'gluten', 'sugar', 'syrup',
];
const ARTIFICIAL = [
  'bha', 'bht', '에톡시퀸', 'ethoxyquin', '합성', '인공', '적색', '황색', '청색', '녹색',
  '타르색소', '아질산나트륨', '아질산염', '소르빈산', '프로필렌글리콜', '이산화티타늄', 'msg',
  '아황산', '화학보존료', '합성보존료', '합성착색료', '합성향료', 'propyleneglycol', 'sodiumnitrite',
];
const FUNCTIONAL = [
  '유산균', '프로바이오틱', '프리바이오틱', '오메가', '생선오일', '연어오일', '어유', '글루코사민',
  '콘드로이틴', 'msm', '타우린', '크랜베리', '블루베리', '프락토올리고당', '유카', '루테인', '비오틴',
  '뮤신', '초유', 'probiotic', 'prebiotic', 'omega', 'glucosamine', 'chondroitin', 'taurine',
  'cranberry', 'blueberry', 'yucca', 'lutein', 'biotin',
];

/** 공백·괄호·대소문자 차이를 흡수한 매칭용 정규화 */
function norm(s: string): string {
  return (s || '').toLowerCase().replace(/[\s()[\]·,./-]/g, '');
}
function hitsAny(haystack: string, needles: string[]): boolean {
  const h = norm(haystack);
  return needles.some((n) => h.includes(norm(n)));
}

function detectProductType(product: Product): FeedProductType {
  const hay = norm(`${product.category} ${product.mainCategory ?? ''} ${product.subCategory ?? ''} ${product.formulation ?? ''} ${product.name}`);
  if (/(영양제|보충제|supplement|파우더|정제|스틱)/.test(hay)) return 'supplement';
  if (/(간식|져키|저키|껌|츄|트릿|treat|snack|육포)/.test(hay)) return 'treat';
  return 'complete';
}

function gradeFromScore(score: number): FeedGrade {
  if (score >= 90) return 'A+';
  if (score >= 82) return 'A';
  if (score >= 70) return 'B';
  if (score >= 58) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

/** RER→DER 배수 (생애주기/중성화 미상 가정, 보수적 평균값) */
function derFactor(profile: UserPetProfile): number {
  if (profile.age <= 1) return 2.5; // 성장기(퍼피·키튼)
  if (profile.age >= 8) return 1.4; // 노령
  return 1.6; // 성체 유지(평균)
}

export function analyzeFeed(product: Product, profile: UserPetProfile): FeedAnalysis {
  const species: 'dog' | 'cat' = profile.species === 'Cat' ? 'cat' : 'dog';
  const productType = detectProductType(product);
  const ingredients = product.ingredients ?? [];

  // ── 1) 영양 계산 (보장성분 실측치가 있을 때만) ──
  const ga: GuaranteedAnalysis | undefined = product.guaranteedAnalysis;
  const hasNutritionData = Boolean(
    ga && ((ga.crudeProtein ?? 0) > 0 || (ga.crudeFat ?? 0) > 0),
  );

  let macros: FeedMacros | null = null;
  let macrosDMB: FeedAnalysis['macrosDMB'] = null;
  let calories: FeedAnalysis['calories'] = null;
  let aafco: FeedAnalysis['aafco'] = { evaluated: false, passed: false, details: [], label: species === 'cat' ? '고양이 성묘 유지' : '강아지 성견 유지' };
  let caP: FeedAnalysis['caP'] = { ratio: null, note: null };

  if (hasNutritionData && ga) {
    const protein = ga.crudeProtein ?? 0;
    const fat = ga.crudeFat ?? 0;
    const fiber = ga.crudeFiber ?? 0;
    const ash = ga.crudeAsh ?? 0;
    const moisture = ga.moisture ?? 0;
    const carb = Math.max(0, Math.round((100 - protein - fat - fiber - ash - moisture) * 10) / 10);
    macros = { protein, fat, fiber, ash, moisture, carb };

    macrosDMB = {
      protein: Math.round((toDryMatter(protein, moisture) ?? 0) * 10) / 10,
      fat: Math.round((toDryMatter(fat, moisture) ?? 0) * 10) / 10,
      fiber: Math.round((toDryMatter(fiber, moisture) ?? 0) * 10) / 10,
      carb: Math.round((toDryMatter(carb, moisture) ?? 0) * 10) / 10,
    };

    const calc = calculateCalories(ga);
    const measuredKcal = product.caloriesPer100g && product.caloriesPer100g > 0;
    calories = {
      per100g: measuredKcal ? Math.round(product.caloriesPer100g as number) : calc.kcalPer100g,
      perKg: measuredKcal ? Math.round((product.caloriesPer100g as number) * 10) : calc.kcalPerKg,
      distribution: { protein: calc.distribution.protein, fat: calc.distribution.fat, carb: calc.distribution.carbs },
      measured: Boolean(measuredKcal),
    };

    if (productType === 'complete') {
      const res = validateAAFCO(ga, species);
      aafco = { evaluated: true, passed: res.passed, details: res.details, label: aafco.label };
    }

    caP = { ratio: ga.calcium && ga.phosphorus ? ga.calcium / ga.phosphorus : null, note: checkCalciumPhosphorusRatio(ga) };
  }

  // ── 2) 원료 품질 판정 ──
  const names = ingredients.map((i) => `${i.nameKo} ${i.nameEn ?? ''}`);
  const isAnimal = (n: string) => hitsAny(n, ANIMAL_PROTEIN) && !hitsAny(n, BY_PRODUCT);
  const animalProteins = ingredients.filter((_, i) => isAnimal(names[i])).map((i) => i.nameKo);
  const fillers = ingredients.filter((_, i) => hitsAny(names[i], FILLER)).map((i) => i.nameKo);
  const byProducts = ingredients.filter((_, i) => hitsAny(names[i], BY_PRODUCT)).map((i) => i.nameKo);
  const artificial = ingredients.filter((_, i) => hitsAny(names[i], ARTIFICIAL)).map((i) => i.nameKo);
  const functional = ingredients.filter((_, i) => hitsAny(names[i], FUNCTIONAL)).map((i) => i.nameKo);

  const allergyHits = Array.from(
    new Set(
      profile.allergies.flatMap((a) => {
        const na = norm(a);
        return ingredients.filter((i) => norm(i.nameKo).includes(na) || norm(i.nameEn ?? '').includes(na)).map((i) => i.nameKo);
      }),
    ),
  );

  const iq: FeedIngredientQuality = {
    total: ingredients.length,
    firstIngredient: ingredients[0]?.nameKo ?? null,
    firstIsAnimalProtein: ingredients.length > 0 && isAnimal(names[0]),
    animalProteins,
    fillers: Array.from(new Set(fillers)),
    byProducts: Array.from(new Set(byProducts)),
    artificial: Array.from(new Set(artificial)),
    functional: Array.from(new Set(functional)),
    safeCount: ingredients.filter((i) => i.riskLevel === 'safe').length,
    cautionCount: ingredients.filter((i) => i.riskLevel === 'caution').length,
    dangerCount: ingredients.filter((i) => i.riskLevel === 'danger').length,
    allergyHits,
  };

  // ── 3) 사료 품질 점수 (객관 지표 · 프로필 무관) ──
  let score = 55;
  if (iq.firstIsAnimalProtein) score += 14;
  else if (iq.animalProteins.length > 0) score += 5;
  if (iq.animalProteins.length >= 2) score += 5;
  score += Math.min(8, iq.functional.length * 3);
  score -= Math.min(12, iq.fillers.length * 4);
  if (iq.byProducts.length > 0) score -= 10;
  score -= Math.min(14, iq.artificial.length * 7);
  score -= Math.min(20, iq.dangerCount * 8);
  score -= Math.min(12, iq.cautionCount * 3);

  if (hasNutritionData && macros && macrosDMB) {
    if (aafco.evaluated) score += aafco.passed ? 10 : -12;
    const pMin = species === 'cat' ? 26 : 18;
    const pHigh = species === 'cat' ? 40 : 28;
    const pMid = species === 'cat' ? 32 : 22;
    if (macrosDMB.protein >= pHigh) score += 6;
    else if (macrosDMB.protein >= pMid) score += 3;
    else if (macrosDMB.protein < pMin && !aafco.evaluated) score -= 6;
    if (macros.carb >= 55) score -= 6;
    else if (macros.carb >= 45) score -= 3;
    if (caP.note) score -= 5;
  }

  // 간식/영양제는 완전사료 기준(AAFCO/탄수화물)을 적용하지 않으므로 소폭 상향 보정
  if (productType !== 'complete') score = Math.max(score, 50);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade = gradeFromScore(score);

  // ── 4) 좋은 점 / 주의할 점 (규칙 기반 문장) ──
  const positives: string[] = [];
  const cautions: string[] = [];

  if (iq.firstIsAnimalProtein && iq.firstIngredient) positives.push(`제1원료가 동물성 단백질(${iq.firstIngredient})이에요`);
  if (iq.animalProteins.length >= 2) positives.push(`동물성 단백질 원료 ${iq.animalProteins.length}종 확인`);
  if (iq.functional.length > 0) positives.push(`기능성 원료 포함: ${iq.functional.slice(0, 3).join(', ')}`);
  if (hasNutritionData && aafco.evaluated && aafco.passed) positives.push('AAFCO 성체 유지 최소 기준(단백·지방)을 충족해요');
  if (iq.dangerCount === 0 && iq.cautionCount === 0 && iq.artificial.length === 0) positives.push('위험·주의·합성첨가물 성분이 확인되지 않았어요');
  if (macrosDMB && macrosDMB.protein >= (species === 'cat' ? 32 : 22)) positives.push(`건물기준 조단백질 ${macrosDMB.protein}%로 단백질이 풍부해요`);

  if (allergyHits.length > 0) cautions.push(`${profile.name}의 회피 성분이 들어 있어요: ${allergyHits.join(', ')}`);
  if (iq.dangerCount > 0) cautions.push(`위험 등급 성분 ${iq.dangerCount}개 포함`);
  if (iq.artificial.length > 0) cautions.push(`합성 첨가물 의심 원료: ${iq.artificial.slice(0, 3).join(', ')}`);
  if (iq.byProducts.length > 0) cautions.push(`부산물 원료 포함: ${iq.byProducts.slice(0, 2).join(', ')}`);
  if (iq.fillers.length >= 2) cautions.push(`곡물·충전제 계열 원료 다수: ${iq.fillers.slice(0, 3).join(', ')}`);
  if (hasNutritionData && aafco.evaluated && !aafco.passed) cautions.push(...aafco.details);
  if (caP.note) cautions.push(caP.note);
  if (macros && macros.carb >= 55) cautions.push(`추정 탄수화물이 ${Math.round(macros.carb)}%로 다소 높아요`);
  if (iq.total === 0) cautions.push('등록된 원재료 정보가 없어 원료 품질은 평가하지 못했어요');

  // ── 요약(한 줄) ──
  const summary = (() => {
    if (allergyHits.length > 0) return `${profile.name}가 피해야 할 성분이 있어 급여 전 확인이 필요해요.`;
    if (grade === 'A+' || grade === 'A') return iq.firstIsAnimalProtein ? '동물성 단백질 중심의 균형 잡힌 우수한 사료예요.' : '전반적으로 품질이 우수한 사료예요.';
    if (grade === 'B') return '무난하게 급여할 수 있는 사료예요.';
    if (grade === 'C') return '나쁘지 않지만 확인할 점이 몇 가지 있어요.';
    return '주의가 필요한 성분이 있어 신중히 선택하세요.';
  })();

  // ── 5) 1일 권장 급여량 (실제 열량 기반) ──
  let feeding: FeedAnalysis['feeding'] = null;
  if (profile.weightKg && profile.weightKg > 0 && productType === 'complete') {
    const kcalFallback = { complete: 380 } as const;
    const kcalPer100g = calories?.per100g && calories.per100g > 0 ? calories.per100g : kcalFallback.complete;
    const measured = Boolean(calories?.per100g && calories.per100g > 0);
    const rer = 70 * Math.pow(profile.weightKg, 0.75);
    const der = rer * derFactor(profile);
    const grams = Math.round((der / kcalPer100g) * 100);
    feeding = { gramsPerDay: grams, kcalPer100g: Math.round(kcalPer100g), measured, derKcal: Math.round(der) };
  }

  return {
    species,
    productType,
    hasNutritionData,
    macros,
    macrosDMB,
    calories,
    aafco,
    caP,
    ingredientQuality: iq,
    score,
    grade,
    summary,
    positives,
    cautions,
    feeding,
    disclaimer: DISCLAIMER,
  };
}
