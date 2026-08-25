/**
 * 름랩(REUMLAB) 사업자·연락처 (푸터·약관 등 공통)
 *
 * 값의 출처는 사업자등록증 및 「경기도 반려동물 창업공모전」 제출서류다.
 * landing/src/constants/company.ts 와 동일한 값을 유지한다 — 임의 생성 금지.
 *
 * mailOrderBizNo 는 통신판매업 신고번호다. 름랩 명의로 신고된 번호가 아직 없어
 * 빈 문자열로 두었고, 화면에서는 값이 있을 때만 해당 항목이 노출된다.
 * 신고 완료 후 이 한 줄만 채우면 앱·랜딩 전체에 반영된다.
 */
export const COMPANY = {
  tradeName: '름랩',
  tradeNameEn: 'REUMLAB',
  representative: '성아름',
  bizRegNo: '793-12-03247',
  mailOrderBizNo: '',
  phone: '010-8111-9370',
  phoneTelHref: 'tel:010-8111-9370',
  address: '경기도 화성시',
  email: 'cinging1000@naver.com',
} as const;
