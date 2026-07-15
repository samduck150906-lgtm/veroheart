/**
 * 출시 전 랜딩 이벤트 트래커.
 * 개인정보(이메일·전화번호·반려동물 이름 등)는 절대 파라미터로 넘기지 않는다.
 */

export type LandingEvent =
  | "hero_waitlist_click"
  | "preview_click"
  | "feature_section_view"
  | "analysis_demo_view"
  | "waitlist_form_start"
  | "waitlist_submit"
  | "waitlist_success"
  | "waitlist_error"
  | "faq_open"
  | "beta_apply_click";

type EventProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export function trackEvent(event: LandingEvent, props?: EventProps): void {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...props });

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event, props ?? {});
  }
}
