import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { PhoneMockup } from "@/components/PhoneMockup";
import { SectionHeading } from "@/components/SectionHeading";

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

const PAIN_CARDS = [
  {
    emoji: "📋",
    title: "빼곡한 성분표",
    body: "전문 용어와 함량 표기만으로는 '지금 이 사료가 우리 아이에게 맞는지' 판단하기 어렵습니다.",
  },
  {
    emoji: "⚠️",
    title: "숨은 알레르기 걱정",
    body: "닭·곡물·유제품 등 아이만의 트리거를 놓치지 않으려면 꼼꼼한 확인이 필요합니다.",
  },
  {
    emoji: "🔍",
    title: "믿기 어려운 리뷰",
    body: "과장된 광고성 후기에 지쳐, 정말 써 본 보호자의 솔직한 정보를 찾기 힘드셨을 거예요.",
  },
];

const AUDIENCE_ITEMS = [
  "반려동물의 건강한 식단을 위해 꼼꼼하게 따져보고 구매하시는 분",
  "기존 쇼핑몰의 광고성 리뷰에 지쳐 진짜 정보를 찾고 계신 분",
  "나이가 많거나 알레르기가 있어 특별한 식단 관리가 필요한 반려동물을 키우시는 분",
];

const PREMIUM_ITEMS = [
  { emoji: "📊", text: "월간 맞춤 성분 리포트 · 알레르기 모니터링" },
  { emoji: "⭐", text: "우선 추천 큐레이션 · 구독 회원 전용 프로모션" },
  { emoji: "📋", text: "상세 비교표 내보내기 (준비 중)" },
  { emoji: "💬", text: "고객 지원 우선 응대" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">

      {/* ───── Hero ───── */}
      <header className="relative bg-gradient-to-b from-[#fff8e1] via-cream-100 to-cream-50">
        {/* Nav */}
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 pt-5 sm:px-8 sm:pt-7">
          <Link href="/" aria-label="베로로 홈" className="inline-flex items-center gap-2">
            <Image
              src="/veroro-logo.png"
              alt="VeRoRo"
              width={132}
              height={48}
              priority
              className="h-9 w-auto drop-shadow-sm sm:h-11"
            />
          </Link>
          <nav
            aria-label="주요 메뉴"
            className="hidden items-center gap-7 text-sm font-semibold text-ink-800/70 sm:flex"
          >
            <a href="#features" className="transition hover:text-gold-deep">기능</a>
            <a href="#audience" className="transition hover:text-gold-deep">추천 대상</a>
            <a href="#premium" className="transition hover:text-gold-deep">프리미엄</a>
            <a
              href={PREORDER_MAIL}
              className="rounded-xl bg-gold-deep px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gold-darker"
            >
              사전 예약
            </a>
          </nav>
        </div>

        {/* Hero body */}
        <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14 lg:flex-row lg:items-center lg:gap-16 lg:pb-28">
          {/* Text */}
          <div className="max-w-[540px] flex-1">
            {/* Badge */}
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gold-muted/60 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-gold-darker shadow-sm">
              🐾 반려동물 성분 분석 · 리뷰 · 커머스
            </p>

            {/* H1 */}
            <h1 className="text-[2.15rem] font-extrabold leading-[1.13] tracking-tight text-ink-900 sm:text-5xl lg:text-[3.1rem] lg:leading-[1.1]">
              우리 아이 입에 들어가는 것,
              <br />
              <span className="text-gold-deep">정말 안전할까요?</span>
            </h1>

            <p className="mt-5 text-[0.9375rem] leading-[1.75] text-ink-800/85 sm:text-lg">
              어려운 사료 성분표 분석부터 깐깐한 반려인들의 진짜 리뷰까지.
              <span className="font-semibold text-ink-900"> 베로로</span>에서
              한 번에 확인하세요.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={APP_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-deep px-7 py-4 text-[0.9375rem] font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-gold-darker active:translate-y-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                앱 다운로드하기
              </a>
              <a
                href={PREORDER_MAIL}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-gold-deep/30 bg-white px-7 py-4 text-[0.9375rem] font-bold text-ink-900 shadow-sm transition hover:-translate-y-0.5 hover:border-gold-deep/60 hover:bg-gold-soft active:translate-y-0"
              >
                사전 예약하고 혜택받기
              </a>
            </div>

            {/* Sub-note */}
            <p className="mt-4 text-xs leading-relaxed text-ink-800/50">
              스토어에서 공식 앱을 확인한 뒤 설치해 주세요.{" "}
              <a
                href={PLAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gold-deep underline-offset-2 hover:underline"
              >
                Google Play
              </a>
              에서도 검색할 수 있어요.
            </p>
          </div>

          {/* Phone mockup */}
          <Reveal className="flex flex-1 justify-center lg:justify-end" delayMs={100}>
            <PhoneMockup label="베로로 앱 화면 예시">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink-800/80">
                    성분 스캔 결과
                  </span>
                  <span className="rounded-full bg-gold-soft px-2.5 py-0.5 text-[10px] font-extrabold text-gold-darker ring-1 ring-gold-muted/50">
                    AI · OCR
                  </span>
                </div>
                <div className="rounded-2xl border border-gold-muted/40 bg-white p-3.5 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-800/45">
                    분석 결과
                  </p>
                  <p className="mt-1 text-sm font-bold text-ink-900">
                    닭고기, 현미, 완두단백…
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      ⚠ 알레르기 주의
                    </span>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                      ✓ 유해 성분 없음
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl border border-gold-muted/30 bg-cream-50 p-3.5">
                  <p className="text-[10px] font-semibold text-gold-deep">찐 리뷰</p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-800/80">
                    &ldquo;광고 없이 성분만 보고 골랐어요. 우리 아이 알러지
                    체크가 정말 편해요.&rdquo;
                  </p>
                </div>
                <div className="rounded-xl bg-gold-deep px-3.5 py-2.5 text-center shadow-sm">
                  <p className="text-[11px] font-bold text-white">바로 구매하기 →</p>
                </div>
              </div>
            </PhoneMockup>
          </Reveal>
        </div>

        {/* Wave divider */}
        <div className="h-8 bg-gradient-to-b from-cream-50 to-white" />
      </header>

      {/* ───── Pain points ───── */}
      <section
        id="pain"
        className="bg-white py-16 sm:py-24"
        aria-labelledby="pain-heading"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal>
            <SectionHeading
              kicker="Pain point"
              id="pain-heading"
              title="뒷면의 작은 글씨, 매번 불안했던 적 있으신가요?"
              description="알레르기 유발 물질이나 유해 성분이 숨어 있을까 봐 마음 졸이는 보호자님의 마음을 베로로가 이해합니다."
            />
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PAIN_CARDS.map((card, i) => (
              <Reveal key={card.title} delayMs={i * 80}>
                <article className="card-lift h-full rounded-3xl border border-gold-muted/35 bg-cream-50 p-6 shadow-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-2xl shadow-sm">
                    {card.emoji}
                  </div>
                  <h3 className="text-[1.0625rem] font-bold text-ink-900">
                    {card.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-800/75">
                    {card.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section
        id="features"
        className="bg-gradient-to-b from-[#fff8e1]/70 to-cream-50 py-16 sm:py-24"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal>
            <SectionHeading
              kicker="Core features"
              id="features-heading"
              title="핵심만 담은 세 가지 경험"
              description="스캔 한 번, 투명한 리뷰, 그리고 우리 아이에게 맞는 선택까지. 베로로가 식단 결정을 돕습니다."
            />
          </Reveal>

          <div className="flex flex-col gap-16 lg:gap-24">

            {/* Feature 1 – OCR */}
            <Reveal>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
                <PhoneMockup label="OCR 성분 분석">
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="flex h-[88px] w-[88px] items-center justify-center rounded-3xl border-2 border-dashed border-gold-deep/40 bg-gold-soft/80 text-4xl shadow-sm">
                      📷
                    </div>
                    <p className="mt-4 text-center text-xs font-bold text-ink-900">
                      성분표 촬영
                    </p>
                    <p className="mt-1.5 text-center text-[11px] leading-snug text-ink-800/65">
                      AI가 유해·알레르기 주의 성분을
                      <br />즉시 정리합니다.
                    </p>
                    <div className="mt-4 w-full space-y-1.5">
                      {["닭 부산물", "합성 보존제", "인공 색소"].map((item) => (
                        <div
                          key={item}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm"
                        >
                          <span className="text-[11px] font-medium text-ink-800">{item}</span>
                          <span className="text-[10px] font-bold text-amber-600">주의</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PhoneMockup>
                <div className="max-w-[500px] flex-1 text-center lg:text-left">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-deep">
                    01 · 성분 분석
                  </p>
                  <h3 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
                    찰칵 한 번으로<br className="hidden sm:block" /> 끝나는 성분 분석
                  </h3>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-800/75">
                    스마트폰 카메라로 성분표를 찍기만 하면 OCR로 텍스트를 읽고,
                    유해 성분부터 알레르기에 주의해야 할 성분까지 한눈에 정리해 드립니다.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Feature 2 – Reviews */}
            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:gap-16">
                <div className="w-full max-w-sm shrink-0 space-y-3 sm:max-w-md">
                  {[
                    { score: "4.9", label: "성분 정확도", tag: "✓ 검증됨", tagColor: "bg-emerald-50 text-emerald-700" },
                    { score: "100%", label: "찐 후기 비율", tag: "광고 제외", tagColor: "bg-gold-soft text-gold-darker" },
                    { score: "투명", label: "리뷰 정책", tag: "청정 구역", tagColor: "bg-gold-soft text-gold-darker" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-gold-muted/30 bg-white px-4 py-3.5 shadow-card"
                    >
                      <div>
                        <p className="text-[11px] font-medium text-ink-800/55">{row.label}</p>
                        <p className="mt-0.5 text-xl font-extrabold text-ink-900">{row.score}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${row.tagColor}`}>
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="max-w-[500px] flex-1 text-center lg:text-left">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-deep">
                    02 · 찐 리뷰
                  </p>
                  <h3 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
                    광고 없는 청정 구역,<br className="hidden sm:block" /> 진짜 리뷰
                  </h3>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-800/75">
                    깐깐한 보호자들이 직접 남긴 솔직한 평가를 모았습니다.
                    과장된 광고 문구 대신 실제 급여 경험과 성분 만족도를
                    중심으로 신뢰할 수 있는 리뷰 시스템을 지향합니다.
                  </p>
                </div>
              </div>
            </Reveal>

            {/* Feature 3 – Commerce */}
            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
                <PhoneMockup label="맞춤 커머스">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-ink-800/80">🛒 오늘의 추천</p>
                    <div className="rounded-2xl bg-gold-darkest p-4 text-cream-50">
                      <p className="text-[10px] font-medium text-gold-muted">우리 아이 맞춤</p>
                      <p className="mt-1 text-sm font-extrabold">저알러지 · 그레인프리</p>
                      <p className="mt-0.5 text-[10px] text-gold-muted/80">닭고기 프리, 무방부제</p>
                    </div>
                    <div className="rounded-2xl border border-gold-muted/30 bg-white p-3 shadow-card">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-cream-200 flex items-center justify-center text-xl">🐟</div>
                        <div>
                          <p className="text-[11px] font-bold text-ink-900">연어 그레인프리 사료</p>
                          <p className="text-[10px] text-ink-800/55">평점 4.9 · 리뷰 142개</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-gold-deep py-2.5 text-xs font-bold text-white shadow-sm"
                    >
                      바로 구매하기 →
                    </button>
                  </div>
                </PhoneMockup>
                <div className="max-w-[500px] flex-1 text-center lg:text-left">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-deep">
                    03 · 맞춤 커머스
                  </p>
                  <h3 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
                    우리 아이 맞춤형<br className="hidden sm:block" /> 쇼핑 경험
                  </h3>
                  <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-800/75">
                    분석 결과와 리뷰 신호를 바탕으로 반려동물에게 맞는 제품을
                    추천하고, 앱 안에서 바로 구매까지 이어질 수 있도록 설계했습니다.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───── Mid-page CTA ───── */}
      <section className="bg-gold-soft py-14 sm:py-16" aria-label="앱 다운로드 유도">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal className="mx-auto max-w-xl text-center">
            <p className="text-2xl font-extrabold text-ink-900 sm:text-3xl">
              지금 베로로를 만나보세요 🐾
            </p>
            <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-800/70">
              지금 앱을 설치하고 우리 아이 맞춤 성분 분석을 시작해 보세요.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={APP_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-deep px-7 py-4 text-[0.9375rem] font-bold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-gold-darker active:translate-y-0"
              >
                앱 다운로드하기
              </a>
              <a
                href={PREORDER_MAIL}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-gold-deep/40 bg-white px-7 py-4 text-[0.9375rem] font-bold text-ink-900 transition hover:-translate-y-0.5 hover:border-gold-deep active:translate-y-0"
              >
                사전 예약하기
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───── Audience ───── */}
      <section
        id="audience"
        className="bg-white py-16 sm:py-24"
        aria-labelledby="audience-heading"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal>
            <SectionHeading
              kicker="For you"
              id="audience-heading"
              title="이런 분들께 추천해요"
            />
          </Reveal>
          <ul className="mx-auto grid max-w-2xl gap-3.5">
            {AUDIENCE_ITEMS.map((text, i) => (
              <Reveal key={i} delayMs={i * 70}>
                <li className="card-lift flex gap-4 rounded-3xl border border-gold-muted/35 bg-cream-50 px-5 py-4 shadow-card">
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-gold-deep text-sm font-extrabold text-white shadow-sm"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-[0.9375rem] leading-relaxed text-ink-800">
                    {text}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── Premium ───── */}
      <section
        id="premium"
        className="bg-gold-darkest py-16 text-cream-50 sm:py-24"
        aria-labelledby="premium-heading"
      >
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Reveal>
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-gold-muted/30 bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-gold-muted">
                ✦ Premium
              </p>
              <h2
                id="premium-heading"
                className="text-3xl font-extrabold tracking-tight sm:text-4xl"
              >
                프리미엄 구독으로<br className="sm:hidden" /> 더 깊은 맞춤 분석
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-cream-100/80">
                베로로만의 맞춤형 분석 리포트와 커머스 혜택을 한 번에.
                성분 인사이트를 넘어 급여 루틴까지 설계할 수 있도록 준비 중입니다.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={80}>
            <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2">
              {PREMIUM_ITEMS.map((item) => (
                <div
                  key={item.text}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/8 px-5 py-4 backdrop-blur-sm"
                >
                  <span className="mt-0.5 text-xl leading-none">{item.emoji}</span>
                  <p className="text-sm font-medium leading-relaxed text-cream-100/90">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delayMs={130} className="mt-10 text-center">
            <a
              href={PREORDER_MAIL}
              className="inline-flex items-center gap-2 rounded-2xl bg-gold-muted px-8 py-4 text-[0.9375rem] font-bold text-gold-darkest shadow-soft transition hover:-translate-y-0.5 hover:bg-cream-50 active:translate-y-0"
            >
              사전 예약하고 프리미엄 혜택받기 →
            </a>
          </Reveal>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer
        className="border-t border-gold-muted/25 bg-cream-100 py-12"
        aria-label="푸터"
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/veroro-logo.png"
                alt="VeRoRo"
                width={120}
                height={44}
                className="h-9 w-auto drop-shadow-sm"
              />
            </div>
            <p className="mt-2 text-sm text-ink-800/60">반려동물계의 필수 앱을 향해</p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Link
              href="/terms"
              className="text-ink-800/70 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              이용약관
            </Link>
            <Link
              href="/privacy"
              className="text-ink-800/70 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              개인정보처리방침
            </Link>
            <Link
              href="/refund"
              className="text-ink-800/70 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              취소 및 환불 안내
            </Link>
            <a
              href={PREORDER_MAIL}
              className="text-ink-800/70 underline-offset-4 transition hover:text-gold-deep hover:underline"
            >
              고객센터 문의
            </a>
          </nav>

          <div className="flex gap-5">
            <a
              href={SOCIAL_INSTAGRAM}
              {...(SOCIAL_INSTAGRAM.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-sm font-semibold text-gold-deep transition hover:text-gold-darker hover:underline"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href={SOCIAL_YOUTUBE}
              {...(SOCIAL_YOUTUBE.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-sm font-semibold text-gold-deep transition hover:text-gold-darker hover:underline"
              aria-label="YouTube"
            >
              YouTube
            </a>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-[1200px] px-5 text-center text-xs text-ink-800/40 sm:px-8">
          © {new Date().getFullYear()} VeRoRo · Petty Community. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
