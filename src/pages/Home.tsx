import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles,
  Clock3,
  ChevronRight,
  Flame,
  Stethoscope,
  Wallet,
  Search,
  MessageCircle,
  ScanLine,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowRight,
  FlaskConical,
  PawPrint,
  Pill,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import {
  RISING_KEYWORDS,
  EDITORIAL_TOPICS,
  TODAYS_DEAL,
  FEATURED_BRANDS,
  TOPIC_TABS,
} from '../constants/discoveryFeed';
import { msUntilHour, splitCountdown, pad2 } from '../utils/countdown';
import type { Product } from '../types';
import { TossChip, TossSectionTitle } from '../components/TossUI';
import PetSafetyAlert from '../components/PetSafetyAlert';
import type { PetSafetyScan } from '../utils/petSafety';

export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const [topicTab, setTopicTab] = useState<typeof TOPIC_TABS[number]['id']>('realtime');
  const [dealMsLeft, setDealMsLeft] = useState(() => msUntilHour(TODAYS_DEAL.endsAtHour));

  useEffect(() => {
    const tick = () => setDealMsLeft(msUntilHour(TODAYS_DEAL.endsAtHour));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const personalRecs = useMemo(
    () =>
      products
        .filter(
          (p) =>
            !p.mainCategory?.includes('사료') ||
            (profile.species === 'Dog' ? p.targetPetType === 'dog' : p.targetPetType === 'cat') ||
            p.targetPetType === 'all',
        )
        .filter((p) => {
          const hasDirectMatch = p.healthConcerns?.some((c) => profile.healthConcerns.includes(c));
          const hasIngredientMatch = p.ingredients.some((ing) =>
            profile.healthConcerns.some((c) => ing.purpose.includes(c)),
          );
          return hasDirectMatch || hasIngredientMatch;
        })
        .slice(0, 4),
    [products, profile],
  );

  const trendingProducts = useMemo(
    () => [...products].sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0)).slice(0, 8),
    [products],
  );

  const concernProducts = useMemo(
    () =>
      [...products]
        .filter((p) => (p.healthConcerns ?? []).some((c) => profile.healthConcerns.includes(c)))
        .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        .slice(0, 8),
    [products, profile.healthConcerns],
  );

  const budgetProducts = useMemo(
    () =>
      [...products]
        .filter((p) => (p.price ?? 0) <= 30000)
        .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
        .slice(0, 8),
    [products],
  );

  const topCommunityPicks = trendingProducts.slice(0, 3);
  const countdown = splitCountdown(dealMsLeft);

  // 최근 본 제품에서 우리 아이 회피·위험 성분 스캔 (홈 상단 경고 배너).
  // 성분 사전은 무거우므로, 최근 본 제품이 있을 때만 동적 import로 지연 로드해
  // 첫 진입(eager) 홈 번들에 사전이 딸려오지 않도록 한다.
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

  // 검색 페이지는 ?q= 파라미터를 읽는다(Search.tsx). 과거 ?query= 는 매칭되지 않아
  // 빈 검색 화면으로 빠지는 버그가 있었다.
  const goSearchWith = (query: string) =>
    navigate({
      pathname: '/search',
      search: query ? `?q=${encodeURIComponent(query)}` : '',
    });

  // 홈 상단 실제 검색 입력(§8) — 클릭 이동이 아니라 홈에서 바로 입력·제출한다.
  const [heroQuery, setHeroQuery] = useState('');
  const submitHeroSearch = () => {
    const q = heroQuery.trim();
    if (!q) return; // 빈/공백 검색 방지
    goSearchWith(q);
  };

  const goCategory = (name: string) =>
    navigate({ pathname: '/search', search: `?category=${encodeURIComponent(name)}` });

  const quickActions = [
    { key: 'scan', label: '성분 분석', icon: FlaskConical, tint: 'rgba(21, 179, 107, 0.12)', color: '#15803D', onClick: () => navigate('/scan') },
    { key: 'pet', label: '우리 아이 등록', icon: PawPrint, tint: 'rgba(219, 39, 119, 0.12)', color: '#DB2777', onClick: () => navigate('/profile') },
    { key: 'popular', label: '인기 사료', icon: Flame, tint: 'rgba(239, 68, 68, 0.12)', color: '#EF4444', onClick: () => navigate('/ranking') },
    { key: 'supplement', label: '영양제 추천', icon: Pill, tint: 'rgba(37, 99, 235, 0.12)', color: '#2563EB', onClick: () => goCategory('영양제') },
  ];

  return (
    <div>
      <Helmet>
        <title>
          {isLoggedIn
            ? `${profile.name} 맞춤 홈 — 베로로`
            : '베로로 — 성분 분석 & 집사들의 찐 리뷰'}
        </title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
      </Helmet>

      {/* Hero — 인사 + 검색/스캔 CTA를 한눈에 (3초 안에 무엇을 할지 전달) */}
      <section className="home-hero" style={{ marginBottom: '16px' }}>
        <span className="home-hero-greeting">
          <PawPrint size={15} /> {greeting}, {petLabel} 보호자님
        </span>
        <h1 className="home-hero-title">
          오늘도 <b>건강한 한 끼</b>를<br />함께 찾아드릴게요
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
            placeholder="사료·간식 이름이나 성분을 검색"
            aria-label="사료·간식·성분 검색"
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

      {/* 위험 성분 경고 — 최근 본 제품에서 회피·위험 성분 감지 시 노출 */}
      {safetyScan && (
        <PetSafetyAlert
          scan={safetyScan}
          petName={profile.name}
          onOpen={(id) => navigate(`/product/${id}`)}
        />
      )}

      {/* 빠른 액션 — 핵심 진입점 4개 */}
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

      {/* 카테고리 퀵 스트립 — 상단으로 승격 */}
      <section style={{ marginBottom: '20px' }}>
        <TossSectionTitle
          title="카테고리"
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
                onClick={() =>
                  navigate({
                    pathname: '/search',
                    search: `?category=${encodeURIComponent(item.name)}`,
                  })
                }
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

      {/* 발견 탭: 실시간 / 큐레이션 / 혜택 */}
      <section style={{ marginBottom: '22px' }}>
        <TossSectionTitle
          title="지금 뭐 보죠?"
          subtitle="급상승 키워드 · 수의사 큐레이션 · 타임세일을 한 탭에서"
          style={{ marginBottom: '10px' }}
        />

        <div role="tablist" className="discovery-tabs">
          {TOPIC_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = topicTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`discovery-tab${active ? ' active' : ''}`}
                onClick={() => setTopicTab(tab.id)}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {topicTab === 'realtime' && (
          <div className="rising-list" aria-label="실시간 급상승 키워드 TOP 10">
            {RISING_KEYWORDS.map((item) => (
              <button
                key={item.rank}
                type="button"
                className="rising-row"
                onClick={() => goSearchWith(item.keyword)}
              >
                <span className={`rising-rank${item.rank <= 3 ? ' top3' : ''}`}>{item.rank}</span>
                <span className="rising-keyword">{item.keyword}</span>
                {item.series && <Sparkline data={item.series} trend={item.trend} />}
                <KeywordTrendBadge item={item} />
              </button>
            ))}
          </div>
        )}

        {topicTab === 'vet' && (
          <div className="editorial-grid">
            {EDITORIAL_TOPICS.map((topic) => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="editorial-card"
                  onClick={() =>
                    topic.searchQuery ? goSearchWith(topic.searchQuery) : navigate('/search')
                  }
                >
                  <span
                    className="editorial-card-icon"
                    style={{ background: topic.tint, color: topic.accent }}
                  >
                    <Icon size={22} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="editorial-card-kicker"
                      style={{ color: topic.accent }}
                    >
                      {topic.kicker}
                    </div>
                    <div className="editorial-card-title">{topic.title}</div>
                    <p className="editorial-card-desc">{topic.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {topicTab === 'deal' && (
          <div className="deal-card">
            <div className="deal-badge">
              <Flame size={11} /> {TODAYS_DEAL.badge}
            </div>
            <h3 className="deal-title">{TODAYS_DEAL.title}</h3>
            <p className="deal-subtitle">{TODAYS_DEAL.subtitle}</p>
            <div className="deal-countdown" aria-label="남은 시간">
              <span className="deal-countdown-cell">{pad2(countdown.hours)}</span>
              <span className="deal-countdown-sep">:</span>
              <span className="deal-countdown-cell">{pad2(countdown.minutes)}</span>
              <span className="deal-countdown-sep">:</span>
              <span className="deal-countdown-cell">{pad2(countdown.seconds)}</span>
              <span className="deal-countdown-label">남음</span>
            </div>
            <button type="button" className="deal-cta" onClick={() => navigate('/ranking')}>
              {TODAYS_DEAL.ctaLabel} <ArrowRight size={14} />
            </button>
          </div>
        )}
      </section>

      {isLoggedIn && (
        <section
          style={{
            marginBottom: '18px',
            padding: '18px',
            borderRadius: '18px',
            background: 'var(--surface-elevated)',
            border: '1px solid rgba(128, 128, 140, 0.16)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="ui-section-head">
            <div>
              <p className="ui-section-kicker">my pet community</p>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.35 }}>
                {profile.name} 맞춤 피드
              </h2>
            </div>
            <Link to="/profile" className="ui-text-button" style={{ textDecoration: 'none' }}>
              수정하기 <ChevronRight size={14} />
            </Link>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
            {profile.healthConcerns.length > 0
              ? profile.healthConcerns.slice(0, 3).join(' · ')
              : '프로필에서 건강 고민을 선택하면 피드가 더 정확해져요.'}
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <TossChip active size="sm">{profile.species === 'Cat' ? 'Cat parent' : 'Dog parent'}</TossChip>
            {profile.healthConcerns.length > 0 ? (
              profile.healthConcerns.slice(0, 3).map((concern) => (
                <TossChip key={concern} size="sm">{concern}</TossChip>
              ))
            ) : (
              <TossChip size="sm">건강 고민 설정 필요</TossChip>
            )}
          </div>
        </section>
      )}

      {/* 추천 브랜드 스트립 */}
      <section style={{ marginBottom: '24px' }}>
        <TossSectionTitle
          title="추천 브랜드"
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
              <span
                className="brand-chip-emblem"
                style={{ background: brand.tint, color: brand.accent }}
              >
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

      {/* 성향 테스트 프로모 — 개인화 시작점 */}
      <section style={{ marginBottom: '22px' }}>
        <button
          type="button"
          className="ui-action-card ui-press"
          onClick={() => navigate('/event/personality-quiz')}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '18px' }}
        >
          <span className="ui-icon-pill" style={{ background: 'rgba(37, 99, 235, 0.12)', width: '46px', height: '46px', borderRadius: '15px', flexShrink: 0 }}>
            <MessageCircle size={22} color="#2563EB" />
          </span>
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '3px' }}>
              {petLabel} 성향 테스트
            </span>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              3분이면 취향 키워드로 맞춤 추천이 정확해져요
            </span>
          </span>
          <ChevronRight size={20} color="#9CA3AF" style={{ flexShrink: 0 }} />
        </button>
      </section>

      {topCommunityPicks.length > 0 && (
        <section style={{ marginBottom: '30px' }}>
          <TossSectionTitle
            title="지금 많이 보는 커뮤니티 픽"
            subtitle="후기와 반응이 빠르게 모이는 제품"
            right={
              <button type="button" className="ui-text-button" onClick={() => navigate('/ranking')}>
                전체 랭킹 <ChevronRight size={14} />
              </button>
            }
            style={{ marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCommunityPicks.map((product, index) => (
              <button
                key={product.id}
                type="button"
                className="ui-list-card"
                onClick={() => navigate(`/product/${product.id}`)}
                style={{ textAlign: 'left', background: 'var(--surface-elevated)', border: 'none', cursor: 'pointer' }}
              >
                <div className="ui-rank-index">{index + 1}</div>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '62px', height: '62px', borderRadius: '18px', objectFit: 'cover', flexShrink: 0 }}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A9099', marginBottom: '4px' }}>{product.brand}</div>
                  <div className="line-clamp-2" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.45, marginBottom: '6px' }}>
                    {product.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="ui-badge ui-badge-soft">★ {product.averageRating}</span>
                    <span className="ui-badge ui-badge-muted">리뷰 {product.reviewsCount}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {personalRecs.length > 0 && (
        <HorizontalProductSection
          title={`${profile.name} 맞춤 추천`}
          subtitle={
            profile.healthConcerns.length > 0
              ? `${profile.healthConcerns.join(', ')} 고민 기준`
              : `${profile.name} 프로필 · 성분·리뷰 기반`
          }
          icon={<Sparkles size={18} color="#F59E0B" />}
          products={personalRecs}
          onMore={() => navigate('/search')}
        />
      )}

      <HorizontalProductSection
        title="급상승 랭킹"
        subtitle="리뷰가 빠르게 늘고 있는 제품"
        icon={<Flame size={18} color="#EF4444" />}
        products={trendingProducts}
        onMore={() => navigate('/ranking')}
      />

      <HorizontalProductSection
        title="질병 · 부위별 추천"
        subtitle={
          profile.healthConcerns.length > 0
            ? `${profile.name} 프로필 건강 고민 기반`
            : `${profile.name}을 위해 마이 펫에서 고민을 추가해 보세요`
        }
        icon={<Stethoscope size={18} color="#2563EB" />}
        products={concernProducts}
        onMore={() => navigate('/search')}
      />

      <HorizontalProductSection
        title="가성비 추천"
        subtitle="3만원 이하 평점 우수 제품"
        icon={<Wallet size={18} color="#059669" />}
        products={budgetProducts}
        onMore={() => navigate('/search')}
      />

      <TargetedAd />

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

    </div>
  );
}

/** 급상승 키워드 24시간 추이 미니 그래프 (상승=빨강 / 하강=파랑 / 보합=회색) */
function Sparkline({ data, trend }: { data: number[]; trend: typeof RISING_KEYWORDS[number]['trend'] }) {
  if (data.length < 2) return null;
  const w = 44;
  const h = 18;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);
  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const color = trend === 'up' || trend === 'new' ? '#EF4444' : trend === 'down' ? '#2563EB' : '#94A3B8';
  const last = points[points.length - 1].split(',');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ flexShrink: 0, overflow: 'visible' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={1.8} fill={color} />
    </svg>
  );
}

function KeywordTrendBadge({ item }: { item: typeof RISING_KEYWORDS[number] }) {
  if (item.trend === 'new') {
    return <span className="rising-trend rising-trend--new">NEW</span>;
  }
  if (item.trend === 'up') {
    return (
      <span className="rising-trend rising-trend--up">
        <ArrowUp size={10} strokeWidth={3} />
        {item.delta ?? ''}
      </span>
    );
  }
  if (item.trend === 'down') {
    return (
      <span className="rising-trend rising-trend--down">
        <ArrowDown size={10} strokeWidth={3} />
        {item.delta ?? ''}
      </span>
    );
  }
  return (
    <span className="rising-trend rising-trend--flat">
      <Minus size={10} strokeWidth={3} />
    </span>
  );
}

function HorizontalProductSection({
  title,
  subtitle,
  icon,
  products,
  onMore,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  products: Product[];
  onMore: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <section style={{ marginBottom: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '17px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            {icon}
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>{subtitle}</p>
        </div>
        <button onClick={onMore} className="ui-text-button" style={{ flexShrink: 0 }}>
          더보기 <ChevronRight size={15} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {products.map((product, idx) => (
          <div key={product.id} style={{ flex: '0 0 292px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2 }}>
              <TossChip active size="sm">{idx + 1}</TossChip>
            </div>
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
