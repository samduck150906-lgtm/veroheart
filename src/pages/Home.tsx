import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Helmet } from 'react-helmet-async';
import { Search, ScanLine, ChevronRight, Clock3, UtensilsCrossed, Soup, Bone, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PetSafetyAlert from '../components/PetSafetyAlert';
import type { PetSafetyScan } from '../utils/petSafety';

const CATEGORIES = [
  { label: '사료', category: '건식사료', icon: Soup },
  { label: '간식', category: '간식', icon: Bone },
  { label: '영양제', category: '영양제', icon: Pill },
];

export default function Home() {
  const { profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();

  const [safetyScan, setSafetyScan] = useState<PetSafetyScan | null>(null);
  useEffect(() => {
    if (recentViews.length === 0) {
      setSafetyScan(null);
      return;
    }
    let cancelled = false;
    import('../utils/petSafety').then(({ scanIngredientRisks }) => {
      if (!cancelled) setSafetyScan(scanIngredientRisks(recentViews, profile));
    });
    return () => {
      cancelled = true;
    };
  }, [recentViews, profile]);

  const petLabel = isLoggedIn && profile.name ? profile.name : '우리 아이';
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return '늦은 밤이에요';
    if (h < 11) return '좋은 아침이에요';
    if (h < 17) return '안녕하세요';
    return '좋은 저녁이에요';
  }, []);

  const [q, setQ] = useState('');
  const submitSearch = () => {
    const query = q.trim();
    navigate({ pathname: '/search', search: query ? `?q=${encodeURIComponent(query)}` : '' });
  };
  const goCategory = (category: string) =>
    navigate({ pathname: '/search', search: `?category=${encodeURIComponent(category)}` });

  return (
    <div style={{ paddingTop: '8px' }}>
      <Helmet>
        <title>베로로 — 사료·간식·영양제 성분 분석</title>
        <meta name="description" content="반려동물 사료·간식·영양제의 원재료와 성분을 분석하고, 먹은 제품을 기록하세요." />
      </Helmet>

      {/* 인사 + 제목 */}
      <div style={{ marginBottom: '18px' }}>
        <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
          {greeting}, {petLabel} 보호자님
        </p>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.35, letterSpacing: '-0.02em' }}>
          어떤 성분이 궁금하세요?
        </h1>
      </div>

      {/* 검색 */}
      <form
        role="search"
        onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--surface-elevated)', border: '1px solid var(--line)',
          borderRadius: '14px', padding: '14px 16px', marginBottom: '12px',
        }}
      >
        <Search size={20} color="var(--text-muted)" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제품·브랜드·성분 검색"
          aria-label="제품·브랜드·성분 검색"
          enterKeyHint="search"
          inputMode="search"
          autoComplete="off"
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', color: 'var(--text-dark)' }}
        />
      </form>

      {/* 스캔 — 단일 주요 액션 */}
      <button
        type="button"
        onClick={() => navigate('/scan')}
        className="ui-press"
        style={{
          width: '100%', minHeight: '52px', marginBottom: '28px',
          border: 'none', borderRadius: '14px', background: 'var(--primary)',
          color: 'var(--text-dark)', fontSize: '16px', fontWeight: 800, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        <ScanLine size={20} /> 바코드 스캔으로 분석
      </button>

      {safetyScan && (
        <PetSafetyAlert scan={safetyScan} petName={profile.name} onOpen={(id) => navigate(`/product/${id}`)} />
      )}

      {/* 카테고리 3종 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {CATEGORIES.map(({ label, category, icon: Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => goCategory(category)}
            className="ui-press"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '22px 10px', borderRadius: '16px',
              background: 'var(--surface-elevated)', border: '1px solid var(--line)', cursor: 'pointer',
            }}
          >
            <Icon size={26} color="var(--text-dark)" strokeWidth={1.75} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* 섭취 다이어리 진입 */}
      <button
        type="button"
        onClick={() => navigate(isLoggedIn ? '/profile?tab=diary' : '/login')}
        className="ui-press"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px',
          padding: '18px', borderRadius: '16px', background: 'var(--surface-elevated)',
          border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: 'var(--surface-alt)', flexShrink: 0 }}>
          <UtensilsCrossed size={20} color="var(--text-dark)" />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>
            {isLoggedIn ? `${petLabel} 섭취 다이어리` : '섭취 다이어리 시작하기'}
          </span>
          <span style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            먹은 사료·간식·영양제를 날짜별로 기록
          </span>
        </span>
        <ChevronRight size={20} color="var(--text-light)" />
      </button>

      {/* 최근 본 제품 */}
      {recentViews.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock3 size={17} /> 최근 본 제품
            </h2>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 8).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/product/${p.id}`)}
                style={{ flexShrink: 0, width: '116px', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
              >
                <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" style={{ width: '116px', height: '116px', borderRadius: '14px', objectFit: 'cover', marginBottom: '8px', border: '1px solid var(--line)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
