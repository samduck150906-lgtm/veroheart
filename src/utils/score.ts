import type { Product, UserPetProfile } from '../data/mock';

/**
 * 궁합 점수 계산식: Compatibility = 0.35S + 0.25C + 0.20R + 0.10P + 0.10V
 * S: 성분 안전성
 * C: 고민 적합도
 * R: 리뷰 만족도
 * P: 인기 점수
 * V: 가격 적합도 (여기서는 하드코딩된 예산 로직으로 대체)
 */

export function calculateCompatibilityScore(product: Product, profile: UserPetProfile): number {
  let score = 0;
  
  // 1. 성분 안전성 (S) - 35점 만점
  const baseSafety = 35;
  let dangerCount = 0;
  let cautionCount = 0;
  const allergyMatches = new Set<string>();

  product.ingredients.forEach(ing => {
    profile.allergies.forEach(a => {
      if (
        ing.nameKo.includes(a) ||
        (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
      ) {
        allergyMatches.add(a);
      }
    });
    if (ing.riskLevel === 'danger') dangerCount += 1;
    if (ing.riskLevel === 'caution') cautionCount += 1;
  });

  const riskPenalty = Math.min(18, dangerCount * 6) + Math.min(9, cautionCount * 3);
  const personalPenalty = Math.min(30, allergyMatches.size * 20);
  const sScore = Math.max(0, baseSafety - riskPenalty - personalPenalty);
  score += Math.max(0, sScore);

  // 2. 고민 적합도 (C) - 25점 만점
  // (임시 매핑 로직)
  let cScore = 15; // 기본 15점
  profile.healthConcerns.forEach(concern => {
    product.ingredients.forEach(ing => {
      if (ing.purpose.includes(concern)) {
        cScore += 5; 
      }
    });
  });
  score += Math.min(25, cScore);

  // 3. 리뷰 만족도 (R) - 20점 만점
  // 평점 5.0 기준 백분율
  const rScore = (product.averageRating / 5.0) * 20;
  score += Math.min(20, rScore);

  // 4. 인기 (P) - 10점 만점
  // 리뷰 수 1000개를 10점으로 가정
  const pScore = Math.min(10, (product.reviewsCount / 1000) * 10);
  score += pScore;

  // 5. 가격 적합도 (V) - 10점 만점
  // MVP에서는 평균 가격을 25000원으로 가정하고 적당한 점수 부여
  let vScore = 8;
  if (product.price > 30000) vScore -= 2; // 비싸면 감점
  if (product.price < 15000) vScore += 2; // 가성비 좋으면 가점
  score += Math.min(10, vScore);

  return Math.round(score);
}
