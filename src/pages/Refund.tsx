import { COMPANY } from '../constants/companyInfo';

export default function Refund() {
  return (
    <div style={{ padding: '20px', paddingTop: '80px', paddingBottom: '100px', lineHeight: '1.8' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>취소 및 환불 안내</h1>
      <div style={{ fontSize: '13px', color: '#374151' }}>
        <p style={{ fontWeight: 'bold', marginTop: '16px' }}>제1조 (청약철회)</p>
        <p>
          소비자는 전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라 상품을 수령한 날부터 7일 이내에 청약철회를 할 수 있습니다.
          다만, 다음 각 호의 경우에는 청약철회가 제한됩니다.
        </p>
        <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyleType: 'disc' }}>
          <li>소비자의 책임 있는 사유로 상품이 멸실되거나 훼손된 경우</li>
          <li>소비자의 사용 또는 일부 소비에 의하여 상품의 가치가 현저히 감소한 경우</li>
          <li>시간이 경과하여 재판매가 곤란할 정도로 상품의 가치가 현저히 감소한 경우</li>
          <li>복제가 가능한 상품의 포장을 훼손한 경우</li>
        </ul>

        <p style={{ fontWeight: 'bold', marginTop: '24px' }}>제2조 (환불 절차)</p>
        <p>
          1. 환불 요청은 마이페이지 내 주문내역에서 가능하며, 고객센터({COMPANY.phone})를 통해서도 접수 가능합니다.<br/>
          2. 환불 요청이 정상적으로 접수되면 3영업일 이내에 환불 처리됩니다.<br/>
          3. 결제 수단에 따라 실제 환불 완료까지 최대 7영업일이 소요될 수 있습니다.<br/>
          4. 신용카드 결제의 경우 카드사 매입 취소를 통해 승인이 취소됩니다.
        </p>

        <p style={{ fontWeight: 'bold', marginTop: '24px' }}>제3조 (반품 배송비)</p>
        <p>
          1. 상품 불량 및 오배송의 경우: 반품 배송비는 판매자 부담<br/>
          2. 단순 변심의 경우: 왕복 배송비 고객 부담 (5,000원)<br/>
          3. 부분 반품의 경우 남은 주문 금액이 무료배송 기준에 미달하면 기존 배송비가 추가 차감될 수 있습니다.
        </p>

        <p style={{ fontWeight: 'bold', marginTop: '24px' }}>제4조 (교환)</p>
        <p>
          1. 교환은 동일 상품으로만 가능합니다.<br/>
          2. 상품 수령일로부터 7일 이내에 교환 요청이 가능합니다.<br/>
          3. 교환 배송비는 사유에 따라 소비자 또는 판매자가 부담합니다.
        </p>

        <p style={{ fontWeight: 'bold', marginTop: '24px' }}>제5조 (반려동물 식품 특례)</p>
        <p>
          반려동물 식품(사료, 간식 등)의 경우 포장 개봉 후에는 위생상의 이유로 교환·환불이 불가합니다.
          단, 유통기한 경과, 이물질 혼입 등 상품 하자의 경우에는 수령일로부터 30일 이내에 교환·환불 요청이 가능합니다.
        </p>

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
