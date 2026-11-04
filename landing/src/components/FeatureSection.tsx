"use client";
import { useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  PawIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { Reveal } from "@/components/Reveal";
export function FeatureSection() {
  const [pet, setPet] = useState<"dog" | "cat">("dog");
  return (
    <section
      id="features"
      className="v3-section v3-features"
      aria-labelledby="features-heading"
    >
      <div className="v3-container">
        <Reveal>
          <div className="v3-section-intro">
            <div>
              <p className="v3-kicker">A LITTLE MORE CARE</p>
              <h2 id="features-heading">
                성분을 아는 만큼,
                <br />
                선택이 편안해져요.
              </h2>
            </div>
            <p>
              긴 설명을 모두 읽지 않아도 괜찮아요.
              <br />
              먹거리 선택에 필요한 정보를
              <br />
              베로로가 차근차근 정리해 드릴게요.
            </p>
          </div>
        </Reveal>
        <div className="v3-feature-grid">
          <Reveal className="v3-analysis-feature">
            <article
              className="v3-feature-card v3-card-cream"
              id="analysis-preview"
            >
              <div className="v3-card-heading">
                <span className="v3-square-icon">
                  <SearchIcon />
                </span>
                <span className="v3-card-label">01 / 원료 살펴보기</span>
              </div>
              <h3>
                이름은 낯설어도,
                <br />
                설명은 쉽게.
              </h3>
              <p>
                원재료와 영양정보, 주의할 성분을
                <br />한 화면에서 확인해 보세요.
              </p>
              <div
                className="v3-demo"
                aria-label="반려동물 프로필에 따른 성분 안내 예시"
              >
                <div className="v3-demo-top">
                  <span>우리 아이 기준으로 보기</span>
                  <span className="v3-demo-label">예시 화면</span>
                </div>
                <div className="v3-demo-pets" aria-label="예시 반려동물 선택">
                  <button
                    type="button"
                    aria-pressed={pet === "dog"}
                    onClick={() => setPet("dog")}
                  >
                    <span className="v3-pet-avatar">
                      <PawIcon />
                    </span>
                    <span>
                      <strong>보리</strong>
                      <small>강아지 · 닭고기 알레르기</small>
                    </span>
                    <span className="v3-selection-dot" />
                  </button>
                  <button
                    type="button"
                    aria-pressed={pet === "cat"}
                    onClick={() => setPet("cat")}
                  >
                    <span className="v3-pet-avatar v3-avatar-lilac">
                      <PawIcon />
                    </span>
                    <span>
                      <strong>나비</strong>
                      <small>고양이 · 알레르기 없음</small>
                    </span>
                    <span className="v3-selection-dot" />
                  </button>
                </div>
                <div className="v3-demo-result" aria-live="polite">
                  <div
                    className={
                      pet === "dog" ? "v3-result-caution" : "v3-result-neutral"
                    }
                  >
                    <ShieldCheckIcon />
                    <strong>
                      {pet === "dog"
                        ? "보리의 알레르기 원료를 확인해 주세요"
                        : "나비는 등록된 알레르기가 없어요"}
                    </strong>
                  </div>
                  <p>
                    {pet === "dog"
                      ? "예시 원료에 닭고기가 포함되어 있어요."
                      : "원료와 영양정보도 함께 살펴보세요."}
                  </p>
                </div>
                <div className="v3-ingredient-rows">
                  {["닭고기", "현미", "연어오일"].map((name, index) => (
                    <div key={name}>
                      <span>
                        <b>{String(index + 1).padStart(2, "0")}</b>
                        {name}
                      </span>
                      <span
                        className={
                          index === 0 && pet === "dog"
                            ? "v3-ingredient-caution"
                            : ""
                        }
                      >
                        {index === 0 && pet === "dog"
                          ? "알레르기 확인"
                          : "원료 정보"}
                        <ArrowRightIcon />
                      </span>
                    </div>
                  ))}
                </div>
                <p className="v3-demo-footnote">
                  기능 소개를 위한 예시입니다. 실제 결과는 제품과 프로필에 따라
                  달라집니다.
                </p>
              </div>
            </article>
          </Reveal>
          <div className="v3-feature-side">
            <Reveal delayMs={80}>
              <article className="v3-feature-card v3-card-yellow">
                <div className="v3-card-heading">
                  <span className="v3-square-icon">
                    <PawIcon />
                  </span>
                  <span className="v3-card-label">02 / 우리 아이 프로필</span>
                </div>
                <h3>
                  모두에게 좋은 것보다,
                  <br />
                  우리 아이에게 맞게.
                </h3>
                <p>
                  종과 연령대, 알레르기와 건강 고민.
                  <br />
                  다른 아이들의 정보를 각각 담아보세요.
                </p>
                <div className="v3-profile-tags" aria-hidden="true">
                  <span>강아지 / 고양이</span>
                  <span>연령대</span>
                  <span>알레르기</span>
                  <span>건강 고민</span>
                </div>
                <span className="v3-profile-decoration" aria-hidden="true">
                  <PawIcon />
                </span>
              </article>
            </Reveal>
            <Reveal delayMs={140}>
              <article className="v3-feature-card v3-card-mint">
                <div className="v3-card-heading">
                  <span className="v3-square-icon">
                    <CheckIcon />
                  </span>
                  <span className="v3-card-label">03 / 급여 다이어리</span>
                </div>
                <h3>
                  먹인 뒤의 이야기도,
                  <br />
                  잊지 않고 기록해요.
                </h3>
                <p>
                  급여량부터 기호도와 특이사항까지.
                  <br />
                  매일의 작은 기록을 한곳에 모아보세요.
                </p>
                <div className="v3-diary-demo" aria-hidden="true">
                  <div>
                    <span>월</span>
                    <i />
                  </div>
                  <div>
                    <span>화</span>
                    <i />
                  </div>
                  <div className="is-today">
                    <span>수</span>
                    <i>
                      <CheckIcon />
                    </i>
                  </div>
                  <div>
                    <span>목</span>
                    <i />
                  </div>
                  <div>
                    <span>금</span>
                    <i />
                  </div>
                  <span className="v3-diary-note">오늘도 기록 완료!</span>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
