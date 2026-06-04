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
  Flame,
  Stethoscope,
  Wallet,
  Search,
  Heart,
  MessageCircle,
  ScanLine,
  Bell,
  Shield,
  User,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px' }}>
      <Helmet>
        <title>
          {isLoggedIn
            ? `${profile.name} 맞춤 홈 — 베로로`
            : '베로로 — 성분 분석 & 집사들의 찐 리뷰'}
        </title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
      </Helmet>

      {/* Top Banner Message */}
      <div style={{ padding: '8px 20px 0' }}>
        <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--brand-deep)' }}>Pet Nutrition Curation</span>
        <h2 style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {isLoggedIn ? `${profile.name}를 위한 오늘의 큐레이션` : '오늘의 사료 큐레이션'}
        </h2>
        {isLoggedIn && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {[profile.species === 'Cat' ? '고양이' : '강아지', `${profile.age || 0}세`, `${profile.weightKg || 0}kg`].map((t) => (
              <span key={t} style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)',
                padding: '2px 8px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--brand-line)' }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {!isLoggedIn && (
        <div style={{
          margin: '0 20px',
          padding: '24px 20px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #FFFDEB 0%, #FFF5D1 100%)',
          border: '1px solid var(--brand-line)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-10px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--brand-tint)',
            opacity: 0.5,
            zIndex: 0
          }} />
          <div style={{ zIndex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--brand-deep)', letterSpacing: '-0.02em' }}>
              우리 아이 맞춤 영양 진단 🐶🐱
            </h3>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, fontWeight: 500 }}>
              로그인 후 아이의 나이, 알레르기, 건강 고민을 입력하시면 수의 영양 학회 기준 맞춤 사료를 추천해 드려요.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                height: '46px',
                borderRadius: '14px',
                background: 'var(--ink)',
                color: 'var(--surface)',
                fontWeight: 700,
                fontSize: 14,
                border: 'none',
                cursor: 'pointer',
                marginTop: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
              }}
            >
              3초만에 내 반려동물 등록하기
            </button>
          </div>
        </div>
      )}

      {/* Personalized Recommendation (Hero Slider) */}
      {isLoggedIn && personalRecs.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--brand-deep)' }}>Curated for</span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                {profile.name} 맞춤 추천
              </h3>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                프로필 · 성분 · 리뷰를 종합한 사람 검수 추천
              </span>
            </div>
            <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {personalRecs.slice(0, 4).map((p, idx) => (
              <ProductCard key={p.id} product={p} variant="vertical" rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Dual Quick Actions Card Grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => navigate('/event/personality-quiz')}
          style={{
            cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--brand-deep)" />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>성향 테스트</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>우리 아이 사료 찾기</span>
          </span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          style={{
            cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="var(--brand-deep)" />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>마이 펫</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>프로필 및 건강 관리</span>
          </span>
        </button>
      </div>

      {/* Trending Products (急上昇) */}
      {trendingProducts.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--brand-deep)' }}>Popularity ranking</span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                급상승 랭킹
              </h3>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                리뷰와 평점이 빠르게 늘고 있는 인기 제품
              </span>
            </div>
            <button onClick={() => navigate('/ranking')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {trendingProducts.slice(0, 5).map((p, idx) => (
              <ProductCard key={p.id} product={p} variant="vertical" rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Concern-based Recommendations */}
      {isLoggedIn && concernProducts.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--brand-deep)' }}>Health concern</span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                질병 · 부위별 추천
              </h3>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                {profile.healthConcerns.length > 0 ? `${profile.healthConcerns.join(' · ')} 고민 기준` : '반려동물 건강 맞춤 사료'}
              </span>
            </div>
            <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {concernProducts.slice(0, 5).map((p, idx) => (
              <ProductCard key={p.id} product={p} variant="vertical" rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Budget-friendly Recommendations */}
      {isLoggedIn && budgetProducts.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 15, color: 'var(--brand-deep)' }}>Budget picks</span>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                가성비 추천 사료
              </h3>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                3만원 이하 실속형 안심 사료
              </span>
            </div>
            <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {budgetProducts.slice(0, 5).map((p, idx) => (
              <ProductCard key={p.id} product={p} variant="vertical" rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Products */}
      {recentViews.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                최근 본 제품
              </h3>
            </div>
            <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 6).map((p) => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: 124, cursor: 'pointer' }}>
                <div style={{ width: 124, height: 124, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--hairline)', marginBottom: 8 }}>
                  <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="line-clamp-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4 }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories Search grid */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              카테고리별 탐색
            </h3>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
              원하는 사료/간식 종류를 선택해보세요
            </span>
          </div>
          <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', paddingBottom: 2 }}>
            전체 탐색 <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {HOME_CATEGORY_ITEMS.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(`/search?category=${encodeURIComponent(item.name)}`)}
              style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', padding: 0
              }}
            >
              <span style={{
                width: '100%', aspectRatio: '1', borderRadius: 16, background: 'var(--brand-tint)',
                border: '1px solid var(--brand-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                {item.emoji}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{item.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trust Curation Footer */}
      <div style={{ margin: '2px 20px 0', padding: '16px 18px', borderRadius: 18, background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={26} color="var(--brand)" />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--surface)' }}>사람이 검수한 데이터</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 1.4 }}>
            모든 추천은 수의 영양 기준과 성분 검수를 거칩니다
          </div>
        </div>
      </div>
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
