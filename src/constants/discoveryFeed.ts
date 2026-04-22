import type { LucideIcon } from 'lucide-react';
import { Flame, Leaf, Stethoscope, ShieldCheck, Sparkles, Gift } from 'lucide-react';

export type KeywordTrend = 'up' | 'down' | 'new' | 'flat';

export interface RisingKeyword {
  rank: number;
  keyword: string;
  trend: KeywordTrend;
  delta?: number;
}

/** 홈 상단에 노출되는 실시간 급상승 탐색 키워드 (24시간 롤링). */
export const RISING_KEYWORDS: RisingKeyword[] = [
  { rank: 1, keyword: '관절 영양제', trend: 'up', delta: 4 },
  { rank: 2, keyword: '저알러지 사료', trend: 'up', delta: 2 },
  { rank: 3, keyword: '그레인프리', trend: 'flat' },
  { rank: 4, keyword: '시니어 강아지', trend: 'new' },
  { rank: 5, keyword: '노령묘 습식', trend: 'up', delta: 3 },
  { rank: 6, keyword: '요로결석 예방', trend: 'down', delta: 1 },
  { rank: 7, keyword: '수제 간식', trend: 'new' },
  { rank: 8, keyword: '오리젠', trend: 'flat' },
  { rank: 9, keyword: '치석 제거', trend: 'up', delta: 2 },
  { rank: 10, keyword: '프로바이오틱스', trend: 'down', delta: 3 },
];

export interface EditorialTopic {
  id: string;
  kicker: string;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  tint: string;
  href?: string;
  searchQuery?: string;
}

/** 에디토리얼 카드 섹션 — 수의사/전문가 큐레이션. */
export const EDITORIAL_TOPICS: EditorialTopic[] = [
  {
    id: 'vet-pick-week',
    kicker: '이번 주 수의사 픽',
    title: '환절기, 면역력 보강이 필요한 때',
    description: '오메가-3·베타글루칸 함량이 확인된 사료·영양제 6종을 묶었어요.',
    icon: Stethoscope,
    accent: '#1D4ED8',
    tint: '#EFF6FF',
    searchQuery: '면역',
  },
  {
    id: 'allergy-guide',
    kicker: '알레르기 가이드',
    title: '닭고기 알레르기 의심? 먼저 확인할 3가지',
    description: '성분표에서 놓치기 쉬운 교차오염 표기와 대체 단백질 가이드를 정리했어요.',
    icon: ShieldCheck,
    accent: '#B45309',
    tint: '#FFFBEB',
    searchQuery: '닭고기',
  },
];

export interface TimeLimitedDeal {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  endsAtHour: number;
}

/** 오늘의 특가 배너. endsAtHour는 KST 기준, 해당 시간(정시)까지 카운트다운. */
export const TODAYS_DEAL: TimeLimitedDeal = {
  id: 'flash-today',
  badge: 'TIMESALE',
  title: '오늘만 · 프리미엄 사료 최대 18% 혜택',
  subtitle: '검수 완료 제품만 선별해 쿠팡 전용 할인가로 연결합니다.',
  ctaLabel: '특가 제품 보기',
  endsAtHour: 23,
};

export interface FeaturedBrand {
  name: string;
  tagline: string;
  emblem: string;
  accent: string;
  tint: string;
}

/** 홈 추천 브랜드 스트립. 실제 카탈로그 브랜드명과 매칭되도록 유지. */
export const FEATURED_BRANDS: FeaturedBrand[] = [
  { name: '오리젠',   tagline: '생육 85%',      emblem: 'O', accent: '#92400E', tint: '#FEF3C7' },
  { name: '아카나',   tagline: '바이오로지컬',  emblem: 'A', accent: '#065F46', tint: '#D1FAE5' },
  { name: '로얄캐닌', tagline: '품종별 정밀',    emblem: 'R', accent: '#9F1239', tint: '#FFE4E6' },
  { name: '뉴트로',   tagline: '홀리스틱',       emblem: 'N', accent: '#1E40AF', tint: '#DBEAFE' },
  { name: 'ANF',      tagline: '내추럴 균형',    emblem: 'F', accent: '#6D28D9', tint: '#EDE9FE' },
  { name: '내추럴코어', tagline: '국내 프리미엄', emblem: '내', accent: '#B45309', tint: '#FEF3C7' },
];

export interface TopicTab {
  id: 'realtime' | 'vet' | 'deal';
  label: string;
  icon: LucideIcon;
}

export const TOPIC_TABS: TopicTab[] = [
  { id: 'realtime', label: '실시간 급상승', icon: Flame },
  { id: 'vet',      label: '수의사 큐레이션', icon: Leaf },
  { id: 'deal',     label: '오늘의 혜택', icon: Gift },
];

export const DISCOVERY_BANNER_ICON = Sparkles;
