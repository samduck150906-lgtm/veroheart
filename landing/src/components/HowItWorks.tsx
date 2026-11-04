import { Reveal } from "@/components/Reveal";
import {
  SearchIcon,
  PawIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@/components/icons";
const steps = [
  {
    title: "먹거리를 찾아요",
    description: "제품명이나 브랜드로 사료·간식·영양제를 찾아보세요.",
    icon: SearchIcon,
  },
  {
    title: "우리 아이로 확인해요",
    description: "아이의 프로필과 원료를 함께 보고, 확인할 부분을 살펴보세요.",
    icon: PawIcon,
  },
  {
    title: "오늘의 한 끼를 남겨요",
    description:
      "얼마나 먹었는지, 잘 먹었는지. 급여 기록을 차곡차곡 남겨보세요.",
    icon: CheckIcon,
  },
];
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="v3-section v3-how"
      aria-labelledby="how-it-works-heading"
    >
      <div className="v3-container">
        <Reveal>
          <div className="v3-section-intro">
            <div>
              <p className="v3-kicker">SMALL STEPS, BETTER CHOICES</p>
              <h2 id="how-it-works-heading">
                더 잘 챙기는 일,
                <br />
                어렵지 않도록.
              </h2>
            </div>
            <a href="#waitlist" className="v3-text-link">
              베로로와 시작하기 <ArrowRightIcon />
            </a>
          </div>
        </Reveal>
        <div className="v3-steps">
          {steps.map((step, index) => (
            <Reveal key={step.title} delayMs={index * 80}>
              <article>
                <div className="v3-step-top">
                  <span>STEP 0{index + 1}</span>
                  <step.icon />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
