import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles,
  Clock3,
  ChevronRight,
  X,
  Tag,
  Flame,
  Stethoscope,
  Wallet,
  Search,
  Heart,
  MessageCircle,
  ScanLine,
  ArrowUp,
  ArrowDown,
  Minus,
  ArrowRight,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import { VERORO_LOGO_SRC } from '../constants/assets';
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

export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const [topicTab, setTopicTab] = useState<typeof TOPIC_TABS[number]['id']>('realtime');
  const [dealMsLeft, setDealMsLeft] = useState(() => msUntilHour(TODAYS_DEAL.endsAtHour));

  useEffect(() => {
    const tick = () => setDealMsLeft(msUntilHour(TODAYS_DEAL.endsAtHour));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const visibleEvents = MOCK_EVENTS.filter((e) => !closedEvents.includes(e.id));
  const featuredEvent = visibleEvents[0];

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

  const goSearchWith = (query: string) =>
    navigate({
      pathname: '/search',
      search: query ? `?query=${encodeURIComponent(query)}` : '',
    });

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

      <section className="discovery-brand-bar" aria-label="베로로 브랜드">
        <img src={VERORO_LOGO_SRC} alt="VeRoRo" />
        <div className="discovery-brand-bar-copy">
          <div className="discovery-brand-bar-kicker">Petty Community</div>
          <div className="discovery-brand-bar-title">성분 분석부터 찐 리뷰까지 — 오늘의 발견</div>
        </div>
      </section>

      <section className="ui-hero-panel" style={{ padding: '18px', marginBottom: '16px' }}>
        <button
          type="button"
          className="ui-search-shortcut"
          onClick={() => navigate('/search')}
          style={{ width: '100%', justifyContent: 'space-between', minHeight: '52px' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', color: '#4B5563', fontSize: '15px', fontWeight: 600 }}>
            <Search size={20} color="#7C6F9C" />
            궁금한 사료나 간식 이름을 검색해 보세요
          </span>
          <ChevronRight size={18} color="#9CA3AF" />
        </button>
        <button
          type="button"
          disabled
          title="준비 중"
          className="ui-search-shortcut"
          style={{
            width: '100%',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '10px',
            opacity: 0.55,
            cursor: 'not-allowed',
            borderStyle: 'dashed',
          }}
        >
          <ScanLine size={20} color="#9CA3AF" />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#6B7280' }}>바코드 스캔 · 준비 중</span>
        </button>
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
          {HOME_CATEGORY_ITEMS.slice(0, 8).map((item) => (
            <button
              key={item.name}
              type="button"
              className="compact-category-btn"
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
            >
              <span className="compact-category-emoji" aria-hidden>{item.emoji}</span>
              <span>{item.name}</span>
            </button>
          ))}
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
            background: '#ffffff',
            border: '1px solid rgba(28, 25, 23, 0.08)',
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

      {/* 빠른 시작 (2x2) */}
      <section style={{ marginBottom: '22px' }}>
        <TossSectionTitle title="빠른 시작" style={{ marginBottom: '12px' }} />
        <div className="ui-grid-2">
          <button
            type="button"
            className="ui-action-card"
            onClick={() => navigate('/event/personality-quiz')}
            style={{ background: '#FFFFFF' }}
          >
            <span className="ui-icon-pill" style={{ background: 'rgba(37, 99, 235, 0.12)', marginBottom: '12px' }}>
              <MessageCircle size={18} color="#2563EB" />
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>성향 테스트</div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              우리 아이의 취향 키워드를 3분 안에
            </p>
          </button>
          <button
            type="button"
            className="ui-action-card"
            onClick={() => navigate('/profile')}
            style={{ background: '#FFFFFF' }}
          >
            <span className="ui-icon-pill" style={{ background: 'rgba(219, 39, 119, 0.12)', marginBottom: '12px' }}>
              <Heart size={18} color="#DB2777" />
            </span>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>마이 펫</div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
              종·연령·건강 고민을 한 번에 관리
            </p>
          </button>
        </div>
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
                style={{ textAlign: 'left', background: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              >
                <div className="ui-rank-index">{index + 1}</div>
                <img
                  src={product.imageUrl}
                  alt={product.name}
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
                <img src={p.imageUrl} alt={p.name} style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {featuredEvent && (
        <section style={{ marginBottom: '26px' }}>
          <TossSectionTitle
            title="커뮤니티 공지"
            subtitle="놓치기 쉬운 이벤트와 쿠폰 소식을 한 번에"
            style={{ marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleEvents.map((ev) => (
              <div key={ev.id} className="ui-list-card" style={{ alignItems: 'flex-start', position: 'relative' }}>
                <div className="ui-icon-pill" style={{ background: 'rgba(245, 158, 11, 0.14)', flexShrink: 0 }}>
                  <Tag size={18} color="#B45309" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span className="ui-badge ui-badge-dark">{ev.badge}</span>
                    {ev.code && <span className="ui-badge ui-badge-soft">{ev.code}</span>}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.55 }}>{ev.desc}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setClosedEvents((prev) => [...prev, ev.id])}
                  style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                  aria-label="공지 닫기"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
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
