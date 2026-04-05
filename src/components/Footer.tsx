import type { CSSProperties, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
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
        padding: '18px 20px 22px',
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
            marginBottom: '14px',
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

        <details
          style={{
            marginBottom: '14px',
            background: 'rgba(255,255,255,0.72)',
            border: '1px solid rgba(232, 90, 60, 0.12)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          <summary
            style={{
              listStyle: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 14px',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '4px' }}>
                사업자 정보
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.45 }}>
                이터널식스 · 성아름 · 303-28-65658
              </div>
            </div>
            <ChevronDown size={16} color="#8B8F97" style={{ flexShrink: 0 }} />
          </summary>
          <div
            style={{
              padding: '0 14px 14px',
              display: 'grid',
              gap: '8px',
              color: '#5c564f',
              fontSize: '11px',
              borderTop: '1px solid rgba(232, 90, 60, 0.08)',
            }}
          >
            <InfoRow label="통신판매업" value="제 2025-수원영통-1499호" />
            <InfoRow
              label="연락처"
              value={
                <a href="tel:010-8111-9370" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  010-8111-9370
                </a>
              }
            />
            <InfoRow label="주소" value="경기도 수원시 영통구 삼성로 186-1 4층" />
            <InfoRow
              label="이메일"
              value={
                <a href="mailto:ceo@eternalsix.kr" style={{ color: 'inherit', textDecoration: 'underline' }}>
                  ceo@eternalsix.kr
                </a>
              }
            />
          </div>
        </details>

        <div
          style={{
            marginTop: '12px',
            paddingTop: '14px',
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
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
          <div
            style={{
              background: 'var(--surface-elevated)',
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid rgba(232, 90, 60, 0.15)',
              fontSize: '10px',
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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: '10px', alignItems: 'start', paddingTop: '8px' }}>
      <strong style={{ color: 'var(--text-dark)', fontWeight: 700 }}>{label}</strong>
      <span style={{ wordBreak: 'break-word', lineHeight: 1.55 }}>{value}</span>
    </div>
  );
}

export { Footer };
export default Footer;
