// 베로로 디자인 토큰 — 단일 소스(single source of truth).
//
// 이 파일이 앱 전체의 색·라운드·그림자·타이포의 "유일한" 출처입니다.
// 인라인 스타일(TS)에서 쓰는 값은 여기서 import 하고, CSS에서 쓰는 값은
// src/index.css 의 :root 변수를 씁니다. 두 곳의 값은 항상 동일하게 유지하세요.
//
// 규칙
//  1) 페이지/컴포넌트에서 색 hex 를 새로 찍지 말 것. 반드시 여기서 가져다 쓸 것.
//  2) 등급 색은 gradeColor()/GRADE 만 사용 (페이지별 GRADE_COLORS 재정의 금지).
//  3) 점수 게이지는 scoreColor()/scoreLabel() 만 사용.
//  admin 페이지(src/pages/admin/**)는 별도 SaaS 테마를 쓰므로 이 토큰을 쓰지 않습니다.

/* ===== Ink 스케일 (텍스트) — Toss 톤. CSS: --text-dark/--text-muted/... ===== */
export const INK = '#191F28'; // 제목/숫자        (--text-dark, ink-900)
export const SUB = '#4E5968'; // 본문            (--text-muted, ink-600)
export const INK_500 = '#6B7684'; // 보조 본문    (--text-light)
export const MUTED = '#8B95A1'; // 캡션/비활성     (--ink-400)
export const INK_300 = '#B0B8C1'; // 더 흐린 보조  (--ink-300)

/* ===== 라인 / 면 ===== */
export const LINE = '#EAEDF0'; // 구분선          (--hairline)
export const LINE_STRONG = '#E5E8EB'; // 진한 구분선 (--hairline-strong)
export const FILL = '#F2F4F6'; // 카드 보조 배경   (--fill)
export const BG = '#F7F4EE'; // 앱 캔버스         (--bg-color)
export const SURFACE = '#FFFFFF'; // 카드/시트     (--surface-elevated)

/* ===== 브랜드(Saffron Gold) ===== */
export const BRAND = '#F5C518'; // (--primary)
export const BRAND_DEEP = '#CA8A04'; // (--primary-dark)
export const BRAND_TINT = '#FEFCE8'; // (--primary-light)
export const INK_ON_BRAND = '#241B00'; // 골드 위 텍스트 (--ink-on-brand)

/* ===== 시그널 + tint ===== */
export const SAFE = '#15B36B';
export const SAFE_TINT = '#E7F8F0';
export const WARN = '#E8A800'; // 주의/B등급 (--caution)
export const WARN_TINT = '#FEF6E0';
export const DANGER = '#F04452';
export const DANGER_TINT = '#FDECEE';

/* ===== 그림자 — 카드 한 체계로 통일 ===== */
export const SHADOW = {
  card: '0 2px 10px rgba(17,24,39,0.045)',
  sm: '0 1px 8px rgba(17,24,39,0.05)',
  lg: '0 6px 20px rgba(30,41,59,0.10)',
} as const;
/** 하위호환 별칭 — 기존 페이지의 CARD / CARD_SM 상수를 대체 */
export const CARD = SHADOW.card;
export const CARD_SM = SHADOW.sm;

/* ===== 라운드 스케일 — CSS --border-radius-* 와 동일 ===== */
export const RADIUS = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/* ===== 타이포 스케일 (px / weight) — 모든 텍스트는 이 토큰만 사용 ===== */
export const T = {
  score: { fontSize: 28, fontWeight: 800, color: INK, letterSpacing: '-0.03em', lineHeight: 1 },
  h1: { fontSize: 20, fontWeight: 800, color: INK, letterSpacing: '-0.03em', lineHeight: 1.32 },
  section: { fontSize: 18, fontWeight: 800, color: INK, letterSpacing: '-0.03em', lineHeight: 1.25 },
  title: { fontSize: 15, fontWeight: 700, color: INK, letterSpacing: '-0.02em', lineHeight: 1.3 },
  price: { fontSize: 15, fontWeight: 800, color: INK, letterSpacing: '-0.02em' },
  body: { fontSize: 14, fontWeight: 600, color: INK, letterSpacing: '-0.01em' },
  prodName: { fontSize: 13, fontWeight: 600, color: INK, letterSpacing: '-0.01em', lineHeight: 1.36 },
  sub: { fontSize: 13, fontWeight: 500, color: SUB, letterSpacing: '-0.01em', lineHeight: 1.4 },
  cap: { fontSize: 12, fontWeight: 500, color: MUTED, letterSpacing: '-0.01em' },
  micro: { fontSize: 11, fontWeight: 700, letterSpacing: '-0.01em' },
} as const;

/* ===== 등급 색 — 단일 소스. productGrade.ts 의 GRADE_META(CSS 변수)와 동일 값 =====
   A=초록 / B=앰버 / C·D=빨강 / S=초록 / F·pending=회색. 페이지별 재정의 금지. */
export interface GradeStyle {
  color: string;
  bg: string;
  letter: string;
}
export const GRADE: Record<string, GradeStyle> = {
  S: { color: SAFE, bg: SAFE_TINT, letter: 'S' },
  A: { color: SAFE, bg: SAFE_TINT, letter: 'A' },
  B: { color: WARN, bg: WARN_TINT, letter: 'B' },
  C: { color: DANGER, bg: DANGER_TINT, letter: 'C' },
  D: { color: DANGER, bg: DANGER_TINT, letter: 'D' },
  F: { color: MUTED, bg: FILL, letter: 'F' },
  pending: { color: MUTED, bg: FILL, letter: '·' },
};
/** 등급 → 스타일. 알 수 없는 등급은 중립 회색. */
export const gradeColor = (grade?: string | null): GradeStyle =>
  (grade && GRADE[grade]) || GRADE.pending;

/* ===== 점수 게이지(0–100) — 모든 페이지 동일 색/문구 ===== */
export const scoreColor = (s: number): string =>
  s >= 85 ? SAFE : s >= 70 ? '#F5C842' : '#FF8A00';
export const scoreLabel = (s: number): string =>
  s >= 90 ? '최고예요' : s >= 80 ? '아주 좋아요' : s >= 70 ? '양호해요' : '관리가 필요해요';

/* ===== 성분 위험도(risk) — Detail 등에서 공유 ===== */
export const RISK_COLOR: Record<'safe' | 'caution' | 'danger', string> = {
  safe: SAFE,
  caution: WARN,
  danger: DANGER,
};
export const RISK_BG: Record<'safe' | 'caution' | 'danger', string> = {
  safe: SAFE_TINT,
  caution: WARN_TINT,
  danger: DANGER_TINT,
};
export const RISK_LABEL: Record<'safe' | 'caution' | 'danger', string> = {
  safe: '안전',
  caution: '주의',
  danger: '위험',
};
