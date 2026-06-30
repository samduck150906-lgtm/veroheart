export type IsoDate = string;
export type IsoTimestamp = string;
export type Uuid = string;

export type RecordStatus = 'draft' | 'active' | 'retired';
export type EngineVersionStatus = RecordStatus;
export type PetSpecies = 'dog' | 'cat' | 'both' | 'other';
export type RuleSpecies = Exclude<PetSpecies, 'other'>;
export type RuleTargetScope = 'ingredient' | 'product' | 'profile';
export type IngredientAliasType =
  | 'label'
  | 'scientific'
  | 'english'
  | 'abbreviation'
  | 'ocr'
  | 'other';
export type EvidenceSourceType =
  | 'paper'
  | 'institution'
  | 'regulation'
  | 'textbook'
  | 'website'
  | 'internal_review'
  | 'other';
export type LabelSourceType =
  | 'manual'
  | 'manufacturer'
  | 'package_image'
  | 'import'
  | 'other';
export type IngredientMatchStatus =
  | 'unreviewed'
  | 'matched'
  | 'ambiguous'
  | 'unmatched'
  | 'ignored';
export type AllergenRelationshipType =
  | 'contains'
  | 'derived_from'
  | 'may_contain'
  | 'cross_contact';
export type MappingConfidence = 'exact' | 'derived' | 'reviewed' | 'suspected';
export type IngredientReviewStatus = 'pending' | 'in_review' | 'resolved' | 'rejected';

export type JsonObject = Record<string, unknown>;

export type AnalysisEngineVersionRow = {
  id: Uuid;
  version: string;
  status: EngineVersionStatus;
  description: string | null;
  ruleset_checksum: string | null;
  released_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type CanonicalIngredientRow = {
  id: Uuid;
  canonical_name_ko: string;
  canonical_name_en: string | null;
  normalized_key: string;
  category: string | null;
  description: string | null;
  status: RecordStatus;
  legacy_ingredient_id: Uuid | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type CanonicalIngredientAliasRow = {
  id: Uuid;
  canonical_ingredient_id: Uuid;
  alias_text: string;
  normalized_alias: string;
  language_code: string;
  alias_type: IngredientAliasType;
  is_preferred: boolean;
  created_at: IsoTimestamp;
};

export type IngredientEvidenceSourceRow = {
  id: Uuid;
  source_type: EvidenceSourceType;
  title: string;
  organization: string | null;
  authors: string[];
  publication_date: IsoDate | null;
  url: string | null;
  doi: string | null;
  citation: string | null;
  accessed_at: IsoDate | null;
  metadata: JsonObject;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type CanonicalIngredientEvidenceRow = {
  id: Uuid;
  canonical_ingredient_id: Uuid;
  source_id: Uuid;
  claim_type: string;
  species: PetSpecies;
  evidence_level: string | null;
  claim_summary: string;
  locator: string | null;
  reviewed_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
};

export type CanonicalAnalysisRuleRow = {
  id: Uuid;
  rule_key: string;
  engine_version_id: Uuid;
  canonical_ingredient_id: Uuid | null;
  target_scope: RuleTargetScope;
  species: RuleSpecies;
  condition: JsonObject;
  severity: string;
  score_delta: number;
  title: string;
  message_template: string;
  evidence_level: string | null;
  is_active: boolean;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type CanonicalAnalysisRuleEvidenceRow = {
  rule_id: Uuid;
  source_id: Uuid;
  note: string | null;
  created_at: IsoTimestamp;
};

export type ProductIngredientLabelSetRow = {
  id: Uuid;
  product_id: Uuid;
  raw_label_text: string;
  source_type: LabelSourceType;
  source_reference: string | null;
  label_language: string;
  is_current: boolean;
  captured_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type ProductIngredientLabelItemRow = {
  id: Uuid;
  label_set_id: Uuid;
  display_order: number;
  raw_ingredient_text: string;
  normalized_ingredient_text: string | null;
  amount_text: string | null;
  percentage: number | null;
  legacy_ingredient_id: Uuid | null;
  canonical_ingredient_id: Uuid | null;
  match_status: IngredientMatchStatus;
  match_confidence: number | null;
  parser_metadata: JsonObject;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};

export type CanonicalIngredientAllergenMapRow = {
  canonical_ingredient_id: Uuid;
  allergen_id: Uuid;
  relationship_type: AllergenRelationshipType;
  confidence: MappingConfidence;
  source_id: Uuid | null;
  created_at: IsoTimestamp;
};

export type CanonicalIngredientReviewQueueRow = {
  id: Uuid;
  label_item_id: Uuid | null;
  submitted_text: string;
  normalized_text: string | null;
  status: IngredientReviewStatus;
  candidate_ingredient_ids: Uuid[];
  resolution_ingredient_id: Uuid | null;
  resolution_note: string | null;
  occurrence_count: number;
  first_seen_at: IsoTimestamp;
  last_seen_at: IsoTimestamp;
  resolved_at: IsoTimestamp | null;
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
};
