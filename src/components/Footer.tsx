


export default function Footer() {
  return (
    <footer style={{ padding: '24px 20px', backgroundColor: '#f9fafb', borderTop: '1px solid #f3f4f6', color: '#6b7280', fontSize: '12px', lineHeight: '1.6', marginTop: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', fontWeight: 'bold' }}>
          <a href="/terms.html" style={{ color: '#374151', textDecoration: 'none' }}>이용약관</a>
          <a href="/privacy.html" style={{ color: '#374151', textDecoration: 'none' }}>개인정보처리방침</a>
          <a href="/refund.html" style={{ color: '#374151', textDecoration: 'none' }}>취소 및 환불 안내</a>
          <a href="/checkout.html" style={{ color: "#4f46e5", textDecoration: "none", marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#e0e7ff", padding: "4px 12px", borderRadius: "12px" }}>🛒 <strong>비회원 장바구니/결제 (테스트)</strong></a>
        </div>
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#6b7280' }}>
            <span>상호명: 이터널식스 | 대표자: 성아름 | 사업자등록번호: 303-28-65658</span>
            <span>통신판매업: 제 2025-수원영통-1499호 | 주소: 경기도 수원시 영통구 삼성로 186-1 4층</span>
            <span>연락처: 010-8111-9370 | 이메일: ceo@eternalsix.kr</span>
          </div>
        </div>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, color: '#9ca3af' }}>© Eternalsix. All rights reserved.</p>
          <div style={{ background: '#fff', padding: '4px 12px', borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px', fontWeight: 'bold', color: '#4f46e5' }}>
            TOSS PAYMENTS 가맹점
          </div>
        </div>
      </div>
    </footer>
  );
}
