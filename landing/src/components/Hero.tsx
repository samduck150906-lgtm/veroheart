"use client";

import { Reveal } from "@/components/Reveal";
import { PhoneMockup } from "@/components/PhoneMockup";
import { ScanIcon, ShieldCheckIcon, ArrowRightIcon } from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
import { launchConfig } from "@/constants/launchConfig";

export function Hero() {
  return (
    <header className="relative overflow-hidden bg-paper pt-28 sm:pt-32">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-14 px-5 pb-20 sm:px-6 sm:pb-24 lg:flex-row lg:gap-16 lg:pb-28">
        <div className="max-w-xl flex-1">
          <Reveal>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              출시 준비 중 · 반려동물 사료·간식 성분분석
            </span>
          </Reveal>

          <Reveal delayMs={80}>
            <h1 className="mt-5 text-balance text-[2.5rem] font-extrabold leading-[1.08] tracking-tightest text-ink-950 sm:text-6xl lg:text-[3.6rem]">
              우리 아이 먹거리,
              <br />
              <span className="text-accent">성분부터 확인해요.</span>
            </h1>
          </Reveal>

          <Reveal delayMs={140}>
            <p className="mt-7 max-w-lg text-pretty text-lg leading-relaxed text-ink-700">
              제품명이나 성분을 검색하고, 성분표를 촬영하면 원재료와 영양정보를
              우리 아이 기준으로 알기 쉽게 정리해 드려요.
            </p>
          </Reveal>

          <Reveal delayMs={200}>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#waitlist"
                onClick={() => trackEvent("hero_waitlist_click", { from: "hero_primary" })}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-7 py-4 text-center text-sm font-bold text-ink-950 transition hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
              >
                출시 알림 받기
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#analysis-preview"
                onClick={() => trackEvent("preview_click", { from: "hero" })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-950/15 px-7 py-4 text-center text-sm font-bold text-ink-950 transition hover:bg-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
              >
                베로로 미리 보기
              </a>
            </div>
          </Reveal>

          <Reveal delayMs={260}>
            <p className="mt-6 text-sm leading-relaxed text-ink-500">
              정식 출시 전에 가장 먼저 소식을 전해 드릴게요. 광고성 메시지를
              무분별하게 보내지 않아요.
            </p>
          </Reveal>

          <Reveal delayMs={300}>
            <div className="mt-6 flex items-center gap-2" aria-label="스토어 출시 예정">
              <span className="rounded-md border border-ink-950/10 px-3 py-1.5 text-[11px] font-semibold text-ink-500">
                App Store 출시 예정
              </span>
              <span className="rounded-md border border-ink-950/10 px-3 py-1.5 text-[11px] font-semibold text-ink-500">
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
                  <span className="text-xs font-semibold text-ink-500">성분표 스캔</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-dark">
                    <ScanIcon className="h-3 w-3" /> 분석 중
                  </span>
                </div>
                <div className="rounded-xl border border-ink-950/10 bg-paper p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    코코(고양이)에게 대체로 잘 맞아요
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink-950">
                    연어, 현미, 완두단백…
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-safe-soft px-2 py-0.5 text-[10px] font-bold text-safe-deep">
                      <ShieldCheckIcon className="h-3 w-3" /> 등록 알레르기 미검출
                    </span>
                    <span className="rounded-md bg-caution-soft px-2 py-0.5 text-[10px] font-bold text-caution-deep">
                      오메가 함량 정보 부족
                    </span>
                  </div>
                </div>
                <p className="px-1 text-[10px] leading-relaxed text-ink-500">
                  예시 화면입니다. 실제 분석 결과는 제품마다 다를 수 있어요.
                </p>
              </div>
            </PhoneMockup>
          </div>
        </Reveal>
      </div>

      {launchConfig.status !== "prelaunch" && (
        <div className="border-y border-ink-950/10 bg-sand py-3 text-center text-xs text-ink-700">
          현재 {launchConfig.status === "beta" ? "베타테스트" : "정식 서비스"} 진행 중입니다.
        </div>
      )}
    </header>
  );
}
