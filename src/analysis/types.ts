/**
 * 베로로(Veroro) 분석 엔진 — 공통 타입 정의
 *
 * 설계 원칙: "AI가 임의로 판단"하지 않는다.
 *   라벨 → 성분 사전 매칭 → 규칙 엔진 판단 → 점수 계산 → (마지막에) 설명 생성
 * 이 파일은 규칙 엔진/성분 사전 계층의 단일 타입 소스다.
 */

export type Species = 'dog' | 'cat' | 'both';

export type ProductType = 'complete_food' | 'treat' | 'supplement' | 'unknown';

export type LifeStage =
  | 'puppy_kitten'
  | 'adult'
  | 'senior'
  | 'all_life_stages'
  | 'unknown';

/** 성분 사전의 카테고리(분류) */
export type IngredientCategory =
  | 'animal_protein'
  | 'processed_protein'
  | 'animal_fat'
  | 'carbohydrate'
  | 'legume'
  | 'vegetable'
  | 'fruit'
  | 'oil'
  | 'additive'
  | 'preservative'
  | 'vitamin_mineral'
  | 'probiotic'
  | 'sweetener'
  | 'unknown';

/** 위험도 4단계: 안전 < 관찰 < 주의 < 위험 */
export type Severity = 'safe' | 'watch' | 'caution' | 'danger';

/** 점수에 영향을 주는 판정 레벨 */
export type FindingLevel = 'good' | 'info' | 'watch' | 'caution' | 'danger';

/** 근거 수준 — 법적 리스크 관리 및 추후 수의/영양 감수 데이터 부착용 */
export type EvidenceLevel =
  | 'regulatory'
  | 'veterinary'
  | 'nutrition_guideline'
  | 'internal_policy';

/** 성분 사전 1건 (canonical 성분) */
export interface DictionaryIngredient {
  id: string;
  canonicalKo: string;
  canonicalEn?: string;
  /** 정규화 전 표기 변형들. 매칭은 normalize 후 비교한다. */
  aliases: string[];
  category: IngredientCategory;
  animalSource?:
    | 'chicken'
    | 'beef'
    | 'pork'
    | 'duck'
    | 'salmon'
    | 'lamb'
    | 'turkey'
    | 'fish'
    | 'egg'
    | 'unknown';
  /** 알레르기 태그 (개인화 필터와 매칭) 예: ["chicken","grain"] */
  allergenTags: string[];
  /** 영양 태그 예: ["protein","omega3","fiber","taurine"] */
  nutritionTags: string[];
  /** 위험 태그 예: ["toxic_dog","toxic_cat","controversial","high_sugar"] */
  riskTags: string[];
  defaultSeverity: Severity;
  explanation: string;
}

/** 라벨에서 토큰화·표준화를 거쳐 사전에 매칭된 성분 1건 */
export interface MatchedIngredient {
  /** 라벨 원문 표기 */
  originalName: string;
  /** 원료 목록상의 순위(1부터). 앞순위일수록 비중이 높을 가능성. */
  position: number;
  /** 함량(%) — 있으면 저장, 없으면 null */
  percent: number | null;
  /** 함량 기준 (배합기준/건물기준/unknown) */
  percentBasis: string | null;
  /** 사전 매칭 결과 (못 찾으면 null) */
  ingredient: DictionaryIngredient | null;
  /** 매칭 신뢰도 0~1 */
  confidence: number;
}

/** 개인화 입력 — 반려동물 프로필 */
export interface PetProfile {
  species: 'dog' | 'cat';
  ageMonths?: number;
  lifeStage?: 'puppy_kitten' | 'adult' | 'senior';
  /** 알레르기 태그. allergenTags와 동일 어휘를 사용한다. */
  allergies: string[];
  /** 질병 태그 예: ["kidney","pancreatitis","obesity"] */
  diseases?: string[];
  name?: string;
}

/** 보증성분 / 등록성분량 (as-fed %) */
export interface GuaranteedAnalysis {
  crudeProtein?: number;
  crudeFat?: number;
  crudeFiber?: number;
  crudeAsh?: number;
  moisture?: number;
  calcium?: number;
  phosphorus?: number;
  taurine?: number;
  zinc?: number;
  vitaminA?: number;
  kcalPer100g?: number;
}

/** 분석 입력 제품 */
export interface ProductForAnalysis {
  id?: string;
  brand?: string;
  name?: string;
  species: Species;
  productType: ProductType;
  lifeStage?: LifeStage;
  /** 이미 토큰화된 성분 배열(라벨 파서 출력). rawIngredients와 둘 중 하나는 필요. */
  matchedIngredients?: MatchedIngredient[];
  guaranteedAnalysis?: GuaranteedAnalysis;
}

/** 규칙 정의 — 코드/DB 어디서든 같은 형태로 평가 가능 */
export interface AnalysisRule {
  id: string;
  target: 'ingredient' | 'product' | 'nutrition' | 'claim' | 'profile';
  species?: Species;
  condition: RuleCondition;
  severity: FindingLevel;
  scoreDelta: number;
  title: string;
  messageTemplate: string;
  evidenceLevel: EvidenceLevel;
}

/** 규칙 조건 — 선언적으로 평가된다. */
export interface RuleCondition {
  /** 특정 canonical 성분(또는 alias)이 존재 */
  hasIngredient?: string;
  /** 나열된 성분 중 하나라도 존재 */
  hasAnyIngredient?: string[];
  /** 특정 카테고리 성분 존재 */
  hasCategory?: IngredientCategory;
  /** 특정 위험 태그 존재 */
  hasRiskTag?: string;
  /** 제1원료의 카테고리가 일치 */
  firstIngredientCategory?: IngredientCategory;
}

/** 엔진이 만들어내는 개별 판정 */
export interface Finding {
  ruleId: string;
  level: FindingLevel;
  title: string;
  message: string;
  /** 관련 성분명(있으면) */
  ingredients?: string[];
  scoreDelta: number;
  evidenceLevel: EvidenceLevel;
}

export type Grade = 'A+' | 'A' | 'B+' | 'B' | 'C' | '주의';

/** 점수 구성요소 (0~100) */
export interface ScoreBreakdown {
  safety: number;
  nutritionFit: number;
  ingredientQuality: number;
  transparency: number;
  feedingGuide?: number;
}

/** 앱 화면 카드용 구조 */
export interface AnalysisSection {
  title: string;
  items: {
    label: string;
    level: FindingLevel;
    description: string;
  }[];
}

/** 규칙 엔진 최종 출력 (LLM 설명 생성 이전의 "사실" 결과) */
export interface RuleEngineResult {
  productId?: string;
  score: number;
  grade: Grade;
  breakdown: ScoreBreakdown;
  summary: string;
  matchedIngredients: MatchedIngredient[];
  positives: Finding[];
  warnings: Finding[];
  /** 사전 미매칭 원료명 — 관리자 검수 큐로 보낼 후보 */
  unknowns: string[];
  transparencyNotes: string[];
  sections: AnalysisSection[];
  disclaimer: string;
}
