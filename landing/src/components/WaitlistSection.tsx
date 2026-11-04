import { Reveal } from "@/components/Reveal";
import { WaitlistForm } from "@/components/WaitlistForm";
import { BellIcon, PawIcon } from "@/components/icons";
export function WaitlistSection() {
  return (
    <section
      id="waitlist"
      className="v3-section v3-waitlist"
      aria-labelledby="waitlist-heading"
    >
      <div className="v3-container">
        <div className="v3-waitlist-panel">
          <Reveal>
            <div className="v3-waitlist-copy">
              <span className="v3-square-icon">
                <BellIcon />
              </span>
              <p className="v3-kicker">LET’S MEET SOON</p>
              <h2 id="waitlist-heading">
                먼저 만나요,
                <br />
                베로로.
              </h2>
              <p>
                정식 출시와 베타테스트 모집 소식을
                <br />
                가장 먼저 전해 드릴게요.
              </p>
              <div className="v3-waitlist-paw" aria-hidden="true">
                <PawIcon />
              </div>
              <span className="v3-store-note">
                App Store · Google Play 출시 예정
              </span>
            </div>
          </Reveal>
          <Reveal delayMs={100}>
            <div className="v3-waitlist-form">
              <h3>출시 소식을 받아보세요</h3>
              <p className="v3-form-intro">알림을 받을 연락처를 남겨주세요.</p>
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
