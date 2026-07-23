export interface FeaturedBrand {
  name: string;
  tagline: string;
  emblem: string;
  accent: string;
  tint: string;
}

/** 홈 "브랜드로 탐색" 스트립. 실제 카탈로그 브랜드명과 매칭되도록 유지. */
export const FEATURED_BRANDS: FeaturedBrand[] = [
  { name: '오리젠',   tagline: '생육 85%',      emblem: 'O', accent: '#92400E', tint: '#FEF3C7' },
  { name: '아카나',   tagline: '바이오로지컬',  emblem: 'A', accent: '#065F46', tint: '#D1FAE5' },
  { name: '로얄캐닌', tagline: '품종별 정밀',    emblem: 'R', accent: '#9F1239', tint: '#FFE4E6' },
  { name: '뉴트로',   tagline: '홀리스틱',       emblem: 'N', accent: '#1E40AF', tint: '#DBEAFE' },
  { name: 'ANF',      tagline: '내추럴 균형',    emblem: 'F', accent: '#6D28D9', tint: '#EDE9FE' },
  { name: '내추럴코어', tagline: '국내 프리미엄', emblem: '내', accent: '#B45309', tint: '#FEF3C7' },
];
