/**
 * 견종 → 질환 매핑 + NRC 2006 정량 규칙 평가 엔진
 *
 * GA(보증성분) → DMB 변환 + 1000kcal 환산 → 임계값 비교
 * GA에 없는 영양소(글루코사민, EPA+DHA 등)는 원료 존재 여부로 판정(pass/unknown).
 */

import { BREED_DISEASE_ENTRIES, DISEASE_MAP, type DiseaseCategory, type NutrientKey, type NutrientRule } from './diseaseRules';

export type RuleCheckStatus = 'pass' | 'fail' | 'unknown';

export interface RuleCheckResult {
  rule: NutrientRule;
  status: RuleCheckStatus;
  computedValue?: number;
  displayValue?: string;
  message: string;
}

export interface ActiveDiseaseResult {
  disease: DiseaseCategory;
  ruleChecks: RuleCheckResult[];
  passCount: number;
  failCount: number;
  unknownCount: number;
  supplementGaps: string[];
}

export interface BreedDiseaseResult {
  breedMatched: string | null;
  diseaseIds: string[];
  activeDiseases: ActiveDiseaseResult[];
}

// ── 영양소 추정 모듈 ────────────────────────────────────────────────────

interface ComputedNutrients {
  protein_dmb: number | null;
  fat_dmb: number | null;
  fiber_dmb: number | null;
  phosphorus_per1000kcal: number | null;
  calcium_phosphorus_ratio: number | null;
  taurine_per1000kcal: number | null;
  kcalPer100g: number | null;
}

function computeFromGA(ga?: {
  crudeProtein?: number; crudeFat?: number; crudeFiber?: number;
  crudeAsh?: number; moisture?: number; calcium?: number; phosphorus?: number;
  taurine?: number;
}): ComputedNutrients {
  if (!ga) {
    return {
      protein_dmb: null, fat_dmb: null, fiber_dmb: null,
      phosphorus_per1000kcal: null, calcium_phosphorus_ratio: null,
      taurine_per1000kcal: null, kcalPer100g: null,
    };
  }

  const moisture = ga.moisture ?? 10;
  const dmFactor = 1 / (1 - moisture / 100);

  const protein_dmb = ga.crudeProtein != null ? ga.crudeProtein * dmFactor : null;
  const fat_dmb = ga.crudeFat != null ? ga.crudeFat * dmFactor : null;
  const fiber_dmb = ga.crudeFiber != null ? ga.crudeFiber * dmFactor : null;
  const ash_dmb = ga.crudeAsh != null ? ga.crudeAsh * dmFactor : 5;

  // Modified Atwater estimate: kcal per 100g DM
  let kcalPer100g: number | null = null;
  if (protein_dmb != null && fat_dmb != null) {
    const nfe_dmb = Math.max(0, 100 - protein_dmb - fat_dmb - (fiber_dmb ?? 0) - ash_dmb);
    const me_per100g_dm = protein_dmb * 3.5 + fat_dmb * 8.5 + nfe_dmb * 3.5;
    kcalPer100g = me_per100g_dm * (1 - moisture / 100);
  }

  // phosphorus %  →  mg/100g = %  × 1000, then /kcalPer100g × 1000 = mg/1000kcal
  const phosphorus_per1000kcal =
    ga.phosphorus != null && kcalPer100g != null && kcalPer100g > 0
      ? (ga.phosphorus * 1000 / kcalPer100g) * 1000
      : null;

  const calcium_phosphorus_ratio =
    ga.calcium != null && ga.phosphorus != null && ga.phosphorus > 0
      ? ga.calcium / ga.phosphorus
      : null;

  // taurine in mg/kg as-fed → mg/100g / kcalPer100g × 1000
  const taurine_per1000kcal =
    ga.taurine != null && kcalPer100g != null && kcalPer100g > 0
      ? (ga.taurine / 10 / kcalPer100g) * 1000
      : null;

  return { protein_dmb, fat_dmb, fiber_dmb, phosphorus_per1000kcal, calcium_phosphorus_ratio, taurine_per1000kcal, kcalPer100g };
}

// ── 원료 기반 영양소 존재 여부 키워드 ───────────────────────────────────

const INGREDIENT_PRESENCE_KEYWORDS: Partial<Record<NutrientKey, string[]>> = {
  glucosamine_per1000kcal: ['글루코사민', 'glucosamine'],
  chondroitin_per1000kcal: ['콘드로이틴', 'chondroitin'],
  msm_per1000kcal: ['msm', '메틸설포닐메탄', 'methylsulfonylmethane'],
  epa_dha_per1000kcal: ['dha', 'epa', '오메가3', '오메가-3', '연어오일', '정어리오일', '청어오일', 'fish oil', 'salmon oil', '초록입홍합'],
  taurine_per1000kcal: ['타우린', 'taurine'],
  l_carnitine_per1000kcal: ['l-카르니틴', 'l카르니틴', 'l-carnitine', 'carnitine'],
  sodium_per1000kcal: [],  // 나트륨은 원료 기반 감지 어려움 → unknown
  zinc_per1000kcal: ['아연', 'zinc'],
  copper_per_kg: ['구리', 'copper'],
};

function hasIngredientKeyword(
  nutrientKey: NutrientKey,
  ingredientNames: string[],
): boolean {
  const keywords = INGREDIENT_PRESENCE_KEYWORDS[nutrientKey] ?? [];
  if (keywords.length === 0) return false;
  const haystack = ingredientNames.join(' ').toLowerCase();
  return keywords.some(kw => haystack.includes(kw.toLowerCase()));
}

// ── 보조제 존재 여부 확인 ───────────────────────────────────────────────

function getSupplementGaps(
  candidates: string[],
  ingredientNames: string[],
): string[] {
  const haystack = ingredientNames.join(' ').toLowerCase();
  return candidates.filter(supp => {
    const kws = supp.toLowerCase().replace(/[()]/g, ' ').split(/[\s·]+/);
    return !kws.some(kw => kw.length > 1 && haystack.includes(kw));
  });
}

// ── 규칙 평가 ────────────────────────────────────────────────────────────

function evaluateRule(
  rule: NutrientRule,
  nutrients: ComputedNutrients,
  ingredientNames: string[],
): RuleCheckResult {
  const key = rule.nutrientKey;
  let computed: number | null = null;

  // GA-derived nutrients
  if (key === 'protein_dmb') computed = nutrients.protein_dmb;
  else if (key === 'fat_dmb') computed = nutrients.fat_dmb;
  else if (key === 'fiber_dmb') computed = nutrients.fiber_dmb;
  else if (key === 'phosphorus_per1000kcal') computed = nutrients.phosphorus_per1000kcal;
  else if (key === 'calcium_phosphorus_ratio') computed = nutrients.calcium_phosphorus_ratio;
  else if (key === 'taurine_per1000kcal') computed = nutrients.taurine_per1000kcal;

  if (computed != null) {
    const { direction, min, max } = rule;
    let pass = false;
    if (direction === 'min' && min != null) pass = computed >= min;
    else if (direction === 'max' && max != null) pass = computed <= max;
    else if (direction === 'range' && min != null && max != null) pass = computed >= min && computed <= max;

    const displayValue = `${computed.toFixed(1)} ${rule.unit}`;
    let limit = '';
    if (direction === 'min') limit = `기준: ${rule.min} 이상`;
    else if (direction === 'max') limit = `기준: ${rule.max} 이하`;
    else limit = `기준: ${rule.min}~${rule.max}`;

    return {
      rule,
      status: pass ? 'pass' : 'fail',
      computedValue: computed,
      displayValue,
      message: pass
        ? `✓ ${displayValue} (${limit})`
        : `✗ ${displayValue} (${limit})`,
    };
  }

  // Ingredient-presence based
  const keywords = INGREDIENT_PRESENCE_KEYWORDS[key];
  if (keywords === undefined || keywords.length === 0) {
    return { rule, status: 'unknown', message: '정보 없음 — GA에 미포함 항목' };
  }

  const present = hasIngredientKeyword(key, ingredientNames);
  if (!present) {
    return { rule, status: 'unknown', message: '원료 목록에서 확인되지 않음 (함량 미표기)' };
  }

  if (rule.direction === 'min') {
    return {
      rule,
      status: 'pass',
      message: '✓ 원료 목록에 포함 확인 (함량 미상)',
    };
  }

  // max/range thresholds for ingredient-only nutrients are not evaluable
  return { rule, status: 'unknown', message: '함량 데이터 없음 — 판단 불가' };
}

// ── 견종 매칭 ────────────────────────────────────────────────────────────

export function matchBreedToDiseases(breedInput: string): { breedMatched: string | null; diseaseIds: string[] } {
  const normalized = breedInput.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const entry of BREED_DISEASE_ENTRIES) {
    const matched = entry.aliases.some(alias => {
      const a = alias.toLowerCase();
      return normalized.includes(a) || a.includes(normalized);
    });
    if (matched) {
      return { breedMatched: entry.aliases[0], diseaseIds: entry.diseaseIds };
    }
  }
  return { breedMatched: null, diseaseIds: [] };
}

// ── 메인 엔진 ────────────────────────────────────────────────────────────

interface ProductForDiseaseEval {
  ingredients?: Array<{ nameKo: string; nameEn?: string }>;
  guaranteedAnalysis?: {
    crudeProtein?: number; crudeFat?: number; crudeFiber?: number;
    crudeAsh?: number; moisture?: number; calcium?: number; phosphorus?: number;
    taurine?: number;
  };
}

/**
 * 주어진 질환 ID 집합에 대해 정량 규칙 + 보조 성분 갭을 평가한다.
 * 견종 매칭(runBreedDiseaseEngine)과 사용자 건강 고민(프로필) 양쪽에서 공용.
 */
export function evaluateDiseases(
  diseaseIds: string[],
  product: ProductForDiseaseEval,
): ActiveDiseaseResult[] {
  const nutrients = computeFromGA(product.guaranteedAnalysis);
  const ingredientNames = (product.ingredients ?? []).map(i => i.nameKo + ' ' + (i.nameEn ?? ''));

  return diseaseIds
    .map(id => DISEASE_MAP[id])
    .filter(Boolean)
    .map(disease => {
      const ruleChecks = disease.quantitativeRules.map(rule =>
        evaluateRule(rule, nutrients, ingredientNames)
      );
      const passCount = ruleChecks.filter(r => r.status === 'pass').length;
      const failCount = ruleChecks.filter(r => r.status === 'fail').length;
      const unknownCount = ruleChecks.filter(r => r.status === 'unknown').length;
      const supplementGaps = getSupplementGaps(disease.supplementCandidates, ingredientNames);

      return { disease, ruleChecks, passCount, failCount, unknownCount, supplementGaps };
    });
}

export function runBreedDiseaseEngine(
  breed: string,
  product: ProductForDiseaseEval,
): BreedDiseaseResult {
  const { breedMatched, diseaseIds } = matchBreedToDiseases(breed);

  if (diseaseIds.length === 0) {
    return { breedMatched, diseaseIds: [], activeDiseases: [] };
  }

  return { breedMatched, diseaseIds, activeDiseases: evaluateDiseases(diseaseIds, product) };
}
