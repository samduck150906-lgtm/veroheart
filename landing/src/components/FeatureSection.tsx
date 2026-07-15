import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import {
  ScanIcon,
  BellIcon,
  LeafIcon,
  CompareIcon,
  CartIcon,
} from "@/components/icons";

const FEATURES = [
  {
    icon: ScanIcon,
    title: "성분표 촬영",
    body: "작은 글씨의 성분표도 사진으로 간편하게 확인해요.",
  },
  {
    icon: BellIcon,
    title: "맞춤 주의 알림",
    body: "우리 아이의 알레르기와 건강 정보를 반영해요.",
  },
  {
    icon: LeafIcon,
    title: "성분 쉬운 설명",
    body: "낯선 원재료와 영양 용어를 쉽게 풀어드려요.",
  },
  {
    icon: CompareIcon,
    title: "제품 비교",
    body: "여러 제품의 원료와 영양정보를 한눈에 비교해요.",
  },
  {
    icon: CartIcon,
    title: "구매처 탐색",
    body: "제품별로 등록된 판매처와 가격 정보를 확인해요.",
  },
];

export function FeatureSection() {
  return (
    <section
      id="features"
      className="bg-paper py-20 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="주요 기능"
            id="features-heading"
            title="필요한 기능만 담았어요"
            description="성분 확인부터 비교까지, 식단 결정에 필요한 만큼만."
          />
        </Reveal>
        <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delayMs={i * 60}>
              <div>
                <f.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-4 text-base font-bold text-ink-950">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
