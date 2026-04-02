import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

const btnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '10px 14px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 700,
  textDecoration: 'none',
  color: 'var(--text-dark)',
  backgroundColor: 'var(--surface-elevated)',
  border: '1px solid rgba(232, 90, 60, 0.18)',
  boxShadow: 'var(--shadow-sm)',
  transition: 'background-color 0.2s, border-color 0.2s',
};

function Footer() {
  return (
    <footer
      style={{
        padding: '24px 20px 28px',
        backgroundColor: 'rgba(255, 245, 240, 0.85)',
        borderTop: '1px solid rgba(232, 90, 60, 0.1)',
        color: '#6b6560',
        fontSize: '12px',
        lineHeight: 1.65,
        marginTop: 'auto',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.04em' }}>
          약관 및 안내
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '20px',
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

        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '10px', letterSpacing: '0.04em' }}>
          사업자 정보
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            color: '#5c564f',
            fontSize: '12px',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>상호</strong> 이터널식스
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>대표자</strong> 성아름
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>사업자등록번호</strong> 303-28-65658
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>통신판매업</strong> 제 2025-수원영통-1499호
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>연락처</strong>{' '}
            <a href="tel:010-8111-9370" style={{ color: 'inherit', textDecoration: 'underline' }}>
              010-8111-9370
            </a>
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>주소</strong> 경기도 수원시 영통구 삼성로 186-1 4층
          </span>
          <span>
            <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>이메일</strong>{' '}
            <a href="mailto:ceo@eternalsix.kr" style={{ color: 'inherit', textDecoration: 'underline' }}>
              ceo@eternalsix.kr
            </a>
          </span>
        </div>

        <div
          style={{
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(232, 90, 60, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p style={{ margin: 0, color: '#9ca3af', fontSize: '11px' }}>© 이터널식스. All rights reserved.</p>
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
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: '4px 12px',
              borderRadius: '12px',
              border: '1px solid rgba(232, 90, 60, 0.15)',
              fontSize: '11px',
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
