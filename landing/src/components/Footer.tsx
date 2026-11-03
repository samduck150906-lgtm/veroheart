import Link from "next/link";
import {
  COMPANY,
  CONTACT_MAILTO,
  SOCIAL_INSTAGRAM,
  SOCIAL_YOUTUBE,
} from "@/constants/company";
import { PawIcon } from "@/components/icons";
export function Footer() {
  return (
    <footer className="v3-footer" aria-label="푸터">
      <div className="v3-container">
        <div className="v3-footer-top">
          <div>
            <Link href="/" aria-label="베로로 홈" className="v3-brand">
              <span className="v3-brand-icon">
                <PawIcon />
              </span>
              <span>
                VERORO<span className="v3-brand-dot">.</span>
              </span>
            </Link>
            <p>
              조금 더 알고,
              <br />더 많이 사랑하기.
            </p>
          </div>
          <nav aria-label="정책">
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/refund">취소 및 환불 안내</Link>
            <a href={CONTACT_MAILTO("[VeRoRo] 문의")}>고객센터 문의 ↗</a>
            {SOCIAL_INSTAGRAM && (
              <a href={SOCIAL_INSTAGRAM} target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
            )}
            {SOCIAL_YOUTUBE && (
              <a href={SOCIAL_YOUTUBE} target="_blank" rel="noreferrer">
                YouTube ↗
              </a>
            )}
          </nav>
        </div>
        <div className="v3-footer-bottom">
          <div>
            <p>
              {COMPANY.tradeName} · 대표 {COMPANY.representative} ·
              사업자등록번호 {COMPANY.bizRegNo}
            </p>
            <p>{COMPANY.address}</p>
            <p>
              고객센터 {COMPANY.phone} · {COMPANY.email}
            </p>
            <p className="v3-partners-note">
              이 서비스에서 안내되는 일부 구매처 링크는 쿠팡 파트너스 활동의
              일환으로, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.
            </p>
          </div>
          <span>
            © {new Date().getFullYear()} {COMPANY.tradeName}
          </span>
        </div>
      </div>
    </footer>
  );
}
