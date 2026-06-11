/**
 * 분석 규칙 정의.
 *
 * 규칙은 코드/DB 어디서나 동일한 형태(AnalysisRule)로 평가된다.
 * 추후 단계에서 이 배열을 DB(analysis_rules) 시드로 옮기고 관리자 검수를 붙인다.
 *
 * LLM은 판단하지 않는다. 위험/안전 판정은 전적으로 이 규칙들이 한다.
 */
import type { AnalysisRule } from './types';

/** 절대 위험 성분 규칙 — 즉시 danger 처리 */
export const DANGER_RULES: AnalysisRule[] = [
  {
    id: 'DOG_XYLITOL_DANGER',
    target: 'ingredient',
    species: 'dog',
    condition: { hasIngredient: '자일리톨' },
    severity: 'danger',
    scoreDelta: -100,
    title: '개에게 위험한 감미료',
    messageTemplate:
      '자일리톨은 개에게 매우 위험할 수 있어요. 섭취 가능성이 있다면 급여하지 않는 것이 안전합니다.',
    evidenceLevel: 'veterinary',
  },
  {
    id: 'DOG_GRAPE_RAISIN_DANGER',
    target: 'ingredient',
    species: 'dog',
    condition: { hasAnyIngredient: ['포도', '건포도'] },
    severity: 'danger',
    scoreDelta: -100,
    title: '개에게 위험할 수 있는 과일 성분',
    messageTemplate: '포도·건포도는 일부 개에서 신장 손상 위험이 보고되어 있어요.',
    evidenceLevel: 'veterinary',
  },
  {
    id: 'ALLIUM_DANGER',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['양파', '마늘', '파', '부추'] },
    severity: 'danger',
    scoreDelta: -90,
    title: '반려동물에게 피해야 할 파속 식물',
    messageTemplate:
      '양파·마늘류는 반려동물에게 위험할 수 있어요. 원료에 포함되어 있다면 급여 전 수의사 상담이 필요합니다.',
    evidenceLevel: 'veterinary',
  },
  {
    id: 'CHOCOLATE_CAFFEINE_DANGER',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['초콜릿', '코코아', '카페인', '커피'] },
    severity: 'danger',
    scoreDelta: -100,
    title: '카페인·초콜릿 계열 주의',
    messageTemplate: '초콜릿·카페인 계열 성분은 반려동물에게 위험할 수 있어요.',
    evidenceLevel: 'veterinary',
  },
  {
    id: 'MACADAMIA_DANGER',
    target: 'ingredient',
    species: 'dog',
    condition: { hasIngredient: '마카다미아' },
    severity: 'danger',
    scoreDelta: -100,
    title: '개에게 위험한 견과류',
    messageTemplate: '마카다미아는 개에게 위험할 수 있어요.',
    evidenceLevel: 'veterinary',
  },
  {
    id: 'CAT_PROPYLENE_GLYCOL',
    target: 'ingredient',
    species: 'cat',
    condition: { hasIngredient: '프로필렌글리콜' },
    severity: 'caution',
    scoreDelta: -25,
    title: '고양이에게 권장되지 않는 습윤제',
    messageTemplate: '프로필렌 글리콜은 특히 고양이에게는 권장되지 않는 성분이에요.',
    evidenceLevel: 'veterinary',
  },
];

/** 주의(논란/합성 보존제 등) 규칙 — 감점하되 위험은 아님 */
export const CAUTION_RULES: AnalysisRule[] = [
  {
    id: 'SYNTHETIC_PRESERVATIVE',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['BHA', 'BHT', '에톡시퀸'] },
    severity: 'caution',
    scoreDelta: -10,
    title: '합성 산화방지제',
    messageTemplate:
      '합성 산화방지제(BHA·BHT·에톡시퀸)가 사용됐어요. 천연 보존제(혼합 토코페롤·로즈마리 추출물 등)에 비해 논란이 있는 성분이에요.',
    evidenceLevel: 'internal_policy',
  },
  {
    id: 'VAGUE_ANIMAL_SOURCE',
    target: 'ingredient',
    species: 'both',
    condition: { hasRiskTag: 'controversial', hasCategory: 'processed_protein' },
    severity: 'watch',
    scoreDelta: -8,
    title: '출처가 불명확한 동물성 원료',
    messageTemplate:
      '동물 기원이 구체적으로 표시되지 않은 원료가 있어요. 출처가 명확한 표기(예: 닭고기분)가 더 좋아요.',
    evidenceLevel: 'internal_policy',
  },
];

/** 좋은 점(가점) 규칙 */
export const GOOD_RULES: AnalysisRule[] = [
  {
    id: 'FIRST_INGREDIENT_ANIMAL_PROTEIN',
    target: 'product',
    species: 'both',
    condition: { firstIngredientCategory: 'animal_protein' },
    severity: 'good',
    scoreDelta: +10,
    title: '명확한 동물성 단백질',
    messageTemplate: '첫 번째 원료가 명확한 동물성 단백질이라 주요 단백질원이 비교적 분명해요.',
    evidenceLevel: 'nutrition_guideline',
  },
  {
    id: 'OMEGA3_PRESENT',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['연어오일', '어유'] },
    severity: 'good',
    scoreDelta: +3,
    title: '오메가-3 공급원',
    messageTemplate: '오메가-3(연어 오일·어유)가 포함돼 피부·관절 건강에 도움이 될 수 있어요.',
    evidenceLevel: 'nutrition_guideline',
  },
  {
    id: 'JOINT_SUPPORT',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['글루코사민', '콘드로이친'] },
    severity: 'good',
    scoreDelta: +3,
    title: '관절 보조 성분',
    messageTemplate: '글루코사민·콘드로이친 등 관절 보조 성분이 포함돼 있어요.',
    evidenceLevel: 'nutrition_guideline',
  },
  {
    id: 'NATURAL_PRESERVATIVE',
    target: 'ingredient',
    species: 'both',
    condition: { hasAnyIngredient: ['혼합토코페롤', '로즈마리추출물'] },
    severity: 'good',
    scoreDelta: +2,
    title: '천연 산화방지제',
    messageTemplate: '혼합 토코페롤·로즈마리 추출물 등 천연 보존제를 사용했어요.',
    evidenceLevel: 'internal_policy',
  },
];

/** 전체 규칙 (평가 순서: danger → caution → good) */
export const ALL_RULES: AnalysisRule[] = [
  ...DANGER_RULES,
  ...CAUTION_RULES,
  ...GOOD_RULES,
];
