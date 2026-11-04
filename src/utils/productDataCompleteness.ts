import type { Product } from '../types';
import { readinessFromStoredStatus } from '../analysis/analysisReadiness';
import { getNutritionPresentation } from '../analysis/nutritionReadiness';

export function describeIngredientAvailability(product: Product): { label: string; detail: string } {
  if (product.ingredientDataLoaded === false) {
    return { label: '원료 보기', detail: '상세 화면에서 전성분 정보를 확인해 주세요.' };
  }
  const known = product.ingredients?.length ?? 0;
  const unknown = product.unknownIngredientTerms?.length ?? 0;
  const { status } = readinessFromStoredStatus(product.analysisStatus, known, unknown);
  if (status === 'blocked') return { label: '원료 표기 확인 필요', detail: '전성분 표기가 서로 달라 전체 점수를 계산하지 않았습니다. 아래 원료 목록을 확인해 주세요.' };
  if (status === 'unavailable' && known > 0 && unknown === 0) {
    return { label: `원료 ${known}개 등록`, detail: '등록된 원료는 아래에서 확인할 수 있습니다. 전성분 라벨 대조와 원료별 분석은 별도로 진행합니다.' };
  }
  if (status !== 'ready' && known + unknown > 0) {
    return { label: `원료 ${known + unknown}개 등록`, detail: `등록된 원료 중 ${unknown}개는 분석 준비 중입니다. 원료 목록은 아래에서 확인할 수 있습니다.` };
  }
  if (known + unknown === 0) return { label: '원료 등록 필요', detail: '이 제품의 전성분 표기가 아직 등록되지 않았습니다.' };
  return { label: '원료 확인 가능', detail: '등록된 전성분을 바탕으로 분석했습니다.' };
}

/**
 * 제품 정보가 얼마나 갖춰졌는지 — 사용자에게 보여줄 상태.
 *
 * 예전에는 제품 상세에 `verification_status` 를 그대로 옮겨 '검수 대기' / '검수 완료'
 * 배지를 띄웠다. 이건 운영자가 데이터를 확인했는지를 나타내는 내부 상태고, 보호자에게는
 * 무슨 뜻인지도, 무엇을 하라는 것인지도 알 수 없다. 게다가 운영 DB 에서 verified 인
 * 제품이 0건이라 사실상 모든 제품에 '검수 대기' 가 붙어 있었다.
 *
 * 대신 "이 제품으로 무엇까지 확인할 수 있는지" 를 실제 데이터로 판단해서 알려 준다.
 * 운영자용 검수 상태는 관리자 콘솔에만 둔다.
 */
export type ProductDataCompleteness = 'full' | 'partial' | 'minimal';

export interface ProductCompletenessDisplay {
  level: ProductDataCompleteness;
  label: string;
  /** 배지에 곁들일 짧은 설명. 정보가 충분하면 비운다. */
  detail: string;
}

export function resolveProductCompleteness(product: Product): ProductDataCompleteness {
  const hasIngredients = (product.ingredients?.length ?? 0) + (product.unknownIngredientTerms?.length ?? 0) > 0;
  const nutrition = getNutritionPresentation(product.guaranteedAnalysis);
  if (hasIngredients && !nutrition.limited && !product.unknownIngredientTerms?.length) return 'full';
  if (hasIngredients) return 'partial';
  return 'minimal';
}

export function describeProductCompleteness(product: Product): ProductCompletenessDisplay {
  if (product.ingredientDataLoaded === false) return { level: 'minimal', ...describeIngredientAvailability(product) };
  if (product.unknownIngredientTerms?.length) return { level: 'partial', ...describeIngredientAvailability(product) };
  switch (resolveProductCompleteness(product)) {
    case 'full':
      return { level: 'full', label: '원료·기초 영양 정보 확인됨', detail: '' };
    case 'partial':
      return {
        level: 'partial',
        label: '일부 정보만 확인할 수 있습니다',
        detail: getNutritionPresentation(product.guaranteedAnalysis).notice,
      };
    default:
      return {
        level: 'minimal',
        label: '원료 정보가 아직 없습니다',
        detail: '원료가 등록되면 우리 아이 기준으로 분석해 드립니다.',
      };
  }
}
