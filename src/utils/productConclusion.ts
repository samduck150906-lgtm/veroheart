import type { Product, UserPetProfile } from '../types';
import type { AnalysisReport } from './analysis';
import { countAllergyCautions, countAllergyHits } from './score';

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
 * 판정 우선순위: 종 불일치 → HARD 알레르기 → 알레르기 관련 caution → 데이터 부족 → 통합 적합도 점수.
 * 종 불일치와 HARD 알레르기는 기본 점수가 높더라도 추천 문구를 노출하지 않는다.
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

    // 2) HARD 알레르기·회피 성분 — 점수와 무관하게 급여 비추천
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

    // 3) 관련 가금류·가공형태 caution — 확정 알레르기로 과장하지 않되 최상단에서 눈에 띄게 노출
    const cautions = countAllergyCautions(product, profile);
    if (cautions.length > 0) {
      const strong = cautions.find((match) => match.kind === 'strong_caution');
      if (strong) {
        return {
          tone: 'caution',
          headline: '알레르기 원료 포함 가능성을 확인해 주세요',
          subline: `가금류 원료가 포괄적으로 표기되어 있어 ${profile.name}의 등록 알레르기 원료가 포함됐는지 성분 출처를 확인하는 편이 안전해요.`,
        };
      }

      const cross = cautions.filter((match) => match.kind === 'cross_caution');
      if (cross.length > 0) {
        const ingredients = [...new Set(cross.map((match) => match.ingredientName))].slice(0, 3);
        return {
          tone: 'caution',
          headline: '관련 가금류 성분을 주의해 주세요',
          subline: `${profile.name}의 등록 알레르기와 같은 가금류 계열인 ${ingredients.join(', ')} 성분이 있어요. 교차반응 가능성이 보고되어 있어 처음 급여하거나 과거 반응 이력이 있다면 특히 주의해 주세요.`,
        };
      }

      if (cautions.some((match) => match.kind === 'hydrolysis_caution')) {
        return {
          tone: 'caution',
          headline: '가수분해 알레르기 원료를 확인해 주세요',
          subline: '가수분해 정도에 따라 반응 가능성이 달라질 수 있어, 원료 정보와 수의사 안내를 함께 확인하는 편이 좋아요.',
        };
      }

      if (cautions.some((match) => match.kind === 'processing_caution')) {
        return {
          tone: 'caution',
          headline: '관련 가금류 지방 성분이 있어요',
          subline: '고기 단백질과 동일한 확정 알레르기로 보지는 않지만, 정제도와 잔류 단백질을 알 수 없어 주의가 필요해요.',
        };
      }
    }
  }

  // 4) 데이터 부족 — 원재료·보장성분이 모두 없으면 점수로 단정하지 않는다
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

  // 5) 제품 기본 평가 — 성분·건강·고민 적합도 통합 점수
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