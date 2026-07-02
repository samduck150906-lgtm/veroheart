import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { PhoneMockup } from "@/components/PhoneMockup";
import { SectionHeading } from "@/components/SectionHeading";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ScanIcon,
  ShieldCheckIcon,
  ChatHeartIcon,
  SparkleIcon,
  CartIcon,
  CheckIcon,
  ArrowRightIcon,
  StarIcon,
  BellIcon,
  LeafIcon,
} from "@/components/icons";

const APP_STORE =
  "https://apps.apple.com/kr/search?term=%EB%B2%A0%EB%A1%9C%EB%A1%9C";
const PLAY_STORE =
  "https://play.google.com/store/search?q=%EB%B2%A0%EB%A1%9C%EB%A1%9C&c=apps";

const DEFAULT_CONTACT = "veroro@eternalsix.com";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT;
const SOCIAL_INSTAGRAM =
  process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() || "#";
const SOCIAL_YOUTUBE =
  process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL?.trim() || "#";

const PREORDER_MAIL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[VeRoRo] 사전 예약 신청")}`;

const STATS = [
  { value: "3초", label: "성분표 스캔 분석" },
  { value: "0", label: "광고성 후기 노출" },
  { value: "100%", label: "성분 기반 큐레이션" },
  { value: "24/7", label: "알레르기 모니터링" },
];

const MARQUEE_ITEMS = [
  "무첨가",
  "그레인프리",
  "저알러지",
  "휴먼그레이드",
  "노예방접종 스트레스",
  "관절 케어",
  "시니어 맞춤",
  "장 건강",
  "피부·모질",
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream-50">
      <SiteHeader appStoreUrl={APP_STORE} />

      {/* ============ HERO ============ */}
      <header className="relative overflow-hidden pt-28 sm:pt-32">
        {/* 배경 데코 */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute inset-0 bg-gold-radial" />
          <div className="absolute inset-0 bg-hero-mesh" />
          <div className="absolute inset-0 bg-grid-lines bg-grid-fade [background-size:44px_44px]" />
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-gold-muted/50 blur-3xl animate-blob" />
          <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-ember/25 blur-3xl animate-blob-slow" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-col items-center gap-14 px-5 pb-16 sm:px-6 sm:pb-20 lg:flex-row lg:items-center lg:gap-12 lg:pb-28">
          <div className="max-w-xl flex-1 text-center lg:text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-muted/70 bg-white/80 px-4 py-1.5 text-xs font-semibold text-gold-darker shadow-sm backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-ember" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-gold-deep" />
                </span>
                반려동물 성분 분석 · 찐 리뷰 · 맞춤 커머스
              </span>
            </Reveal>

            <Reveal delayMs={80}>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.12] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.4rem]">
                우리 아이 입에 들어가는 것,
                <br />
                <span className="text-gradient-gold">정말 안전할까요?</span>
              </h1>
            </Reveal>

            <Reveal delayMs={140}>
              <p className="mx-auto mt-6 max-w-lg text-pretty text-base leading-relaxed text-ink-800/80 sm:text-lg lg:mx-0">
                어려운 사료 성분표 분석부터 깐깐한 반려인들의 진짜 리뷰까지.
                <span className="font-semibold text-ink-900"> 베로로</span>
                에서 한 번에 확인하세요.
              </p>
            </Reveal>

            <Reveal delayMs={200}>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap lg:items-start lg:justify-start">
                <a
                  href={APP_STORE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-7 py-4 text-center text-sm font-bold text-white shadow-glow transition hover:shadow-glow-lg hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep sm:w-auto"
                >
                  앱 다운로드하기
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href={PREORDER_MAIL}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-deep/25 bg-white/80 px-7 py-4 text-center text-sm font-bold text-ink-900 shadow-sm backdrop-blur transition hover:border-gold-deep/50 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep sm:w-auto"
                >
                  <SparkleIcon className="h-4 w-4 text-gold-deep" />
                  사전 예약하고 혜택받기
                </a>
              </div>
            </Reveal>

            <Reveal delayMs={260}>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <div
                  className="flex items-center gap-0.5 text-gold-deep"
                  aria-hidden
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4" />
                  ))}
                </div>
                <p className="text-xs text-ink-800/70">
                  성분만 보고 고르는 보호자들이 선택한 앱 ·{" "}
                  <a
                    href={PLAY_STORE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-gold-deep underline-offset-2 hover:underline"
                  >
                    Google Play
                  </a>{" "}
                  에서도 검색
                </p>
              </div>
            </Reveal>
          </div>

          {/* 히어로 목업 + 플로팅 카드 */}
          <Reveal className="relative flex flex-1 justify-center lg:justify-end" delayMs={120}>
            <div className="relative">
              <div className="animate-float-y">
                <PhoneMockup label="베로로 앱 화면 예시">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-800/75">
                        성분 스캔
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-[10px] font-bold text-white">
                        <ScanIcon className="h-3 w-3" /> OCR
                      </span>
                    </div>
                    <div className="rounded-2xl border border-gold-muted/40 bg-white p-3.5 shadow-card">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-800/55">
                        분석 결과
                      </p>
                      <p className="mt-1 text-sm font-bold text-ink-900">
                        닭고기, 현미, 완두단백…
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded-lg bg-ember-soft px-2 py-0.5 text-[10px] font-bold text-ember-deep">
                          알레르기 주의
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold-darkest">
                          <CheckIcon className="h-3 w-3" /> 유해 성분 없음
                        </span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gold-muted/40 bg-white p-3.5 shadow-card">
                      <div className="flex items-center gap-1 text-gold-deep" aria-hidden>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon key={i} className="h-3 w-3" />
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs leading-snug text-ink-800">
                        “광고 없이 성분만 보고 골랐어요. 우리 아이 알러지 체크가
                        편해요.”
                      </p>
                    </div>
                  </div>
                </PhoneMockup>
              </div>

              {/* 플로팅 미니 카드 */}
              <div className="absolute -left-6 top-16 hidden animate-float-y-slow rounded-2xl border border-gold-muted/50 bg-white/90 px-3.5 py-2.5 shadow-float backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-soft text-gold-deep">
                    <ShieldCheckIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] text-ink-800/60">유해 성분</p>
                    <p className="text-xs font-bold text-ink-900">0건 검출</p>
                  </div>
                </div>
              </div>
              <div className="absolute -right-4 bottom-16 hidden animate-float-y rounded-2xl border border-gold-muted/50 bg-white/90 px-3.5 py-2.5 shadow-float backdrop-blur sm:block">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ember-soft text-ember-deep">
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] text-ink-800/60">알레르기</p>
                    <p className="text-xs font-bold text-ink-900">실시간 알림</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 스탯 밴드 */}
        <div className="relative border-y border-gold-muted/40 bg-white/60 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-gold-muted/30 px-5 sm:px-6 md:grid-cols-4">
            {STATS.map((stat, i) => (
              <Reveal key={stat.label} delayMs={i * 60}>
                <div className="px-2 py-6 text-center md:py-8">
                  <p className="text-2xl font-extrabold tracking-tight text-gradient-gold sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs font-medium text-ink-800/70 sm:text-sm">
                    {stat.label}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </header>

      {/* ============ PAIN POINTS ============ */}
      <section
        id="pain"
        className="relative border-b border-gold-muted/25 bg-white py-20 sm:py-24"
        aria-labelledby="pain-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="Pain point"
              id="pain-heading"
              title="뒷면의 작은 글씨, 매번 불안했던 적 있으신가요?"
              description="알레르기 유발 물질이나 유해 성분이 숨어 있을까 봐 마음 졸이는 보호자님의 마음을 베로로가 이해합니다."
            />
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: LeafIcon,
                title: "빼곡한 성분표",
                body: "전문 용어와 함량 표기만으로는 ‘지금 이 사료가 우리 아이에게 맞는지’ 판단하기 어렵습니다.",
              },
              {
                icon: ShieldCheckIcon,
                title: "숨은 알레르기 걱정",
                body: "닭·곡물·유제품 등 아이만의 트리거를 놓치지 않으려면 꼼꼼한 확인이 필요합니다.",
              },
              {
                icon: ChatHeartIcon,
                title: "믿기 어려운 리뷰",
                body: "과장된 광고성 후기에 지쳐, 정말 써 본 보호자의 솔직한 정보를 찾기 힘드셨을 거예요.",
              },
            ].map((card, i) => (
              <Reveal key={card.title} delayMs={i * 80}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-gold-muted/40 bg-cream-50/80 p-7 shadow-card transition duration-300 hover:-translate-y-1.5 hover:border-gold-deep/50 hover:shadow-soft">
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-muted/30 blur-2xl transition group-hover:bg-gold-muted/50" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-gradient text-white shadow-glow">
                    <card.icon className="h-6 w-6" />
                  </span>
                  <h3 className="relative mt-5 text-lg font-bold text-ink-900">
                    {card.title}
                  </h3>
                  <p className="relative mt-3 text-sm leading-relaxed text-ink-800/80">
                    {card.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section
        id="features"
        className="relative overflow-hidden border-b border-gold-muted/25 bg-gradient-to-b from-cream-50 via-gold-soft/50 to-cream-50 py-20 sm:py-24"
        aria-labelledby="features-heading"
      >
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-dot-grid [background-size:22px_22px] opacity-60"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="Core features"
              id="features-heading"
              title="핵심만 담은 세 가지 경험"
              description="스캔 한 번, 투명한 리뷰, 그리고 우리 아이에게 맞는 선택까지. 베로로가 식단 결정을 돕습니다."
            />
          </Reveal>

          <div className="flex flex-col gap-16 lg:gap-24">
            {/* Feature 1 */}
            <Reveal>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
                <PhoneMockup label="OCR 성분 분석">
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-dashed border-gold-deep/50 bg-gold-soft/70">
                      <span
                        className="absolute inset-x-3 top-4 h-0.5 rounded-full bg-gold-deep/70 shadow-[0_0_12px_rgba(217,119,6,0.6)] animate-float-y"
                        aria-hidden
                      />
                      <ScanIcon className="h-11 w-11 text-gold-deep" />
                    </div>
                    <p className="mt-5 text-center text-sm font-bold text-ink-900">
                      성분표 촬영
                    </p>
                    <p className="mt-1 text-center text-[11px] leading-relaxed text-ink-800/70">
                      유해·알레르기 주의 성분을 성분 데이터와 대조해 즉시 정리합니다.
                    </p>
                  </div>
                </PhoneMockup>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-gold-darker shadow-card">
                    <ScanIcon className="h-3.5 w-3.5" /> STEP 01 · 스캔
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                    찰칵 한 번으로 끝나는 성분 분석
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-ink-800/80">
                    스마트폰 카메라로 성분표를 찍기만 하면 OCR로 텍스트를 읽고,
                    유해 성분부터 알레르기에 주의해야 할 성분까지 한눈에 정리해
                    드립니다.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Feature 2 */}
            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:gap-16">
                <div className="grid w-full max-w-sm shrink-0 grid-cols-1 gap-3 sm:max-w-md">
                  {[
                    { score: "4.9", label: "성분 정확도", tag: "검증됨" },
                    { score: "실구매", label: "찐 후기 비율", tag: "광고 제외" },
                    { score: "투명", label: "리뷰 정책", tag: "청정 구역" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="ring-gradient flex items-center justify-between rounded-2xl bg-white px-5 py-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
                    >
                      <div>
                        <p className="text-xs text-ink-800/60">{row.label}</p>
                        <p className="text-xl font-extrabold text-ink-900">
                          {row.score}
                        </p>
                      </div>
                      <span className="rounded-full bg-gold-soft px-3 py-1 text-[10px] font-bold text-gold-darkest">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-gold-darker shadow-card">
                    <ChatHeartIcon className="h-3.5 w-3.5" /> STEP 02 · 리뷰
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                    광고 없는 청정 구역, 찐 리뷰
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-ink-800/80">
                    깐깐한 보호자들이 직접 남긴 솔직한 평가를 모았습니다. 과장된
                    광고 문구 대신, 실제 급여 경험과 성분 만족도를 중심으로 신뢰할
                    수 있는 리뷰 시스템을 지향합니다.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Feature 3 */}
            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
                <PhoneMockup label="맞춤 커머스">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-ink-800/75">
                      오늘의 추천
                    </p>
                    <div className="rounded-2xl bg-gradient-to-br from-ink-900 to-gold-darkest p-4 text-cream-50 shadow-card">
                      <p className="text-[10px] text-gold-muted">우리 아이 맞춤</p>
                      <p className="mt-1 text-sm font-bold">
                        저알러지 · 그레인프리
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-gold-muted" aria-hidden>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon key={i} className="h-3 w-3" />
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gold-gradient py-3 text-xs font-bold text-white shadow-glow transition hover:brightness-105"
                    >
                      <CartIcon className="h-4 w-4" /> 바로 구매하기
                    </button>
                  </div>
                </PhoneMockup>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-gold-darker shadow-card">
                    <CartIcon className="h-3.5 w-3.5" /> STEP 03 · 커머스
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
                    우리 아이 맞춤형 커머스
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-ink-800/80">
                    분석 결과와 리뷰 신호를 바탕으로 반려동물에게 맞는 제품을
                    추천하고, 앱 안에서 바로 구매까지 이어질 수 있도록
                    설계했습니다.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>

        {/* 키워드 마퀴 */}
        <div className="relative mt-16 overflow-hidden py-2 sm:mt-20">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-cream-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-cream-50 to-transparent" />
          <div className="flex w-max animate-marquee gap-3">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gold-muted/60 bg-white/80 px-4 py-2 text-sm font-semibold text-ink-800/80 shadow-sm"
              >
                <LeafIcon className="h-3.5 w-3.5 text-gold-deep" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AUDIENCE ============ */}
      <section
        id="audience"
        className="border-b border-gold-muted/25 bg-white py-20 sm:py-24"
        aria-labelledby="audience-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="For you"
              id="audience-heading"
              title="이런 분들께 추천해요"
              description="한 명 한 명의 반려생활에 꼭 맞는 정보를, 베로로가 대신 정리해 드립니다."
            />
          </Reveal>
          <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              "반려동물의 건강한 식단을 위해 꼼꼼하게 따져보고 구매하시는 분",
              "기존 쇼핑몰의 광고성 리뷰에 지쳐 진짜 정보를 찾고 계신 분",
              "나이가 많거나 알레르기가 있어 특별한 식단 관리가 필요한 반려동물을 키우시는 분",
              "성분 하나하나까지 확인하고 안심하고 급여하고 싶은 보호자",
            ].map((text, i) => (
              <Reveal key={i} delayMs={i * 60}>
                <li className="flex h-full gap-4 rounded-3xl border border-gold-muted/40 bg-cream-50/70 px-6 py-5 shadow-card transition hover:-translate-y-1 hover:border-gold-deep/40 hover:shadow-soft">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-white shadow-glow"
                    aria-hidden
                  >
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-relaxed text-ink-800 sm:text-base">
                    {text}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ============ PREMIUM ============ */}
      <section
        id="premium"
        className="relative overflow-hidden bg-ink-900 py-20 text-cream-50 sm:py-24"
        aria-labelledby="premium-heading"
      >
        <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden>
          <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-gold-deep/30 blur-3xl animate-blob" />
          <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-ember/20 blur-3xl animate-blob-slow" />
          <div className="absolute inset-0 bg-dot-grid [background-size:26px_26px] opacity-[0.15]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-muted/40 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-gold-muted backdrop-blur">
                <SparkleIcon className="h-3.5 w-3.5" /> Premium
              </span>
              <h2
                id="premium-heading"
                className="mt-5 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                프리미엄 구독으로{" "}
                <span className="text-gradient-gold">더 깊은 맞춤 분석</span>
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-cream-100/80 sm:text-lg">
                베로로만의 맞춤형 분석 리포트와 커머스 혜택을 한 번에. 성분
                인사이트를 넘어 급여 루틴까지 설계할 수 있도록 준비 중입니다.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheckIcon,
                  text: "월간 맞춤 성분 리포트 · 알레르기 모니터링",
                },
                {
                  icon: SparkleIcon,
                  text: "우선 추천 큐레이션 · 구독 회원 전용 프로모션",
                },
                {
                  icon: ScanIcon,
                  text: "상세 비교표 내보내기 (준비 중일 수 있음)",
                },
                {
                  icon: ChatHeartIcon,
                  text: "고객 지원 우선 응대",
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm transition hover:border-gold-muted/40 hover:bg-white/[0.1]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-white shadow-glow">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-cream-100">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative bg-cream-50 px-5 py-20 sm:px-6 sm:py-24">
        <Reveal>
          <div className="ring-gradient relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gold-soft via-cream-50 to-gold-muted/40 px-6 py-14 text-center shadow-soft sm:px-12 sm:py-16">
            <div
              className="pointer-events-none absolute inset-0 -z-0 bg-dot-grid [background-size:22px_22px] opacity-40"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-ember/20 blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-balance text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                오늘부터 성분으로 고르세요
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-ink-800/80 sm:text-lg">
                지금 베로로를 설치하고, 우리 아이에게 맞는 안전한 한 끼를
                찾아보세요.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href={APP_STORE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-gradient px-7 py-4 text-sm font-bold text-white shadow-glow transition hover:shadow-glow-lg hover:brightness-105 sm:w-auto"
                >
                  앱 다운로드하기
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a
                  href={PREORDER_MAIL}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gold-deep/25 bg-white px-7 py-4 text-sm font-bold text-ink-900 shadow-sm transition hover:border-gold-deep/50 sm:w-auto"
                >
                  <SparkleIcon className="h-4 w-4 text-gold-deep" />
                  사전 예약하고 혜택받기
                </a>
              </div>
              <p className="mt-5 text-xs text-ink-800/60">
                스토어에서 공식 앱을 확인한 뒤 설치해 주세요.
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ FOOTER ============ */}
      <footer
        className="border-t border-gold-muted/30 bg-cream-100 py-14"
        aria-label="푸터"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xs">
            <Image
              src="/veroro-logo.png"
              alt="VeRoRo"
              width={120}
              height={44}
              className="h-9 w-auto drop-shadow-sm"
            />
            <p className="mt-3 text-sm leading-relaxed text-ink-800/70">
              반려동물계의 필수 앱을 향해. 성분으로 고르는 안심 반려생활.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link
              href="/terms"
              className="font-medium text-ink-800/85 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="font-medium text-ink-800/85 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/refund"
              className="font-medium text-ink-800/85 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              취소 및 환불 안내
            </Link>
            <a
              href={PREORDER_MAIL}
              className="font-medium text-ink-800/85 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              고객센터 문의
            </a>
          </nav>
          <div className="flex gap-3">
            <a
              href={SOCIAL_INSTAGRAM}
              {...(SOCIAL_INSTAGRAM.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-muted/60 bg-white text-gold-deep transition hover:bg-gold-soft"
              aria-label="Instagram"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
            <a
              href={SOCIAL_YOUTUBE}
              {...(SOCIAL_YOUTUBE.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold-muted/60 bg-white text-gold-deep transition hover:bg-gold-soft"
              aria-label="YouTube"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
                <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-5 text-center text-xs text-ink-800/55 sm:px-6">
          © {new Date().getFullYear()} VeRoRo. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
