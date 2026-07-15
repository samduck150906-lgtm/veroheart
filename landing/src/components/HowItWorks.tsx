import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { SearchIcon, CameraIcon, ShieldCheckIcon, CompareIcon } from "@/components/icons";

const STEPS = [
  {
    icon: SearchIcon,
    step: "1",
    title: "검색하거나 촬영해요",
    body: "제품명, 성분명, 바코드 또는 성분표를 확인해요.",
  },
  {
    icon: CameraIcon,
    step: "2",
    title: "한눈에 분석해요",
    body: "원재료와 영양정보를 보기 쉽게 정리해요.",
  },
  {
    icon: ShieldCheckIcon,
    step: "3",
    title: "우리 아이 기준으로 확인해요",
    body: "등록한 알레르기·건강 정보를 반영해 주의점을 알려드려요.",
  },
  {
    icon: CompareIcon,
    step: "4",
    title: "비교하고 선택해요",
    body: "비슷한 제품의 성분과 가격을 함께 비교해요.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-b border-ink-800/10 bg-cream-50 py-20 sm:py-24"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="이용 방법"
            id="how-it-works-heading"
            title="네 단계면 충분해요"
            description="복잡한 성분표 대신, 베로로가 정리한 결과부터 확인하세요."
          />
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delayMs={i * 70}>
              <div className="relative h-full rounded-2xl border border-ink-800/10 bg-white p-6">
                <span className="text-xs font-bold tracking-wide text-gold-deep">
                  STEP {s.step}
                </span>
                <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-soft text-gold-darkest">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-800/75">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
