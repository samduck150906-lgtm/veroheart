/**
 * 출시 알림 신청 폼 → Supabase Edge Function(waitlist-signup) 클라이언트 래퍼.
 *
 * 메인 앱(src/lib/supabase.ts)과 동일한 Supabase 프로젝트·패턴을 사용한다.
 * anon 키만 클라이언트에 노출되며, 실제 삽입은 service_role 키로 Edge Function
 * 내부에서만 수행된다(NEXT_PUBLIC_* 로 service_role 키를 절대 넣지 말 것).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const IS_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export type WaitlistPayload = {
  email: string;
  phone?: string;
  marketingConsent: boolean;
  privacyConsent: boolean;
};

export type WaitlistResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export async function submitWaitlist(
  payload: WaitlistPayload,
): Promise<WaitlistResult> {
  if (!IS_CONFIGURED) {
    // 백엔드 연결 정보가 없는 환경(예: 로컬 미리보기)에서는 성공한 척하지 않는다.
    return {
      ok: false,
      error:
        "신청 폼이 아직 연결되지 않았어요. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.",
    };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/waitlist-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ...payload, source: "landing" }),
    });

    if (res.status === 409) {
      return { ok: true, duplicate: true };
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return {
        ok: false,
        error:
          (body && typeof body.error === "string" && body.error) ||
          "신청 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
      };
    }

    return { ok: true, duplicate: false };
  } catch {
    return {
      ok: false,
      error: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.",
    };
  }
}
