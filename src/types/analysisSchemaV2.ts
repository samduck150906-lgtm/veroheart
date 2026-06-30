/**
 * Phase 1 — 통합 분석 엔진 v2 스키마 타입 (순수 타입 정의).
 *
 * ⚠️ 이 파일은 "타입 선언만" 포함한다. 런타임 코드/기존 모듈을 import 하지 않으며,
 *    어떤 화면 동작도 바꾸지 않는다. (Phase 1: 비파괴 추가)
 *
 * 대응 마이그레이션: supabase/migrations_phase1_pending/01~06
 */

// ── 공통 어휘 ────────────────────────────────────────────────────────────────
export type SpeciesRisk = 'unknown' | 'safe' | 'caution' | 'danger';

export type RelationType =
  | 'same_ingredient'
  | 'protein_derivative'
  | 'meal'
  | 'broth'
  | 'fat_derivative'
  | 'oil'
  | 'extract'
  | 'flavor'
  | 'possible_trace'
  | 'unknown_derivative';

export type InferenceStatus =
  | 'auto_suggested'
  | 'manually_reviewed'
  | 'expert_reviewed'
  | 'rejected';

export type AllergenConfidence = 'exact' | 'derived' | 'trace';

export type EvidenceLevel =
  | 'regulatory'
  | 'veterinary'
  | 'nutrition_guideline'
  | 'internal_policy';

// ── DB 행 타입 (snake_case 그대로; 매핑은 별도 어댑터에서) ──────────────────────
/** public.ingredients (Phase 1 확장 컬럼 포함) */
export interface IngredientRowV2 {
  id: string;
  name_ko: string;
  name_en: string | null;
  /** 기존 단일 위험도(보존). 신규 판정엔 dog_risk/cat_risk 사용 */
  risk_level: 'safe' | 'caution' | 'danger';
  legacy_risk_level: string | null;
  description: string | null;
  caution_conditions: string[] | null;
  allergy_triggers: string[] | null;

  canonical_name_ko: string | null;
  canonical_name_en: string | null;
  category: string | null;
  source_group: string | null;     // 예: 'chicken'
  ingredient_form: string | null;   // 예: 'muscle' | 'fat' | 'meal' | 'broth' | ...
  dog_risk: SpeciesRisk;
  cat_risk: SpeciesRisk;
  allergen_tags: string[];
  nutrition_tags: string[];
  risk_tags: string[];
  default_severity: SpeciesRisk;
  evidence_level: EvidenceLevel | null;
  review_status: string;            // 'draft' | 'verified' | ...
  inference_status: InferenceStatus;
  is_canonical: boolean;
  merged_into: string | null;
  updated_at: string;
}

/** public.ingredient_aliases */
export interface IngredientAliasRow {
  id: string;
  ingredient_id: string;
  raw_alias: string;
  normalized_alias: string;
  language: string;
  relation_type: RelationType;
  match_priority: number;
  review_status: InferenceStatus;
  source_synonym_id: string | null;
}

/** public.sources */
export interface SourceRow {
  id: string;
  organization: string | null;
  document_title: string | null;
  url: string | null;
  doi: string | null;
  source_type:
    | 'regulation' | 'guideline' | 'peer_reviewed'
    | 'textbook' | 'clinical' | 'internal' | null;
  published_at: string | null;
  accessed_at: string | null;
  trust_grade: 'A' | 'B' | 'C' | null;
  applies_species: 'dog' | 'cat' | 'both' | null;
  applies_conditions: string[] | null;
  review_status: string;
}

export interface IngredientSourceRow {
  ingredient_id: string;
  source_id: string;
  note: string | null;
}

export interface RuleSourceRow {
  rule_id: string;
  source_id: string;
  note: string | null;
}

/** public.engine_versions */
export interface EngineVersionRow {
  kind: 'ingredient_db' | 'rule' | 'scoring';
  version: string;
  updated_at: string;
}

/** public.ingredient_allergen_map (Phase 1 확장) */
export interface IngredientAllergenMapRow {
  ingredient_id: string;
  allergen_id: string;
  confidence: AllergenConfidence;
  relation_type: RelationType | null;
  source_id: string | null;
  review_status: InferenceStatus;
}

/** public.product_ingredient_inputs (원문 보존) */
export interface ProductIngredientInputRow {
  id: string;
  product_id: string;
  raw_ingredient_name: string;
  normalized_input: string | null;
  canonical_ingredient_id: string | null;
  display_order: number;
  source_text: string | null;
  match_type: 'legacy_link' | 'exact' | 'alias' | 'fuzzy' | 'unmatched';
  match_confidence: number | null;
  review_status: InferenceStatus;
  legacy_ingredient_id: string | null;
}

// ── 통합 결과 객체 (설계서 3장) ──────────────────────────────────────────────
export type Verdict =
  | 'SUITABLE' | 'CAUTION' | 'NOT_RECOMMENDED' | 'INSUFFICIENT_DATA';

export interface NormalizedIngredient {
  rawName: string;
  normalized: string;
  ingredientId: string | null;
  canonicalNameKo: string | null;
  sourceGroup: string | null;
  ingredientForm: string | null;
  relationType: RelationType | null;
  position: number;
  allergenTags: string[];
  matchConfidence: number;
}

export interface AnalysisFinding {
  code: string;
  level: 'danger' | 'caution' | 'watch' | 'good' | 'info';
  title: string;
  message: string;
  ingredients: string[];
  scoreDelta: number;
  evidenceLevel: EvidenceLevel;
  sourceIds: string[];
}

export interface UnknownIngredient {
  rawName: string;
  normalized: string;
  loggedToQueue: boolean;
}

export interface UnifiedAnalysisResult {
  verdict: Verdict;
  suitabilityScore: number | null;
  analysisConfidence: number;

  normalizedIngredients: NormalizedIngredient[];
  conflicts: AnalysisFinding[];
  warnings: AnalysisFinding[];
  positives: AnalysisFinding[];
  unknownIngredients: UnknownIngredient[];

  reasonCodes: string[];
  sourceIds: string[];

  ingredientDbVersion: string;
  ruleVersion: string;
  scoringVersion: string;
}

/** 적합도와 분리되는 비-판정 지표 (랭킹 전용; 적합도 화면 노출 금지) */
export interface ProductRankingScore {
  suitability: number | null;
  productTrust: number;
  popularity: number;
  value: number;
  composite: number;
}
