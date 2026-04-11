import { Reveal } from "@/components/Reveal";
import { PhoneMockup } from "@/components/PhoneMockup";
import { SectionHeading } from "@/components/SectionHeading";

const APP_STORE =
  "https://apps.apple.com/kr/search?term=%EB%B2%A0%EB%A1%9C%EB%A1%9C";
const PLAY_STORE =
  "https://play.google.com/store/search?q=%EB%B2%A0%EB%A1%9C%EB%A1%9C&c=apps";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_APP_SITE_ORIGIN ?? "https://www.veroro.kr";
const TERMS_URL = `${SITE_ORIGIN.replace(/\/$/, "")}/terms`;
const PRIVACY_URL = `${SITE_ORIGIN.replace(/\/$/, "")}/privacy`;

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
const SOCIAL_INSTAGRAM =
  process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL?.trim() || "#";
const SOCIAL_YOUTUBE =
  process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE_URL?.trim() || "#";

const PREORDER_MAIL = CONTACT_EMAIL
  ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[VeRoRo] 사전 예약 신청")}`
  : "mailto:?subject=" +
    encodeURIComponent("[VeRoRo] 사전 예약 신청") +
    "&body=" +
    encodeURIComponent(
      "아래에 연락처를 남겨 주세요.\n\n- 이름:\n- 휴대폰:\n- 반려동물 종류:\n",
    );

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Hero */}
      <header className="relative border-b border-cream-200/80 bg-gradient-to-b from-sky-soft/60 via-cream-50 to-cream-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:flex-row lg:items-center lg:gap-16 lg:pb-24">
          <div className="max-w-xl flex-1">
            <p className="mb-3 inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-sky-deep shadow-sm ring-1 ring-sky-soft">
              반려동물 성분 분석 · 리뷰 · 커머스
            </p>
            <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-forest-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.15]">
              우리 아이 입에 들어가는 것,
              <br />
              <span className="text-sky-deep">정말 안전할까요?</span>
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-forest-800/85 sm:text-lg">
              어려운 사료 성분표 분석부터 깐깐한 반려인들의 진짜 리뷰까지.
              <span className="font-semibold text-forest-900"> 베로로</span>
              에서 한 번에 확인하세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={APP_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-forest-800 px-6 py-3.5 text-center text-sm font-semibold text-cream-50 shadow-soft transition hover:bg-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-800"
              >
                앱 다운로드하기
              </a>
              <a
                href={PREORDER_MAIL}
                className="inline-flex items-center justify-center rounded-2xl border-2 border-forest-800/15 bg-white px-6 py-3.5 text-center text-sm font-semibold text-forest-900 shadow-sm transition hover:border-peach-deep/40 hover:bg-peach-soft/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-deep"
              >
                사전 예약하고 혜택받기
              </a>
            </div>
            <p className="mt-4 text-xs text-forest-800/55">
              스토어에서 공식 앱을 확인한 뒤 설치해 주세요.{" "}
              <a
                href={PLAY_STORE}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-deep underline-offset-2 hover:underline"
              >
                Google Play
              </a>
              에서도 검색할 수 있어요.
            </p>
          </div>
          <Reveal className="flex flex-1 justify-center lg:justify-end" delayMs={80}>
            <PhoneMockup label="베로로 앱 화면 예시">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-forest-800/70">
                    성분 스캔
                  </span>
                  <span className="rounded-full bg-sky-soft px-2 py-0.5 text-[10px] font-bold text-sky-deep">
                    OCR
                  </span>
                </div>
                <div className="rounded-xl border border-cream-200 bg-white p-3 shadow-card">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-forest-800/50">
                    분석 결과
                  </p>
                  <p className="mt-1 text-sm font-bold text-forest-900">
                    닭고기, 현미, 완두단백…
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-peach-soft px-2 py-0.5 text-[10px] font-semibold text-peach-deep">
                      알레르기 주의
                    </span>
                    <span className="rounded-md bg-cream-200 px-2 py-0.5 text-[10px] font-semibold text-forest-800">
                      유해 성분 없음
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-cream-200 bg-white p-3 shadow-card">
                  <p className="text-[10px] text-forest-800/55">찐 리뷰</p>
                  <p className="mt-1 text-xs leading-snug text-forest-800">
                    “광고 없이 성분만 보고 골랐어요. 우리 아이 알러지 체크가
                    편해요.”
                  </p>
                </div>
              </div>
            </PhoneMockup>
          </Reveal>
        </div>
      </header>

      {/* Pain points */}
      <section
        id="pain"
        className="border-b border-cream-200 bg-white py-16 sm:py-20"
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
                title: "빼곡한 성분표",
                body: "전문 용어와 함량 표기만으로는 ‘지금 이 사료가 우리 아이에게 맞는지’ 판단하기 어렵습니다.",
              },
              {
                title: "숨은 알레르기 걱정",
                body: "닭·곡물·유제품 등 아이만의 트리거를 놓치지 않으려면 꼼꼼한 확인이 필요합니다.",
              },
              {
                title: "믿기 어려운 리뷰",
                body: "과장된 광고성 후기에 지쳐, 정말 써 본 보호자의 솔직한 정보를 찾기 힘드셨을 거예요.",
              },
            ].map((card, i) => (
              <Reveal key={card.title} delayMs={i * 70}>
                <article className="h-full rounded-2xl border border-cream-200 bg-cream-50/80 p-6 shadow-card transition hover:border-sky-soft hover:shadow-soft">
                  <h3 className="text-lg font-bold text-forest-900">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-800/80">
                    {card.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-b border-cream-200 bg-gradient-to-b from-cream-50 to-sky-soft/40 py-16 sm:py-20"
        aria-labelledby="features-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="Core features"
              id="features-heading"
              title="핵심만 담은 세 가지 경험"
              description="스캔 한 번, 투명한 리뷰, 그리고 우리 아이에게 맞는 선택까지. 베로로가 식단 결정을 돕습니다."
            />
          </Reveal>

          <div className="flex flex-col gap-14 lg:gap-20">
            <Reveal>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
                <PhoneMockup label="OCR 성분 분석">
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-sky-deep/40 bg-sky-soft/50">
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="text-sky-deep"
                        aria-hidden
                      >
                        <path
                          d="M4 9h2l1.5-2h9L18 9h2a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2v-8a2 2 0 012-2z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="15"
                          r="3.25"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                    <p className="mt-4 text-center text-xs font-semibold text-forest-900">
                      성분표 촬영
                    </p>
                    <p className="mt-1 text-center text-[11px] text-forest-800/65">
                      AI가 유해·알레르기 주의 성분을 즉시 정리합니다.
                    </p>
                  </div>
                </PhoneMockup>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <h3 className="text-xl font-bold text-forest-900 sm:text-2xl">
                    찰칵 한 번으로 끝나는 성분 분석
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-800/80 sm:text-base">
                    스마트폰 카메라로 성분표를 찍기만 하면 OCR로 텍스트를
                    읽고, 유해 성분부터 알레르기에 주의해야 할 성분까지 한눈에
                    정리해 드립니다.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row-reverse lg:items-center lg:gap-14">
                <div className="grid w-full max-w-sm shrink-0 grid-cols-1 gap-3 sm:max-w-md">
                  {[
                    { score: "4.9", label: "성분 정확도", tag: "검증됨" },
                    { score: "실구매", label: "찐 후기 비율", tag: "광고 제외" },
                    { score: "투명", label: "리뷰 정책", tag: "청정 구역" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-cream-200 bg-white px-4 py-3 shadow-card"
                    >
                      <div>
                        <p className="text-xs text-forest-800/55">{row.label}</p>
                        <p className="text-lg font-bold text-forest-900">
                          {row.score}
                        </p>
                      </div>
                      <span className="rounded-full bg-forest-800/10 px-2.5 py-1 text-[10px] font-bold text-forest-800">
                        {row.tag}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <h3 className="text-xl font-bold text-forest-900 sm:text-2xl">
                    광고 없는 청정 구역, 찐 리뷰
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-800/80 sm:text-base">
                    깐깐한 보호자들이 직접 남긴 솔직한 평가를 모았습니다.
                    과장된 광고 문구 대신, 실제 급여 경험과 성분 만족도를
                    중심으로 신뢰할 수 있는 리뷰 시스템을 지향합니다.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delayMs={60}>
              <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
                <PhoneMockup label="맞춤 커머스">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-forest-800/70">
                      오늘의 추천
                    </p>
                    <div className="rounded-xl bg-forest-800 p-3 text-cream-50">
                      <p className="text-[10px] text-cream-200">우리 아이 맞춤</p>
                      <p className="mt-1 text-sm font-bold">
                        저알러지 · 그레인프리
                      </p>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-xl bg-peach-deep py-2.5 text-xs font-bold text-white"
                    >
                      바로 구매하기
                    </button>
                  </div>
                </PhoneMockup>
                <div className="max-w-lg flex-1 text-center lg:text-left">
                  <h3 className="text-xl font-bold text-forest-900 sm:text-2xl">
                    우리 아이 맞춤형 커머스
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-forest-800/80 sm:text-base">
                    분석 결과와 리뷰 신호를 바탕으로 반려동물에게 맞는 제품을
                    추천하고, 앱 안에서 바로 구매까지 이어질 수 있도록
                    설계했습니다.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Audience */}
      <section
        id="audience"
        className="border-b border-cream-200 bg-white py-16 sm:py-20"
        aria-labelledby="audience-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <SectionHeading
              kicker="For you"
              id="audience-heading"
              title="이런 분들께 추천해요"
            />
          </Reveal>
          <ul className="mx-auto grid max-w-3xl gap-4">
            {[
              "반려동물의 건강한 식단을 위해 꼼꼼하게 따져보고 구매하시는 분",
              "기존 쇼핑몰의 광고성 리뷰에 지쳐 진짜 정보를 찾고 계신 분",
              "나이가 많거나 알레르기가 있어 특별한 식단 관리가 필요한 반려동물을 키우시는 분",
            ].map((text, i) => (
              <Reveal key={i} delayMs={i * 60}>
                <li className="flex gap-4 rounded-2xl border border-cream-200 bg-cream-50/60 px-5 py-4 shadow-card">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-soft text-sm font-bold text-sky-deep"
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span className="text-sm leading-relaxed text-forest-800 sm:text-base">
                    {text}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Premium */}
      <section
        id="premium"
        className="bg-forest-900 py-16 text-cream-50 sm:py-20"
        aria-labelledby="premium-heading"
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <Reveal>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-sky-soft">
                Premium
              </p>
              <h2
                id="premium-heading"
                className="text-2xl font-bold tracking-tight sm:text-3xl"
              >
                프리미엄 구독으로 더 깊은 맞춤 분석
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cream-200 sm:text-base">
                베로로만의 맞춤형 분석 리포트와 커머스 혜택을 한 번에. 성분
                인사이트를 넘어 급여 루틴까지 설계할 수 있도록 준비 중입니다.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={80}>
            <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
              {[
                "월간 맞춤 성분 리포트 · 알레르기 모니터링",
                "우선 추천 큐레이션 · 구독 회원 전용 프로모션",
                "상세 비교표보내기 (준비 중일 수 있음)",
                "고객 지원 우선 응대",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="text-sm font-medium leading-relaxed text-cream-100">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delayMs={120} className="mt-10 text-center">
            <a
              href={PREORDER_MAIL}
              className="inline-flex rounded-2xl bg-cream-50 px-6 py-3 text-sm font-bold text-forest-900 shadow-soft transition hover:bg-white"
            >
              사전 예약하고 혜택받기
            </a>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-cream-200 bg-cream-100/80 py-12"
        aria-label="푸터"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-lg font-extrabold tracking-tight text-forest-900">
              VeRoRo
            </p>
            <p className="mt-1 text-sm text-forest-800/65">
              반려동물계의 필수 앱을 향해
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a
              href={TERMS_URL}
              className="text-forest-800/80 underline-offset-4 hover:text-forest-900 hover:underline"
            >
              서비스 이용약관
            </a>
            <a
              href={PRIVACY_URL}
              className="text-forest-800/80 underline-offset-4 hover:text-forest-900 hover:underline"
            >
              개인정보처리방침
            </a>
            <a
              href={PREORDER_MAIL}
              className="text-forest-800/80 underline-offset-4 hover:text-forest-900 hover:underline"
            >
              고객센터 문의
            </a>
          </nav>
          <div className="flex gap-4">
            <a
              href={SOCIAL_INSTAGRAM}
              {...(SOCIAL_INSTAGRAM.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-sm font-semibold text-sky-deep hover:underline"
              aria-label="Instagram"
            >
              Instagram
            </a>
            <a
              href={SOCIAL_YOUTUBE}
              {...(SOCIAL_YOUTUBE.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="text-sm font-semibold text-sky-deep hover:underline"
              aria-label="YouTube"
            >
              YouTube
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-5 text-center text-xs text-forest-800/50 sm:px-6">
          © {new Date().getFullYear()} VeRoRo · Petty Community. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
}
