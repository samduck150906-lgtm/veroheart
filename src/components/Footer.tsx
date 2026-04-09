import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer
      style={{
        padding: '12px 20px 14px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,243,255,0.92) 100%)',
        borderTop: '1px solid rgba(124, 111, 156, 0.14)',
        color: '#6b6560',
        fontSize: '9px',
        lineHeight: 1.45,
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '8px',
            alignItems: 'center',
          }}
        >
          <Link
            to="/terms"
            style={{ fontSize: '10px', color: '#6B5FA3', textDecoration: 'none', fontWeight: 700 }}
          >
            이용약관
          </Link>
          <span style={{ color: '#C8BFB8' }}>|</span>
          <Link
            to="/privacy"
            style={{ fontSize: '10px', color: '#6B5FA3', textDecoration: 'none', fontWeight: 700 }}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: '#C8BFB8' }}>|</span>
          <Link
            to="/refund"
            style={{ fontSize: '10px', color: '#6B5FA3', textDecoration: 'none', fontWeight: 700 }}
          >
            취소 및 환불 안내
          </Link>
        </div>

        <div
          style={{
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 800,
            color: '#221B35',
          }}
        >
          Petty Community powered by VeRoRo
        </div>

        <div
          style={{
            fontSize: '8.5px',
            lineHeight: 1.4,
            color: '#938D88',
          }}
        >
          <p style={{ margin: '0 0 1px' }}>
            상호 이터널식스 · 대표자 성아름 · 사업자등록번호 303-28-65658 · 통신판매업 제 2025-수원영통-1499호
          </p>
          <p style={{ margin: 0 }}>
            주소 경기도 수원시 영통구 삼성로 186-1 4층 · 연락처{' '}
            <a href="tel:010-8111-9370" style={{ color: 'inherit', textDecoration: 'none' }}>
              010-8111-9370
            </a>{' '}
            · 이메일{' '}
            <a href="mailto:ceo@eternalsix.kr" style={{ color: 'inherit', textDecoration: 'none' }}>
              ceo@eternalsix.kr
            </a>{' '}
            · © 이터널식스
          </p>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
