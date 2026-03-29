import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{
      padding: '24px 20px',
      backgroundColor: '#f9fafb',
      borderTop: '1px solid #f3f4f6',
      color: '#6b7280',
      fontSize: '11px',
      lineHeight: '1.6',
      paddingBottom: '80px' // BottomNav 가리리지 않게 여백
    }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', fontWeight: 'bold' }}>
        <Link to="/terms" style={{ color: '#374151', textDecoration: 'none' }}>이용약관</Link>
        <Link to="/privacy" style={{ color: '#374151', textDecoration: 'none' }}>개인정보처리방침</Link>
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}>이터널식스</p>
        <p style={{ margin: 0 }}>대표자: 성아름 | 사업자등록번호: 303-28-65658</p>
        <p style={{ margin: 0 }}>통신판매업: 제 2025-수원영통-1499호</p>
        <p style={{ margin: 0 }}>주소: 경기도 수원시 영통구 삼성로 186-1 4층</p>
        <p style={{ margin: 0 }}>연락처: 010-8111-9370 | 이메일: ceo@eternalsix.kr</p>
      </div>
      <p style={{ margin: '12px 0 0 0', color: '#9ca3af' }}>© Vero Heart. All rights reserved.</p>
    </footer>
  );
}
