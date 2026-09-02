import type { Product, UserPetProfile } from '../types';
import { toDryMatter } from '../analysis/nutrition';
import {
  HEALTH_CONCERN_DEFINITIONS,
  canonicalizeHealthConcerns,
  normalizeConcernToken,
  type ConcernEvidenceLevel,
  type ConcernStatus,
  type DataConfidence,
  type EvidenceValueKind,
  type HealthConcernEvaluationResult,
  type HealthConcernId,
  type MedicalThresholdEvidence,
  type QuantitativeConcernCheck,
} from './concerns';

type Species = 'dog' | 'cat' | 'all';

interface Threshold {
  nutrient: string;
  field: 'crudeProtein' | 'crudeFat' | 'crudeFiber' | 'phosphorus' | 'calcium' | 'taurine' | 'vitaminA';
  direction: 'min' | 'max' | 'range';
  min?: number;
  max?: number;
  unit: string;
  species: Species;
  lifeStage: string;
  scope: MedicalThresholdEvidence['scope'];
  source: string;
  sourceDateOrVersion: string;
  evidenceStrength: MedicalThresholdEvidence['evidenceStrength'];
  limitations: string;
  valueKind: EvidenceValueKind;
  compute: (product: Product) => number | null;
}

const WELLNESS_SOURCE = 'Internal label-comparison policy using public guaranteed-analysis fields';
const WSAVA_SOURCE = 'WSAVA Global Nutrition Guidelines';
const FEDIAF_SOURCE = 'FEDIAF Nutritional Guidelines for Complete and Complementary Pet Food for Cats and Dogs';
const MERCK_RENAL_SOURCE = 'MSD/Merck Veterinary Manual, Renal Dysfunction in Dogs and Cats';

function numberOrNull(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function caloriesPer100g(product: Product): number | null {
  return numberOrNull(product.caloriesPer100g ?? product.guaranteedAnalysis?.kcalPer100g);
}

function dmb(product: Product, field: 'crudeProtein' | 'crudeFat' | 'crudeFiber'): number | null {
  const ga = product.guaranteedAnalysis;
  const value = numberOrNull(ga?.[field]);
  if (value == null) return null;
  return toDryMatter(value, numberOrNull(ga?.moisture) ?? 10);
}

function percentToMgPer1000Kcal(product: Product, field: 'phosphorus' | 'calcium'): number | null {
  const value = numberOrNull(product.guaranteedAnalysis?.[field]);
  const kcal = caloriesPer100g(product);
  if (value == null || kcal == null || kcal <= 0) return null;
  return ((value * 1000) / kcal) * 1000;
}

function mgKgToMgPer1000Kcal(product: Product, field: 'taurine'): number | null {
  const value = numberOrNull(product.guaranteedAnalysis?.[field]);
  const kcal = caloriesPer100g(product);
  if (value == null || kcal == null || kcal <= 0) return null;
  return ((value / 10) / kcal) * 1000;
}

function sourceEvidence(threshold: Threshold): MedicalThresholdEvidence {
  const range =
    threshold.direction === 'range'
      ? `${threshold.min}-${threshold.max}`
      : threshold.direction === 'min'
        ? `>=${threshold.min}`
        : `<=${threshold.max}`;
  return {
    source: threshold.source,
    sourceDateOrVersion: threshold.sourceDateOrVersion,
    species: threshold.species,
    lifeStage: threshold.lifeStage,
    scope: threshold.scope,
    nutrient: threshold.nutrient,
    unit: threshold.unit,
    thresholdOrRange: range,
    valueKind: threshold.valueKind,
    evidenceStrength: threshold.evidenceStrength,
    limitations: threshold.limitations,
  };
}

const THRESHOLDS: Partial<Record<HealthConcernId, Threshold[]>> = {
  digestive: [
    {
      nutrient: '조섬유',
      field: 'crudeFiber',
      direction: 'range',
      min: 3,
      max: 6,
      unit: '% DMB',
      species: 'all',
      lifeStage: 'adult',
      scope: 'general_wellness',
      source: WELLNESS_SOURCE,
      sourceDateOrVersion: '2026-09-02',
      evidenceStrength: 'low',
      limitations: '조섬유는 총식이섬유가 아니므로 소화기 적합성의 보조 비교로만 사용한다.',
      valueKind: 'calculated',
      compute: (product) => dmb(product, 'crudeFiber'),
    },
  ],
  weight: [
    {
      nutrient: '조지방',
      field: 'crudeFat',
      direction: 'max',
      max: 12,
      unit: '% DMB',
      species: 'all',
      lifeStage: 'adult',
      scope: 'general_wellness',
      source: WSAVA_SOURCE,
      sourceDateOrVersion: 'Global Nutrition Guidelines, accessed 2026-09-02',
      evidenceStrength: 'low',
      limitations: '체중 관리는 BCS, 급여량, 열량, 활동량이 함께 필요하며 지방 수치 하나로 감량 처방을 만들 수 없다.',
      valueKind: 'calculated',
      compute: (product) => dmb(product, 'crudeFat'),
    },
    {
      nutrient: '조단백질',
      field: 'crudeProtein',
      direction: 'min',
      min: 28,
      unit: '% DMB',
      species: 'all',
      lifeStage: 'adult',
      scope: 'general_wellness',
      source: WSAVA_SOURCE,
      sourceDateOrVersion: 'Global Nutrition Guidelines, accessed 2026-09-02',
      evidenceStrength: 'low',
      limitations: '근육량과 개체 상태 평가 없이 체중 감량 효과를 단정하지 않는다.',
      valueKind: 'calculated',
      compute: (product) => dmb(product, 'crudeProtein'),
    },
  ],
  renal_urinary: [
    {
      nutrient: '인',
      field: 'phosphorus',
      direction: 'max',
      max: 500,
      unit: 'mg/1000kcal',
      species: 'all',
      lifeStage: 'adult',
      scope: 'diagnosed_disease',
      source: MERCK_RENAL_SOURCE,
      sourceDateOrVersion: 'accessed 2026-09-02',
      evidenceStrength: 'medium',
      limitations: '일반 신장·비뇨기 관심사는 진단이 아니며, CKD 식이는 수의사 판단과 처방식 검토가 필요하다.',
      valueKind: 'calculated',
      compute: (product) => percentToMgPer1000Kcal(product, 'phosphorus'),
    },
  ],
  heart: [
    {
      nutrient: '타우린',
      field: 'taurine',
      direction: 'min',
      min: 100,
      unit: 'mg/1000kcal',
      species: 'cat',
      lifeStage: 'adult',
      scope: 'healthy_animal',
      source: FEDIAF_SOURCE,
      sourceDateOrVersion: '2024',
      evidenceStrength: 'medium',
      limitations: '타우린 표시는 특히 고양이 영양에서 중요하지만 DCM 예방이나 심장질환 치료를 의미하지 않는다.',
      valueKind: 'calculated',
      compute: (product) => mgKgToMgPer1000Kcal(product, 'taurine'),
    },
  ],
};

const FUNCTIONAL_INGREDIENTS: Record<HealthConcernId, readonly string[]> = {
  skin_coat: ['오메가3', '오메가-3', '연어오일', 'fish oil', 'salmon oil', '비오틴', '아연', 'zinc'],
  joint: ['글루코사민', '콘드로이틴', 'msm', '초록입홍합', 'green lipped mussel', 'epa', 'dha'],
  digestive: ['프로바이오틱스', '프리바이오틱스', '유산균', '이눌린', 'fos', 'prebiotic', 'probiotic'],
  weight: ['l-카르니틴', 'l카르니틴', 'carnitine'],
  renal_urinary: ['크랜베리', 'cranberry', '오메가3', '오메가-3'],
  heart: ['타우린', 'taurine', 'l-카르니틴', 'l카르니틴', 'carnitine', '코엔자임q10'],
  immune: ['비타민e', 'vitamin e', '아연', 'zinc', '셀레늄', 'selenium', '초유', 'colostrum'],
  eye: ['루테인', 'lutein', '타우린', 'taurine', '비타민a', 'vitamin a', 'dha'],
  oral: ['덴탈', '치석', '헥사메타인산', 'sodium hexametaphosphate', '녹차추출물'],
};

function textMatchesAny(value: string, needles: readonly string[]): boolean {
  const hay = normalizeConcernToken(value);
  return needles.some((needle) => hay.includes(normalizeConcernToken(needle)));
}

function matchedTags(product: Product, concernId: HealthConcernId): string[] {
  const aliases = HEALTH_CONCERN_DEFINITIONS[concernId].aliases;
  return [...new Set((product.healthConcerns ?? []).filter((tag) => textMatchesAny(tag, aliases)))];
}

function matchedIngredients(product: Product, concernId: HealthConcernId): string[] {
  const needles = FUNCTIONAL_INGREDIENTS[concernId];
  return [
    ...new Set(
      (product.ingredients ?? [])
        .filter((ingredient) =>
          [ingredient.nameKo, ingredient.nameEn, ingredient.purpose].some((value) => value && textMatchesAny(value, needles)),
        )
        .map((ingredient) => ingredient.nameKo),
    ),
  ];
}

function evaluateThreshold(threshold: Threshold, product: Product): QuantitativeConcernCheck {
  const actualValue = threshold.compute(product);
  const evidence = sourceEvidence(threshold);
  if (actualValue == null) {
    return {
      nutrient: threshold.nutrient,
      status: 'unknown',
      unit: threshold.unit,
      valueKind: 'unknown',
      evidence,
      message: `${threshold.nutrient} 수치가 공개되어 있지 않아 비교할 수 없어요.`,
    };
  }

  const pass =
    threshold.direction === 'range'
      ? actualValue >= (threshold.min ?? Number.NEGATIVE_INFINITY) && actualValue <= (threshold.max ?? Number.POSITIVE_INFINITY)
      : threshold.direction === 'min'
        ? actualValue >= (threshold.min ?? Number.POSITIVE_INFINITY)
        : actualValue <= (threshold.max ?? Number.NEGATIVE_INFINITY);

  return {
    nutrient: threshold.nutrient,
    status: pass ? 'pass' : 'fail',
    actualValue,
    unit: threshold.unit,
    valueKind: threshold.valueKind,
    evidence,
    message: pass
      ? '공개된 라벨 수치가 내부 비교 기준 범위에 있어요.'
      : '공개된 수치가 비교 기준을 벗어나 있어 급여 전 확인이 필요해요.',
  };
}

function evidenceFactor(status: ConcernStatus, evidenceLevel: ConcernEvidenceLevel): number {
  if (status === 'supported' && evidenceLevel === 'validated_quantitative') return 1;
  if (status === 'possible' && evidenceLevel === 'tag_and_ingredient_quantity_unknown') return 0.5;
  if (status === 'tag_only') return 0.25;
  if (status === 'possible' && evidenceLevel === 'ingredient_only_quantity_unknown') return 0.25;
  return 0;
}

function deriveStatus(
  concernId: HealthConcernId,
  checks: QuantitativeConcernCheck[],
  tags: string[],
  ingredients: string[],
): { status: ConcernStatus; evidenceLevel: ConcernEvidenceLevel; facts: string[]; confidence: DataConfidence } {
  const facts: string[] = [];
  const failed = checks.filter((check) => check.status === 'fail');
  const passed = checks.filter((check) => check.status === 'pass');

  if (failed.length > 0) {
    facts.push('공개된 수치가 비교 기준을 벗어나 있어 급여 전 확인이 필요해요.');
    return { status: 'not_supported', evidenceLevel: 'contradictory', facts, confidence: 'sufficient' };
  }

  if (passed.length > 0) {
    facts.push('공개된 라벨 수치가 내부 비교 기준 범위에 있어요.');
    return { status: 'supported', evidenceLevel: 'validated_quantitative', facts, confidence: 'sufficient' };
  }

  const hasTag = tags.length > 0;
  const hasIngredient = ingredients.length > 0;
  if ((concernId === 'renal_urinary' || concernId === 'heart') && (hasTag || hasIngredient)) {
    facts.push(
      hasIngredient
        ? '관련 성분이 표시되어 있지만 함량은 확인되지 않아요.'
        : '제품에 관련 건강태그가 등록되어 있으나 이를 뒷받침할 상세 수치는 부족해요.',
    );
    return {
      status: hasIngredient ? 'possible' : 'tag_only',
      evidenceLevel: hasIngredient && hasTag ? 'tag_and_ingredient_quantity_unknown' : hasTag ? 'tag_only' : 'ingredient_only_quantity_unknown',
      facts,
      confidence: 'partial',
    };
  }

  if (hasTag && hasIngredient) {
    facts.push('관련 성분이 표시되어 있지만 함량은 확인되지 않아요.');
    return { status: 'possible', evidenceLevel: 'tag_and_ingredient_quantity_unknown', facts, confidence: 'partial' };
  }
  if (hasTag) {
    facts.push('제품에 관련 건강태그가 등록되어 있으나 이를 뒷받침할 상세 수치는 부족해요.');
    return { status: 'tag_only', evidenceLevel: 'tag_only', facts, confidence: 'partial' };
  }
  if (hasIngredient) {
    facts.push('관련 성분이 표시되어 있지만 함량은 확인되지 않아요.');
    return { status: 'possible', evidenceLevel: 'ingredient_only_quantity_unknown', facts, confidence: 'partial' };
  }

  facts.push('현재 공개된 정보만으로 적합 여부를 판단할 수 없어요.');
  return { status: 'unknown', evidenceLevel: 'missing', facts, confidence: 'insufficient' };
}

export function evaluateHealthConcerns(product: Product, profile: UserPetProfile): HealthConcernEvaluationResult[] {
  const canonical = canonicalizeHealthConcerns(profile.healthConcerns);
  if (canonical.length === 0) return [];
  const share = 20 / canonical.length;

  return canonical.map((concernId) => {
    const definition = HEALTH_CONCERN_DEFINITIONS[concernId];
    const tags = matchedTags(product, concernId);
    const ingredients = matchedIngredients(product, concernId);
    const quantitativeChecks = (THRESHOLDS[concernId] ?? []).map((threshold) => evaluateThreshold(threshold, product));
    const state = deriveStatus(concernId, quantitativeChecks, tags, ingredients);
    const missingRequiredFields = quantitativeChecks
      .filter((check) => check.status === 'unknown')
      .map((check) => check.nutrient);
    const cautionReasons = quantitativeChecks
      .filter((check) => check.status === 'fail')
      .map((check) => check.message);
    const scoringContribution = Math.round(share * evidenceFactor(state.status, state.evidenceLevel) * 100) / 100;

    return {
      concernId,
      originalProfileLabel: definition.label,
      status: state.status,
      evidenceLevel: state.evidenceLevel,
      matchedProductTags: tags,
      matchedIngredientEvidence: ingredients,
      quantitativeChecks,
      missingRequiredFields,
      cautionReasons,
      userFacingFacts: state.facts,
      confidence: state.confidence,
      scoringContribution,
      sourceReferences: quantitativeChecks.flatMap((check) => (check.evidence ? [check.evidence] : [])),
    };
  });
}
