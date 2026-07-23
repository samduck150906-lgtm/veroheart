import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Helmet } from 'react-helmet-async';
import {
  ChevronRight,
  Search,
  ScanLine,
  FlaskConical,
  PawPrint,
  Pill,
  Clock3,
  UtensilsCrossed,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import { FEATURED_BRANDS } from '../constants/discoveryFeed';
import { TossSectionTitle } from '../components/TossUI';
import PetSafetyAlert from '../components/PetSafetyAlert';
import type { PetSafetyScan } from '../utils/petSafety';

export default function Home() {
  const { profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();

  // 최근 본 제품에서 우리 아이 회피·위험 성분 스캔 (홈 상단 경고 배너).
  // 성분 사전은 무거우므로, 최근 본 제품이 있을 때만 동적 import로 지연 로드한다.
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
    if (h < 6) return '늦은 밤이네요';
    if (h < 11) return '좋은 아침이에요';
    if (h < 17) return '안녕하세요';
    return '좋은 저녁이에요';
  }, []);

  const goSearchWith = (query: string) =>
    navigate({
      pathname: '/search',
      search: query ? `?q=${encodeURIComponent(query)}` : '',
    });

  const goCategory = (name: string) =>
    navigate({ pathname: '/search', search: `?category=${encodeURIComponent(name)}` });

  // 홈 상단 실제 검색 입력 — 홈에서 바로 입력·제출한다.
  const [heroQuery, setHeroQuery] = useState('');
  const submitHeroSearch = () => {
    const q = heroQuery.trim();
    if (!q) return;
    goSearchWith(q);
  };

  const quickActions = [
    { key: 'scan', label: '성분 분석', icon: FlaskConical, tint: 'rgba(21, 179, 107, 0.12)', color: '#15803D', onClick: () => navigate('/scan') },
    { key: 'pet', label: '우리 아이', icon: PawPrint, tint: 'rgba(219, 39, 119, 0.12)', color: '#DB2777', onClick: () => navigate('/profile?tab=pets') },
    { key: 'diary', label: '식이 다이어리', icon: UtensilsCrossed, tint: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', onClick: () => navigate('/profile?tab=diary') },
    { key: 'supplement', label: '영양제', icon: Pill, tint: 'rgba(99, 102, 241, 0.12)', color: '#4F46E5', onClick: () => goCategory('영양제') },
  ];

  return (
    <div>
      <Helmet>
        <title>베로로 — 사료·간식·영양제 성분 분석</title>
        <meta name="description" content="베로로 — 반려동물 사료·간식·영양제의 원재료와 성분을 분석하고, 우리 아이가 먹은 제품을 기록하세요." />
      </Helmet>

      {/* Hero — 서비스 핵심 안내 + 통합 검색 + 스캔 CTA */}
      <section className="home-hero" style={{ marginBottom: '16px' }}>
        <span className="home-hero-greeting">
          <PawPrint size={15} /> {greeting}, {petLabel} 보호자님
        </span>
        <h1 className="home-hero-title">
          사료·간식·영양제<br /><b>성분을 분석</b>해 드릴게요
        </h1>
        <form
          className="home-hero-search"
          role="search"
          onSubmit={(e) => { e.preventDefault(); submitHeroSearch(); }}
          style={{ gap: 10, justifyContent: 'flex-start' }}
        >
          <Search size={20} color="#7C6F9C" style={{ flexShrink: 0 }} aria-hidden />
          <input
            type="search"
            value={heroQuery}
            onChange={(e) => setHeroQuery(e.target.value)}
            placeholder="제품명·브랜드·성분을 검색"
            aria-label="제품·브랜드·성분 검색"
            enterKeyHint="search"
            inputMode="search"
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 600, color: 'var(--text-dark)',
            }}
          />
          <button
            type="submit"
            aria-label="검색"
            disabled={!heroQuery.trim()}
            style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 12, border: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: heroQuery.trim() ? 'var(--primary)' : 'var(--secondary)',
              color: heroQuery.trim() ? 'var(--text-dark)' : '#9CA3AF',
              cursor: heroQuery.trim() ? 'pointer' : 'default',
              transition: 'background var(--transition-fast)',
            }}
          >
            <Search size={18} strokeWidth={2.5} aria-hidden />
          </button>
        </form>
        <button
          type="button"
          className="home-hero-scan ui-press"
          onClick={() => navigate('/scan')}
        >
          <ScanLine size={20} />
          바코드 스캔으로 바로 분석
        </button>
      </section>

      {/* 서비스 핵심 안내 — 무엇을 할 수 있는지 3초 안에 전달 */}
      <section style={{ marginBottom: '22px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}
        >
          {[
            { icon: Search, title: '제품 검색', desc: '이름·브랜드·성분' },
            { icon: FlaskConical, title: '성분 분석', desc: '원재료·주의 성분' },
            { icon: UtensilsCrossed, title: '섭취 기록', desc: '다이어리에 기록' },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                padding: '14px 10px',
                borderRadius: '16px',
                background: 'var(--surface-elevated)',
                border: '1px solid rgba(128, 128, 140, 0.14)',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'center',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(21, 179, 107, 0.1)',
                  color: '#15803D',
                  marginBottom: '8px',
                }}
              >
                <Icon size={18} />
              </span>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '2px' }}>{title}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.4 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 카테고리 — 사료·간식·영양제 진입 */}
      <section style={{ marginBottom: '22px' }}>
        <TossSectionTitle
          title="카테고리"
          subtitle="사료·간식·영양제 성분을 카테고리로 탐색"
          right={
            <button type="button" className="ui-text-button" onClick={() => navigate('/search')}>
              전체 탐색 <ChevronRight size={14} />
            </button>
          }
          style={{ marginBottom: '10px' }}
        />
        <div className="compact-category-strip">
          {HOME_CATEGORY_ITEMS.slice(0, 8).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                type="button"
                className="compact-category-btn ui-press"
                onClick={() => goCategory(item.name)}
              >
                <span className="compact-category-icon" style={{ background: item.tint, color: item.color }} aria-hidden>
                  <Icon size={22} strokeWidth={2} />
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 빠른 액션 — 성분 분석·우리 아이·다이어리 핵심 진입점 */}
      <section style={{ marginBottom: '22px' }}>
        <div className="quick-actions">
          {quickActions.map(({ key, label, icon: Icon, tint, color, onClick }) => (
            <button key={key} type="button" className="quick-action ui-press" onClick={onClick}>
              <span className="quick-action-icon" style={{ background: tint, color }}>
                <Icon size={22} />
              </span>
              <span className="quick-action-label">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 위험 성분 경고 — 최근 본 제품에서 회피·위험 성분 감지 시 노출 */}
      {safetyScan && (
        <PetSafetyAlert
          scan={safetyScan}
          petName={profile.name}
          onOpen={(id) => navigate(`/product/${id}`)}
        />
      )}

      {/* 오늘 섭취 기록 바로가기 (로그인 사용자) */}
      {isLoggedIn ? (
        <section style={{ marginBottom: '24px' }}>
          <button
            type="button"
            className="ui-action-card ui-press"
            onClick={() => navigate('/profile?tab=diary')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '18px', textAlign: 'left' }}
          >
            <span className="ui-icon-pill" style={{ background: 'rgba(37, 99, 235, 0.12)', width: '46px', height: '46px', borderRadius: '15px', flexShrink: 0 }}>
              <UtensilsCrossed size={22} color="#2563EB" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '3px' }}>
                오늘 {petLabel} 섭취 기록하기
              </span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                오늘 먹은 사료·간식·영양제를 다이어리에 남겨보세요
              </span>
            </span>
            <ChevronRight size={20} color="#9CA3AF" style={{ flexShrink: 0 }} />
          </button>
        </section>
      ) : (
        <section style={{ marginBottom: '24px' }}>
          <button
            type="button"
            className="ui-action-card ui-press"
            onClick={() => navigate('/login')}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '18px', textAlign: 'left' }}
          >
            <span className="ui-icon-pill" style={{ background: 'rgba(21, 179, 107, 0.12)', width: '46px', height: '46px', borderRadius: '15px', flexShrink: 0 }}>
              <ListChecks size={22} color="#15803D" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '3px' }}>
                로그인하고 섭취 다이어리 시작하기
              </span>
              <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                우리 아이가 먹은 제품을 날짜별로 기록하고 분석과 연결해요
              </span>
            </span>
            <ChevronRight size={20} color="#9CA3AF" style={{ flexShrink: 0 }} />
          </button>
        </section>
      )}

      {/* 브랜드로 탐색 — 카탈로그 브랜드 바로가기 */}
      <section style={{ marginBottom: '24px' }}>
        <TossSectionTitle
          title="브랜드로 탐색"
          subtitle="카탈로그에 등록된 주요 브랜드로 바로 이동"
          style={{ marginBottom: '12px' }}
        />
        <div className="brand-strip">
          {FEATURED_BRANDS.map((brand) => (
            <Link
              key={brand.name}
              to={`/brand/${encodeURIComponent(brand.name)}`}
              className="brand-chip"
            >
              <span className="brand-chip-emblem" style={{ background: brand.tint, color: brand.accent }}>
                {brand.emblem}
              </span>
              <div style={{ minWidth: 0 }}>
                <div className="brand-chip-name">{brand.name}</div>
                <div className="brand-chip-tagline">{brand.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 최근 본 제품 — 기존 제품 탐색 콘텐츠 */}
      {recentViews.length > 0 && (
        <section style={{ marginBottom: '38px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock3 size={20} /> 최근 본 제품</span>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              더보기 <ChevronRight size={16} />
            </button>
          </h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 6).map((p) => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '124px', cursor: 'pointer' }}>
                <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 성분 분석 안내 배너 — 핵심 포지셔닝 재확인 */}
      <section style={{ marginBottom: '32px' }}>
        <div
          style={{
            padding: '20px',
            borderRadius: '18px',
            background: 'var(--surface-elevated)',
            border: '1px solid rgba(128, 128, 140, 0.16)',
            boxShadow: 'var(--shadow-card)',
            display: 'flex',
            gap: '14px',
            alignItems: 'flex-start',
          }}
        >
          <span className="ui-icon-pill" style={{ background: 'rgba(21, 179, 107, 0.12)', width: '46px', height: '46px', borderRadius: '15px', flexShrink: 0 }}>
            <ShieldCheck size={22} color="#15803D" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '4px' }}>
              원재료와 주의 성분까지 분석해요
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.55 }}>
              제품을 검색하거나 스캔하면 주원료·보증성분·알레르기·주의 성분을 확인할 수 있어요.
            </p>
            <button type="button" className="ui-text-button" style={{ padding: 0 }} onClick={() => navigate('/search')}>
              제품 분석하러 가기 <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
