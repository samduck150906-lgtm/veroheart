// @ts-nocheck
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
  Bell,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { VIRAL_LANDING_COPY } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../types';
import { TossChip, TossSectionTitle } from '../components/TossUI';
import ProductImage from '../components/ProductImage';
import { Text } from '../components/Text';
import SearchBar from '../components/SearchBar';
import BottomSheetFilters from '../components/BottomSheetFilters';



export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const petName = profile.name === '우리 아이' ? '베로' : profile.name;
  const petBreed = profile.name === '우리 아이' ? '말티즈' : (profile.species === 'Dog' ? '말티즈' : '러시안블루');
  const petAge = profile.name === '우리 아이' ? 3 : profile.age;
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const [isRecallBannerVisible, setIsRecallBannerVisible] = useState(true);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const visibleEvents = MOCK_EVENTS.filter(e => !closedEvents.includes(e.id));
  const featuredEvent = visibleEvents[0];
  // New filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ ages: [], ingredients: [], allergens: [] });
  const [filterOpen, setFilterOpen] = useState(false);
  // Compute filtered products
  const filteredProducts = products.filter(p => {
    const matchesQuery = searchQuery
      ? p.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesAge = filters.ages.length
      ? filters.ages.includes(p.ageGroup)
      : true;
    const matchesIngredient = filters.ingredients.length
      ? filters.ingredients.includes(p.mainIngredient)
      : true;
    const matchesAllergen = filters.allergens.length
      ? !p.allergens?.some(a => filters.allergens.includes(a))
      : true;
    return matchesQuery && matchesAge && matchesIngredient && matchesAllergen;
  });

  // 1. Identify expected pet type from profile
  const expectedPetType = profile.species === 'Cat' ? 'cat' : 'dog';

  // 2. Strict Curation Filter for personalRecs (Hero)
  const personalRecs = products
    // STAGE A: Enforce Species Match Across ALL categories (no just dry feed)
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    // STAGE B: Filter Out Allergens
    .filter(p => {
      if (!profile.allergies || profile.allergies.length === 0) return true;
      const hasAllergenInIngredients = p.ingredients?.some(ing => 
        profile.allergies.some(allergen => 
          ing.nameKo?.includes(allergen) || ing.nameEn?.toLowerCase().includes(allergen.toLowerCase())
        )
      );
      const hasAllergenInList = p.allergens?.some(a => 
        profile.allergies.some(allergen => a.includes(allergen))
      );
      return !hasAllergenInIngredients && !hasAllergenInList;
    })
    // STAGE C: Prioritize Health Concerns (e.g. skin, kidney, joints, digestion, etc.)
    .sort((a, b) => {
      const aMatches = a.healthConcerns?.filter(c => profile.healthConcerns.includes(c)).length || 0;
      const bMatches = b.healthConcerns?.filter(c => profile.healthConcerns.includes(c)).length || 0;
      
      if (aMatches !== bMatches) {
        return bMatches - aMatches; // Prioritize more health concern matches
      }
      
      // Secondary: Sort by high rating
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    })
    .slice(0, 4);

  // 3. Populated Backfill for personalRecs to ensure it's never empty
  if (personalRecs.length < 4) {
    const backfillCount = 4 - personalRecs.length;
    const existingIds = new Set(personalRecs.map(p => p.id));
    const backfill = products
      .filter(p => (p.targetPetType === expectedPetType || p.targetPetType === 'all') && !existingIds.has(p.id))
      .filter(p => {
        if (!profile.allergies || profile.allergies.length === 0) return true;
        const hasAllergenInIngredients = p.ingredients?.some(ing => 
          profile.allergies.some(allergen => 
            ing.nameKo?.includes(allergen) || ing.nameEn?.toLowerCase().includes(allergen.toLowerCase())
          )
        );
        const hasAllergenInList = p.allergens?.some(a => 
          profile.allergies.some(allergen => a.includes(allergen))
        );
        return !hasAllergenInIngredients && !hasAllergenInList;
      })
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, backfillCount);
    
    personalRecs.push(...backfill);
  }

  // 4. Strict Species-Matching Trending Feed
  const trendingProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
    .slice(0, 5); // condensed down to 5 to save scroll length

  // 5. Strict Species-Matching Concern Feed
  const concernProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .filter(p => (p.healthConcerns ?? []).some(c => profile.healthConcerns.includes(c)))
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5); // condensed down to 5

  // 6. Strict Species-Matching Budget Feed
  const budgetProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .filter(p => (p.price ?? 0) <= 30000)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5); // condensed down to 5

  const topCommunityPicks = []; // Removed for vertical space optimization


  const quickActions = [
    {
      title: '탐색',
      description: '',
      icon: <Search size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/search'),
    },
    {
      title: '랭킹',
      description: '',
      icon: <Flame size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/ranking'),
    },
    {
      title: '성향 테스트',
      description: '',
      icon: <MessageCircle size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/event/personality-quiz'),
    },
    {
      title: '마이 펫',
      description: '',
      icon: <Heart size={18} color="var(--text-muted)" strokeWidth={1.8} />,
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

      {/* Quiet pet header — minimal photo + name */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-color)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--surface-muted)',
              flexShrink: 0,
            }}
          >
            <img
              src={profile.species === 'Cat'
                ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&auto=format&fit=crop&q=80'}
              alt={`${petName} 프로필`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-light)',
                letterSpacing: '0.04em',
                marginBottom: '2px',
              }}
            >
              맞춤 추천
            </span>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-dark)',
                margin: 0,
                letterSpacing: '-0.01em',
                lineHeight: 1.25,
              }}
            >
              {petName}
              <span style={{ color: 'var(--text-light)', fontWeight: 500, fontSize: '13px', marginLeft: '6px' }}>
                {petBreed} · {petAge}세
              </span>
            </h1>
          </div>
        </div>

        <button
          type="button"
          aria-label="알림 수신함 열기"
          onClick={() => {
            alert(`알림 수신함\n\n- ${petName}를 위한 맞춤 영양 리포트가 발급되었습니다.\n- 이번 달 사료 유해성분 모니터링이 완료되었습니다.`);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            padding: 0,
          }}
        >
          <Bell size={20} strokeWidth={1.8} />
        </button>
      </header>

      {/* Slim recall notice — inline single line */}
      {isRecallBannerVisible && (
        <section
          role="button"
          tabIndex={0}
          aria-label="FDA 및 농식품부 긴급 회수 공고 자세히 보기"
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
          onClick={() => setIsRecallModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsRecallModalOpen(true);
            }
          }}
        >
          <AlertTriangle size={14} color="var(--accent)" strokeWidth={2} aria-hidden />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '8px', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent)',
                flexShrink: 0,
                letterSpacing: '-0.005em',
              }}
            >
              회수 공고
            </span>
            <span
              className="line-clamp-1"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                minWidth: 0,
              }}
            >
              살모넬라균 오염 의심 사료 회수 대상 안내
            </span>
          </div>
          <ChevronRight size={14} color="var(--text-light)" strokeWidth={2} aria-hidden />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRecallBannerVisible(false);
            }}
            aria-label="공고 배너 닫기"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </section>
      )}

      <section style={{ padding: '12px 20px 0', marginBottom: '4px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
          onClick={() => navigate('/scanner')}
          aria-label="바코드 스캔으로 성분 분석 시작하기"
        >
          <ScanLine size={18} color="var(--text-muted)" strokeWidth={1.8} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>바코드를 스캔해 성분을 분석해 보세요</span>
        </button>
      </section>

      {/* Trending Products - SHOW FIRST */}
      <HorizontalProductSection
        title="급상승 랭킹"
        subtitle="리뷰가 빠르게 늘고 있는 제품"
        products={trendingProducts}
        onMore={() => navigate('/ranking')}
      />

      {personalRecs.length > 0 && (
        <HorizontalProductSection
          title={`${profile.name} 맞춤 추천`}
          subtitle={
            profile.healthConcerns.length > 0
              ? `${profile.healthConcerns.join(', ')} 고민 기준`
              : `${profile.name} 프로필 · 성분·리뷰 기반`
          }
          products={personalRecs}
          onMore={() => navigate('/search')}
        />
      )}

      {/* Quick Actions — single neutral surface */}
      <section style={{ marginBottom: '18px', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            background: 'var(--surface-elevated)',
            borderRadius: '16px',
            padding: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {quickActions.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              aria-label={item.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 4px',
                borderRadius: '12px',
                outline: 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  color: 'var(--text-muted)',
                }}
                aria-hidden
              >
                {item.icon}
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.title}</div>
            </button>
          ))}
        </div>
      </section>

      {featuredEvent && (
        <section style={{ marginBottom: '24px', padding: '0 20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em', marginBottom: '2px' }}>
              새로운 소식
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>
              이벤트와 쿠폰 소식을 한 번에
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'var(--surface-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Tag size={16} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span className="ui-badge ui-badge-muted">{ev.badge}</span>
                    {ev.code && <span className="ui-badge ui-badge-muted">{ev.code}</span>}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '2px', letterSpacing: '-0.005em' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, lineHeight: 1.5 }}>
                    {ev.desc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClosedEvents(prev => [...prev, ev.id])}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}
                  aria-label="공지 닫기"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <HorizontalProductSection
        title="질병 · 부위별 추천"
        subtitle={
          profile.healthConcerns.length > 0
            ? `${profile.name} 프로필 건강 고민 기반`
            : `${profile.name}을 위해 마이 펫에서 고민을 추가해 보세요`
        }
        products={concernProducts}
        onMore={() => navigate('/search')}
      />

      <HorizontalProductSection
        title="가성비 추천"
        subtitle="3만원 이하 평점 우수 제품"
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
                <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '24px', marginBottom: '24px', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em', marginBottom: '2px' }}>
              카테고리별 탐색
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>
              원하는 상품군으로 이동해 보세요
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px',
            }}
          >
            전체 <ChevronRight size={14} />
          </button>
        </div>
        <div className="ui-category-grid">
          {HOME_CATEGORY_ITEMS.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
              aria-label={`${item.name} 카테고리로 이동`}
            >
              <div className="ui-category-card">
                <div className="ui-category-icon">{item.emoji}</div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', letterSpacing: '-0.005em' }}>{item.name}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Safety Recall & Safety Information Detailed Modal Overlay */}
      {isRecallModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          onClick={() => setIsRecallModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              width: '100%',
              maxWidth: '460px',
              borderRadius: '24px',
              border: '1.5px solid rgba(217, 48, 37, 0.12)',
              boxShadow: '0 20px 25px -5px rgba(217, 48, 37, 0.05), 0 10px 10px -5px rgba(217, 48, 37, 0.02), 0 30px 60px rgba(0, 0, 0, 0.15)',
              padding: '24px',
              position: 'relative',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={22} color="var(--accent)" strokeWidth={2.5} />
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
                  긴급 사료 리콜 및 안전 공고
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRecallModalOpen(false)}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  transition: 'all 0.2s',
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.backgroundColor = '#FEF2F2';
                  e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.color = '#64748B';
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Subtitle / Source Info */}
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1.5px solid rgba(217, 48, 37, 0.1)',
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '13px',
                color: '#7F1D1D',
                fontWeight: 600,
                lineHeight: 1.5,
                marginBottom: '20px',
              }}
            >
              미국 식품의약국(FDA) 및 대한민국 농림축산식품부에서 발표한 최근 자진회수 및 강제 리콜 사료 정보입니다. 해당 제품을 급여 중이신 보호자께서는 즉시 급여를 중단하시고 공식 조치 요령에 따라 반품 또는 교환을 받으시길 권장합니다.
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                msOverflowStyle: 'none',
                scrollbarWidth: 'none',
              }}
              className="no-scrollbar"
            >
              {/* Alert 1 (FDA) */}
              <div
                style={{
                  border: '1px solid rgba(217, 48, 37, 0.08)',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: 'rgba(217, 48, 37, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    미국 FDA 공고
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>2026.05.12</span>
                </div>
                <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B', marginBottom: '8px', lineHeight: 1.35 }}>
                  Raw & Green 브랜드 프리미엄 캣푸드 살모넬라균(Salmonella) 오염 우려 자진회수
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                  미국 FDA 동물의약품센터(CVM)는 특정 유통기한 배치(생산 번호: Lot 202605A) 제품의 원료 검사 도중 살모넬라균 검출 의심으로 수입·유통사의 유통 물량 전체에 대한 자진회수를 권고했습니다. 살모넬라균은 반려묘뿐만 아니라 사료를 직접 만지는 집사의 피부나 호흡기 교차 오염을 유발할 수 있으므로, 해당 배치의 사료는 즉시 밀봉하여 폐기하거나 구매처에서 전액 환불을 받으시기 바랍니다.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>대상: 고양이 건식 1.8kg / 4kg</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F8FAFC', color: 'var(--accent)', border: '1px solid rgba(217, 48, 37, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>조치: 급여 중단 & 환불</span>
                </div>
                <a
                  href="https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    textDecoration: 'none',
                    marginTop: '12px',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span>FDA 공식 리콜 페이지 바로가기</span>
                  <ExternalLink size={12} strokeWidth={2.5} />
                </a>
              </div>

              {/* Alert 2 (Korean Ministry) */}
              <div
                style={{
                  border: '1px solid rgba(217, 48, 37, 0.08)',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', textTransform: 'uppercase', letterSpacing: '0.04em', backgroundColor: 'rgba(234, 88, 12, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                    농림축산식품부 명령
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8' }}>2026.05.18</span>
                </div>
                <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E293B', marginBottom: '8px', lineHeight: 1.35 }}>
                  해피퍼피 오가닉 국산 건식 사료 조수분(Moisture) 함량 기준치 초과 회수 조치
                </h4>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                  국내 농림축산식품부 정기 검사에서 해피퍼피 오가닉 사료 2종에 대해 법적 허용 수분 함량 상한(14.0% 이하)을 초과한 실측 15.6%가 검출되었습니다. 과도한 수분량은 고온다습한 계절에 눈에 보이지 않는 곰팡이 포자 번식 및 부패 속도를 과도하게 앞당겨 급여 시 설사와 구토 등 장염 증세를 일으킬 우려가 있습니다. 유통 판매는 중단되었으며, 기구매 보호자께서는 제조업체(080-123-4567)를 통해 무료 교환 및 환불 절차를 진행하십시오.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>대상: 강아지 오가닉 연어/소고기</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F8FAFC', color: '#EA580C', border: '1px solid rgba(234, 88, 12, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>조치: 회수/폐기 & 무상교환</span>
                </div>
                <a
                  href="https://www.epis.or.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    textDecoration: 'none',
                    marginTop: '12px',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span>농식품부 사료정보 관리시스템 바로가기</span>
                  <ExternalLink size={12} strokeWidth={2.5} />
                </a>
              </div>
            </div>

            {/* Footer Alert Close Action */}
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsRecallModalOpen(false)}
                style={{ flex: 1, borderRadius: '14px', height: '48px', fontSize: '14px', fontWeight: 700, padding: 0 }}
              >
                닫기
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsRecallBannerVisible(false);
                  setIsRecallModalOpen(false);
                }}
                style={{ flex: 1.3, borderRadius: '14px', height: '48px', fontSize: '14px', fontWeight: 700, padding: 0, background: 'linear-gradient(135deg, var(--accent) 0%, #B91C1C 100%)', boxShadow: '0 4px 14px rgba(217, 48, 37, 0.2)' }}
              >
                공고 확인 완료 (배너 끄기)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HorizontalProductSection({
  title,
  subtitle,
  products,
  onMore,
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  products: Product[];
  onMore: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <section style={{ marginBottom: '24px', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '16px', marginBottom: '2px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>{subtitle}</p>
        </div>
        <button
          onClick={onMore}
          style={{
            flexShrink: 0,
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '4px',
          }}
        >
          더보기 <ChevronRight size={14} />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '4px',
          paddingRight: '32px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitMaskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)',
          maskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)',
          scrollSnapType: 'x proximity',
        }}
        aria-label={`${title} 가로 스크롤 목록`}
      >
        {products.map((product, idx) => (
          <div
            key={product.id}
            style={{ flex: '0 0 168px', position: 'relative', scrollSnapAlign: 'start' }}
          >
            <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
              <span
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '6px',
                  letterSpacing: '-0.01em',
                }}
              >
                {idx + 1}
              </span>
            </div>
            <ProductCard product={product} variant="vertical" />
          </div>
        ))}
      </div>
    </section>
  );
}
