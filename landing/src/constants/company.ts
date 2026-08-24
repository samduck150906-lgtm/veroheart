/**
 * 름랩(REUMLAB) 사업자·연락처 정보.
 * src/constants/companyInfo.ts(메인 앱)와 동일한 값을 유지한다 — 임의 생성 금지.
 */
export const COMPANY = {
  tradeName: "름랩(REUMLAB)",
  representative: "성아름",
  bizRegNo: "793-12-03247",
  phone: "010-8111-9370",
  phoneTelHref: "tel:010-8111-9370",
  address: "경기도 화성시 동탄구 첨단산업1로 58, 307호",
  email: "veroro@eternalsix.com",
} as const;

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || COMPANY.email;

export const SOCIAL_INSTAGRAM =
  process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() || null;

export const SOCIAL_YOUTUBE =
  process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL?.trim() || null;

export const CONTACT_MAILTO = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
