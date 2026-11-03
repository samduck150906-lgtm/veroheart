"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PawIcon, ArrowRightIcon } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
const NAV_LINKS = [
  { href: "/#features", label: "베로로 소개" },
  { href: "/#how-it-works", label: "이용 방법" },
  { href: "/#trust", label: "분석 방식" },
  { href: "/#faq", label: "자주 묻는 질문" },
];
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false),
    [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 801px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <header className={"v3-site-header" + (scrolled ? " is-scrolled" : "")}>
      <a href="#main-content" className="v3-skip-link">
        본문으로 바로가기
      </a>
      <div className="v3-container v3-header-inner">
        <Link
          href="/"
          aria-label="베로로 홈"
          className="v3-brand"
          onClick={() => setOpen(false)}
        >
          <span className="v3-brand-icon">
            <PawIcon />
          </span>
          <span>
            VERORO<span className="v3-brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="주요 메뉴" className="v3-desktop-nav">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="v3-header-actions">
          <Link
            href="/#waitlist"
            className="v3-header-cta"
            onClick={() => {
              setOpen(false);
              trackEvent("hero_waitlist_click", { from: "header" });
            }}
          >
            출시 알림 받기 <ArrowRightIcon />
          </Link>
          <button
            ref={menuButton}
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setOpen((v) => !v)}
            className="v3-menu-toggle"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              {open ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 8h16" />
                  <path d="M4 16h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="v3-mobile-menu">
          <button
            type="button"
            className="v3-menu-backdrop"
            aria-label="메뉴 배경 닫기"
            onClick={() => setOpen(false)}
          />
          <nav id="mobile-nav" aria-label="모바일 메뉴">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
                <ArrowRightIcon />
              </a>
            ))}
            <Link
              href="/#waitlist"
              className="v3-mobile-signup"
              onClick={() => {
                setOpen(false);
                trackEvent("hero_waitlist_click", { from: "mobile_menu" });
              }}
            >
              출시 알림 받기 <ArrowRightIcon />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
