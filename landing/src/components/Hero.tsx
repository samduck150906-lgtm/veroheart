"use client";

import { Reveal } from "@/components/Reveal";
import { PhoneMockup } from "@/components/PhoneMockup";
import { ScanIcon, ShieldCheckIcon, ArrowRightIcon } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
import { launchConfig } from "@/constants/launchConfig";

export function Hero() {
  return (
    <header className="relative overflow-hidden bg-warm-fade pt-28 sm:pt-32">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-5 pb-16 sm:px-6 sm:pb-20 lg:flex-row lg:items-center lg:gap-12 lg:pb-24">
        <div className="max-w-xl flex-1 text-center lg:text-left">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-muted/70 bg-white px-4 py-1.5 text-xs font-semibold text-gold-darker">
              출시 준비 중 · 반려동물 사료·간식 성분분석
            </span>
          </Reveal>

          <Reveal delayMs={80}>
            <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.15] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.3rem]">
              우리 아이 먹거리,
              <br />
              <span className="text-gradient-gold">성분부터 확인해요.</span>
            </h1>
          </Reveal>

          <Reveal delayMs={140}>
            <p className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-ink-800/80 sm:text-lg lg:mx-0">
              제품명이나 성분을 검색하고, 성분표를 촬영하면 원재료와 영양정보를
              우리 아이 기준으로 알기 쉽게 정리해 드려요.
            </p>
          </Reveal>

          <Reveal delayMs={200}>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:items-start lg:justify-start">
              <a
                href="#waitlist"
                onClick={() => trackEvent("hero_waitlist_click", { from: "hero_primary" })}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-7 py-4 text-center text-sm font-bold text-white shadow-soft transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep sm:w-auto"
              >
                출시 알림 받기
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#analysis-preview"
                onClick={() => trackEvent("preview_click", { from: "hero" })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-deep/25 bg-white px-7 py-4 text-center text-sm font-bold text-ink-900 transition hover:border-gold-deep/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep sm:w-auto"
              >
                베로로 미리 보기
              </a>
            </div>
          </Reveal>

          <Reveal delayMs={260}>
            <p className="mt-6 text-xs leading-relaxed text-ink-800/60">
              정식 출시 전에 가장 먼저 소식을 전해 드릴게요. 광고성 메시지를
              무분별하게 보내지 않아요.
            </p>
          </Reveal>

          <Reveal delayMs={300}>
            <div className="mt-6 flex items-center justify-center gap-2 lg:justify-start" aria-label="스토어 출시 예정">
              <span className="rounded-lg border border-ink-800/15 px-3 py-1.5 text-[11px] font-semibold text-ink-800/50">
                App Store 출시 예정
              </span>
              <span className="rounded-lg border border-ink-800/15 px-3 py-1.5 text-[11px] font-semibold text-ink-800/50">
                Google Play 출시 예정
              </span>
            </div>
          </Reveal>
        </div>

        <Reveal className="relative flex flex-1 justify-center lg:justify-end" delayMs={120}>
          <div className="animate-float-y">
            <PhoneMockup label="베로로 분석 결과 예시 화면">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-800/70">성분표 스캔</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-darkest">
                    <ScanIcon className="h-3 w-3" /> 분석 중
                  </span>
                </div>
                <div className="rounded-2xl border border-ink-800/10 bg-white p-3.5 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-800/50">
                    코코(고양이)에게 대체로 잘 맞아요
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink-900">
                    연어, 현미, 완두단백…
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-safe-soft px-2 py-0.5 text-[10px] font-bold text-safe-deep">
                      <ShieldCheckIcon className="h-3 w-3" /> 등록 알레르기 미검출
                    </span>
                    <span className="rounded-lg bg-caution-soft px-2 py-0.5 text-[10px] font-bold text-caution-deep">
                      오메가 함량 정보 부족
                    </span>
                  </div>
                </div>
                <p className="px-1 text-[10px] leading-relaxed text-ink-800/45">
                  예시 화면입니다. 실제 분석 결과는 제품마다 다를 수 있어요.
                </p>
              </div>
            </PhoneMockup>
          </div>
        </Reveal>
      </div>

      {launchConfig.status !== "prelaunch" && (
        <div className="border-y border-gold-muted/30 bg-white/70 py-3 text-center text-xs text-ink-800/60">
          현재 {launchConfig.status === "beta" ? "베타테스트" : "정식 서비스"} 진행 중입니다.
        </div>
      )}
    </header>
  );
}
