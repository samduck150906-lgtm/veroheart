import { COMPANY } from '../constants/companyInfo';

export default function Refund() {
  return (
    <div style={{ padding: '20px', paddingTop: '80px', paddingBottom: '100px', lineHeight: 1.65 }}>
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>VeRoRo(베로로) 취소 및 환불 안내</h1>
      <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '20px' }}>시행일: 2026년 4월 12일</p>

      <div style={{ fontSize: '13px', color: '#374151' }}>
        <p>
          본 안내는 VeRoRo(베로로) 서비스를 통해 이루어지는 전자상거래 및 유료 서비스(구독·프리미엄 등, 도입 시)에
          적용됩니다. 세부 사항은 주문·결제 화면 및 별도 고지를 함께 확인해 주세요.
        </p>

        <p style={{ fontWeight: 'bold', marginTop: '18px' }}>제1조 (청약철회·계약 취소)</p>
        <p>① 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조에 따라, 이용자는 상품 배송이 시작되기 전까지
          구매를 취소할 수 있습니다. 배송 상태에 따라 취소 가능 여부가 달라질 수 있습니다.</p>
        <p>② 다음 각 호에 해당하는 경우에는 법령에 따라 청약철회가 제한될 수 있습니다.</p>
        <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
          <li>이용자에게 책임 있는 사유로 재화 등이 멸실되거나 훼손된 경우(다만 내용 확인을 위한 포장 개봉 등은 제외)</li>
          <li>이용자의 사용 또는 일부 소비로 재화 등의 가치가 현저히 감소한 경우</li>
          <li>시간의 경과로 재판매가 곤란할 정도로 재화 등의 가치가 현저히 감소한 경우</li>
          <li>복제 가능한 재화 등의 포장을 훼손한 경우</li>
          <li>그 밖에 법령에서 정한 청약철회 제한 사유에 해당하는 경우</li>
        </ul>

        <p style={{ fontWeight: 'bold', marginTop: '24px' }}>제2조 (환불 절차)</p>
        <p>
          1. 환불 요청은 마이페이지 내 주문내역에서 가능하며, 고객센터({COMPANY.phone})를 통해서도 접수 가능합니다.<br/>
          2. 환불 요청이 정상적으로 접수되면 3영업일 이내에 환불 처리됩니다.<br/>
          3. 결제 수단에 따라 실제 환불 완료까지 최대 7영업일이 소요될 수 있습니다.<br/>
          4. 신용카드 결제의 경우 카드사 매입 취소를 통해 승인이 취소됩니다.
        </p>

        <p style={{ fontWeight: 'bold', marginTop: '18px' }}>제3조 (환불 절차 및 기한)</p>
        <p>① 취소·환불 신청은 앱 내 마이페이지 또는 주문 상세에서 가능하며, 고객센터를 통해서도 접수할 수 있습니다.</p>
        <p>② 회사는 합당한 환불 사유가 확인된 경우 관련 법령에 따라 지체 없이 환급 절차를 진행합니다. 결제수단별로
          카드사 매입 취소 등 실제 환불 반영까지 영업일 기준 수 일이 소요될 수 있습니다.</p>
        <p>③ 부분 취소·부분 환불 시 남은 금액이 무료배송 조건 등에 미달하는 경우, 정책에 따라 배송비 등이 재청구되거나
          차감될 수 있습니다.</p>

        <p style={{ fontWeight: 'bold', marginTop: '18px' }}>제4조 (배송비 부담)</p>
        <p>① 상품 하자·오배송의 경우: 반품(또는 교환)에 필요한 배송비는 회사가 부담합니다.</p>
        <p>② 단순 변심에 의한 청약철회의 경우: 왕복 배송비 등은 이용자가 부담하는 것이 원칙이며, 금액은 주문 시
          고지된 정책에 따릅니다.</p>

        <p style={{ fontWeight: 'bold', marginTop: '18px' }}>제5조 (구독·프리미엄 등 정기·유료 서비스)</p>
        <p>① 구독형 서비스를 제공하는 경우, 요금·갱신 주기·해지 방법·환불 조건은 결제 전 별도 화면에서 안내·동의받으며,
          법령이 정한 범위 내에서 중도 해지 시 이용 기간에 따른 일할 계산 등을 적용할 수 있습니다.</p>
        <p>② 이미 사용·다운로드된 디지털 콘텐츠 등은 그 성격상 환불이 제한될 수 있습니다.</p>

        <div style={{ marginTop: '32px', padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '12px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>📞 고객센터 · 사업자 정보</p>
          <p>
            상호 {COMPANY.tradeName} · 대표 {COMPANY.representative}
            <br />
            사업자등록번호 {COMPANY.bizRegNo} · 통신판매업 {COMPANY.mailOrderBizNo}
            <br />
            주소 {COMPANY.address}
            <br />
            전화: {COMPANY.phone}
            <br />
            이메일: {COMPANY.email}
            <br />
            운영시간: 평일 10:00 ~ 18:00 (점심 12:00 ~ 13:00 제외)
            <br />
            주말 및 공휴일 휴무
          </p>
        </div>
      </div>
    </div>
  );
}
