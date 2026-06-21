// src/analysis/scoringPipeline.ts
import { analyzeIngredientQuality } from './ingredientQuality';
import type { QualityGradeResult, IngredientSignal } from './ingredientQuality';
import {
  classifyFunctionalIngredients,
  getNutritionDisclosure,
  getETFTrustGrade,
} from './nutrientClassification';
import type { FunctionalIngredient, NutritionDisclosureLevel, ETFTrustGrade } from './nutrientClassification';

export interface ScoringPipelineResult {
  ingredientScore: number;
  ingredientScoreDisplay: string;
  rawMaterialGrade: string;
  rawMaterialCriteriaScore: number;
  rawMaterialDisplay: string;
  nutritionDisclosureLevel: NutritionDisclosureLevel;
  nutritionDisclosureCount: number;
  nutritionDisclosureDisplay: string;
  safetyFailures: number;
  safetyDisplay: string;
  dangerIngredients: string[];
  etfGrade: ETFTrustGrade;
  etfDisplay: string;
  etfDescription: string;
  top3: Array<{ name: string; qualityResult: QualityGradeResult; barWidth: number; signal: IngredientSignal }>;
  allSignals: Array<{ name: string; signal: IngredientSignal; qualityResult: QualityGradeResult }>;
  strengths: string[];
  functionalIngredients: FunctionalIngredient[];
  hasProteinInflation: boolean;
  inflationDetails: string[];
  hasDCMRisk: boolean;
  dcmLegumes: string[];
}

export function runScoringPipeline(product: {
  ingredients?: Array<{ nameKo: string; nameEn?: string; riskLevel: string }>;
  guaranteedAnalysis?: {
    crudeProtein?: number; crudeFat?: number; crudeFiber?: number;
    crudeAsh?: number; moisture?: number; calcium?: number; phosphorus?: number;
  };
  verificationStatus?: string;
}): ScoringPipelineResult {
  const ingredients = product.ingredients ?? [];
  const ga = product.guaranteedAnalysis;

  const quality = analyzeIngredientQuality(ingredients);
  const functional = classifyFunctionalIngredients(ingredients);
  const disclosure = getNutritionDisclosure(ga);
  const dangerIngredients = ingredients.filter(i => i.riskLevel === 'danger').map(i => i.nameKo);
  const etf = getETFTrustGrade({
    verificationStatus: product.verificationStatus,
    disclosureLevel: disclosure.level,
    ingredientGrade: quality.overallGrade,
    dangerCount: dangerIngredients.length,
  });

  return {
    ingredientScore: quality.ingredientScore,
    ingredientScoreDisplay: `${quality.ingredientScore.toFixed(1)}/5.0`,
    rawMaterialGrade: quality.overallGrade,
    rawMaterialCriteriaScore: quality.overallScore,
    rawMaterialDisplay: `${quality.overallGrade}, ${quality.overallScore}/6`,
    nutritionDisclosureLevel: disclosure.level,
    nutritionDisclosureCount: disclosure.disclosedCount,
    nutritionDisclosureDisplay: `${disclosure.level} (${disclosure.disclosedCount}/${disclosure.totalBaseline})`,
    safetyFailures: dangerIngredients.length,
    safetyDisplay: dangerIngredients.length === 0 ? '실패 없음' : `${dangerIngredients.length}개 실패`,
    dangerIngredients,
    etfGrade: etf.grade,
    etfDisplay: `${etf.grade}등급`,
    etfDescription: etf.description,
    top3: quality.top3,
    allSignals: quality.allSignals,
    strengths: quality.strengths,
    functionalIngredients: functional,
    hasProteinInflation: quality.proteinInflation.hasInflation,
    inflationDetails: quality.proteinInflation.processedPlantProteins,
    hasDCMRisk: quality.dcmRisk.hasRisk,
    dcmLegumes: quality.dcmRisk.legumesInTop5,
  };
}
