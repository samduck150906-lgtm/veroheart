import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { CheckIcon } from "@/components/icons";

const BASIS_ITEMS = [
  "공개된 원재료 정보",
  "보장성분과 영양정보",
  "성분명과 유사어 정규화",
  "반려동물 프로필 정보",
  "데이터 출처와 확인 상태",
  "규칙 기반 분석 결과",
];

export function TrustSection() {
  return (
    <section
      id="trust"
      className="bg-sand py-20 sm:py-28"
      aria-labelledby="trust-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="분석 방식"
            id="trust-heading"
            title="그럴듯한 답보다, 확인 가능한 근거를 보여드려요."
            description="베로로는 공개된 제품 정보와 기준을 바탕으로 원재료와 영양정보를 분석합니다. 확인되지 않은 정보는 임의로 채우지 않고 '정보 부족'으로 구분해 표시해요."
          />
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <Reveal>
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {BASIS_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-ink-900">
                  <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayMs={80}>
            <div className="rounded-2xl bg-paper p-6 sm:p-8">
              <h3 className="text-sm font-bold text-ink-950">이렇게 판단해요</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                베로로의 판정과 점수는 AI가 즉흥적으로 만든 답이 아니라, 성분
                사전과 반려동물 프로필을 기준으로 한 규칙 기반 로직에서
                도출돼요. 같은 조건이면 항상 같은 결과가 나옵니다.
              </p>
              <div className="mt-5 border-t border-ink-950/10 pt-5">
                <p className="text-xs font-semibold text-ink-500">중요한 고지</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-900">
                  이 분석은 제품 라벨 기반 참고 정보이며, 질병·치료 목적의
                  급여 판단은 수의사 상담이 필요합니다.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
