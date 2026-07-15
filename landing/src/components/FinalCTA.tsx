"use client";

import { Reveal } from "@/components/Reveal";
import { trackEvent } from "@/lib/analytics";

export function FinalCTA() {
  return (
    <section className="bg-paper px-5 py-20 sm:px-6 sm:py-28">
      <Reveal>
        <div className="mx-auto max-w-3xl rounded-2xl bg-sand px-6 py-16 text-center sm:px-12 sm:py-20">
          <h2 className="text-balance text-3xl font-extrabold leading-[1.15] tracking-tightest text-ink-950 sm:text-4xl">
            우리 아이 먹거리,
            <br />
            더 쉽게 확인할 수 있도록.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-ink-700 sm:text-lg">
            베로로가 정식 출시를 준비하고 있어요.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#waitlist"
              onClick={() => trackEvent("hero_waitlist_click", { from: "final_cta" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-7 py-4 text-sm font-bold text-ink-950 transition hover:bg-accent-dark sm:w-auto"
            >
              출시 알림 받기
            </a>
            <a
              href="mailto:veroro@eternalsix.com?subject=%5BVeRoRo%5D%20%EB%B2%A0%ED%83%80%ED%85%8C%EC%8A%A4%ED%84%B0%20%EC%8B%A0%EC%B2%AD"
              onClick={() => trackEvent("beta_apply_click", { from: "final_cta" })}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ink-950/15 px-7 py-4 text-sm font-bold text-ink-950 transition hover:bg-paper sm:w-auto"
            >
              베타테스터 신청
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
