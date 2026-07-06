import type { LucideIcon } from 'lucide-react';
import { Soup, Fish, Bone, Pill, Snowflake, Beef, Smile, Scale } from 'lucide-react';

export interface HomeCategoryItem {
  name: string;
  icon: LucideIcon;
  /** 아이콘 배경 톤 */
  tint: string;
  /** 아이콘 색 */
  color: string;
}

/** 홈 카테고리 퀵 스트립 — 이모지 대신 통일된 라인 아이콘 + 톤 배경 */
export const HOME_CATEGORY_ITEMS: HomeCategoryItem[] = [
  { name: '건식사료', icon: Soup, tint: 'rgba(245, 158, 11, 0.12)', color: '#D97706' },
  { name: '습식사료', icon: Fish, tint: 'rgba(59, 130, 246, 0.12)', color: '#2563EB' },
  { name: '간식', icon: Bone, tint: 'rgba(249, 115, 22, 0.12)', color: '#EA580C' },
  { name: '영양제', icon: Pill, tint: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5' },
  { name: '동결건조', icon: Snowflake, tint: 'rgba(6, 182, 212, 0.12)', color: '#0891B2' },
  { name: '생식', icon: Beef, tint: 'rgba(244, 63, 94, 0.12)', color: '#E11D48' },
  { name: '치아·구강', icon: Smile, tint: 'rgba(20, 184, 166, 0.12)', color: '#0D9488' },
  { name: '다이어트', icon: Scale, tint: 'rgba(34, 197, 94, 0.12)', color: '#16A34A' },
];
