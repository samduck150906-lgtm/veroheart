import type { Product, UserPetProfile } from '../types';
import { getCompatibilityBreakdown } from './score';

export interface AnalysisReport {
  score: number;
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
  highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[];
  detailedAnalysis: string;
}

export function generateAnalysisReport(product: Product, profile: UserPetProfile): AnalysisReport {
  const ingredients = product.ingredients || [];
  const compatibility = getCompatibilityBreakdown(product, profile);
  let score = 0;
  
  // 1. Ingredient Safety (S) - 35 points
  let sScore = 35;
  const allergyMatches: string[] = [];
  const dangerIngredients: string[] = [];

  ingredients.forEach(ing => {
    // Check for allergies
    const matchesAllergy = profile.allergies.some(a => 
      ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
    );

    if (matchesAllergy) {
      allergyMatches.push(ing.nameKo);
      sScore -= 15;
    }

    if (ing.riskLevel === 'danger') {
      dangerIngredients.push(ing.nameKo);
      sScore -= 10;
    } else if (ing.riskLevel === 'caution') {
      sScore -= 5;
    }
  });

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

  const totalScore = Math.round((score + compatibility.total) / 2);
  
  // Highlights
  const highlights: { text: string; type: 'positive' | 'negative' | 'caution' }[] = [];
  
  if (allergyMatches.length > 0) {
    highlights.push({
      text: `알레르기 주의보! ${allergyMatches.join(', ')} 등 우리 애가 못 먹는 원료가 포함되어 있어요.`,
      type: 'negative',
    });
  }

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
    summary = `${profile.name}에게 대체로 안전하고 건강한 제품입니다.`;
  } else if (totalScore < 50 || allergyMatches.length > 0) {
    grade = 'Poor';
    summary = '급여 전 전문가와 상담이 필요한 제품입니다.';
  }

  return {
    score: totalScore,
    grade,
    summary,
    highlights,
    detailedAnalysis: `전체 ${ingredients.length}개의 성분 중 ${dangerIngredients.length}개의 위험 성분이 발견되었습니다. ${
      profile.healthConcerns.length > 0
        ? `${profile.name}의 건강 고민(${profile.healthConcerns.join(', ')})과의 관련도는 ${concernMatches.length > 0 ? '높음' : '보통'}입니다. `
        : ''
    }리뷰/인기/가격까지 포함한 종합 적합도는 ${compatibility.total}점으로 계산되었습니다.`
  };
}
