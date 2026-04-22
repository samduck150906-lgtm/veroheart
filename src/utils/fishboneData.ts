import type { Ingredient, Product, UserPetProfile } from '../types';
import type { FishboneCategory, FishboneCause } from '../components/FishboneDiagram';

function countByRisk(ingredients: Ingredient[]) {
  return ingredients.reduce(
    (acc, ing) => {
      acc[ing.riskLevel] = (acc[ing.riskLevel] ?? 0) + 1;
      return acc;
    },
    { safe: 0, caution: 0, danger: 0 } as Record<Ingredient['riskLevel'], number>,
  );
}

function pickAllergyHits(ingredients: Ingredient[], profile: UserPetProfile): string[] {
  if (profile.allergies.length === 0) return [];
  return ingredients
    .filter((ing) =>
      profile.allergies.some(
        (a) => ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase())),
      ),
    )
    .map((ing) => ing.nameKo);
}

function pickConcernMatches(ingredients: Ingredient[], profile: UserPetProfile): string[] {
  if (profile.healthConcerns.length === 0) return [];
  const matches: string[] = [];
  profile.healthConcerns.forEach((concern) => {
    const helpful = ingredients.find(
      (ing) => ing.purpose.includes(concern) || ing.nameKo.includes(concern),
    );
    if (helpful) matches.push(`${concern} → ${helpful.nameKo}`);
  });
  return matches;
}

/**
 * Turns a product + user profile into fishbone categories covering the
 * main levers behind a product's overall fit: ingredient safety, nutrition,
 * personal fit, and social proof.
 */
export function buildProductFishbone(product: Product, profile: UserPetProfile): FishboneCategory[] {
  const ingredients = product.ingredients ?? [];
  const counts = countByRisk(ingredients);
  const allergyHits = pickAllergyHits(ingredients, profile);
  const concernMatches = pickConcernMatches(ingredients, profile);

  const safetyCauses: FishboneCause[] = [];
  if (counts.safe > 0) safetyCauses.push({ label: `안전 성분 ${counts.safe}개`, tone: 'positive' });
  if (counts.caution > 0) safetyCauses.push({ label: `주의 성분 ${counts.caution}개`, tone: 'caution' });
  if (counts.danger > 0) safetyCauses.push({ label: `위험 성분 ${counts.danger}개`, tone: 'danger' });
  if (safetyCauses.length === 0) safetyCauses.push({ label: '성분 데이터 부족', tone: 'neutral' });

  const nutritionCauses: FishboneCause[] = [];
  if (product.formulation) nutritionCauses.push({ label: product.formulation, tone: 'neutral' });
  if (product.mainCategory) nutritionCauses.push({ label: product.mainCategory, tone: 'neutral' });
  if (product.targetLifeStage && product.targetLifeStage.length > 0) {
    nutritionCauses.push({ label: product.targetLifeStage.join('·'), tone: 'neutral' });
  }
  if (nutritionCauses.length === 0) nutritionCauses.push({ label: '기본 영양 구성', tone: 'neutral' });

  const fitCauses: FishboneCause[] = [];
  if (allergyHits.length > 0) {
    fitCauses.push({ label: `알레르기 ${allergyHits[0]}${allergyHits.length > 1 ? ` 외 ${allergyHits.length - 1}` : ''}`, tone: 'danger' });
  } else if (profile.allergies.length > 0) {
    fitCauses.push({ label: '등록 알레르기 회피', tone: 'positive' });
  }
  if (concernMatches.length > 0) {
    concernMatches.slice(0, 2).forEach((m) => fitCauses.push({ label: m, tone: 'positive' }));
  } else if (profile.healthConcerns.length > 0) {
    fitCauses.push({ label: '관심 건강 이슈 보완 부족', tone: 'caution' });
  }
  if (product.targetPetType && product.targetPetType !== 'all') {
    const matches =
      (profile.species === 'Dog' && product.targetPetType === 'dog') ||
      (profile.species === 'Cat' && product.targetPetType === 'cat');
    fitCauses.push({
      label: matches ? `${profile.species === 'Dog' ? '강아지' : '고양이'} 전용` : '종 불일치',
      tone: matches ? 'positive' : 'danger',
    });
  }
  if (fitCauses.length === 0) fitCauses.push({ label: '프로필 정보 추가 권장', tone: 'neutral' });

  const trustCauses: FishboneCause[] = [];
  trustCauses.push({
    label: `평점 ${product.averageRating.toFixed(1)}`,
    tone: product.averageRating >= 4 ? 'positive' : product.averageRating >= 3 ? 'neutral' : 'caution',
  });
  trustCauses.push({
    label: `후기 ${product.reviewsCount}건`,
    tone: product.reviewsCount >= 30 ? 'positive' : product.reviewsCount >= 5 ? 'neutral' : 'caution',
  });
  if (product.verificationStatus === 'verified') {
    trustCauses.push({ label: '검수 완료', tone: 'positive' });
  } else if (product.verificationStatus === 'needs_review') {
    trustCauses.push({ label: '재검토 필요', tone: 'caution' });
  } else {
    trustCauses.push({ label: '검수 대기', tone: 'neutral' });
  }
  if (product.manufacturerName) {
    trustCauses.push({ label: `제조 ${product.manufacturerName}`, tone: 'neutral' });
  }

  return [
    { label: '성분 안전성', causes: safetyCauses },
    { label: '영양 구성', causes: nutritionCauses },
    { label: '우리 아이 적합', causes: fitCauses },
    { label: '브랜드 신뢰', causes: trustCauses },
  ];
}
