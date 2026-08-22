import type { Product, UserPetProfile } from '../types';
import type { AllergyRelationshipMatch } from '../analysis/allergyFamilyMatcher';
import { getCompatibilityBreakdown } from './score';

export interface AnalysisReport {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[];
  detailedAnalysis: string;
}

function allergyCautionText(matches: AllergyRelationshipMatch[]): string | null {
  if (matches.length === 0) return null;

  const strong = matches.filter((match) => match.kind === 'strong_caution');
  if (strong.length > 0) {
    return '등록한 알레르기와 관련된 가금류 원료가 포괄적으로 표기되어 있어, 원료 출처를 확인한 뒤 급여하는 편이 안전해요.';
  }

  const cross = matches.filter((match) => match.kind === 'cross_caution');
  if (cross.length > 0) {
    const allergens = [...new Set(cross.map((match) => match.allergy))];
    const ingredients = [...new Set(cross.map((match) => match.ingredientName))].slice(0, 3);
    return `${allergens.join(', ')} 알레르기와 관련된 다른 가금류 성분(${ingredients.join(', ')})이 있어요. 가금류 간 교차반응 가능성이 보고되어 있으므로 처음 급여하거나 과거 반응 이력이 있다면 특히 주의해 주세요.`;
  }

  if (matches.some((match) => match.kind === 'hydrolysis_caution')) {
    return '등록한 알레르기 원료의 가수분해 성분이 있어요. 가수분해 정도에 따라 반응 가능성이 달라질 수 있어 제품 정보를 확인해 주세요.';
  }

  if (matches.some((match) => match.kind === 'processing_caution')) {
    return '등록한 알레르기 원료와 관련된 가금류 지방 성분이 있어요. 고기 단백질과 동일한 확정 알레르기로 보지는 않지만 원료 정제도와 잔류 단백질을 알 수 없어 주의가 필요해요.';
  }

  return null;
}

export function generateAnalysisReport(product: Product, profile: UserPetProfile): AnalysisReport {
  const ingredients = product.ingredients || [];
  const compatibility = getCompatibilityBreakdown(product, profile);
  const dangerIngredients = ingredients
    .filter((ingredient) => ingredient.riskLevel === 'danger')
    .map((ingredient) => ingredient.nameKo);
  const cautionIngredients = ingredients
    .filter((ingredient) => ingredient.riskLevel === 'caution')
    .map((ingredient) => ingredient.nameKo);
  const allergyCaution = allergyCautionText(compatibility.allergyCautions);

  const highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[] = [];

  if (compatibility.speciesMismatch) {
    const expected = profile.species === 'Cat' ? '고양이' : '강아지';
    const actual = product.targetPetType === 'cat' ? '고양이' : '강아지';
    highlights.push({
      text: `${expected}용 제품이 아닙니다. 이 제품은 ${actual}용으로 등록되어 있어요.`,
      type: 'negative',
    });
  }

  if (compatibility.allergyHits.length > 0) {
    highlights.push({
      text: `알레르기·회피 성분 ${compatibility.allergyHits.join(', ')}이 포함되어 있어 급여를 권하지 않아요.`,
      type: 'negative',
    });
  } else if (allergyCaution) {
    highlights.push({ text: allergyCaution, type: 'caution' });
  }

  if (dangerIngredients.length > 0) {
    highlights.push({
      text: `위험 성분 ${dangerIngredients.join(', ')}이 포함되어 있어 성분표 확인이 필요해요.`,
      type: 'caution',
    });
  } else if (cautionIngredients.length > 0) {
    highlights.push({
      text: `주의 성분 ${cautionIngredients.slice(0, 3).join(', ')}${cautionIngredients.length > 3 ? ` 외 ${cautionIngredients.length - 3}개` : ''}가 있어요.`,
      type: 'caution',
    });
  }

  if (compatibility.matchedConcerns.length > 0) {
    highlights.push({
      text: `${compatibility.matchedConcerns.join(', ')} 고민과 연관된 성분·제품 정보가 확인됐어요.`,
      type: 'positive',
    });
  }

  if (compatibility.preferencePenalty > 0 && compatibility.preferenceLevel != null) {
    highlights.push({
      text: `과거 기호도 ${compatibility.preferenceLevel.toFixed(1)}점으로, 잘 먹지 않았던 기록을 반영했어요.`,
      type: 'caution',
    });
  }

  let grade: AnalysisReport['grade'] = 'Fair';
  let summary = `${profile.name}에게 무난한 편이지만 성분표를 함께 확인해 주세요.`;

  if (compatibility.speciesMismatch) {
    grade = 'Poor';
    summary = `${profile.name}의 동물 종류와 맞지 않는 제품입니다.`;
  } else if (compatibility.allergyHits.length > 0) {
    grade = 'Poor';
    summary = `${profile.name}의 알레르기·회피 성분이 포함되어 있어 급여를 권하지 않아요.`;
  } else if (allergyCaution) {
    grade = compatibility.total >= 70 ? 'Good' : 'Fair';
    summary = `관련 가금류 성분이 있어 교차반응 가능성에 주의가 필요해요.`;
  } else if (compatibility.total >= 85) {
    grade = 'Excellent';
    summary = `${profile.name}에게 성분과 건강 조건이 매우 잘 맞는 제품입니다.`;
  } else if (compatibility.total >= 70) {
    grade = 'Good';
    summary = `${profile.name}에게 대체로 잘 맞는 제품입니다.`;
  } else if (compatibility.total < 50) {
    grade = 'Poor';
    summary = '급여 전 성분과 건강 조건을 다시 확인하는 편이 좋아요.';
  }

  return {
    score: compatibility.total,
    grade,
    summary,
    highlights,
    detailedAnalysis: [
      `성분 안전성 ${compatibility.ingredientSafety}/50점`,
      `건강 적합성 ${compatibility.healthSuitability}/30점`,
      `고민 적합성 ${compatibility.concernFit}/20점`,
      compatibility.allergyPenalty > 0 ? `알레르기 감점 -${compatibility.allergyPenalty}점` : null,
      compatibility.allergyCautionPenalty > 0
        ? `알레르기 관련 주의 감점 -${compatibility.allergyCautionPenalty}점`
        : null,
      compatibility.preferencePenalty > 0 ? `기호도 감점 -${compatibility.preferencePenalty}점` : null,
      compatibility.speciesMismatch ? '동물 종류 불일치로 최종 0점 처리' : null,
    ]
      .filter(Boolean)
      .join(' · '),
  };
}