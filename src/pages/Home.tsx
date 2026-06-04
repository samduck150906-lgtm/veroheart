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
  Stethoscope,
  Heart,
  MessageCircle,
  Bell,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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
  const petName = profile.name !== '우리 아이' ? profile.name : null;
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

  // 2. Build trending first so personalRecs can exclude them
  const trendingProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
    .slice(0, 5);
  const trendingIds = new Set(trendingProducts.map(p => p.id));

  const allergenFilter = (p: (typeof products)[0]) => {
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
  };

  // 3. Strict Curation Filter for personalRecs (Hero) — exclude trending products
  const personalRecs = products
    .filter(p => (p.targetPetType === expectedPetType || p.targetPetType === 'all') && !trendingIds.has(p.id))
    .filter(allergenFilter)
    .sort((a, b) => {
      const aMatches = a.healthConcerns?.filter(c => profile.healthConcerns.includes(c)).length || 0;
      const bMatches = b.healthConcerns?.filter(c => profile.healthConcerns.includes(c)).length || 0;
      if (aMatches !== bMatches) return bMatches - aMatches;
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    })
    .slice(0, 4);

  // 4. Backfill personalRecs (also excluding trending)
  if (personalRecs.length < 4) {
    const backfillCount = 4 - personalRecs.length;
    const existingIds = new Set(personalRecs.map(p => p.id));
    const backfill = products
      .filter(p => (p.targetPetType === expectedPetType || p.targetPetType === 'all') && !existingIds.has(p.id) && !trendingIds.has(p.id))
      .filter(allergenFilter)
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, backfillCount);
    personalRecs.push(...backfill);
  }

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

      {/* Premium Pet Profile Header Component */}
      <header
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Pet Profile Photo with Premium HSL Soft Mint Green Gradient Ring */}
          <div
            style={{
              position: 'relative',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              padding: '2.5px',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
              boxShadow: '0 6px 16px rgba(129, 201, 149, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={profile.species === 'Cat' 
                ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=120&auto=format&fit=crop&q=80' 
                : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=120&auto=format&fit=crop&q=80'}
              alt={`${petName} 프로필`}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #FFFFFF',
              }}
            />
            {/* Active/Status pulse ring */}
            <span
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
                border: '2px solid #FFFFFF',
                boxShadow: '0 0 0 2px rgba(129, 201, 149, 0.3)',
              }}
            />
          </div>

          {/* Personalization Info */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--primary-dark)',
                letterSpacing: '0.06em',
                marginBottom: '1px',
              }}
            >
              PET NUTRITION CURATION
            </span>
            <h1
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--text-dark)',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              <span style={{ color: '#4F46E5', fontWeight: 900 }}>
                {petName ?? profile.name}
              </span>
              {profile.species && profile.age > 0 && (
                <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '14px' }}>
                  ({profile.species === 'Dog' ? '강아지' : '고양이'}, {profile.age}세)
                </span>
              )}
              를 위한 맞춤 추천
            </h1>
          </div>
        </div>

        {/* Right side Premium Notification Icon */}
        <button
          type="button"
          onClick={() => {
            alert('🔔 알림 기능이 곧 제공될 예정입니다.');
          }}
          style={{
            background: '#F8FAFC',
            border: '1px solid rgba(28, 25, 23, 0.08)',
            cursor: 'pointer',
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dark)',
            position: 'relative',
            transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.04)';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.15)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = 'rgba(28, 25, 23, 0.08)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Bell size={20} strokeWidth={2.2} />
          {/* Glowing Premium Red Alert dot */}
          <span
            style={{
              position: 'absolute',
              top: '9px',
              right: '9px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 0 2px rgba(217, 48, 37, 0.2)',
            }}
          />
        </button>
      </header>



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

      {/* Sleek, Premium Compact Single-row Quick Actions for maximum vertical space optimization */}
      <section style={{ marginBottom: '14px', padding: '0 4px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '12px', 
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 10px',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {quickActions.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                outline: 'none',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                background: item.accent,
                marginBottom: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                {item.icon}
              </span>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-dark)' }}>{item.title}</div>
            </button>
          ))}
        </div>
      </section>


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
    <section style={{ marginBottom: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '16.5px', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            {icon}
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>{subtitle}</p>
        </div>
        <button onClick={onMore} className="ui-text-button" style={{ flexShrink: 0, fontSize: '12.5px' }}>
          더보기 <ChevronRight size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {products.map((product, idx) => (
          <div key={product.id} style={{ flex: '0 0 172px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
              <span style={{ 
                background: 'rgba(79, 70, 229, 0.9)', 
                color: '#ffffff', 
                fontSize: '10.5px', 
                fontWeight: 800, 
                padding: '3px 7px', 
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
              }}>
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
