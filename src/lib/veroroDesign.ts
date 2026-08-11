/**
 * VERORO 디자인 토큰 — Claude Design 핸드오프 `VERORO App.dc.html`의
 * GC / LVL / YEL / INK / SUB / LINE 상수를 코드에서 그대로 참조하기 위한 모듈.
 * 색 값의 단일 출처는 CSS(`src/styles/veroro-design.css`)이며,
 * 여기서는 인라인 스타일에서 쓸 수 있도록 var() 참조를 노출한다.
 */

/** 원본 프로토타입의 리터럴 값 — 다크 테마 영향을 받지 않아야 하는 곳(잉크 위 요소 등)에 쓴다. */
export const VR_RAW = {
  ink: '#15150F',
  yellow: '#FFD90A',
  yellowInk: '#6B5C00',
  sub: '#8A8A7C',
  line: '#E3E1D8',
  white: '#FFFFFF',
} as const;

/** 테마를 따라가는 토큰 참조 */
export const VR = {
  ink: 'var(--vr-ink)',
  yellow: 'var(--vr-yellow)',
  yellowInk: 'var(--vr-yellow-ink)',
  yellowDeep: 'var(--vr-yellow-deep)',
  yellowSoft: 'var(--vr-yellow-soft)',
  yellowTint: 'var(--vr-yellow-tint)',
  sub: 'var(--vr-sub)',
  line: 'var(--vr-line)',
  cardLine: 'var(--vr-card-line)',
  rowLine: 'var(--vr-row-line)',
  soft: 'var(--vr-soft)',
  soft2: 'var(--vr-soft-2)',
  body: 'var(--vr-body)',
  muted: 'var(--vr-muted)',
  faint: 'var(--vr-faint)',
  disabled: 'var(--vr-disabled)',
  mono: 'var(--vr-mono)',
  surface: 'var(--surface)',
} as const;

export type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'F';

export interface GradePalette {
  /** 글자색 */
  fg: string;
  /** 배경색 */
  bg: string;
}

/** GC 상수 — 등급별 (글자색, 배경색) */
export const GRADE_PALETTE: Record<GradeLetter, GradePalette> = {
  A: { fg: 'var(--vr-grade-a-fg)', bg: 'var(--vr-grade-a-bg)' },
  B: { fg: 'var(--vr-grade-b-fg)', bg: 'var(--vr-grade-b-bg)' },
  C: { fg: 'var(--vr-grade-c-fg)', bg: 'var(--vr-grade-c-bg)' },
  D: { fg: 'var(--vr-grade-d-fg)', bg: 'var(--vr-grade-d-bg)' },
  F: { fg: 'var(--vr-grade-f-fg)', bg: 'var(--vr-grade-f-bg)' },
};

export function isGradeLetter(value: string): value is GradeLetter {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'F';
}

/** 등급 문자를 색 팔레트로. 알 수 없는 값은 F 취급(가장 보수적). */
export function gradePalette(grade: string): GradePalette {
  const key = grade.trim().toUpperCase().charAt(0);
  return isGradeLetter(key) ? GRADE_PALETTE[key] : GRADE_PALETTE.F;
}

/** 등급별 한 줄 판정 문구 — 프로토타입 verdicts 맵 */
export const GRADE_VERDICT: Record<GradeLetter, string> = {
  A: '믹스 없이 바로 급여 가능',
  B: '대체로 괜찮아',
  C: '몇 가지 확인 필요',
  D: '주의해서 봐',
  F: '권하지 않아',
};

export function gradeVerdict(grade: string): string {
  const key = grade.trim().toUpperCase().charAt(0);
  return isGradeLetter(key) ? GRADE_VERDICT[key] : GRADE_VERDICT.F;
}

/** 성분 신호등 레벨 — LVL 상수 */
export type SignalLevel = 'good' | 'warn' | 'risk';

export const SIGNAL_PALETTE: Record<SignalLevel, GradePalette> = {
  good: { fg: 'var(--vr-signal-good-fg)', bg: 'var(--vr-signal-good-bg)' },
  warn: { fg: 'var(--vr-signal-warn-fg)', bg: 'var(--vr-signal-warn-bg)' },
  risk: { fg: 'var(--vr-signal-risk-fg)', bg: 'var(--vr-signal-risk-bg)' },
};

/** 제품명/브랜드에서 이미지 자리에 쓸 2글자 모노그램을 만든다. */
export function monogram(source: string): string {
  const cleaned = source.replace(/[^A-Za-z가-힣0-9]/g, '');
  if (!cleaned) return '··';
  const ascii = cleaned.match(/[A-Za-z]/g);
  if (ascii && ascii.length >= 2) return (ascii[0] + ascii[1]).toUpperCase();
  return cleaned.slice(0, 2);
}

/** 프로필 적합도 한 줄 요약 — 프로토타입 fitShort */
export function fitShortLabel(score: number, petName: string): string {
  if (score >= 90) return `${petName}에게 딱`;
  if (score >= 70) return '무난해';
  return '주의 성분 있음';
}
