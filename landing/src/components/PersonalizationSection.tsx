import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { PawIcon } from "@/components/icons";

const PROFILE_FIELDS = [
  { label: "이름", value: "코코" },
  { label: "종", value: "고양이" },
  { label: "나이", value: "4세" },
  { label: "민감 부위", value: "피부" },
  { label: "알레르기", value: "닭고기" },
];

export function PersonalizationSection() {
  return (
    <section
      id="personalization"
      className="bg-paper py-20 sm:py-28"
      aria-labelledby="personalization-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <SectionHeading
              kicker="맞춤 분석"
              id="personalization-heading"
              title="모든 반려동물에게 같은 답을 보여주지 않습니다."
              description="종, 나이, 민감한 성분에 따라 확인해야 할 내용은 달라질 수 있습니다."
            />
          </Reveal>

          <Reveal delayMs={100}>
            <div className="mx-auto w-full max-w-sm rounded-2xl bg-sand p-6">
              <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <PawIcon className="h-4 w-4 text-accent" />
                  반려동물 프로필
                </span>
                <span>데모 프로필</span>
              </div>
              <dl className="mt-5 divide-y divide-ink-950/10">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.label} className="flex items-center justify-between py-3">
                    <dt className="text-sm text-ink-500">{f.label}</dt>
                    <dd className="text-sm font-bold text-ink-950">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                실제 이용자의 정보가 아닌 예시 프로필입니다.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
