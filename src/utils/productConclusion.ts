import type { Product, UserPetProfile } from '../types';
import type { AnalysisReport } from './analysis';
import { countAllergyHits } from './score';

export type ConclusionTone = 'match' | 'caution' | 'alert';

export type ProductConclusion = {
  tone: ConclusionTone;
  /** 한 줄 결론 (화면 최상단) */
  headline: string;
  /** 보조 한 줄 (선택) */
  subline?: string;
};

export type ProductConclusionOptions = {
  /**
   * 실제 반려동물 프로필 기반인지 여부(기본 true).
   * 게스트(기본 프로필)에게는 종 불일치·알레르기 개인화 경고를 내지 않는다 —
   * 등록된 반려동물이 없는데 "강아지용이 아닙니다"라고 단정하면 안 되기 때문.
   */
  personalized?: boolean;
};

/** 상세 상단 '결론 우선' 카드용 카피.
 *
 * 판정 우선순위: 종 불일치 → 알레르기 → 데이터 부족 → 통합 적합도 점수.
 * 종 불일치와 알레르기는 기본 점수가 높더라도 추천 문구를 노출하지 않는다.
 * 알레르기 판정은 점수 엔진(score.ts)과 동일한 매처를 공유한다.
 */
export function buildProductConclusion(
  product: Product,
  profile: UserPetProfile,
  report: AnalysisReport | null,
  options: ProductConclusionOptions = {},
): ProductConclusion {
  const personalized = options.personalized ?? true;

  if (personalized) {
    // 1) 종 부적합 — 강아지/고양이가 다르면 0점 판정과 같은 강도의 경고
    const expected = profile.species === 'Cat' ? 'cat' : 'dog';
    if (product.targetPetType && product.targetPetType !== 'all' && product.targetPetType !== expected) {
      const mineKo = expected === 'cat' ? '고양이' : '강아지';
      const productKo = product.targetPetType === 'cat' ? '고양이' : '강아지';
      return {
        tone: 'alert',
        headline: `${mineKo}용 제품이 아닙니다`,
        subline: `이 제품은 ${productKo}용으로 등록되어 있어 ${profile.name}에게 급여하면 안 돼요.`,
      };
    }

    // 2) 알레르기·회피 성분 — 점수와 무관하게 급여 비추천
    const hits = countAllergyHits(product, profile);
    if (hits.length > 0) {
      const first = hits[0];
      const more = hits.length > 1 ? ` 외 ${hits.length - 1}종` : '';
      return {
        tone: 'alert',
        headline: `${profile.name}에게 급여를 권하지 않아요`,
        subline: `${first}${more} 알레르기·회피 성분이 포함되어 있어요.`,
      };
    }
  }

  // 3) 데이터 부족 — 원재료·보장성분이 모두 없으면 점수로 단정하지 않는다
  const hasIngredients = (product.ingredients?.length ?? 0) > 0;
  const guaranteedAnalysis = product.guaranteedAnalysis;
  const hasNutrition = Boolean(
    guaranteedAnalysis &&
      ((guaranteedAnalysis.crudeProtein ?? 0) > 0 || (guaranteedAnalysis.crudeFat ?? 0) > 0),
  );
  if (!hasIngredients && !hasNutrition) {
    return {
      tone: 'caution',
      headline: '아직 정확히 판정하기 어려워요',
      subline: `원재료·영양 정보가 부족해 ${profile.name} 적합도를 정확히 계산하기 어려워요.`,
    };
  }

  // 4) 제품 기본 평가 — 성분·건강·고민 적합도 통합 점수
  const score = report?.score ?? 0;
  if (score >= 85) {
    return {
      tone: 'match',
      headline: `${profile.name}에게 ${score}% 잘 맞아요`,
      subline: report?.summary,
    };
  }
  if (score >= 70) {
    return {
      tone: 'match',
      headline: `${profile.name}에게 대체로 잘 맞아요 (${score}%)`,
      subline: report?.summary,
    };
  }
  if (score >= 55) {
    return {
      tone: 'caution',
      headline: `${profile.name}에게 보통이에요 (${score}%)`,
      subline: '성분표와 건강 고민 항목을 함께 확인해 주세요.',
    };
  }
  return {
    tone: 'caution',
    headline: `신중히 보시는 편이 좋아요 (${score}%)`,
    subline: report?.summary,
  };
}
