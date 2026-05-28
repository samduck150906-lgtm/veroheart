/** 이터널식스 사업자·연락처 (푸터·약관 등 공통)
 *  - 휴대폰 번호는 푸터에서 마스킹 노출하고, 통화는 tel: 링크에서 정상 연결됩니다.
 *  - 개인 정보 스팸/피싱 방지 목적의 표시 정책입니다 (사업자등록 정보는 그대로 유지).
 */
export const COMPANY = {
  tradeName: '이터널식스',
  representative: '성아름',
  bizRegNo: '303-28-65658',
  mailOrderBizNo: '제 2025-수원영통-1499호',
  /** 통화 연결용 실제 번호 (tel: 링크 등 백엔드 용도) */
  phone: '010-8111-9370',
  /** 화면 노출용 마스킹 번호 (가운데 4자리 가림) */
  phoneDisplay: '010-****-9370',
  phoneTelHref: 'tel:010-8111-9370',
  address: '경기도 수원시 영통구 삼성로 186-1 4층',
  /** 공식 문의 이메일 (대표 메일) */
  email: 'veroro@eternalsix.com',
} as const;
