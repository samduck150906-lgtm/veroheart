export type IngredientCategory = 
  | "protein_source" 
  | "carbohydrate" 
  | "fat" 
  | "additive" 
  | "preservative" 
  | "flavoring" 
  | "coloring" 
  | "functional" 
  | "unknown";

export type RiskLevel = "safe" | "caution" | "danger";

export type HealthCondition = 
  | "kidney" 
  | "urinary" 
  | "joint" 
  | "obesity" 
  | "allergy" 
  | "dental" 
  | "none";

export interface IngredientAnalysisItem {
  name: string;
  category: IngredientCategory;
  risk: RiskLevel;
  reason: string;
}

export interface AnalysisResponse {
  summary: string;
  risk_level: RiskLevel;
  scores: {
    safety: number;
    nutrition: number;
    final: number;
  };
  ingredient_analysis: IngredientAnalysisItem[];
  alerts: string[];
  combination_analysis: {
    protein_quality: string;
    additive_level: string;
    risk_comment: string;
  };
  recommended_for: HealthCondition[];
  not_recommended_for: HealthCondition[];
}
