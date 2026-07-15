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
      className="border-b border-ink-800/10 bg-white py-20 sm:py-24"
      aria-labelledby="personalization-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              kicker="맞춤 분석"
              id="personalization-heading"
              title="모든 반려동물에게 같은 답을 보여주지 않아요."
              description="강아지인지 고양이인지, 몇 살인지, 어떤 성분에 민감한지에 따라 확인해야 할 내용은 달라질 수 있어요."
            />
          </Reveal>

          <Reveal delayMs={100}>
            <div className="mx-auto w-full max-w-sm rounded-3xl border border-ink-800/10 bg-cream-50 p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-800/50">
                  <PawIcon className="h-4 w-4 text-gold-deep" />
                  반려동물 프로필
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-800/50 shadow-card">
                  데모 프로필
                </span>
              </div>
              <dl className="mt-5 divide-y divide-ink-800/10">
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.label} className="flex items-center justify-between py-3">
                    <dt className="text-sm text-ink-800/60">{f.label}</dt>
                    <dd className="text-sm font-bold text-ink-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-ink-800/50">
                실제 이용자의 정보가 아닌 예시 프로필입니다.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
