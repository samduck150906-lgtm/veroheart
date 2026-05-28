import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Home as HomeIcon, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 240px)',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <Helmet>
        <title>페이지를 찾을 수 없어요 | 베로로</title>
        <meta name="description" content="요청하신 페이지를 찾을 수 없습니다. 베로로 홈으로 돌아가 다시 탐색해 보세요." />
      </Helmet>

      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--surface-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          border: '1px solid var(--border-subtle)',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '-0.02em' }}>
          404
        </span>
      </div>

      <h1
        style={{
          fontSize: '22px',
          fontWeight: 900,
          color: '#0F172A',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
        }}
      >
        앗, 페이지를 찾을 수 없어요
      </h1>
      <p
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#64748B',
          margin: '0 0 28px',
          lineHeight: 1.6,
          maxWidth: '320px',
        }}
      >
        주소가 변경되었거나 삭제된 페이지일 수 있어요.
        <br />
        홈에서 다시 시작해 보세요.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderRadius: '14px',
            background: 'var(--text-dark)',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <HomeIcon size={16} strokeWidth={1.8} />
          홈으로 이동
        </Link>
        <Link
          to="/search"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px 20px',
            borderRadius: '14px',
            background: 'var(--surface-elevated)',
            color: 'var(--text-dark)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={15} strokeWidth={1.8} />
          제품 검색하러 가기
        </Link>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '12px',
            background: 'transparent',
            color: '#94A3B8',
            fontSize: '13px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="이전 페이지로 돌아가기"
        >
          <ArrowLeft size={14} />
          이전 페이지로
        </button>
      </div>
    </div>
  );
}
