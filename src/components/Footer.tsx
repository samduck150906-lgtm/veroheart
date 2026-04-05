import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const btnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '7px 10px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 700,
  textDecoration: 'none',
  color: 'var(--text-dark)',
  backgroundColor: 'var(--surface-elevated)',
  border: '1px solid rgba(232, 90, 60, 0.18)',
  boxShadow: 'none',
  transition: 'background-color 0.2s, border-color 0.2s',
};

function Footer() {
  return (
    <footer
      style={{
        padding: '12px 20px 16px',
        backgroundColor: 'rgba(255, 245, 240, 0.85)',
        borderTop: '1px solid rgba(232, 90, 60, 0.1)',
        color: '#6b6560',
        fontSize: '11px',
        lineHeight: 1.5,
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>
          약관 및 안내
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '10px',
          }}
        >
          <Link to="/terms" style={btnStyle}>
            이용약관
          </Link>
          <Link to="/privacy" style={btnStyle}>
            개인정보처리방침
          </Link>
          <Link to="/refund" style={btnStyle}>
            취소 및 환불 안내
          </Link>
        </div>

        <div
          style={{
            marginBottom: '10px',
            fontSize: '9px',
            lineHeight: 1.55,
            color: '#8B8681',
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
            marginTop: '8px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(232, 90, 60, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '10px' }}>© 이터널식스. All rights reserved.</p>
          <Link
            to="/cart"
            style={{
              ...btnStyle,
              marginLeft: 'auto',
              backgroundColor: 'rgba(255, 107, 74, 0.12)',
              borderColor: 'rgba(232, 90, 60, 0.25)',
              color: 'var(--primary-dark)',
            }}
          >
            장바구니 · 결제
          </Link>
        </div>
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(232, 90, 60, 0.15)',
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--primary-dark)',
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
