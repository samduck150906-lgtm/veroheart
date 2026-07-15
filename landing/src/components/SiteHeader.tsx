"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { trackEvent } from "@/lib/analytics";

const NAV_LINKS = [
  { href: "#how-it-works", label: "이용 방법" },
  { href: "#features", label: "주요 기능" },
  { href: "#trust", label: "분석 방식" },
  { href: "#faq", label: "자주 묻는 질문" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ${
          scrolled ? "glass border-b border-ink-950/10" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
          <Link
            href="/"
            aria-label="베로로 홈"
            className="inline-flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <Image
              src="/veroro-logo.png"
              alt="VeRoRo"
              width={132}
              height={48}
              priority
              className="h-7 w-auto sm:h-8"
            />
          </Link>

          <nav aria-label="주요 메뉴" className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-ink-700 transition hover:text-ink-950"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="#waitlist"
              onClick={() => trackEvent("hero_waitlist_click", { from: "header" })}
              className="hidden rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:inline-flex"
            >
              출시 알림 받기
            </a>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-ink-950/15 text-ink-950 transition hover:bg-sand md:hidden"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                {open ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 드로어 */}
      <div id="mobile-nav" className={`md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`fixed inset-0 top-0 z-40 bg-ink-950/25 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <nav
          aria-label="모바일 메뉴"
          className={`absolute inset-x-3 top-[64px] z-50 origin-top rounded-2xl border border-ink-950/10 bg-paper p-3 shadow-soft transition-all duration-300 ${
            open ? "translate-y-0 scale-100 opacity-100" : "-translate-y-3 scale-95 opacity-0"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-base font-semibold text-ink-950 transition hover:bg-sand"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#waitlist"
            onClick={() => {
              setOpen(false);
              trackEvent("hero_waitlist_click", { from: "mobile_menu" });
            }}
            className="mt-1 block rounded-lg bg-accent px-4 py-3 text-center text-base font-bold text-ink-950"
          >
            출시 알림 받기
          </a>
        </nav>
      </div>
    </header>
  );
}
