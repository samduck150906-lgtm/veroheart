import type { UserPetProfile } from '../types';

export function buildHomeFeedTitle(profile: UserPetProfile | undefined, isLoggedIn: boolean): string {
  if (!isLoggedIn || !profile) return '오늘의 추천 사료';
  const name = profile.name || '우리 아이';
  return `${name}에게 맞는 사료`;
}
