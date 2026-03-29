import React from 'react';

export default function Privacy() {
  return (
    <div style={{ padding: '20px', paddingTop: '80px', paddingBottom: '100px', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>개인정보처리방침</h1>
      <div style={{ fontSize: '13px', color: '#374151' }}>
        <p>주식회사 베로하트(이하 "회사")는 「개인정보 보호법」 등 관련 법령상의 개인정보보호 규정을 준수하며, 정보주체의 개인정보 보호 및 권익을 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 개인정보 처리방침을 수립·공개합니다.</p>
        
        <p style={{ fontWeight: 'bold', marginTop: '16px' }}>1. 개인정보의 수집 및 이용 목적</p>
        <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. <br/>- 회원 가입 및 관리 <br/>- 재화 또는 서비스 제공(결제, 배송 등)</p>
        
        <p style={{ fontWeight: 'bold', marginTop: '16px' }}>2. 수집하는 개인정보 항목</p>
        <p>회사는 서비스 제공을 위해 아래의 개인정보를 수집합니다. <br/>- 필수항목: 성명, 연락처, 이메일, 배송지 주소, 결제정보</p>
        
        <p style={{ fontWeight: 'bold', marginTop: '16px' }}>3. 개인정보의 보유 및 이용기간</p>
        <p>회사는 법령에 따른 보존기간 또는 정보주체로부터 수집 시 동의받은 기간 내에서 개인정보를 보유·이용합니다. 전자상거래 등에서의 소비자 보호에 관한 법률 등 법령 기준에 따릅니다.</p>
      </div>
    </div>
  );
}
