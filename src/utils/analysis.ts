import type { Product, UserPetProfile } from '../data/mock';

/** 건강 고민 매칭이 없을 때: 점수가 펫 맞춤이 아님을 드러내는 요약 문구 */
function generalPopulationGoodSummary(product: Product): string {
  if (product.targetPetType === 'dog') return '대부분의 강아지에게 안전하고 무난한 제품입니다.';
  if (product.targetPetType === 'cat') return '대부분의 고양이에게 안전하고 무난한 제품입니다.';
  return '대부분의 강아지/고양이에게 안전하고 무난한 제품입니다.';
}

export interface AnalysisReport {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[];
  detailedAnalysis: string;
}

const SAFETY_POLICY = {
  base: 35,
  dangerPenalty: 6,
  cautionPenalty: 3,
  maxDangerPenalty: 18,
  maxCautionPenalty: 9,
  confirmedAllergyPenalty: 20,
  suspectedAllergyPenalty: 12,
  avoidancePenalty: 6,
  maxPersonalPenalty: 30,
} as const;

function inferProfileType(allergyKeyword: string): 'confirmed' | 'suspected' | 'avoidance' {
  const normalized = allergyKeyword.toLowerCase();
  if (normalized.includes('의심')) return 'suspected';
  if (normalized.includes('기피') || normalized.includes('피하기')) return 'avoidance';
  return 'confirmed';
}

export function generateAnalysisReport(product: Product, profile: UserPetProfile): AnalysisReport {
  const ingredients = product.ingredients || [];
  let score = 0;
  
  // 1. Ingredient Safety (S) - 35 points
  const matchedAllergies = new Map<string, { ingredients: Set<string>; profileType: 'confirmed' | 'suspected' | 'avoidance' }>();
  const dangerIngredients: string[] = [];
  let dangerCount = 0;
  let cautionCount = 0;

  ingredients.forEach(ing => {
    profile.allergies.forEach(allergyKeyword => {
      const normalizedKeyword = allergyKeyword.replace(/\(.*?\)/g, '').trim();
      const matchesAllergy =
        ing.nameKo.includes(normalizedKeyword) ||
        (ing.nameEn && ing.nameEn.toLowerCase().includes(normalizedKeyword.toLowerCase()));

      if (!matchesAllergy) return;

      const key = normalizedKeyword || allergyKeyword;
      if (!matchedAllergies.has(key)) {
        matchedAllergies.set(key, { ingredients: new Set<string>(), profileType: inferProfileType(allergyKeyword) });
      }
      matchedAllergies.get(key)?.ingredients.add(ing.nameKo);
    });

    if (ing.riskLevel === 'danger') {
      dangerIngredients.push(ing.nameKo);
      dangerCount += 1;
    } else if (ing.riskLevel === 'caution') {
      cautionCount += 1;
    }
  });

  const riskPenalty =
    Math.min(SAFETY_POLICY.maxDangerPenalty, dangerCount * SAFETY_POLICY.dangerPenalty) +
    Math.min(SAFETY_POLICY.maxCautionPenalty, cautionCount * SAFETY_POLICY.cautionPenalty);

  let personalPenalty = 0;
  matchedAllergies.forEach((v) => {
    if (v.profileType === 'confirmed') personalPenalty += SAFETY_POLICY.confirmedAllergyPenalty;
    else if (v.profileType === 'suspected') personalPenalty += SAFETY_POLICY.suspectedAllergyPenalty;
    else personalPenalty += SAFETY_POLICY.avoidancePenalty;
  });
  personalPenalty = Math.min(SAFETY_POLICY.maxPersonalPenalty, personalPenalty);

  const sScore = Math.max(0, SAFETY_POLICY.base - riskPenalty - personalPenalty);
  score += Math.max(0, sScore);

  // 2. Health Concern Suitability (C) - 25 points
  let cScore = 15;
  const concernMatches: string[] = [];
  
  profile.healthConcerns.forEach(concern => {
    const helpfulIng = ingredients.find(ing => ing.purpose.includes(concern) || ing.nameKo.includes(concern));
    if (helpfulIng) {
      concernMatches.push(helpfulIng.nameKo);
      cScore += 5;
    }
  });
  score += Math.min(25, cScore);

  // 3. Review & Rating (R) - 20 points
  const rScore = (product.averageRating / 5) * 20;
  score += rScore;

  // 4. Popularity & Value (P+V) - 20 points
  const pScore = Math.min(10, (product.reviewsCount / 500) * 10);
  score += pScore + 8; // Default value score

  const totalScore = Math.round(score);
  
  // Highlights
  const highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[] = [];
  
  matchedAllergies.forEach((value, allergy) => {
    const ingredientsText = Array.from(value.ingredients).join(', ');
    if (value.profileType === 'avoidance') {
      highlights.push({
        text: `참고: ${allergy} 기피 성분(${ingredientsText})이 포함되어 있어요.`,
        type: 'caution',
      });
      return;
    }
    highlights.push({
      text: `주의! ${allergy} 알러지 유발 성분(${ingredientsText})이 포함되어 있어요.`,
      type: 'negative',
    });
  });

  if (dangerIngredients.length > 0) {
    highlights.push({
      text: `위험 성분 하이라이트: ${dangerIngredients.join(', ')} 포함 — 빨간색만 피하면 안심이에요.`,
      type: 'caution',
    });
  }

  if (concernMatches.length > 0) {
    highlights.push({ text: `${profile.healthConcerns[0]} 건강에 도움이 되는 성분 포함`, type: 'positive' });
  }

  // Summary logic
  let grade: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Fair';
  let summary = '무난한 선택입니다.';
  
  if (totalScore >= 85) {
    grade = 'Excellent';
    summary = `${profile.name}에게 완벽하게 추천하는 제품입니다!`;
  } else if (totalScore >= 70) {
    grade = 'Good';
    summary =
      concernMatches.length > 0
        ? `${profile.name}에게 대체로 안전하고 건강한 제품입니다.`
        : generalPopulationGoodSummary(product);
  } else if (totalScore < 50 || matchedAllergies.size > 0) {
    grade = 'Poor';
    summary = '급여 전 전문가와 상담이 필요한 제품입니다.';
  }

  return {
    score: totalScore,
    grade,
    summary,
    highlights,
    detailedAnalysis: `전체 ${ingredients.length}개 성분을 분석한 결과 위험도 감점 ${riskPenalty}점, 맞춤형 감점 ${personalPenalty}점이 반영되었습니다. ${profile.name}의 건강 고민인 ${profile.healthConcerns.join(', ')}에 대한 고려도는 ${concernMatches.length > 0 ? '높음' : '보통'}입니다.`
  };
}
