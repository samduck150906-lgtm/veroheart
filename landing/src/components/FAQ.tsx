"use client";

import { useState } from "react";
import { Reveal } from "@/components/Reveal";

import { trackEvent } from "@/lib/analytics";

const FAQ_ITEMS = [
  {
    q: "베로로는 언제 출시되나요?",
    a: "현재 정식 출시를 준비하고 있습니다. 출시 알림을 신청하면 베타테스트와 출시 일정을 가장 먼저 안내합니다.",
  },
  {
    q: "사료와 간식만 분석할 수 있나요?",
    a: "네, 현재는 반려동물 사료와 간식, 영양제의 원재료·영양정보 분석에 집중하고 있습니다. 다른 카테고리는 추후 검토할 예정입니다.",
  },
  {
    q: "분석 결과가 수의사의 진단을 대신하나요?",
    a: "아닙니다. 베로로는 제품의 공개된 성분과 영양정보를 이해하기 쉽게 정리하는 서비스입니다. 질병의 진단이나 치료가 필요한 경우 반드시 수의사와 상담해 주세요.",
  },
  {
    q: "성분표 사진도 분석할 수 있나요?",
    a: "성분표를 촬영하면 텍스트를 인식해 분석에 활용하는 기능을 개발하고 있습니다. 정식 출시 전까지 인식 정확도를 계속 개선하고 있습니다.",
  },
  {
    q: "제품 정보는 어디에서 가져오나요?",
    a: "제조사가 공개한 원재료·영양성분 정보와 판매처에 등록된 상품 정보를 기반으로 합니다. 확인되지 않은 정보는 임의로 채우지 않고 정보 부족으로 표시합니다.",
  },
  {
    q: "개인정보는 어떻게 사용되나요?",
    a: "반려동물 프로필 정보는 맞춤 분석에만 사용되며, 출시 알림 신청 시 남긴 이메일·연락처는 출시·베타테스트 소식 안내 목적으로만 사용됩니다. 자세한 내용은 개인정보처리방침에서 확인할 수 있습니다.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (i: number) => {
    const next = openIndex === i ? null : i;
    setOpenIndex(next);
    if (next !== null) trackEvent("faq_open", { question: FAQ_ITEMS[i].q });
  };
  return (
    <section
      id="faq"
      className="v3-section v3-faq"
      aria-labelledby="faq-heading"
    >
      <div className="v3-container v3-faq-grid">
        <Reveal>
          <div>
            <p className="v3-kicker">A FEW THINGS TO KNOW</p>
            <h2 id="faq-heading">
              궁금한 점이
              <br />
              있으신가요?
            </h2>
            <a href="mailto:veroro@eternalsix.com" className="v3-text-link">
              베로로에 문의하기 <span aria-hidden>↗</span>
            </a>
          </div>
        </Reveal>
        <Reveal delayMs={80}>
          <div className="v3-faq-list">
            {FAQ_ITEMS.map((item, i) => {
              const open = openIndex === i;
              return (
                <div className="v3-faq-item" key={item.q}>
                  <h3>
                    <button
                      id={"faq-button-" + i}
                      type="button"
                      onClick={() => toggle(i)}
                      aria-expanded={open}
                      aria-controls={"faq-panel-" + i}
                    >
                      <span>{item.q}</span>
                      <span
                        className={"v3-faq-plus" + (open ? " is-open" : "")}
                        aria-hidden
                      >
                        +
                      </span>
                    </button>
                  </h3>
                  <div
                    id={"faq-panel-" + i}
                    role="region"
                    aria-labelledby={"faq-button-" + i}
                    aria-hidden={!open}
                    className="accordion-panel"
                    data-open={open}
                  >
                    <div>
                      <p>{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
