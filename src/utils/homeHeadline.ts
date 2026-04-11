import type { UserPetProfile } from '../types';

function ageLabel(age: number): string {
  if (age <= 2) return '아기';
  if (age >= 9) return '시니어';
  return '성인';
}

/** 홈 상단 한 줄 타이틀 — 나이·이름·건강 고민 조합 (텍스트 최소) */
export function buildHomeFeedTitle(profile: UserPetProfile, isLoggedIn: boolean): string {
  if (!isLoggedIn) return '오늘의 맞춤 피드';
  const name = profile.name?.trim() || '우리 아이';
  const ageWord = ageLabel(profile.age);
  const species = profile.species === 'Cat' ? '고양이' : '강아지';
  const topConcern = profile.healthConcerns[0];

  if (topConcern) {
    return `${ageWord} ${name}의 ${topConcern} 맞춤 ${species} 피드`;
  }
  return `${ageWord} ${name}를 위한 맞춤 ${species} 피드`;
}
