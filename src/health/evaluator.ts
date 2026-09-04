import type { Product, UserPetProfile } from '../types';
import {
  normalizeConcernToken,
  resolveHealthConcernId,
  type ConcernEvidenceLevel,
  type ConcernStatus,
  type DataConfidence,
  type EvidenceValueKind,
  type HealthConcernEvaluationResult,
  type HealthConcernEvaluationReport,
  type HealthConcernEvidenceDomain,
  type HealthConcernId,
  type MedicalThresholdEvidence,
  type QuantitativeConcernCheck,
  type QuantitativeInputEvidence,
  type ProductForm,
} from './concerns';

type Species = 'dog' | 'cat' | 'all';
type ProductCategory = MedicalThresholdEvidence['productCategory'];

interface Threshold {
  nutrient: string;
  field: 'crudeProtein' | 'crudeFat' | 'crudeFiber' | 'phosphorus' | 'calcium' | 'taurine' | 'vitaminA';
  direction: 'min' | 'max' | 'range';
  min?: number;
  max?: number;
  unit: string;
  species: Species;
  lifeStage: string;
  productCategory: ProductCategory;
  concernDomain: HealthConcernEvidenceDomain;
  scope: MedicalThresholdEvidence['scope'];
  source: string;
  issuingOrganization: string;
  documentTitle: string;
  sourceDateOrVersion: string;
  sourceUrl?: string;
  location: string;
  productForm: ProductForm;
  basis: MedicalThresholdEvidence['basis'];
  classification: MedicalThresholdEvidence['classification'];
  judgmentEnabled: boolean;
  evidenceStrength: MedicalThresholdEvidence['evidenceStrength'];
  limitations: string;
  compute: (product: Product) => ComputedThresholdValue;
}

interface ComputedThresholdValue {
  value: number | null;
  valueKind: EvidenceValueKind;
  inputEvidence: QuantitativeInputEvidence[];
}

interface IngredientEvidenceMatch {
  displayName: string;
  matchedField: 'nameKo' | 'nameEn' | 'purpose';
  matchedValue: string;
  matchedKeyword: string;
  evidenceDomain: HealthConcernEvidenceDomain;
}

const FEDIAF_GUIDELINES_URL =
  'https://europeanpetfood.org/wp-content/uploads/2025/09/FEDIAF-Nutritional-Guidelines_2025-ONLINE.pdf';
const WSAVA_GUIDELINES_URL = 'https://wsava.org/global-guidelines/global-nutrition-guidelines/';

interface DeclaredValueConstraints {
  allowPercentSuffix: boolean;
  min?: number;
  minExclusive?: number;
  max?: number;
  maxExclusive?: number;
}

function parseDeclaredValue(
  field: string,
  rawValue: unknown,
  constraints: DeclaredValueConstraints,
): QuantitativeInputEvidence {
  const exactEvidence = (parsedValue: number): QuantitativeInputEvidence => {
    const outOfRange =
      (constraints.min != null && parsedValue < constraints.min)
      || (constraints.minExclusive != null && parsedValue <= constraints.minExclusive)
      || (constraints.max != null && parsedValue > constraints.max)
      || (constraints.maxExclusive != null && parsedValue >= constraints.maxExclusive);
    return outOfRange
      ? { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' }
      : { field, rawValue, parsedValue, qualifier: 'exact', valueKind: 'label_declared' };
  };

  if (typeof rawValue === 'number') {
    return Number.isFinite(rawValue)
      ? exactEvidence(rawValue)
      : { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' };
  }

  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' };
  }

  const match = rawValue.match(/^\s*(<=|>=|<|>|≤|≥)?\s*(\d+(?:\.\d+)?)\s*(%)?\s*$/);
  if (!match) return { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' };

  if (match[3] && !constraints.allowPercentSuffix) {
    return { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' };
  }

  const parsedValue = Number(match[2]);
  if (!Number.isFinite(parsedValue)
    || (constraints.min != null && parsedValue < constraints.min)
    || (constraints.minExclusive != null && parsedValue <= constraints.minExclusive)
    || (constraints.max != null && parsedValue > constraints.max)
    || (constraints.maxExclusive != null && parsedValue >= constraints.maxExclusive)) {
    return { field, rawValue, qualifier: 'unavailable', valueKind: 'unknown' };
  }
  const qualifier =
    match[1] === '<' ? 'lt'
      : match[1] === '<=' || match[1] === '≤' ? 'lte'
        : match[1] === '>' ? 'gt'
          : match[1] === '>=' || match[1] === '≥' ? 'gte'
            : 'exact';
  return { field, rawValue, parsedValue, qualifier, valueKind: 'label_declared' };
}

function parsePercentageValue(field: string, rawValue: unknown, moisture = false): QuantitativeInputEvidence {
  return parseDeclaredValue(field, rawValue, {
    allowPercentSuffix: true,
    min: 0,
    ...(moisture ? { maxExclusive: 100 } : { max: 100 }),
  });
}

function parseEnergyValue(field: string, rawValue: unknown): QuantitativeInputEvidence {
  return parseDeclaredValue(field, rawValue, { allowPercentSuffix: false, minExclusive: 0 });
}

function parseUnitUnresolvedValue(field: string, rawValue: unknown): QuantitativeInputEvidence {
  return parseDeclaredValue(field, rawValue, { allowPercentSuffix: false, min: 0 });
}

function comparableValue(input: QuantitativeInputEvidence): number | null {
  return input.qualifier === 'exact' && input.parsedValue != null ? input.parsedValue : null;
}

function calculatedValue(value: number | null, inputEvidence: QuantitativeInputEvidence[]): ComputedThresholdValue {
  return {
    value: value != null && Number.isFinite(value) ? value : null,
    valueKind: value != null && Number.isFinite(value) ? 'calculated' : 'unknown',
    inputEvidence,
  };
}

function caloriesPer100g(product: Product): QuantitativeInputEvidence {
  return product.caloriesPer100g != null
    ? parseEnergyValue('caloriesPer100g', product.caloriesPer100g)
    : parseEnergyValue('guaranteedAnalysis.kcalPer100g', product.guaranteedAnalysis?.kcalPer100g);
}

function dmb(product: Product, field: 'crudeProtein' | 'crudeFat' | 'crudeFiber'): ComputedThresholdValue {
  const ga = product.guaranteedAnalysis;
  const nutrient = parsePercentageValue(`guaranteedAnalysis.${field}`, ga?.[field]);
  const moisture = parsePercentageValue('guaranteedAnalysis.moisture', ga?.moisture, true);
  const value = comparableValue(nutrient);
  const moistureValue = comparableValue(moisture);
  return calculatedValue(
    value == null || moistureValue == null ? null : (value / (100 - moistureValue)) * 100,
    [nutrient, moisture],
  );
}

function percentToMgPer1000Kcal(product: Product, field: 'phosphorus' | 'calcium'): ComputedThresholdValue {
  const nutrient = parsePercentageValue(`guaranteedAnalysis.${field}`, product.guaranteedAnalysis?.[field]);
  const energy = caloriesPer100g(product);
  const value = comparableValue(nutrient);
  const kcal = comparableValue(energy);
  return calculatedValue(
    value == null || kcal == null || kcal <= 0 ? null : ((value * 1000) / kcal) * 1000,
    [nutrient, energy],
  );
}

function taurineWithUnverifiedInputUnit(product: Product): ComputedThresholdValue {
  const nutrient = parseUnitUnresolvedValue('guaranteedAnalysis.taurine', product.guaranteedAnalysis?.taurine);
  const energy = caloriesPer100g(product);
  return { value: null, valueKind: 'unknown', inputEvidence: [nutrient, energy] };
}

function sourceEvidence(threshold: Threshold, valueKind: EvidenceValueKind): MedicalThresholdEvidence {
  const range =
    threshold.direction === 'range'
      ? `${threshold.min}-${threshold.max}`
      : threshold.direction === 'min'
        ? `>=${threshold.min}`
        : `<=${threshold.max}`;
  return {
    source: threshold.source,
    issuingOrganization: threshold.issuingOrganization,
    documentTitle: threshold.documentTitle,
    sourceDateOrVersion: threshold.sourceDateOrVersion,
    sourceUrl: threshold.sourceUrl,
    location: threshold.location,
    species: threshold.species,
    lifeStage: threshold.lifeStage,
    productCategory: threshold.productCategory,
    productForm: threshold.productForm,
    concernDomain: threshold.concernDomain,
    scope: threshold.scope,
    nutrient: threshold.nutrient,
    unit: threshold.unit,
    basis: threshold.basis,
    thresholdOrRange: range,
    valueKind,
    evidenceStrength: threshold.evidenceStrength,
    classification: threshold.classification,
    judgmentEnabled: threshold.judgmentEnabled,
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
      productCategory: 'complete_food',
      concernDomain: 'general',
      scope: 'general_wellness',
      source: 'Internal exploratory label-comparison heuristic',
      issuingOrganization: 'VERORO',
      documentTitle: 'Health concern evaluator internal heuristic register',
      sourceDateOrVersion: '2026-09-03',
      location: 'digestive crude-fiber exploratory range',
      productForm: 'any',
      basis: 'dry_matter',
      classification: 'internal_heuristic',
      judgmentEnabled: false,
      evidenceStrength: 'low',
      limitations: '조섬유는 총식이섬유가 아니므로 소화기 적합성의 보조 비교로만 사용한다.',
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
      productCategory: 'complete_food',
      concernDomain: 'general',
      scope: 'general_wellness',
      source: 'Prior internal weight-management heuristic; not a WSAVA cutoff',
      issuingOrganization: 'VERORO',
      documentTitle: 'Health concern evaluator internal heuristic register',
      sourceDateOrVersion: '2026-09-03',
      sourceUrl: WSAVA_GUIDELINES_URL,
      location: 'No exact WSAVA section supports the fixed <=12% DMB cutoff',
      productForm: 'any',
      basis: 'dry_matter',
      classification: 'internal_heuristic',
      judgmentEnabled: false,
      evidenceStrength: 'low',
      limitations: '체중 관리는 BCS, 급여량, 열량, 활동량이 함께 필요하며 지방 수치 하나로 감량 처방을 만들 수 없다.',
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
      productCategory: 'complete_food',
      concernDomain: 'general',
      scope: 'general_wellness',
      source: 'Prior internal weight-management heuristic; not a WSAVA cutoff',
      issuingOrganization: 'VERORO',
      documentTitle: 'Health concern evaluator internal heuristic register',
      sourceDateOrVersion: '2026-09-03',
      sourceUrl: WSAVA_GUIDELINES_URL,
      location: 'No exact WSAVA section supports the fixed >=28% DMB cutoff',
      productForm: 'any',
      basis: 'dry_matter',
      classification: 'internal_heuristic',
      judgmentEnabled: false,
      evidenceStrength: 'low',
      limitations: '근육량과 개체 상태 평가 없이 체중 감량 효과를 단정하지 않는다.',
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
      productCategory: 'complete_food',
      concernDomain: 'renal',
      scope: 'diagnosed_disease',
      source: 'Prior renal heuristic with unverified universal cutoff attribution',
      issuingOrganization: 'VERORO',
      documentTitle: 'Health concern evaluator internal heuristic register',
      sourceDateOrVersion: '2026-09-03',
      location: 'Prior <=500 mg/1000 kcal rule; exact primary table not verified',
      productForm: 'any',
      basis: 'energy',
      classification: 'clinical',
      judgmentEnabled: false,
      evidenceStrength: 'medium',
      limitations: '일반 신장·비뇨기 관심사는 진단이 아니며, CKD 식이는 수의사 판단과 처방식 검토가 필요하다.',
      compute: (product) => percentToMgPer1000Kcal(product, 'phosphorus'),
    },
  ],
  heart: [
    {
      nutrient: '타우린',
      field: 'taurine',
      direction: 'min',
      min: 330,
      unit: 'mg/1000kcal',
      species: 'cat',
      lifeStage: 'adult',
      productCategory: 'complete_food',
      concernDomain: 'general',
      scope: 'healthy_animal',
      source: 'FEDIAF Nutritional Guidelines 2025',
      issuingOrganization: 'FEDIAF',
      documentTitle: 'Nutritional Guidelines for Complete and Complementary Pet Food for Cats and Dogs',
      sourceDateOrVersion: 'Publication September 2025',
      sourceUrl: FEDIAF_GUIDELINES_URL,
      location: 'Table III-4b, page 19, adult cat at MER 75 kcal/kg BW^0.67',
      productForm: 'dry',
      basis: 'energy',
      classification: 'normative',
      judgmentEnabled: false,
      evidenceStrength: 'medium',
      limitations: '입력 taurine 필드의 단위와 분석 provenance가 없어 비교를 비활성화했다. 완전사료 최소 권장량이며 심장질환 치료 근거가 아니다.',
      compute: taurineWithUnverifiedInputUnit,
    },
    {
      nutrient: '타우린',
      field: 'taurine',
      direction: 'min',
      min: 670,
      unit: 'mg/1000kcal',
      species: 'cat',
      lifeStage: 'adult',
      productCategory: 'complete_food',
      concernDomain: 'general',
      scope: 'healthy_animal',
      source: 'FEDIAF Nutritional Guidelines 2025',
      issuingOrganization: 'FEDIAF',
      documentTitle: 'Nutritional Guidelines for Complete and Complementary Pet Food for Cats and Dogs',
      sourceDateOrVersion: 'Publication September 2025',
      sourceUrl: FEDIAF_GUIDELINES_URL,
      location: 'Table III-4b, page 19, canned adult cat at MER 75 kcal/kg BW^0.67',
      productForm: 'wet',
      basis: 'energy',
      classification: 'normative',
      judgmentEnabled: false,
      evidenceStrength: 'medium',
      limitations: '입력 taurine 필드의 단위와 분석 provenance가 없어 비교를 비활성화했다. 완전사료 최소 권장량이며 심장질환 치료 근거가 아니다.',
      compute: taurineWithUnverifiedInputUnit,
    },
  ],
};

const FUNCTIONAL_INGREDIENTS: Record<HealthConcernId, readonly string[]> = {
  skin_coat: ['오메가3', '오메가-3', '연어오일', 'fish oil', 'salmon oil', '비오틴', '아연', 'zinc'],
  joint: ['글루코사민', '콘드로이틴', 'msm', '초록입홍합', 'green lipped mussel', 'epa', 'dha'],
  digestive: ['프로바이오틱스', '프리바이오틱스', '유산균', '이눌린', 'fos', 'prebiotic', 'probiotic'],
  weight: ['l-카르니틴', 'l카르니틴', 'carnitine'],
  renal_urinary: ['크랜베리', 'cranberry', '오메가3', '오메가-3', 'omega-3', 'omega 3'],
  heart: ['타우린', 'taurine', 'l-카르니틴', 'l카르니틴', 'carnitine', '코엔자임q10'],
  immune: ['비타민e', 'vitamin e', '아연', 'zinc', '셀레늄', 'selenium', '초유', 'colostrum'],
  eye: ['루테인', 'lutein', '타우린', 'taurine', '비타민a', 'vitamin a', 'dha'],
  oral: ['덴탈', '치석', '헥사메타인산', 'sodium hexametaphosphate', '녹차추출물'],
};

const RENAL_URINARY_INGREDIENT_DOMAINS: Record<string, HealthConcernEvidenceDomain> = {
  '크랜베리': 'lower_urinary',
  cranberry: 'lower_urinary',
  '오메가3': 'renal',
  '오메가-3': 'renal',
  'omega-3': 'renal',
  'omega 3': 'renal',
};

function evidenceTextMatches(value: string, needle: string): boolean {
  const hay = normalizeConcernToken(value).normalize('NFKC');
  const normalizedNeedle = normalizeConcernToken(needle).normalize('NFKC');
  if (/^[a-z0-9 -]+$/.test(normalizedNeedle)) {
    const escaped = normalizedNeedle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i').test(hay);
  }
  return hay.includes(normalizedNeedle);
}

function renalUrinaryDomain(value: string): HealthConcernEvidenceDomain {
  const normalized = normalizeConcernToken(value);
  if (['신장', 'kidney', 'renal'].includes(normalized)) return 'renal';
  if (['비뇨기', '요로', '방광', 'urinary', 'bladder'].includes(normalized)) return 'lower_urinary';
  return 'general';
}

function domainMatches(selected: HealthConcernEvidenceDomain, evidence: HealthConcernEvidenceDomain): boolean {
  return selected === 'general' || evidence === 'general' || selected === evidence;
}

function matchedTags(
  product: Product,
  concernId: HealthConcernId,
  selectedDomain: HealthConcernEvidenceDomain,
): string[] {
  return [
    ...new Set(
      (product.healthConcerns ?? []).filter((tag) => {
        if (resolveHealthConcernId(tag) !== concernId) return false;
        return concernId !== 'renal_urinary' || domainMatches(selectedDomain, renalUrinaryDomain(tag));
      }),
    ),
  ];
}

function matchedIngredients(
  product: Product,
  concernId: HealthConcernId,
  selectedDomain: HealthConcernEvidenceDomain,
): IngredientEvidenceMatch[] {
  const needles = FUNCTIONAL_INGREDIENTS[concernId];
  const matches: IngredientEvidenceMatch[] = [];
  const seen = new Set<string>();

  for (const ingredient of product.ingredients ?? []) {
    const displayName = ingredient.nameKo || ingredient.nameEn || ingredient.purpose;
    for (const matchedField of ['nameKo', 'nameEn', 'purpose'] as const) {
      const matchedValue = ingredient[matchedField];
      if (!matchedValue) continue;
      for (const matchedKeyword of needles) {
        if (!evidenceTextMatches(matchedValue, matchedKeyword)) continue;
        const evidenceDomain = concernId === 'renal_urinary'
          ? RENAL_URINARY_INGREDIENT_DOMAINS[matchedKeyword] ?? 'general'
          : 'general';
        if (!domainMatches(selectedDomain, evidenceDomain)) continue;
        const key = [displayName, matchedField, matchedValue, matchedKeyword, evidenceDomain].join('\u0000');
        if (seen.has(key)) continue;
        seen.add(key);
        matches.push({ displayName, matchedField, matchedValue, matchedKeyword, evidenceDomain });
      }
    }
  }

  return matches;
}

export function healthRuleAppliesToSpecies(ruleSpecies: Species, profileSpecies: Species): boolean {
  return ruleSpecies === 'all' || ruleSpecies === profileSpecies;
}

function productCategory(product: Product): ProductCategory {
  const values = [product.category, product.mainCategory, product.subCategory]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeConcernToken(value));
  if (values.some((value) => ['food', '사료', '주식', 'complete', 'complete food', 'complete_food'].includes(value))) {
    return 'complete_food';
  }
  if (values.some((value) => ['treat', 'snack', '간식'].includes(value))) return 'treat';
  if (values.some((value) => ['supplement', '영양제', '보충제'].includes(value))) return 'supplement';
  if (values.some((value) => ['topper', '토퍼'].includes(value))) return 'topper';
  return 'unknown';
}

function productForm(product: Product): ProductForm {
  const formulation = normalizeConcernToken(product.formulation ?? '');
  if (['dry', '건식'].includes(formulation)) return 'dry';
  if (['wet', '습식', '캔', 'canned'].includes(formulation)) return 'wet';
  return 'unknown';
}

function profileLifeStage(profile: UserPetProfile): 'growth' | 'adult' | 'senior' | 'unknown' {
  if (!Number.isFinite(profile.age) || profile.age < 0) return 'unknown';
  if (profile.age <= 1) return 'growth';
  if (profile.age >= 8) return 'senior';
  return 'adult';
}

function applicabilityReason(
  threshold: Threshold,
  product: Product,
  profile: UserPetProfile,
  selectedDomain: HealthConcernEvidenceDomain,
): { kind: NonNullable<QuantitativeConcernCheck['applicability']>; message: string } | null {
  if (!domainMatches(selectedDomain, threshold.concernDomain)) {
    return { kind: 'concern_domain', message: '선택한 건강 고민 영역과 다른 정량 기준이라 적용되지 않아요.' };
  }
  const species: Species = profile.species === 'Cat' ? 'cat' : 'dog';
  if (!healthRuleAppliesToSpecies(threshold.species, species)) {
    return {
      kind: 'species',
      message: `이 기준은 ${threshold.species === 'cat' ? '고양이' : '강아지'}용이라 현재 프로필에는 적용되지 않아요.`,
    };
  }
  if (product.targetPetType && product.targetPetType !== 'all' && product.targetPetType !== species) {
    return { kind: 'product_species', message: '제품 대상 동물과 프로필 종이 달라 이 기준을 적용할 수 없어요.' };
  }
  if (threshold.lifeStage !== 'all' && threshold.lifeStage !== profileLifeStage(profile)) {
    return { kind: 'life_stage', message: '현재 생애주기에는 이 기준이 적용되지 않아요.' };
  }
  if (productCategory(product) !== threshold.productCategory) {
    return { kind: 'product_type', message: '완전사료용 영양 기준을 이 제품 유형에 적용할 수 없어요.' };
  }
  if (threshold.productForm !== 'any' && productForm(product) !== threshold.productForm) {
    return { kind: 'product_form', message: '제품 형태 정보가 이 기준과 맞지 않아 적용할 수 없어요.' };
  }
  return null;
}

function evaluateThreshold(
  threshold: Threshold,
  product: Product,
  profile: UserPetProfile,
  selectedDomain: HealthConcernEvidenceDomain,
): QuantitativeConcernCheck {
  const notApplicableReason = applicabilityReason(threshold, product, profile, selectedDomain);
  if (notApplicableReason) {
    return {
      nutrient: threshold.nutrient,
      status: 'not_applicable',
      unit: threshold.unit,
      valueKind: 'unknown',
      applicability: notApplicableReason.kind,
      concernDomain: threshold.concernDomain,
      judgment: threshold.judgmentEnabled ? 'active' : 'informational',
      inputEvidence: [],
      evidence: sourceEvidence(threshold, 'unknown'),
      message: notApplicableReason.message,
    };
  }
  const computed = threshold.compute(product);
  const evidence = sourceEvidence(threshold, computed.valueKind);
  if (computed.value == null) {
    return {
      nutrient: threshold.nutrient,
      status: 'unknown',
      unit: threshold.unit,
      valueKind: 'unknown',
      concernDomain: threshold.concernDomain,
      judgment: threshold.judgmentEnabled ? 'active' : 'informational',
      inputEvidence: computed.inputEvidence,
      evidence,
      message: `${threshold.nutrient} 수치가 공개되어 있지 않아 비교할 수 없어요.`,
    };
  }

  const pass =
    threshold.direction === 'range'
      ? computed.value >= (threshold.min ?? Number.NEGATIVE_INFINITY) && computed.value <= (threshold.max ?? Number.POSITIVE_INFINITY)
      : threshold.direction === 'min'
        ? computed.value >= (threshold.min ?? Number.POSITIVE_INFINITY)
        : computed.value <= (threshold.max ?? Number.NEGATIVE_INFINITY);

  return {
    nutrient: threshold.nutrient,
    status: pass ? 'pass' : 'fail',
    actualValue: computed.value,
    unit: threshold.unit,
    valueKind: computed.valueKind,
    concernDomain: threshold.concernDomain,
    judgment: threshold.judgmentEnabled ? 'active' : 'informational',
    inputEvidence: computed.inputEvidence,
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
  selectedDomain: HealthConcernEvidenceDomain,
): { status: ConcernStatus; evidenceLevel: ConcernEvidenceLevel; facts: string[]; confidence: DataConfidence } {
  const facts: string[] = [];
  const judgmentChecks = checks.filter((check) => check.judgment === 'active');
  const failed = judgmentChecks.filter((check) => check.status === 'fail');
  const passed = judgmentChecks.filter((check) => check.status === 'pass');
  const unknown = judgmentChecks.filter((check) => check.status === 'unknown');
  const blockingApplicability = checks.filter(
    (check) => check.status === 'not_applicable' && !['species', 'concern_domain'].includes(check.applicability ?? ''),
  );

  if (checks.length > 0 && checks.every((check) => check.status === 'not_applicable') && blockingApplicability.length > 0) {
    facts.push('현재 프로필이나 제품 유형에는 이 정량 기준이 적용되지 않아요.');
    return { status: 'not_applicable', evidenceLevel: 'not_applicable', facts, confidence: 'insufficient' };
  }

  if (failed.length > 0) {
    facts.push('공개된 수치가 비교 기준을 벗어나 있어 급여 전 확인이 필요해요.');
    return { status: 'not_supported', evidenceLevel: 'contradictory', facts, confidence: 'sufficient' };
  }

  if (passed.length > 0 && unknown.length === 0 && !(concernId === 'renal_urinary' && selectedDomain === 'general')) {
    facts.push('공개된 라벨 수치가 내부 비교 기준 범위에 있어요.');
    return { status: 'supported', evidenceLevel: 'validated_quantitative', facts, confidence: 'sufficient' };
  }

  if (passed.length > 0 && unknown.length > 0) {
    facts.push('일부 수치는 비교할 수 있지만 필요한 정보가 모두 공개되지는 않았어요.');
    return { status: 'possible', evidenceLevel: 'partial_quantitative', facts, confidence: 'partial' };
  }

  if (passed.length > 0) {
    facts.push('신장 관련 수치는 비교되었지만 비뇨기 전체 적합성을 확인하는 근거는 아니에요.');
    return { status: 'possible', evidenceLevel: 'partial_quantitative', facts, confidence: 'partial' };
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

function concernSelections(inputs: readonly string[]): Array<{
  concernId: HealthConcernId;
  originalProfileLabel: string;
  selectedDomain: HealthConcernEvidenceDomain;
}> {
  const seen = new Set<HealthConcernId>();
  const selections: Array<{
    concernId: HealthConcernId;
    originalProfileLabel: string;
    selectedDomain: HealthConcernEvidenceDomain;
  }> = [];
  for (const input of inputs) {
    const concernId = resolveHealthConcernId(input);
    if (!concernId || seen.has(concernId)) continue;
    seen.add(concernId);
    selections.push({
      concernId,
      originalProfileLabel: input,
      selectedDomain: concernId === 'renal_urinary' ? renalUrinaryDomain(input) : 'general',
    });
  }
  return selections;
}

export function evaluateHealthConcernsDetailed(
  product: Product,
  profile: UserPetProfile,
): HealthConcernEvaluationReport {
  const canonical = concernSelections(profile.healthConcerns);
  const unrecognizedProfileInputs = profile.healthConcerns.filter((input) => resolveHealthConcernId(input) == null);
  if (canonical.length === 0) return { results: [], unrecognizedProfileInputs };
  const share = 20 / canonical.length;

  const results = canonical.map(({ concernId, originalProfileLabel, selectedDomain }) => {
    const tags = matchedTags(product, concernId, selectedDomain);
    const ingredientMatches = matchedIngredients(product, concernId, selectedDomain);
    const ingredients = [...new Set(ingredientMatches.map((match) => match.displayName))];
    const quantitativeChecks = (THRESHOLDS[concernId] ?? []).map((threshold) =>
      evaluateThreshold(threshold, product, profile, selectedDomain),
    );
    const state = deriveStatus(concernId, quantitativeChecks, tags, ingredients, selectedDomain);
    const missingRequiredFields = quantitativeChecks
      .filter((check) => check.judgment === 'active' && check.status === 'unknown')
      .map((check) => check.nutrient);
    const cautionReasons = quantitativeChecks
      .filter((check) => check.judgment === 'active' && check.status === 'fail')
      .map((check) => check.message);
    const scoringContribution = Math.round(share * evidenceFactor(state.status, state.evidenceLevel) * 100) / 100;

    return {
      concernId,
      originalProfileLabel,
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
      evidenceDomains: [...new Set([
        ...tags.map((tag) => concernId === 'renal_urinary' ? renalUrinaryDomain(tag) : 'general' as const),
        ...ingredientMatches.map((match) => match.evidenceDomain),
        ...quantitativeChecks
          .filter((check) => check.status === 'pass' || check.status === 'fail')
          .map((check) => check.concernDomain),
      ])],
    };
  });
  return { results, unrecognizedProfileInputs };
}

export function evaluateHealthConcerns(product: Product, profile: UserPetProfile): HealthConcernEvaluationResult[] {
  return evaluateHealthConcernsDetailed(product, profile).results;
}
