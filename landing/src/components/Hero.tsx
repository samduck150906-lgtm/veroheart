"use client";
import Image from "next/image";
import {
  ArrowRightIcon,
  CheckIcon,
  LeafIcon,
  PawIcon,
  SearchIcon,
} from "@/components/icons";
import { trackEvent } from "@/lib/analytics";
import { launchConfig } from "@/constants/launchConfig";
export function Hero() {
  return (
    <section className="v3-hero" aria-labelledby="hero-heading">
      <div className="v3-container v3-hero-grid">
        <div className="v3-hero-copy">
          <div className="v3-eyebrow">
            <span className="v3-live-dot" />
            {launchConfig.status === "prelaunch"
              ? "우리 아이를 위한 새로운 식생활"
              : "베로로와 함께하는 식생활"}
          </div>
          <h1 id="hero-heading">
            사랑하니까,
            <br />
            성분까지
            <br className="v3-small-break" /> <span>꼼꼼하게.</span>
          </h1>
          <p className="v3-hero-description">
            매일 먹는 사료부터 작은 간식까지.
            <br />
            낯선 성분표를 우리 아이 기준으로 읽어주는
            <br className="v3-desktop-break" /> 반려동물 먹거리 가이드, 베로로.
          </p>
          <div className="v3-hero-actions">
            <a
              href="#waitlist"
              className="v3-button v3-button-yellow"
              onClick={() =>
                trackEvent("hero_waitlist_click", { from: "hero_primary" })
              }
            >
              출시 알림 받기 <ArrowRightIcon />
            </a>
            <a
              href="#features"
              className="v3-text-link"
              onClick={() => trackEvent("preview_click", { from: "hero" })}
            >
              베로로 알아보기 <span aria-hidden>↗</span>
            </a>
          </div>
          <div className="v3-hero-note">
            <PawIcon /> 강아지도, 고양이도. 우리 집 아이에 맞게.
          </div>
        </div>
        <div className="v3-hero-art">
          <div className="v3-pet-photo">
            <Image
              src="/images/pets-studio-v3.webp"
              alt="나란히 앉아 있는 크림색 강아지와 회색 줄무늬 고양이"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 760px) 92vw, 50vw"
            />
            <span className="v3-photo-caption">FOR THEIR HAPPY EVERYDAY</span>
            <div className="v3-love-stamp" aria-hidden="true">
              <PawIcon />
              <span>
                made with
                <br />
                love & care
              </span>
            </div>
          </div>
          <div className="v3-floating-note">
            <span className="v3-note-icon">
              <SearchIcon />
            </span>
            <div>
              <span>작은 글씨 속 원료까지</span>
              <strong>알기 쉽게, 한눈에.</strong>
            </div>
            <span className="v3-note-check">
              <CheckIcon />
            </span>
          </div>
          <span className="v3-art-spark" aria-hidden="true">
            ✳
          </span>
        </div>
      </div>
      <div className="v3-container v3-benefit-strip">
        <span className="v3-strip-intro">
          좋은 선택의 시작은
          <br />
          <strong>제대로 아는 것부터.</strong>
        </span>
        <div>
          <SearchIcon />
          <span>
            제품과 원료를
            <br />
            <strong>쉽게 찾아보고</strong>
          </span>
        </div>
        <div>
          <PawIcon />
          <span>
            알레르기와 프로필을
            <br />
            <strong>우리 아이 기준으로</strong>
          </span>
        </div>
        <div>
          <LeafIcon />
          <span>
            매일 먹인 기록을
            <br />
            <strong>차곡차곡 남겨요</strong>
          </span>
        </div>
      </div>
    </section>
  );
}
