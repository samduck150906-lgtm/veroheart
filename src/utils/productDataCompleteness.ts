import type { Product } from '../types';

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
  const hasIngredients = (product.ingredients?.length ?? 0) > 0;
  const analysis = product.guaranteedAnalysis;
  // 성분 분석표는 값이 하나라도 실제로 들어와야 의미가 있다.
  const hasNutrition = Boolean(
    analysis && Object.values(analysis).some((value) => typeof value === 'number' && Number.isFinite(value)),
  );

  if (hasIngredients && hasNutrition) return 'full';
  if (hasIngredients) return 'partial';
  return 'minimal';
}

export function describeProductCompleteness(product: Product): ProductCompletenessDisplay {
  switch (resolveProductCompleteness(product)) {
    case 'full':
      return { level: 'full', label: '원료·영양 정보 확인됨', detail: '' };
    case 'partial':
      return {
        level: 'partial',
        label: '일부 정보만 확인할 수 있어요',
        detail: '원료는 확인했지만 영양성분이 등록되지 않아 급여량·영양 균형은 분석할 수 없어요.',
      };
    default:
      return {
        level: 'minimal',
        label: '원료 정보가 아직 없어요',
        detail: '원료가 등록되면 우리 아이 기준으로 분석해 줄게요.',
      };
  }
}
