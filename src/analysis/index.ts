/**
 * 베로로 분석 엔진 공개 진입점.
 *
 * 파이프라인: (라벨 파서) → 성분 사전 매칭 → 규칙 엔진 → (설명 생성기)
 * 이 단계에서는 사전 + 규칙 + 엔진 + 영양 계산까지를 제공한다.
 */
export * from './types';
export { normalizeIngredientName } from './normalize';
export { INGREDIENT_DICTIONARY, findIngredientByName } from './ingredientDictionary';
export { ALL_RULES, DANGER_RULES, CAUTION_RULES, GOOD_RULES } from './rules';
export {
  toDryMatter,
  calculateCalories,
  validateAAFCO,
  checkCalciumPhosphorusRatio,
} from './nutrition';
export { analyzeProduct, matchIngredients } from './ruleEngine';
export {
  extractSection,
  splitIngredients,
  parseIngredientToken,
  parseGuaranteedAnalysis,
  parseLabel,
} from './labelParser';
export type { ParsedLabel } from './labelParser';
