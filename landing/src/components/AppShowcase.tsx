import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { SearchIcon, ScanIcon, ShieldCheckIcon, CompareIcon } from "@/components/icons";

const SCREENS = [
  {
    icon: SearchIcon,
    title: "검색",
    body: "제품명이나 브랜드로 원하는 사료·간식을 찾아요.",
  },
  {
    icon: ScanIcon,
    title: "스캔",
    body: "성분표나 바코드를 촬영해 바로 분석을 시작해요.",
  },
  {
    icon: ShieldCheckIcon,
    title: "분석 결과",
    body: "원재료, 영양정보, 주의 성분을 한 화면에서 확인해요.",
  },
  {
    icon: CompareIcon,
    title: "비교",
    body: "관심 제품끼리 원료와 가격을 나란히 비교해요.",
  },
];

export function AppShowcase() {
  return (
    <section
      id="app-showcase"
      className="border-b border-ink-800/10 bg-white py-20 sm:py-24"
      aria-labelledby="app-showcase-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="화면 미리 보기"
            id="app-showcase-heading"
            title="실제 개발 중인 화면 구성"
            description="정식 출시 전까지 세부 디자인은 계속 다듬어질 수 있어요."
          />
        </Reveal>

        <div className="grid gap-6 sm:grid-cols-2">
          {SCREENS.map((screen, i) => (
            <Reveal key={screen.title} delayMs={i * 70}>
              <div className="overflow-hidden rounded-2xl border border-ink-800/10 bg-cream-50">
                <div className="flex items-center gap-1.5 border-b border-ink-800/10 bg-white px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-800/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-800/15" />
                  <span className="h-2.5 w-2.5 rounded-full bg-ink-800/15" />
                  <span className="ml-2 text-xs font-semibold text-ink-800/50">
                    {screen.title}
                  </span>
                </div>
                <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-soft text-gold-darkest">
                    <screen.icon className="h-6 w-6" />
                  </span>
                  <p className="text-sm leading-relaxed text-ink-800/75">
                    {screen.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
