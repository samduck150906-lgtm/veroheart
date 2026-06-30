import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  Utensils,
  Cookie,
  Pill,
  Sparkles,
  Droplets,
  Eye,
  Trash,
  Home,
} from 'lucide-react';

/**
 * Supabase `products.main_category`에 넣을 값과 동일해야 합니다.
 * (전체는 DB 값이 아니라 필터 미적용 상태)
 */
export const MAIN_CATEGORY_DB_VALUES = [
  '사료',
  '간식',
  '영양제',
  '구강관리',
  '피부·목욕·위생',
  '눈·귀·민감부위 케어',
  '배변/모래/패드',
  '생활용품·환경안전',
] as const;

export type MainCategoryDbValue = (typeof MAIN_CATEGORY_DB_VALUES)[number];

/** 탐색 화면 상단 칩 (이름 = DB main_category) */
export const SEARCH_MAIN_CATEGORIES: { name: string; icon: LucideIcon }[] = [
  { name: '전체', icon: LayoutGrid },
  { name: '사료', icon: Utensils },
  { name: '간식', icon: Cookie },
  { name: '영양제', icon: Pill },
  { name: '구강관리', icon: Sparkles },
  { name: '피부·목욕·위생', icon: Droplets },
  { name: '눈·귀·민감부위 케어', icon: Eye },
  { name: '배변/모래/패드', icon: Trash },
  { name: '생활용품·환경안전', icon: Home },
];

const VALID_CATEGORY_NAMES = new Set(SEARCH_MAIN_CATEGORIES.map((c) => c.name));

/** URL `?category=` 값을 탐색 상태로 정규화 */
export function resolveCategoryFromSearchParams(categoryParam: string | null): string {
  if (categoryParam && VALID_CATEGORY_NAMES.has(categoryParam)) return categoryParam;
  return '전체';
}

/** 홈 그리드 — `name`은 반드시 MAIN_CATEGORY_DB_VALUES와 동일 */
export const HOME_CATEGORY_ITEMS: { name: MainCategoryDbValue; emoji: string; icon: LucideIcon }[] = [
  { name: '사료', emoji: '🍖', icon: Utensils },
  { name: '간식', emoji: '🦴', icon: Cookie },
  { name: '영양제', emoji: '💊', icon: Pill },
  { name: '구강관리', emoji: '🦷', icon: Sparkles },
  { name: '피부·목욕·위생', emoji: '🧼', icon: Droplets },
  { name: '눈·귀·민감부위 케어', emoji: '👁️', icon: Eye },
  { name: '배변/모래/패드', emoji: '💩', icon: Trash },
  { name: '생활용품·환경안전', emoji: '🏠', icon: Home },
];
