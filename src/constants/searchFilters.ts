/** 가격대 프리셋 (원) */
export type PriceBand = 'any' | 'u2' | '2-4' | '4-7' | '7-10' | '10p';

export function priceBandToMinMax(band: PriceBand): { priceMin?: number; priceMax?: number } {
  switch (band) {
    case 'u2':
      return { priceMax: 20000 };
    case '2-4':
      return { priceMin: 20000, priceMax: 40000 };
    case '4-7':
      return { priceMin: 40000, priceMax: 70000 };
    case '7-10':
      return { priceMin: 70000, priceMax: 100000 };
    case '10p':
      return { priceMin: 100000 };
    default:
      return {};
  }
}

export const PRICE_BAND_LABELS: { id: PriceBand; label: string }[] = [
  { id: 'any', label: '전체' },
  { id: 'u2', label: '~2만원' },
  { id: '2-4', label: '2~4만' },
  { id: '4-7', label: '4~7만' },
  { id: '7-10', label: '7~10만' },
  { id: '10p', label: '10만원+' },
];

export const FORMULATION_OPTIONS = ['건식', '습식', '동결건조', '소프트', '에어드라이', '스튜', '파우치'];

export const HEALTH_CONCERN_OPTIONS = [
  '알레르기',
  '눈물',
  '관절',
  '신장',
  '요로',
  '피부',
  '구강',
  '비만',
  '다이어트',
  '체중',
  '소화',
  '면역',
  '스트레스',
  '심장',
  '간',
];

/** 질병(상태) 중심 태그: product_health_concerns와 1:1로 매칭되는 값이어야 함 */
export const HEALTH_DISEASE_OPTIONS = [
  '알레르기',
  '신장',
  '요로',
  '비만',
  '소화',
  '면역',
  '스트레스',
  '심장',
  '간',
];

/** 케어 부위/목적 중심 태그: product_health_concerns와 1:1로 매칭되는 값이어야 함 */
export const HEALTH_BODY_PART_OPTIONS = [
  '피부',
  '관절',
  '눈물',
  '구강',
  '다이어트',
  '체중',
];

export const LIFE_STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '퍼피·키튼', label: '퍼피·키튼' },
  { value: '성체', label: '성체' },
  { value: '시니어', label: '노령(시니어)' },
];
