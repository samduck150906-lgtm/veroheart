import { Reveal } from "@/components/Reveal";
import { ArrowRightIcon, ShieldCheckIcon } from "@/components/icons";
export function TrustSection() {
  return (
    <section id="trust" className="v3-trust" aria-labelledby="trust-heading">
      <div className="v3-container v3-trust-grid">
        <Reveal>
          <span className="v3-trust-icon">
            <ShieldCheckIcon />
          </span>
          <p className="v3-kicker">CLEAR INFORMATION, REAL CARE</p>
          <h2 id="trust-heading">
            좋다는 말보다,
            <br />
            <span>확인할 수 있는 근거.</span>
          </h2>
          <p className="v3-trust-description">
            보호자가 스스로 선택할 수 있도록,
            <br />
            무엇을 보고 안내하는지 함께 보여드립니다.
          </p>
        </Reveal>
        <Reveal delayMs={100}>
          <div className="v3-trust-principles">
            {[
              [
                "공개된 정보에서 시작해요",
                "제품의 원재료와 영양정보, 확인된 출처를 바탕으로 정리합니다.",
              ],
              [
                "우리 아이의 정보를 함께 봐요",
                "등록한 종·연령대·알레르기·건강 고민을 기준에 반영합니다.",
              ],
              [
                "모르는 정보는 구분해요",
                "확인되지 않은 원료나 정보는 확정된 결과와 나누어 안내합니다.",
              ],
            ].map(([title, description], index) => (
              <div key={title}>
                <span>0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ArrowRightIcon />
              </div>
            ))}
          </div>
          <p className="v3-medical-note">
            제품 라벨 기반 참고 정보입니다. 질병·치료 목적의 급여 판단은
            수의사와 상담해 주세요.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
