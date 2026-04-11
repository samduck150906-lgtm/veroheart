import { useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { VIRAL_LANDING_COPY } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../types';
import { TossChip, TossSectionTitle } from '../components/TossUI';

export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const visibleEvents = MOCK_EVENTS.filter(e => !closedEvents.includes(e.id));
  const featuredEvent = visibleEvents[0];

  // Personalized Recommendations: Filter by species and prioritize health concerns
  const personalRecs = products
    .filter(p => !p.mainCategory?.includes('사료') || 
      (profile.species === 'Dog' ? p.targetPetType === 'dog' : p.targetPetType === 'cat') ||
      p.targetPetType === 'all'
    )
    .filter(p => {
      const hasDirectMatch = p.healthConcerns?.some(c => profile.healthConcerns.includes(c));
      const hasIngredientMatch = p.ingredients.some(ing => profile.healthConcerns.some(c => ing.purpose.includes(c)));
      return hasDirectMatch || hasIngredientMatch;
    })
    .slice(0, 4);

  const trendingProducts = [...products]
    .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
    .slice(0, 8);

  const concernProducts = [...products]
    .filter(p => (p.healthConcerns ?? []).some(c => profile.healthConcerns.includes(c)))
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 8);

  const budgetProducts = [...products]
    .filter(p => (p.price ?? 0) <= 30000)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 8);

  const topCommunityPicks = trendingProducts.slice(0, 3);

  const quickActions = [
    {
      title: '탐색',
      description: '',
      icon: <Search size={18} color="#7C3AED" />,
      accent: 'rgba(124, 58, 237, 0.12)',
      onClick: () => navigate('/search'),
    },
    {
      title: '랭킹',
      description: '',
      icon: <Flame size={18} color="#DC2626" />,
      accent: 'rgba(239, 68, 68, 0.12)',
      onClick: () => navigate('/ranking'),
    },
    {
      title: '성향 테스트',
      description: '',
      icon: <MessageCircle size={18} color="#2563EB" />,
      accent: 'rgba(37, 99, 235, 0.12)',
      onClick: () => navigate('/event/personality-quiz'),
    },
    {
      title: '마이 펫',
      description: '',
      icon: <Heart size={18} color="#DB2777" />,
      accent: 'rgba(219, 39, 119, 0.12)',
      onClick: () => navigate('/profile'),
    },
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

      <section className="ui-hero-panel" style={{ padding: '24px 18px 20px', marginBottom: '16px' }}>
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
            {profile.healthConcerns.length > 0
              ? profile.healthConcerns.slice(0, 3).map((concern) => (
                  <TossChip key={concern} size="sm">{concern}</TossChip>
                ))
              : <TossChip size="sm">건강 고민 설정 필요</TossChip>}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '18px' }}>
        <TossSectionTitle title="바로 가기" style={{ marginBottom: '12px' }} />
        <div className="ui-grid-2">
          {quickActions.map((item) => (
            <button
              key={item.title}
              type="button"
              className="ui-action-card"
              onClick={item.onClick}
              style={{ background: '#FFFFFF' }}
            >
              <span className="ui-icon-pill" style={{ background: item.accent, marginBottom: '12px' }}>
                {item.icon}
              </span>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>{item.title}</div>
              {item.description ? (
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.5 }}>
                  {item.description}
                </p>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section
        style={{
          marginBottom: '22px',
          padding: '18px',
          borderRadius: '18px',
          background: '#fffbeb',
          border: '1px solid rgba(234, 179, 8, 0.25)',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#a16207', margin: '0 0 6px', letterSpacing: '0.04em' }}>
          VIRAL TEST CAMPAIGN
        </p>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#44403c', margin: '0 0 8px', lineHeight: 1.35 }}>
          {VIRAL_LANDING_COPY.hero.headline}
        </h2>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#78716c', margin: '0 0 12px', lineHeight: 1.5 }}>
          {VIRAL_LANDING_COPY.hero.sub}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/event/personality-quiz')}
            style={{ borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaPrimary}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/event/personality-quiz')}
            style={{ borderRadius: '12px', height: '44px', fontSize: '13px', fontWeight: 600 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaSecondary}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#57534e', background: '#fff', border: '1px solid #e7e5e4', borderRadius: '10px', padding: '8px 10px', lineHeight: 1.45 }}>
          반려동물 취향과 라이프스타일을 가볍게 체크하고 결과를 공유해 보세요.
        </div>
      </section>

      {featuredEvent && (
        <section style={{ marginBottom: '26px' }}>
          <TossSectionTitle
            title="커뮤니티 공지"
            subtitle="놓치기 쉬운 이벤트와 쿠폰 소식을 한 번에"
            style={{ marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleEvents.map(ev => (
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
                  onClick={() => setClosedEvents(prev => [...prev, ev.id])}
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

      {topCommunityPicks.length > 0 && (
        <section style={{ marginBottom: '30px' }}>
          <TossSectionTitle
            title="지금 많이 보는 커뮤니티 픽"
            subtitle="후기와 반응이 빠르게 모이는 제품"
            right={(
              <button type="button" className="ui-text-button" onClick={() => navigate('/ranking')}>
                전체 랭킹 <ChevronRight size={14} />
              </button>
            )}
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
            {recentViews.slice(0, 6).map(p => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '124px', cursor: 'pointer' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '32px', marginBottom: '24px' }}>
        <TossSectionTitle
          title="카테고리별 탐색"
          subtitle="원하는 상품군으로 바로 이동해 보세요"
          right={(
            <button type="button" className="ui-text-button" onClick={() => navigate('/search')}>
              전체 탐색 <ChevronRight size={14} />
            </button>
          )}
          style={{ marginBottom: '16px' }}
        />
        <div className="ui-category-grid">
          {HOME_CATEGORY_ITEMS.map(item => (
            <div
              key={item.name} 
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div className="ui-category-card">
                <div className="ui-category-icon">{item.emoji}</div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
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
