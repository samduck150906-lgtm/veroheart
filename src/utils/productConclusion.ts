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

/** 상세 상단 '결론 우선' 카드용 카피.
 *
 * 판정 우선순위(§6): 명확한 개인화 위험(알레르기) → 종/제품유형 부적합 →
 * 데이터 부족 → 제품 기본 평가(점수). 상위 신호가 있으면 기본 점수가 높아도
 * 그 신호가 최종 결론이 된다. (여러 점수를 병렬로 두지 않고 하나의 결론으로 수렴) */
export function buildProductConclusion(
  product: Product,
  profile: UserPetProfile,
  report: AnalysisReport | null
): ProductConclusion {
  // 1) 명확한 개인화 위험 — 알레르기/회피 성분(기본 점수보다 우선)
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

  // 2) 종 부적합 — 강아지/고양이가 다르면(‘전체’·미표기는 제외) 경고
  const expected = profile.species === 'Cat' ? 'cat' : 'dog';
  if (product.targetPetType && product.targetPetType !== 'all' && product.targetPetType !== expected) {
    const mineKo = expected === 'cat' ? '고양이' : '강아지';
    const prodKo = product.targetPetType === 'cat' ? '고양이' : '강아지';
    return {
      tone: 'caution',
      headline: `${mineKo}에게 맞는 제품인지 확인해 주세요`,
      subline: `이 제품은 ${prodKo}용으로 표시돼 있어요.`,
    };
  }

  // 3) 데이터 부족 — 원재료·보장성분이 모두 없으면 점수로 단정하지 않는다
  const hasIngredients = (product.ingredients?.length ?? 0) > 0;
  const ga = product.guaranteedAnalysis;
  const hasNutrition = Boolean(ga && ((ga.crudeProtein ?? 0) > 0 || (ga.crudeFat ?? 0) > 0));
  if (!hasIngredients && !hasNutrition) {
    return {
      tone: 'caution',
      headline: '아직 정확히 판정하기 어려워요',
      subline: `원재료·영양 정보가 부족해 ${profile.name} 적합도를 계산하지 못했어요.`,
    };
  }

  // 4) 제품 기본 평가 — 점수 기반
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
