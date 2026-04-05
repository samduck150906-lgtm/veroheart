import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer
      style={{
        padding: '10px 20px 14px',
        backgroundColor: 'rgba(255, 245, 240, 0.7)',
        borderTop: '1px solid rgba(232, 90, 60, 0.1)',
        color: '#6b6560',
        fontSize: '10px',
        lineHeight: 1.4,
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '8px',
          }}
        >
          <Link
            to="/terms"
            style={{ fontSize: '10px', color: '#7B746E', textDecoration: 'none' }}
          >
            이용약관
          </Link>
          <span style={{ color: '#C8BFB8' }}>|</span>
          <Link
            to="/privacy"
            style={{ fontSize: '10px', color: '#7B746E', textDecoration: 'none' }}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: '#C8BFB8' }}>|</span>
          <Link
            to="/refund"
            style={{ fontSize: '10px', color: '#7B746E', textDecoration: 'none' }}
          >
            취소 및 환불 안내
          </Link>
        </div>

        <div
          style={{
            marginBottom: '8px',
            fontSize: '9px',
            lineHeight: 1.45,
            color: '#938D88',
          }}
        >
          <p style={{ margin: '0 0 1px' }}>
            상호 이터널식스 · 대표자 성아름 · 사업자등록번호 303-28-65658 · 통신판매업 제 2025-수원영통-1499호
          </p>
          <p style={{ margin: '0 0 1px' }}>
            주소 경기도 수원시 영통구 삼성로 186-1 4층 · 연락처{' '}
            <a href="tel:010-8111-9370" style={{ color: 'inherit', textDecoration: 'underline' }}>
              010-8111-9370
            </a>
          </p>
          <p style={{ margin: 0 }}>
            이메일{' '}
            <a href="mailto:ceo@eternalsix.kr" style={{ color: 'inherit', textDecoration: 'underline' }}>
              ceo@eternalsix.kr
            </a>
          </p>
        </div>

        <div
          style={{
            marginTop: '6px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(232, 90, 60, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px 10px',
          }}
        >
          <p style={{ margin: 0, color: '#AAA39E', fontSize: '9px' }}>© 이터널식스. All rights reserved.</p>
          <Link
            to="/cart"
            style={{
              marginLeft: 'auto',
              fontSize: '9px',
              color: '#8C5A4C',
              textDecoration: 'none',
              fontWeight: 700,
            }}
          >
            장바구니 · 결제
          </Link>
        </div>
        <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 500,
              color: '#B5AEA8',
            }}
          >
            TOSS PAYMENTS 가맹점
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
