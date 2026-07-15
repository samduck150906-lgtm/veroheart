import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { AlertIcon, ChatHeartIcon, SearchIcon, LeafIcon } from "@/components/icons";

const PAIN_POINTS = [
  {
    icon: LeafIcon,
    text: "연어가 들어갔다는데, 왜 동물성 단백질 함량은 낮게 나오지?",
  },
  {
    icon: AlertIcon,
    text: "알레르기가 있는데, 원재료를 하나씩 찾아보기가 너무 어려워요.",
  },
  {
    icon: SearchIcon,
    text: "제품은 많고 설명은 긴데, 뭘 기준으로 골라야 할지 모르겠어요.",
  },
  {
    icon: ChatHeartIcon,
    text: "성분이 좋다는 말보다, 왜 좋은지를 알고 싶어요.",
  },
];

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="border-b border-ink-800/10 bg-white py-20 sm:py-24"
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="보호자의 고민"
            id="problem-heading"
            title="성분표 앞에서, 한 번쯤 멈춰본 적 있으신가요?"
            description="원재료명과 보장성분만으로는 우리 아이에게 맞는 제품인지 판단하기 어렵습니다."
          />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2">
          {PAIN_POINTS.map((item, i) => (
            <Reveal key={item.text} delayMs={i * 70}>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-ink-800/10 bg-cream-50 px-6 py-5">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-gold-deep shadow-card">
                  <item.icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-ink-800 sm:text-base">
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
