import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <Helmet>
        <title>페이지를 찾을 수 없어요 | 베로로</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div style={{ fontSize: '64px', fontWeight: 900, color: 'var(--primary-dark)', lineHeight: 1, marginBottom: '12px' }}>
        404
      </div>
      <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>
        페이지를 찾을 수 없어요
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 28px', maxWidth: '320px' }}>
        주소가 바뀌었거나 삭제된 페이지일 수 있어요. 아래 버튼으로 이동해 주세요.
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '12px 20px', borderRadius: '14px',
            background: 'var(--primary)', color: '#fff',
            fontWeight: 700, fontSize: '14px', textDecoration: 'none',
          }}
        >
          <Home size={18} /> 홈으로
        </Link>
        <Link
          to="/search"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '12px 20px', borderRadius: '14px',
            background: '#fff', color: 'var(--primary-dark)',
            border: '1.5px solid rgba(129, 201, 149, 0.4)',
            fontWeight: 700, fontSize: '14px', textDecoration: 'none',
          }}
        >
          <Search size={18} /> 상품 탐색
        </Link>
      </div>
    </div>
  );
}
