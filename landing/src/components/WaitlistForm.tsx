"use client";

import { useRef, useState, type FormEvent } from "react";
import { isValidEmail, submitWaitlist } from "@/lib/waitlist";
import { trackEvent } from "@/lib/analytics";
import { CheckIcon, MailIcon } from "@/components/icons";

type Status = "idle" | "submitting" | "success" | "duplicate" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldError, setFieldError] = useState<"email" | "privacy" | null>(null);
  const startedRef = useRef(false);

  const handleFocusStart = () => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("waitlist_form_start");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      setFieldError("email");
      setStatus("idle");
      return;
    }
    if (!privacyConsent) {
      setFieldError("privacy");
      setStatus("idle");
      return;
    }
    setFieldError(null);

    setStatus("submitting");
    trackEvent("waitlist_submit");

    const result = await submitWaitlist({
      email: email.trim(),
      phone: phone.trim() || undefined,
      privacyConsent,
      marketingConsent,
    });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      trackEvent("waitlist_error");
      return;
    }

    setStatus(result.duplicate ? "duplicate" : "success");
    trackEvent("waitlist_success", { duplicate: result.duplicate });
  };

  if (status === "success" || status === "duplicate") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-safe-soft px-6 py-10 text-center">
        <CheckIcon className="h-6 w-6 text-safe-deep" />
        <p className="text-base font-bold text-ink-950">
          {status === "duplicate"
            ? "이미 신청해 주셨어요. 감사해요!"
            : "출시 알림 신청이 완료됐어요."}
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-ink-700">
          정식 출시와 베타테스트 모집 소식을 가장 먼저 전해 드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-describedby="waitlist-privacy-note">
      <div>
        <label htmlFor="waitlist-email" className="mb-1.5 block text-sm font-semibold text-ink-950">
          이메일 <span className="text-accent">*</span>
        </label>
        <div className="relative">
          <MailIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input
            id="waitlist-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onFocus={handleFocusStart}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError === "email") setFieldError(null);
            }}
            aria-invalid={fieldError === "email"}
            aria-describedby={fieldError === "email" ? "waitlist-email-error" : undefined}
            placeholder="example@email.com"
            className="w-full rounded-lg border border-ink-950/15 bg-paper py-3.5 pl-11 pr-4 text-sm text-ink-950 outline-none transition placeholder:text-ink-300 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        {fieldError === "email" && (
          <p id="waitlist-email-error" className="mt-1.5 text-xs font-medium text-risk-deep">
            올바른 이메일 형식을 입력해 주세요.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="waitlist-phone" className="mb-1.5 block text-sm font-semibold text-ink-950">
          휴대전화 번호 <span className="text-ink-500">(선택)</span>
        </label>
        <input
          id="waitlist-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onFocus={handleFocusStart}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-ink-950/15 bg-paper px-4 py-3.5 text-sm text-ink-950 outline-none transition placeholder:text-ink-300 focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="space-y-2.5 pt-1">
        <label className="flex items-start gap-2.5 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={privacyConsent}
            onChange={(e) => {
              setPrivacyConsent(e.target.checked);
              if (fieldError === "privacy") setFieldError(null);
            }}
            aria-describedby={fieldError === "privacy" ? "waitlist-privacy-error" : undefined}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-ink-950/30 text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <span>
            개인정보 수집·이용에 동의합니다 <span className="text-accent">(필수)</span>
          </span>
        </label>
        {fieldError === "privacy" && (
          <p id="waitlist-privacy-error" className="pl-[26px] text-xs font-medium text-risk-deep">
            개인정보 수집·이용에 동의해 주셔야 신청할 수 있어요.
          </p>
        )}
        <label className="flex items-start gap-2.5 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => setMarketingConsent(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-ink-950/30 text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <span>
            출시 소식 외 마케팅 정보 수신에 동의합니다{" "}
            <span className="text-ink-500">(선택)</span>
          </span>
        </label>
      </div>

      <p id="waitlist-privacy-note" className="text-xs leading-relaxed text-ink-500">
        수집 항목: 이메일, 휴대전화번호(선택) · 수집 목적: 출시·베타테스트
        소식 안내 · 보유 기간: 신청일로부터 1년 또는 목적 달성 시까지
        (정식 회원 전환 시 즉시 파기)
      </p>

      {status === "error" && (
        <p role="alert" className="text-sm font-medium text-risk-deep">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-4 text-sm font-bold text-ink-950 transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "신청 처리 중…" : "출시 알림 신청하기"}
      </button>
    </form>
  );
}
