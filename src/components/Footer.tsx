import { Link } from 'react-router-dom';
import { COUPANG_PARTNERS_DISCLOSURE } from '../constants/coupangPartners';
import { COMPANY } from '../constants/companyInfo';

function Footer() {
  return (
    <footer
      style={{
        padding: '12px 20px 14px',
        background: 'rgba(250, 250, 249, 0.96)',
        borderTop: '1px solid rgba(28, 25, 23, 0.08)',
        color: '#78716c',
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
            style={{ fontSize: '10px', color: '#57534e', textDecoration: 'none', fontWeight: 600 }}
          >
            이용약관
          </Link>
          <span style={{ color: '#d6d3d1' }}>|</span>
          <Link
            to="/privacy"
            style={{ fontSize: '10px', color: '#57534e', textDecoration: 'none', fontWeight: 600 }}
          >
            개인정보처리방침
          </Link>
          <span style={{ color: '#d6d3d1' }}>|</span>
          <Link
            to="/refund"
            style={{ fontSize: '10px', color: '#57534e', textDecoration: 'none', fontWeight: 600 }}
          >
            취소 및 환불 안내
          </Link>
        </div>

        <div
          style={{
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#292524',
          }}
        >
          VeRoRo
        </div>

        <p
          style={{
            margin: '0 0 10px',
            fontSize: '10px',
            lineHeight: 1.45,
            fontWeight: 600,
            color: '#6B6560',
          }}
        >
          {COUPANG_PARTNERS_DISCLOSURE}
        </p>

        <div style={{ fontSize: '8.5px', lineHeight: 1.4, color: '#938D88' }}>
          © {COMPANY.tradeName}
        </div>
      </div>
    </footer>
  );
}

export { Footer };
export default Footer;
