export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RuleDirection = 'min' | 'max';
/** 저장 형태: mg/kg 수치, % → mg/kg 환산, % 직접 비교 */
export type NutrientStorage = 'mg_per_kg' | 'percent_to_mg_kg' | 'percent_direct';

export interface NutritionRule {
  id: string;
  label: string;
  /** GuaranteedAnalysis 키 이름 */
  nutrientKey: string;
  storedAs: NutrientStorage;
  direction: RuleDirection;
  /** 비교 임계값 (displayUnit 기준) */
  threshold: number;
  displayUnit: string;
  confidence: ConfidenceLevel;
}

/** 견종 → 취약 질환 매핑 (견종명 부분 일치) */
export const BREED_CONDITION_MAP: Record<string, string[]> = {
  '골든리트리버': ['관절', '피부', '심장', '체중관리'],
  '래브라도': ['관절', '체중관리', '피부'],
  '리트리버': ['관절', '피부', '심장', '체중관리'],
  '보더콜리': ['관절', '피부'],
  '허스키': ['관절', '피부', '심장'],
  '불독': ['관절', '체중관리', '피부'],
  '비글': ['관절', '체중관리'],
  '닥스훈트': ['관절', '체중관리'],
  '코기': ['관절', '체중관리'],
};

/** 견종별 기본 처방 설명 */
export const BREED_PRESCRIPTION: Record<string, string> = {
  '골든리트리버': '글루코사민과 EPA/DHA 강화 추천',
  '래브라도': '관절 보조 및 체중 관리 우선',
  '리트리버': '글루코사민과 EPA/DHA 강화 추천',
  '보더콜리': '관절 보조 및 피부·코트 영양 강화',
  '허스키': '관절 지지와 심장·피부 영양 균형',
  '불독': '체중 관리와 피부 보호 우선',
  '비글': '체중 관리와 관절 보조 중점',
  '닥스훈트': '척추·관절 보조 및 체중 관리',
  '코기': '관절 보조 및 적정 체중 유지',
};

/** 질환별 정량 영양 규칙 */
export const CONDITION_RULES: Record<string, NutritionRule[]> = {
  '관절': [
    {
      id: 'glucosamine',
      label: '글루코사민',
      nutrientKey: 'glucosamineMgKg',
      storedAs: 'mg_per_kg',
      direction: 'min',
      threshold: 70,
      displayUnit: 'mg/1000kcal',
      confidence: 'medium',
    },
    {
      id: 'chondroitin',
      label: '콘드로이틴',
      nutrientKey: 'chondroitinMgKg',
      storedAs: 'mg_per_kg',
      direction: 'min',
      threshold: 50,
      displayUnit: 'mg/1000kcal',
      confidence: 'medium',
    },
    {
      id: 'epa_dha',
      label: 'EPA+DHA',
      nutrientKey: 'epaDhaPercent',
      storedAs: 'percent_to_mg_kg',
      direction: 'min',
      threshold: 150,
      displayUnit: 'mg/1000kcal',
      confidence: 'high',
    },
    {
      id: 'msm',
      label: 'MSM',
      nutrientKey: 'msmMgKg',
      storedAs: 'mg_per_kg',
      direction: 'min',
      threshold: 30,
      displayUnit: 'mg/1000kcal',
      confidence: 'medium',
    },
  ],
  '심장': [
    {
      id: 'sodium',
      label: '나트륨',
      nutrientKey: 'sodiumMgKg',
      storedAs: 'mg_per_kg',
      direction: 'max',
      threshold: 250,
      displayUnit: 'mg/1000kcal',
      confidence: 'high',
    },
    {
      id: 'taurine',
      label: '타우린',
      nutrientKey: 'taurineMgKg',
      storedAs: 'mg_per_kg',
      direction: 'min',
      threshold: 100,
      displayUnit: 'mg/1000kcal',
      confidence: 'high',
    },
    {
      id: 'lcarnitine',
      label: 'L-카르니틴',
      nutrientKey: 'lcarnitineMgKg',
      storedAs: 'mg_per_kg',
      direction: 'min',
      threshold: 20,
      displayUnit: 'mg/1000kcal',
      confidence: 'medium',
    },
  ],
  '체중관리': [
    {
      id: 'fat',
      label: '조지방',
      nutrientKey: 'crudeFat',
      storedAs: 'percent_direct',
      direction: 'max',
      threshold: 12,
      displayUnit: '%',
      confidence: 'high',
    },
    {
      id: 'protein',
      label: '조단백질',
      nutrientKey: 'crudeProtein',
      storedAs: 'percent_direct',
      direction: 'min',
      threshold: 28,
      displayUnit: '%',
      confidence: 'high',
    },
  ],
  // 피부: 정량 기준 없음 — 성분 존재 시 보조 가점만
  '피부': [],
};

/** 피부 질환 보조 후보 성분 키워드 */
export const SKIN_BONUS_KEYWORDS = [
  '오메가3', '오메가-3', 'omega', '연어유', '정어리유',
  '비타민A', '비타민E', '베타카로틴',
  '아연', 'zinc', '바이오틴', 'biotin',
];
