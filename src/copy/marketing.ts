/**
 * 베로로 브랜드·기능·UGC 카피 (단일 소스)
 */

/** 스플래시 로딩 화면에서 로테이션 */
export const SPLASH_TAGLINES = [
  '우리 아이가 먹는 모든 것, 의심 대신 베로로 하세요.',
  '집사의 마음은 진심(Vero)이니까, 성분 분석은 베로로가 합니다.',
  '로니와 삼덕이의 건강한 식탁을 위한 가장 쉬운 습관',
  '세상에 나쁜 성분은 있어도, 나쁜 집사는 없으니까.',
] as const;

/** 홈 히어로 (고정 구성) */
export const HOME_HERO = {
  headline: '우리 아이가 먹는 모든 것, 의심 대신 베로로 하세요.',
  sub: '집사의 마음은 진심(Vero)이니까, 성분 분석은 베로로가 합니다.',
  customTable: '로니와 삼덕이의 건강한 식탁을 위한 가장 쉬운 습관',
  footnote: '세상에 나쁜 성분은 있어도, 나쁜 집사는 없으니까.',
} as const;

/** 성분 분석 · OCR */
export const CORE_COPY = {
  ocr: '사료 뒷면 성분표, 사진 한 장이면 충분해요.',
  dangerHighlight: '위험 성분 하이라이트: 빨간색만 피하면 안심이에요.',
  allergyAlert: '알레르기 주의보! 우리 애가 못 먹는 원료가 포함되어 있어요.',
  thorough: '성분은 꼼꼼하게, 분석은 깐깐하게.',
} as const;

/** 리뷰 · 커뮤니티 */
export const UGC_COPY = {
  honestReviews: "광고 없는 집사들의 '찐' 리뷰만 모았어요.",
  palatability: '기호성 체크: 우리 애는 냄새만 맡고 도망갔어요(ㅠㅠ)',
  allergyList: '같은 알레르기를 가진 집사들의 사료 추천 리스트',
  settleDown: '사료 유목민 끝! 베로로에서 정착템 찾기',
} as const;

export function pickSplashTagline(): string {
  const i = Math.floor(Math.random() * SPLASH_TAGLINES.length);
  return SPLASH_TAGLINES[i];
}
