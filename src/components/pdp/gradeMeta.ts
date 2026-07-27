import { gradeFromScore as canonicalGradeFromScore } from '../../utils/score';

export type SafetyTone = 'excellent' | 'good' | 'caution' | 'danger';

export interface GradeMeta {
  grade: string;
  tone: SafetyTone;
  fg: string;
  bg: string;
  ring: string;
  label: string;
}

/**
 * 0–100 score → letter grade + semantic color band.
 * 등급 경계는 utils/score.ts의 gradeFromScore(단일 진실원천)를 그대로 사용한다 —
 * 같은 점수가 화면마다 다른 등급으로 보이면 안 되기 때문. 여기서는 색·라벨만 입힌다.
 */
export function gradeMetaFromScore(score: number): GradeMeta {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const safe = { fg: 'var(--pdp-safe-fg)', bg: 'var(--pdp-safe-bg)' };
  const good = { fg: 'var(--pdp-good-fg)', bg: 'var(--pdp-good-bg)' };
  const caution = { fg: 'var(--pdp-caution-fg)', bg: 'var(--pdp-caution-bg)' };
  const danger = { fg: 'var(--pdp-danger-fg)', bg: 'var(--pdp-danger-bg)' };
  switch (canonicalGradeFromScore(s)) {
    case 'A':
      return { grade: 'A', tone: 'excellent', ...safe, ring: '#22C55E', label: '매우 안전' };
    case 'B':
      return { grade: 'B', tone: 'good', ...good, ring: '#4ADE80', label: '대체로 안전' };
    case 'C':
      return { grade: 'C', tone: 'caution', ...caution, ring: '#F59E0B', label: '확인 필요' };
    case 'D':
      return { grade: 'D', tone: 'caution', ...caution, ring: '#F97316', label: '주의' };
    default:
      return { grade: 'F', tone: 'danger', ...danger, ring: '#EF4444', label: '비추천' };
  }
}
