// src/analysis/ingredientQuality.ts
import { findIngredientByName } from './ingredientDictionary';
import type { DictionaryIngredient, IngredientCategory } from './types';

export type QualityGrade = '최고' | '양호' | '주의' | '경고';

export type SignalLevel =
  | 'major_positive'  // 주요 가점 (초록) - fresh named animal protein
  | 'minor_positive'  // 보조 가점 (주황) - named processed protein, functional supplement
  | 'alt_protein'     // 대체 단백질 (파랑) - whole plant protein
  | 'neutral'         // 중립 (회색) - vitamins, minerals, natural preservatives
  | 'caution'         // 주의 (노랑) - unnamed/generic, processed plant protein
  | 'warning';        // 강한 주의 (빨강) - by-products, dangerous

export interface QualityGradeResult {
  grade: QualityGrade;
  typeLabel: string;   // e.g. "신선육", "건식 단백", "기능성 보조"
  tierLabel: string;   // e.g. "최상위", "상위", "중립", "주의", "경고"
  label: string;       // combined: "신선육·최상위"
  color: string;
  description: string;
}

export interface IngredientSignal {
  level: SignalLevel;
  dotColor: string;
  label: string;
  labelColor: string;
  labelBg: string;
}

export interface ProteinInflationResult {
  hasInflation: boolean;
  processedPlantProteins: string[];
  inflationSignal: 'none' | 'minor' | 'major';
}

export interface DCMRiskResult {
  hasRisk: boolean;
  legumesInTop5: string[];
  riskLevel: 'none' | 'watch' | 'danger';
}

export interface QualityAnalysisResult {
  top3: Array<{
    name: string;
    qualityResult: QualityGradeResult;
    barWidth: number;
    signal: IngredientSignal;
  }>;
  allSignals: Array<{
    name: string;
    signal: IngredientSignal;
    qualityResult: QualityGradeResult;
  }>;
  overallGrade: string;
  overallScore: number;
  strengths: string[];
  proteinInflation: ProteinInflationResult;
  dcmRisk: DCMRiskResult;
  ingredientScore: number;
}

export const QUALITY_GRADE_COLOR: Record<QualityGrade, string> = {
  '최고': '#15B36B',
  '양호': '#3182F6',
  '주의': '#F59E0B',
  '경고': '#F04452',
};

const SIGNAL_STYLE: Record<SignalLevel, { dot: string; bg: string; text: string; label: string }> = {
  major_positive: { dot: '#15B36B', bg: '#ECFDF5', text: '#166534', label: '주요 가점' },
  minor_positive: { dot: '#F59E0B', bg: '#FFFBEB', text: '#92400E', label: '보조 가점' },
  alt_protein:    { dot: '#3182F6', bg: '#EFF6FF', text: '#1D4ED8', label: '대체 단백질' },
  neutral:        { dot: '#94A3B8', bg: '#F8FAFC', text: '#475569', label: '중립' },
  caution:        { dot: '#F97316', bg: '#FFF7ED', text: '#9A3412', label: '주의' },
  warning:        { dot: '#F04452', bg: '#FFF1F2', text: '#BE123C', label: '강한 주의' },
};

const BYPRODUCT_PATTERNS = [
  '부산물', 'by-product', 'byproduct', '가금류분', '가금육분',
  'poultry meal', 'poultry by-product', '육골분', '동물성 단백질',
  'meat meal', 'meat and bone meal', 'animal digest',
];

const PROCESSED_PLANT_PROTEIN_PATTERNS = [
  '완두 단백', '완두단백', '완두단백질', 'pea protein',
  '옥수수 글루텐', '옥수수글루텐', 'corn gluten meal', 'corn gluten',
  '대두 단백', '대두단백', 'soy protein', 'soy protein concentrate',
  '밀 글루텐', '밀글루텐', 'wheat gluten',
  '감자 단백', '감자단백', 'potato protein',
];

const ORGAN_MEAT_KEYWORDS = [
  '간', '신장', '심장', '폐', '위', '비장', '트라이프', '췌장',
  'liver', 'kidney', 'heart', 'lung', 'spleen', 'tripe',
];

function isByProduct(name: string): boolean {
  const lower = name.toLowerCase();
  return BYPRODUCT_PATTERNS.some(k => lower.includes(k.toLowerCase()));
}

function isProcessedPlantProtein(name: string): boolean {
  const lower = name.toLowerCase();
  return PROCESSED_PLANT_PROTEIN_PATTERNS.some(k => lower.includes(k.toLowerCase()));
}

function isOrganMeat(name: string): boolean {
  const lower = name.toLowerCase();
  return ORGAN_MEAT_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
}

export function classifyIngredientQuality(name: string, dictEntry: DictionaryIngredient | null): QualityGradeResult {
  if (isByProduct(name) || dictEntry?.defaultSeverity === 'danger') {
    const typeLabel = dictEntry?.defaultSeverity === 'danger' ? '위험 성분' : '부산물';
    return {
      grade: '경고', typeLabel, tierLabel: '경고',
      label: `${typeLabel}·경고`, color: QUALITY_GRADE_COLOR['경고'],
      description: dictEntry?.explanation ?? '출처나 품질이 불분명한 부산물이에요.',
    };
  }

  if (!dictEntry) {
    return {
      grade: '주의', typeLabel: '미확인 원료', tierLabel: '주의',
      label: '미확인 원료·주의', color: QUALITY_GRADE_COLOR['주의'],
      description: '성분 정보를 확인하기 어려운 원료예요.',
    };
  }

  const { category, defaultSeverity, explanation } = dictEntry;

  if (category === 'processed_protein' && dictEntry.animalSource === 'unknown') {
    return {
      grade: '경고', typeLabel: '비명시 가공단백', tierLabel: '경고',
      label: '비명시 가공단백·경고', color: QUALITY_GRADE_COLOR['경고'],
      description: '동물 출처가 명확하지 않은 가공 단백질이에요.',
    };
  }

  if (isProcessedPlantProtein(name)) {
    return {
      grade: '주의', typeLabel: '가공 식물단백', tierLabel: '주의',
      label: '가공 식물단백·주의', color: QUALITY_GRADE_COLOR['주의'],
      description: '조단백 수치를 높이는 데 쓰일 수 있는 가공 식물성 단백질이에요.',
    };
  }

  if (defaultSeverity === 'caution') {
    return {
      grade: '주의', typeLabel: '주의 성분', tierLabel: '주의',
      label: '주의 성분·주의', color: QUALITY_GRADE_COLOR['주의'],
      description: explanation,
    };
  }

  if (category === 'animal_protein') {
    const isOrgan = isOrganMeat(name);
    return {
      grade: '최고',
      typeLabel: isOrgan ? '장기육' : '신선육',
      tierLabel: '최상위',
      label: isOrgan ? '장기육·최상위' : '신선육·최상위',
      color: QUALITY_GRADE_COLOR['최고'],
      description: isOrgan ? '출처가 명확한 신선 장기육이에요.' : '출처가 명확한 신선 동물성 단백질이에요.',
    };
  }

  if (category === 'processed_protein') {
    return {
      grade: '양호', typeLabel: '건식 단백', tierLabel: '상위',
      label: '건식 단백·상위', color: QUALITY_GRADE_COLOR['양호'],
      description: '수분을 제거해 단백질을 농축한 명시 원료예요.',
    };
  }

  if (category === 'animal_fat') {
    return {
      grade: '양호', typeLabel: '동물성 지방', tierLabel: '상위',
      label: '동물성 지방·상위', color: QUALITY_GRADE_COLOR['양호'],
      description: '에너지 및 지방산을 공급하는 동물성 지방이에요.',
    };
  }

  if (category === 'vitamin_mineral' || category === 'probiotic') {
    const hasFunctional = dictEntry.nutritionTags.some(t => ['joint', 'gut', 'omega3', 'taurine', 'antioxidant'].includes(t));
    const typeLabel = hasFunctional ? '기능성 보조' : '영양 보조';
    return {
      grade: '양호', typeLabel, tierLabel: '상위',
      label: `${typeLabel}·상위`, color: QUALITY_GRADE_COLOR['양호'],
      description: hasFunctional ? '특정 건강 기능을 보조하는 영양 성분이에요.' : '필수 영양소를 보충하는 성분이에요.',
    };
  }

  if (category === 'oil') {
    const isOmega3 = dictEntry.nutritionTags.includes('omega3');
    return {
      grade: '양호',
      typeLabel: isOmega3 ? '오메가3 오일' : '기능성 오일',
      tierLabel: '상위',
      label: isOmega3 ? '오메가3 오일·상위' : '기능성 오일·상위',
      color: QUALITY_GRADE_COLOR['양호'],
      description: '지방산을 공급하는 오일이에요.',
    };
  }

  if (category === 'legume') {
    return {
      grade: '주의', typeLabel: '두류 단백', tierLabel: '중립',
      label: '두류 단백·중립', color: QUALITY_GRADE_COLOR['주의'],
      description: '식물성 단백·섬유원이에요. 상위에 다수 포함 시 DCM 연관성이 연구되었어요.',
    };
  }

  if (category === 'carbohydrate') {
    return {
      grade: '주의', typeLabel: '탄수화물', tierLabel: '중립',
      label: '탄수화물·중립', color: QUALITY_GRADE_COLOR['주의'],
      description: '에너지원으로 사용되는 탄수화물이에요.',
    };
  }

  if (category === 'preservative') {
    if (defaultSeverity === 'safe') {
      return {
        grade: '양호', typeLabel: '천연 보존제', tierLabel: '중립',
        label: '천연 보존제·중립', color: QUALITY_GRADE_COLOR['양호'],
        description: '천연 산화방지제로 제품 신선도를 유지해요.',
      };
    }
    return {
      grade: '주의', typeLabel: '합성 보존제', tierLabel: '주의',
      label: '합성 보존제·주의', color: QUALITY_GRADE_COLOR['주의'],
      description: explanation,
    };
  }

  if (category === 'additive') {
    return {
      grade: defaultSeverity === 'safe' ? '양호' : '주의',
      typeLabel: '첨가물',
      tierLabel: defaultSeverity === 'safe' ? '중립' : '주의',
      label: defaultSeverity === 'safe' ? '첨가물·중립' : '첨가물·주의',
      color: QUALITY_GRADE_COLOR[defaultSeverity === 'safe' ? '양호' : '주의'],
      description: explanation,
    };
  }

  if (category === 'sweetener') {
    return {
      grade: '경고', typeLabel: '위험 성분', tierLabel: '경고',
      label: '위험 성분·경고', color: QUALITY_GRADE_COLOR['경고'],
      description: explanation,
    };
  }

  return {
    grade: '양호', typeLabel: '기타', tierLabel: '중립',
    label: '기타·중립', color: QUALITY_GRADE_COLOR['양호'],
    description: explanation,
  };
}

function makeSignal(level: SignalLevel): IngredientSignal {
  const s = SIGNAL_STYLE[level];
  return { level, dotColor: s.dot, label: s.label, labelColor: s.text, labelBg: s.bg };
}

export function getSignalLevel(name: string, dictEntry: DictionaryIngredient | null): IngredientSignal {
  if (dictEntry?.defaultSeverity === 'danger') return makeSignal('warning');
  if (isByProduct(name)) return makeSignal('warning');
  if (!dictEntry) return makeSignal('caution');

  const { category, defaultSeverity, nutritionTags } = dictEntry;

  if (category === 'animal_protein') return makeSignal('major_positive');

  if (isProcessedPlantProtein(name)) return makeSignal('caution');

  if (category === 'processed_protein') {
    return dictEntry.animalSource === 'unknown' ? makeSignal('warning') : makeSignal('minor_positive');
  }

  if (category === 'legume') return makeSignal('alt_protein');

  if (category === 'vitamin_mineral' || category === 'probiotic') {
    const hasFunctional = nutritionTags.some(t => ['joint', 'gut', 'omega3', 'taurine'].includes(t));
    return hasFunctional ? makeSignal('minor_positive') : makeSignal('neutral');
  }

  if (category === 'oil') {
    return nutritionTags.includes('omega3') ? makeSignal('minor_positive') : makeSignal('neutral');
  }

  if (category === 'preservative') {
    return defaultSeverity === 'safe' ? makeSignal('neutral') : makeSignal('caution');
  }

  if (category === 'additive') {
    return defaultSeverity === 'caution' ? makeSignal('caution') : makeSignal('neutral');
  }

  if (category === 'sweetener') return makeSignal('warning');
  if (category === 'carbohydrate') return makeSignal('neutral');
  if (category === 'animal_fat') return makeSignal('minor_positive');

  return makeSignal('neutral');
}

export function detectProteinInflation(
  ingredients: Array<{ nameKo: string; position: number }>
): ProteinInflationResult {
  const processed = ingredients.filter(i => isProcessedPlantProtein(i.nameKo)).map(i => i.nameKo);
  const lateProcessed = ingredients.filter(i => i.position >= 5 && i.position <= 8 && isProcessedPlantProtein(i.nameKo));
  return {
    hasInflation: processed.length > 0,
    processedPlantProteins: processed,
    inflationSignal: lateProcessed.length > 0 ? 'major' : processed.length > 0 ? 'minor' : 'none',
  };
}

export function detectDCMRisk(
  ingredients: Array<{ nameKo: string; dictEntry: DictionaryIngredient | null; position: number }>
): DCMRiskResult {
  const top5Legumes = ingredients
    .filter(i => i.position <= 5 && i.dictEntry?.category === 'legume')
    .map(i => i.nameKo);
  return {
    hasRisk: top5Legumes.length >= 2,
    legumesInTop5: top5Legumes,
    riskLevel: top5Legumes.length >= 2 ? 'danger' : top5Legumes.length === 1 ? 'watch' : 'none',
  };
}

export function analyzeIngredientQuality(
  productIngredients: Array<{ nameKo: string; nameEn?: string; riskLevel: string }>
): QualityAnalysisResult {
  const withDict = productIngredients.map((ing, idx) => {
    const dictEntry =
      findIngredientByName(ing.nameKo) ??
      (ing.nameEn ? findIngredientByName(ing.nameEn) : null);
    return { ...ing, dictEntry, position: idx + 1 };
  });

  const top3 = withDict.slice(0, 3).map((ing, idx) => ({
    name: ing.nameKo,
    qualityResult: classifyIngredientQuality(ing.nameKo, ing.dictEntry),
    barWidth: idx === 0 ? 100 : idx === 1 ? 72 : 52,
    signal: getSignalLevel(ing.nameKo, ing.dictEntry),
  }));

  const allSignals = withDict.map(ing => ({
    name: ing.nameKo,
    signal: getSignalLevel(ing.nameKo, ing.dictEntry),
    qualityResult: classifyIngredientQuality(ing.nameKo, ing.dictEntry),
  }));

  const proteinInflation = detectProteinInflation(withDict);
  const dcmRisk = detectDCMRisk(withDict);

  // 6 quality criteria
  const c1 = top3.length > 0 && top3[0].qualityResult.grade === '최고';
  const c2 = top3.every(i => !(i.qualityResult.grade === '경고' && i.qualityResult.typeLabel === '부산물'));
  const c3 = !proteinInflation.hasInflation;
  const c4 = !dcmRisk.hasRisk;
  const namedAnimalCount = withDict.filter(i =>
    i.dictEntry?.category === 'animal_protein' ||
    (i.dictEntry?.category === 'processed_protein' && i.dictEntry.animalSource !== 'unknown')
  ).length;
  const c5 = withDict.length === 0 || namedAnimalCount / withDict.length >= 0.15;
  const c6 = top3.length > 0 && (top3[0].qualityResult.grade === '최고' || top3[0].qualityResult.grade === '양호');

  const criteriaCount = [c1, c2, c3, c4, c5, c6].filter(Boolean).length;
  const overallGrade =
    criteriaCount === 6 ? 'A+' :
    criteriaCount === 5 ? 'A' :
    criteriaCount === 4 ? 'B+' :
    criteriaCount === 3 ? 'B' :
    criteriaCount === 2 ? 'C' : '주의';

  const strengths: string[] = [];
  if (c3) strengths.push('식물성 보강 없음');
  if (dcmRisk.legumesInTop5.length === 0) strengths.push('DCM 안전');
  const hasGrains = withDict.some(i => i.dictEntry?.allergenTags?.includes('grain'));
  if (!hasGrains) strengths.push('그레인프리');
  if (c1) strengths.push('신선육 1위');
  const hasBeneficial = withDict.some(i =>
    i.dictEntry?.nutritionTags?.some(t => ['joint', 'gut', 'omega3', 'taurine'].includes(t))
  );
  if (hasBeneficial) strengths.push('기능성 성분 포함');

  const gradeScore: Record<string, number> = {
    'A+': 5.0, 'A': 4.5, 'B+': 4.0, 'B': 3.5, 'C': 3.0, '주의': 2.0,
  };
  let ingredientScore = gradeScore[overallGrade] ?? 3.0;
  if (proteinInflation.inflationSignal === 'major') ingredientScore = Math.max(0, ingredientScore - 0.5);
  if (dcmRisk.riskLevel === 'danger') ingredientScore = Math.max(0, ingredientScore - 0.5);

  return { top3, allSignals, overallGrade, overallScore: criteriaCount, strengths, proteinInflation, dcmRisk, ingredientScore };
}
