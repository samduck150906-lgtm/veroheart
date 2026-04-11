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
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_HERO, CORE_COPY, UGC_COPY, VIRAL_LANDING_COPY } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../types';
import { TossCard, TossChip, TossSectionTitle } from '../components/TossUI';

export default function Home() {
  const { products, profile, recentViews, isLoggedIn, favorites } = useStore();
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
  const homeStats = [
    { label: '큐레이션', value: `${products.length}+`, caption: '성분 기반 추천' },
    { label: '찜 목록', value: `${favorites.length}`, caption: '관심 제품 저장' },
    { label: '최근 활동', value: `${recentViews.length}`, caption: '다시 보기 가능' },
  ];

  const quickActions = [
    {
      title: '전체 탐색',
      description: '카테고리와 고민별로 빠르게 둘러보기',
      icon: <Search size={18} color="#7C3AED" />,
      accent: 'rgba(124, 58, 237, 0.12)',
      onClick: () => navigate('/search'),
    },
    {
      title: '랭킹 보기',
      description: '집사들이 많이 보는 인기 제품 확인',
      icon: <Flame size={18} color="#DC2626" />,
      accent: 'rgba(239, 68, 68, 0.12)',
      onClick: () => navigate('/ranking'),
    },
    {
      title: '테스트 참여',
      description: '바이럴 테스트로 취향과 니즈 파악',
      icon: <MessageCircle size={18} color="#2563EB" />,
      accent: 'rgba(37, 99, 235, 0.12)',
      onClick: () => navigate('/event/personality-quiz'),
    },
    {
      title: '프로필 설정',
      description: '반려동물 정보를 등록하고 추천 고도화',
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

      <section className="ui-hero-panel" style={{ padding: '22px 18px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div>
            <p className="ui-section-kicker" style={{ marginBottom: '8px' }}>Petty pick</p>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#221B35', lineHeight: 1.25, margin: '0 0 10px' }}>
              {isLoggedIn ? `${profile.name}에게 맞는 커뮤니티 홈` : HOME_HERO.headline}
            </h1>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#5B566A', lineHeight: 1.6, margin: '0 0 12px' }}>
              {isLoggedIn
                ? `${profile.species === 'Cat' ? '고양이' : '강아지'} 보호자를 위한 추천, 인기 후기, 테스트 참여를 한 화면에서 모았어요.`
                : HOME_HERO.sub}
            </p>
          </div>
          <span className="ui-badge" style={{ background: '#FFFFFF', color: '#7C3AED', boxShadow: 'var(--shadow-sm)', flexShrink: 0 }}>
            Live
          </span>
        </div>

        <button
          type="button"
          className="ui-search-shortcut"
          onClick={() => navigate('/search')}
          style={{ width: '100%', justifyContent: 'space-between', marginBottom: '14px' }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} color="#7C6F9C" />
            제품, 성분, 브랜드를 검색해 보세요
          </span>
          <ChevronRight size={16} color="#9CA3AF" />
        </button>

        <div className="ui-highlight-box" style={{ marginBottom: '14px' }}>
          {CORE_COPY.ocr}
        </div>

        <div
          style={{
            marginBottom: '14px',
            padding: '14px',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.72)',
            border: '1px solid rgba(124, 111, 156, 0.16)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 900, color: '#241C33', marginBottom: '6px' }}>
            데이터 신뢰 원칙
          </div>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.6, color: '#5B566A', fontWeight: 600 }}>
            제품 등록과 성분 매핑은 크롤링 자동화보다 운영자 수기 검수와 성분 사전 관리에 더 많이 의존합니다.
            AI는 추천과 요약을 돕지만, 제조사/원재료 이해와 최종 검증은 사람이 맡습니다.
          </p>
        </div>

        <div className="ui-grid-3">
          {homeStats.map((item) => (
            <div
              key={item.label}
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                border: '1px solid rgba(255, 255, 255, 0.9)',
                borderRadius: '18px',
                padding: '14px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 800, color: '#8B7AAE', letterSpacing: '0.04em' }}>
                {item.label}
              </p>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#241C33', marginBottom: '4px' }}>{item.value}</div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>{item.caption}</p>
            </div>
          ))}
        </div>
      </section>

      {isLoggedIn && (
        <section
          style={{
            marginBottom: '18px',
            padding: '18px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F5F3FF 48%, #EEF2FF 100%)',
            border: '1px solid rgba(124, 111, 156, 0.18)',
            boxShadow: '0 12px 32px rgba(76, 29, 149, 0.08)',
          }}
        >
          <div className="ui-section-head">
            <div>
              <p className="ui-section-kicker">my pet community</p>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#221B35', lineHeight: 1.35 }}>
                {profile.name} 맞춤 피드
              </h2>
            </div>
            <Link to="/profile" className="ui-text-button" style={{ textDecoration: 'none' }}>
              수정하기 <ChevronRight size={14} />
            </Link>
          </div>

          <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#5B6474', fontWeight: 600, lineHeight: 1.6 }}>
            {profile.species === 'Cat' ? '고양이' : '강아지'} 보호자
            {profile.healthConcerns.length > 0
              ? ` · ${profile.healthConcerns.join(', ')} 중심으로 추천을 정리했어요.`
              : ' · 아직 건강 고민이 비어 있어요. 프로필을 채우면 추천 정확도가 올라가요.'}
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
        <TossSectionTitle
          title="지금 바로 참여해 보세요"
          subtitle="탐색, 랭킹, 테스트, 프로필을 빠르게 이동할 수 있어요"
          style={{ marginBottom: '12px' }}
        />
        <div className="ui-grid-2">
          {quickActions.map((item) => (
            <button
              key={item.title}
              type="button"
              className="ui-action-card"
              onClick={item.onClick}
              style={{ background: '#FFFFFF' }}
            >
              <span className="ui-icon-pill" style={{ background: item.accent, marginBottom: '14px' }}>
                {item.icon}
              </span>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#1F2937', marginBottom: '6px' }}>{item.title}</div>
              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280', fontWeight: 600, lineHeight: 1.5 }}>
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[UGC_COPY.honestReviews, UGC_COPY.palatability].map((line) => (
            <TossCard key={line} style={{
              fontSize: '12px', fontWeight: 600, color: '#4B5563', padding: '10px', borderRadius: '14px',
              background: '#FFFBEB', border: '1px solid #FDE68A', lineHeight: 1.4, minHeight: '58px', display: 'flex', alignItems: 'center',
            }}>
              {line}
            </TossCard>
          ))}
        </div>
      </section>

      <section
        style={{
          marginBottom: '22px',
          padding: '18px',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #FFF7ED 0%, #FFFFFF 100%)',
          border: '1px solid #FED7AA',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', margin: '0 0 6px', letterSpacing: '0.05em' }}>
          VIRAL TEST CAMPAIGN
        </p>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#7C2D12', margin: '0 0 8px', lineHeight: 1.35 }}>
          {VIRAL_LANDING_COPY.hero.headline}
        </h2>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#9A3412', margin: '0 0 12px', lineHeight: 1.5 }}>
          {VIRAL_LANDING_COPY.hero.sub}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/event/personality-quiz')}
            style={{ borderRadius: '14px', height: '44px', fontSize: '13px', fontWeight: 800 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaPrimary}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/event/personality-quiz')}
            style={{ borderRadius: '14px', height: '44px', fontSize: '13px', fontWeight: 800 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaSecondary}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#7C2D12', background: '#FFF', border: '1px dashed #FDBA74', borderRadius: '12px', padding: '8px 10px', lineHeight: 1.45 }}>
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
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#1F2937', marginBottom: '4px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, lineHeight: 1.55 }}>{ev.desc}</div>
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
                  <div className="line-clamp-2" style={{ fontSize: '14px', fontWeight: 800, color: '#1F2937', lineHeight: 1.45, marginBottom: '6px' }}>
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
          <h2 style={{ fontSize: '22px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock3 size={20} /> 최근 본 제품</span>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
              더보기 <ChevronRight size={16} />
            </button>
          </h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 6).map(p => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '124px', cursor: 'pointer' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 700, color: '#374151', lineHeight: 1.45 }}>{p.name}</div>
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
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#3F3A2A' }}>{item.name}</span>
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
          <h2 style={{ fontSize: '18px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            {icon}
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, margin: 0 }}>{subtitle}</p>
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
