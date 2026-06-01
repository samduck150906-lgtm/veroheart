import type { Ingredient, Product, UserPetProfile } from '../types';
import type { AnalysisReport } from './analysis';

export type ConclusionTone = 'match' | 'caution' | 'alert';

export type ProductConclusion = {
  tone: ConclusionTone;
  /** 한 줄 결론 (화면 최상단) */
  headline: string;
  /** 보조 한 줄 (선택) */
  subline?: string;
};

function allergyHits(product: Product, profile: UserPetProfile): Ingredient[] {
  const ings = product.ingredients || [];
  return ings.filter((ing) =>
    profile.allergies.some(
      (a) =>
        ing.nameKo.includes(a) ||
        (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
    )
  );
}

/** 상세 상단 '결론 우선' 카드용 카피 */
export function buildProductConclusion(
  product: Product,
  profile: UserPetProfile,
  report: AnalysisReport | null
): ProductConclusion {
  const hits = allergyHits(product, profile);
  if (hits.length > 0) {
    const first = hits[0].nameKo;
    const more = hits.length > 1 ? ` 외 ${hits.length - 1}종` : '';
    return {
      tone: 'alert',
      headline: `주의! ${profile.name}에게 맞지 않을 수 있어요`,
      subline: `${first}${more} 알레르기·회피 성분이 포함되어 있어요.`,
    };
  }

  const score = report?.score ?? 0;
  if (score >= 80) {
    return {
      tone: 'match',
      headline: `${profile.name}에게 ${score}% 잘 맞아요`,
      subline: report?.summary,
    };
  }
  if (score >= 55) {
    return {
      tone: 'caution',
      headline: `${profile.name}에게 보통이에요 (${score}%)`,
      subline: '성분표를 함께 확인해 주세요.',
    };
  }
  return {
    tone: 'caution',
    headline: `신중히 보시는 편이 좋아요 (${score}%)`,
    subline: report?.summary,
  };
}
