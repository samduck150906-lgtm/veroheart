export const HEALTH_CONCERN_IDS = [
  'skin_coat',
  'joint',
  'digestive',
  'weight',
  'renal_urinary',
  'heart',
  'immune',
  'eye',
  'oral',
] as const;

export type HealthConcernId = (typeof HEALTH_CONCERN_IDS)[number];

export type ConcernStatus =
  | 'supported'
  | 'possible'
  | 'tag_only'
  | 'not_supported'
  | 'unknown'
  | 'not_applicable';

export type ConcernEvidenceLevel =
  | 'validated_quantitative'
  | 'tag_and_ingredient_quantity_unknown'
  | 'tag_only'
  | 'ingredient_only_quantity_unknown'
  | 'missing'
  | 'contradictory'
  | 'not_applicable';

export type DataConfidence = 'sufficient' | 'partial' | 'insufficient';

export type RecommendationEligibility =
  | 'eligible'
  | 'limited'
  | 'blocked'
  | 'unknown';

export type EvidenceValueKind = 'measured' | 'label_declared' | 'calculated' | 'estimated' | 'unknown';

export type DeclaredValueQualifier = 'exact' | 'lt' | 'lte' | 'gt' | 'gte' | 'unavailable';

export interface QuantitativeInputEvidence {
  field: string;
  rawValue: unknown;
  parsedValue?: number;
  qualifier: DeclaredValueQualifier;
  valueKind: 'label_declared' | 'unknown';
}

export interface MedicalThresholdEvidence {
  source: string;
  sourceDateOrVersion: string;
  species: 'dog' | 'cat' | 'all';
  lifeStage: string;
  scope: 'healthy_animal' | 'diagnosed_disease' | 'general_wellness';
  nutrient: string;
  unit: string;
  thresholdOrRange: string;
  valueKind: EvidenceValueKind;
  evidenceStrength: 'high' | 'medium' | 'low';
  limitations: string;
}

export interface QuantitativeConcernCheck {
  nutrient: string;
  status: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  actualValue?: number;
  unit?: string;
  valueKind: EvidenceValueKind;
  inputEvidence: QuantitativeInputEvidence[];
  evidence?: MedicalThresholdEvidence;
  message: string;
}

export interface HealthConcernEvaluationResult {
  concernId: HealthConcernId;
  originalProfileLabel: string;
  status: ConcernStatus;
  evidenceLevel: ConcernEvidenceLevel;
  matchedProductTags: string[];
  matchedIngredientEvidence: string[];
  quantitativeChecks: QuantitativeConcernCheck[];
  missingRequiredFields: string[];
  cautionReasons: string[];
  userFacingFacts: string[];
  confidence: DataConfidence;
  scoringContribution: number;
  sourceReferences: MedicalThresholdEvidence[];
}

export interface HealthConcernDefinition {
  id: HealthConcernId;
  label: string;
  aliases: readonly string[];
  legacyDiseaseIds: readonly string[];
  medicallySensitive: boolean;
}

export const HEALTH_CONCERN_DEFINITIONS: Record<HealthConcernId, HealthConcernDefinition> = {
  skin_coat: {
    id: 'skin_coat',
    label: '피부·모질',
    aliases: ['피부·모질', '피부', '모질', '피모', 'skin', 'coat', 'skin coat'],
    legacyDiseaseIds: ['skin'],
    medicallySensitive: false,
  },
  joint: {
    id: 'joint',
    label: '관절',
    aliases: ['관절', 'joint', 'arthritis', 'glucosamine', 'chondroitin'],
    legacyDiseaseIds: ['joint'],
    medicallySensitive: false,
  },
  digestive: {
    id: 'digestive',
    label: '소화기',
    aliases: ['소화기', '소화', '장 건강', '장건강', '위장', 'gut', 'digestive', 'digestion', 'stomach'],
    legacyDiseaseIds: ['gut'],
    medicallySensitive: false,
  },
  weight: {
    id: 'weight',
    label: '비만·다이어트',
    aliases: ['비만·다이어트', '비만', '다이어트', '체중', '체중 관리', '체중관리', 'weight', 'obesity', 'diet'],
    legacyDiseaseIds: ['weight'],
    medicallySensitive: false,
  },
  renal_urinary: {
    id: 'renal_urinary',
    label: '신장·비뇨기',
    aliases: ['신장·비뇨기', '신장', '비뇨기', '요로', '방광', 'kidney', 'renal', 'urinary', 'bladder'],
    legacyDiseaseIds: ['kidney'],
    medicallySensitive: true,
  },
  heart: {
    id: 'heart',
    label: '심장',
    aliases: ['심장', 'heart', 'cardiac'],
    legacyDiseaseIds: ['heart'],
    medicallySensitive: true,
  },
  immune: {
    id: 'immune',
    label: '면역',
    aliases: ['면역', '면역 기능', '면역기능', 'immune', 'immunity'],
    legacyDiseaseIds: [],
    medicallySensitive: false,
  },
  eye: {
    id: 'eye',
    label: '눈',
    aliases: ['눈', '눈 건강', '눈건강', '안구', '시력', 'eye', 'vision', 'ocular'],
    legacyDiseaseIds: ['eye'],
    medicallySensitive: false,
  },
  oral: {
    id: 'oral',
    label: '구강',
    aliases: ['구강', '구강 건강', '구강건강', '치아', '치석', 'dental', 'teeth', 'oral'],
    legacyDiseaseIds: ['dental'],
    medicallySensitive: false,
  },
};

export const HEALTH_CONCERN_OPTIONS = HEALTH_CONCERN_IDS.map((id) => HEALTH_CONCERN_DEFINITIONS[id].label);

export function normalizeConcernToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[ㆍ・]/g, '·')
    .replace(/\s+/g, ' ');
}

const ALIAS_TO_CONCERN_ID = new Map<string, HealthConcernId>(
  HEALTH_CONCERN_IDS.flatMap((id) =>
    HEALTH_CONCERN_DEFINITIONS[id].aliases.map((alias) => [normalizeConcernToken(alias), id] as const),
  ),
);

export function resolveHealthConcernId(input: string): HealthConcernId | null {
  return ALIAS_TO_CONCERN_ID.get(normalizeConcernToken(input)) ?? null;
}

export function getConcernAliases(id: HealthConcernId): string[] {
  return [...HEALTH_CONCERN_DEFINITIONS[id].aliases];
}

export function canonicalizeHealthConcerns(inputs: readonly string[] | undefined): HealthConcernId[] {
  const out: HealthConcernId[] = [];
  const seen = new Set<HealthConcernId>();
  for (const input of inputs ?? []) {
    const id = resolveHealthConcernId(input);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function healthConcernLabelsFromIds(ids: readonly HealthConcernId[]): string[] {
  return ids.map((id) => HEALTH_CONCERN_DEFINITIONS[id].label);
}
