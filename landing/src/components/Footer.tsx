import Link from "next/link";
import Image from "next/image";
import { COMPANY, CONTACT_MAILTO, SOCIAL_INSTAGRAM, SOCIAL_YOUTUBE } from "@/constants/company";

const COUPANG_PARTNERS_DISCLOSURE =
  "이 서비스에서 안내되는 일부 구매처 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.";

export function Footer() {
  return (
    <footer className="border-t border-ink-800/10 bg-cream-100 py-14" aria-label="푸터">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <Image
            src="/veroro-logo.png"
            alt="VeRoRo"
            width={120}
            height={44}
            className="h-8 w-auto"
          />
          <p className="mt-4 space-y-1 text-xs leading-relaxed text-ink-800/60">
            <span className="block">
              {COMPANY.tradeName} · 대표 {COMPANY.representative}
            </span>
            <span className="block">
              사업자등록번호 {COMPANY.bizRegNo} · 통신판매업 {COMPANY.mailOrderBizNo}
            </span>
            <span className="block">{COMPANY.address}</span>
            <span className="block">
              고객센터 {COMPANY.phone} · {COMPANY.email}
            </span>
          </p>
          <p className="mt-4 text-[11px] leading-relaxed text-ink-800/45">
            {COUPANG_PARTNERS_DISCLOSURE}
          </p>
        </div>

        <nav aria-label="정책" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <Link
            href="/terms"
            className="font-medium text-ink-800/80 underline-offset-4 transition hover:text-gold-deep hover:underline"
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="font-medium text-ink-800/80 underline-offset-4 transition hover:text-gold-deep hover:underline"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/refund"
            className="font-medium text-ink-800/80 underline-offset-4 transition hover:text-gold-deep hover:underline"
          >
            취소 및 환불 안내
          </Link>
          <a
            href={CONTACT_MAILTO("[VeRoRo] 문의")}
            className="font-medium text-ink-800/80 underline-offset-4 transition hover:text-gold-deep hover:underline"
          >
            고객센터 문의
          </a>
        </nav>

        {(SOCIAL_INSTAGRAM || SOCIAL_YOUTUBE) && (
          <div className="flex gap-3">
            {SOCIAL_INSTAGRAM && (
              <a
                href={SOCIAL_INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-800/15 bg-white text-gold-deep transition hover:bg-gold-soft"
                aria-label="Instagram"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
            {SOCIAL_YOUTUBE && (
              <a
                href={SOCIAL_YOUTUBE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-800/15 bg-white text-gold-deep transition hover:bg-gold-soft"
                aria-label="YouTube"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
                  <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-5 text-center text-xs text-ink-800/45 sm:px-6">
        © {new Date().getFullYear()} {COMPANY.tradeName}. All rights reserved.
      </p>
    </footer>
  );
}
