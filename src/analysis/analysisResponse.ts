/**
 * 규칙 엔진 결과 → 스캐너(Analyzer) 화면이 쓰는 AnalysisResponse 매퍼.
 *
 * 스캐너의 로컬 팰백이 위험/주의 성분을 직접 하드코딩하던 것을
 * 사전 + 규칙 엔진 단일 소스로 대체한다.
 */
import type {
  AnalysisResponse,
  IngredientAnalysisItem,
  IngredientCategory as AnalyzerCategory,
  RiskLevel,
} from '../types/analyzer';
import type { GuaranteedAnalysis, IngredientCategory } from './types';
import { parseLabel } from './labelParser';
import { analyzeProduct } from './ruleEngine';
import { calculateCalories } from './nutrition';
import { toAllergenTags } from './adapter';

function mapCategory(cat: IngredientCategory): AnalyzerCategory {
  switch (cat) {
    case 'animal_protein':
    case 'processed_protein':
      return 'protein_source';
    case 'carbohydrate':
    case 'legume':
    case 'vegetable':
    case 'fruit':
      return 'carbohydrate';
    case 'animal_fat':
    case 'oil':
      return 'fat';
    case 'preservative':
      return 'preservative';
    case 'additive':
    case 'sweetener':
      return 'additive';
    case 'vitamin_mineral':
    case 'probiotic':
      return 'functional';
    default:
      return 'unknown';
  }
}

const DUMMY_GA = (isSnack: boolean): GuaranteedAnalysis => ({
  crudeProtein: isSnack ? 15 : 26,
  crudeFat: isSnack ? 5 : 12,
  crudeFiber: 5,
  crudeAsh: 8,
  moisture: 10,
});

export interface BuildResponseInput {
  ingredientText: string;
  animal: 'dog' | 'cat';
  /** 화면 상태값: 'food' | 'snack' | '영양제' 등 */
  productType: string;
  allergies?: string[];
  healthConcerns?: string[];
}

/**
 * 전성분 텍스트를 파싱·분석해 AnalysisResponse를 만든다.
 * (Edge Function이 실패할 때의 로컬 폴백 및 오프라인 경로)
 */
export function buildAnalysisResponse(input: BuildResponseInput): AnalysisResponse {
  const { ingredientText, animal, productType } = input;
  const isSnack = productType === 'snack';
  const engineType =
    productType === 'snack' ? 'treat' : productType === '영양제' ? 'supplement' : 'complete_food';

  const parsed = parseLabel(ingredientText);
  const ga =
    parsed.guaranteedAnalysis.crudeProtein !== undefined
      ? parsed.guaranteedAnalysis
      : DUMMY_GA(isSnack);

  const result = analyzeProduct(
    {
      species: animal,
      productType: engineType,
      matchedIngredients: parsed.ingredients,
      guaranteedAnalysis: ga,
    },
    {
      species: animal,
      allergies: toAllergenTags(input.allergies ?? []),
      diseases: input.healthConcerns ?? [],
    },
  );

  // 위험/주의 성분명 집합 (per-ingredient risk 산정용)
  const dangerNames = new Set<string>();
  const cautionNames = new Set<string>();
  for (const w of result.warnings) {
    const bucket = w.level === 'danger' ? dangerNames : cautionNames;
    (w.ingredients ?? []).forEach((n) => bucket.add(n));
  }

  const ingredient_analysis: IngredientAnalysisItem[] = parsed.ingredients.map((m) => {
    const name = m.ingredient?.canonicalKo ?? m.originalName;
    let risk: RiskLevel = 'safe';
    if (dangerNames.has(name)) risk = 'danger';
    else if (cautionNames.has(name)) risk = 'caution';
    else if (m.ingredient && m.ingredient.defaultSeverity !== 'safe')
      risk = m.ingredient.defaultSeverity === 'danger' ? 'danger' : 'caution';

    return {
      name: m.originalName,
      category: m.ingredient ? mapCategory(m.ingredient.category) : 'unknown',
      risk,
      reason: m.ingredient
        ? m.ingredient.explanation
        : '표준 성분 사전에 없는 원료예요. 추가 확인이 필요해요.',
    };
  });

  const calories = calculateCalories(ga);
  const hasDanger = result.warnings.some((w) => w.level === 'danger');
  const risk_level: RiskLevel = hasDanger
    ? 'danger'
    : result.score >= 80
      ? 'safe'
      : result.score >= 60
        ? 'caution'
        : 'danger';

  const toxicItems = result.warnings
    .filter((w) => w.level === 'danger')
    .flatMap((w) =>
      (w.ingredients ?? []).map((n) => ({ name: n, reason: w.message })),
    );

  return {
    summary: result.summary,
    risk_level,
    scores: {
      safety: result.breakdown.safety,
      nutrition: result.breakdown.nutritionFit,
      final: result.score,
    },
    ingredient_analysis,
    alerts: result.warnings.map((w) => w.message),
    combination_analysis: {
      protein_quality:
        result.positives.some((p) => p.ruleId === 'FIRST_INGREDIENT_ANIMAL_PROTEIN')
          ? '제1원료가 명확한 동물성 단백질'
          : '보통 수준의 단백질 구성',
      additive_level: result.warnings.some((w) => w.ruleId === 'SYNTHETIC_PRESERVATIVE')
        ? 'BHA/BHT 등 합성 보존제 주의'
        : '특이 합성 보존제 미검출',
      risk_comment: `규칙 엔진 분석 완료. 총점 ${result.score}점(등급 ${result.grade}), 주의/위험 항목 ${result.warnings.length}개.`,
    },
    recommended_for: [],
    not_recommended_for: [],
    estimated_calories_kcal_kg: calories.kcalPerKg,
    caloric_distribution: calories.distribution,
    contains_toxic: hasDanger,
    toxic_ingredients: toxicItems,
  };
}
