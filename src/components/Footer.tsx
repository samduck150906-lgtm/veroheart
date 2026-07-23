import { Link } from 'react-router-dom';
import { COMPANY } from '../constants/companyInfo';

function Footer() {
  return (
    <footer
      style={{
        padding: '12px 20px 14px',
        background: 'var(--surface-alt)',
        borderTop: '1px solid rgba(128, 128, 140, 0.14)',
        color: 'var(--text-muted)',
        fontSize: '9px',
        lineHeight: 1.45,
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
            style={{ fontSize: '10px', color: 'var(--text-dark)', textDecoration: 'none', fontWeight: 600 }}
          >
            이용약관
          </Link>
          <span style={{ color: 'var(--line)' }}>|</span>
          <Link
            to="/privacy"
            style={{ fontSize: '10px', color: 'var(--text-dark)', textDecoration: 'none', fontWeight: 600 }}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: 'var(--line)' }}>|</span>
          <Link
            to="/refund"
            style={{ fontSize: '10px', color: 'var(--text-dark)', textDecoration: 'none', fontWeight: 600 }}
          >
            취소 및 환불 안내
          </Link>
        </div>

        <div
          style={{
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-dark)',
          }}
        >
          VeRoRo
        </div>

        <div style={{ fontSize: '8.5px', lineHeight: 1.4, color: 'var(--text-muted)' }}>
          © {COMPANY.tradeName}
        </div>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
