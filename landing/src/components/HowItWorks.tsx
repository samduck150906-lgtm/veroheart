import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";

const STEPS = [
  {
    step: "01",
    title: "검색하거나 촬영해요",
    body: "제품명, 성분명, 바코드 또는 성분표를 확인해요.",
  },
  {
    step: "02",
    title: "한눈에 분석해요",
    body: "원재료와 영양정보를 보기 쉽게 정리해요.",
  },
  {
    step: "03",
    title: "우리 아이 기준으로 확인해요",
    body: "등록한 알레르기·건강 정보를 반영해 주의점을 알려드려요.",
  },
  {
    step: "04",
    title: "비교하고 선택해요",
    body: "비슷한 제품의 성분과 가격을 함께 비교해요.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-paper py-20 sm:py-28"
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
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delayMs={i * 70}>
              <div className="border-t-2 border-ink-950 pt-5">
                <span className="text-sm font-bold text-accent">{s.step}</span>
                <h3 className="mt-2 text-lg font-bold leading-snug text-ink-950">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
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
