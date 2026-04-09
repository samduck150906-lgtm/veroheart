import { useState, type ReactNode } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Clock, ChevronRight, X, Tag, Flame, Stethoscope, Wallet } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_HERO, CORE_COPY, UGC_COPY, VIRAL_LANDING_COPY, KAKAO_SHARE_MESSAGES } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../types';

export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const visibleEvents = MOCK_EVENTS.filter(e => !closedEvents.includes(e.id));

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

      <section style={{
        marginBottom: '22px', padding: '20px 18px', borderRadius: '24px',
        background: 'linear-gradient(160deg, #FFFFFF 0%, #FFFCE9 100%)',
        border: '1px solid rgba(251, 191, 36, 0.28)', boxShadow: 'var(--shadow-md)',
      }}>
        <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--community-tint)', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>First impression</p>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.4, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
          {HOME_HERO.headline}
        </h1>
        <p style={{ fontSize: '13px', fontWeight: 600, color: '#4B5563', lineHeight: 1.5, margin: '0 0 10px' }}>
          {HOME_HERO.sub}
        </p>
        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
          {CORE_COPY.ocr}
        </p>
      </section>

      {isLoggedIn && (
        <section
          style={{
            marginBottom: '22px',
            padding: '16px 18px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ECFDF5 0%, #FFFFFF 100%)',
            border: '1px solid #A7F3D0',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)',
          }}
        >
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.06em' }}>
            MY PET
          </p>
          <h2 style={{ margin: '6px 0 6px', fontSize: '17px', fontWeight: 900, color: '#064E3B', lineHeight: 1.35 }}>
            {profile.name} 맞춤 홈
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#374151', fontWeight: 600, lineHeight: 1.5 }}>
            {profile.species === 'Cat' ? '🐈 고양이' : '🐕 강아지'}
            {profile.healthConcerns.length > 0
              ? ` · 선택한 고민: ${profile.healthConcerns.join(', ')}`
              : ' · 프로필에서 건강 고민을 선택하면 추천이 더 정확해져요.'}
          </p>
          {profile.healthConcerns.length === 0 && (
            <Link
              to="/profile"
              style={{
                display: 'inline-block',
                marginTop: '10px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#047857',
                textDecoration: 'none',
              }}
            >
              프로필 설정하기 →
            </Link>
          )}
        </section>
      )}

      <section
        style={{
          marginBottom: '22px',
          padding: '18px',
          borderRadius: '20px',
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
            onClick={() => navigate('/test')}
            style={{ borderRadius: '12px', height: '42px', fontSize: '13px', fontWeight: 800 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaPrimary}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => navigate('/test')}
            style={{ borderRadius: '12px', height: '42px', fontSize: '13px', fontWeight: 800 }}
          >
            {VIRAL_LANDING_COPY.hero.ctaSecondary}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#7C2D12', background: '#FFF', border: '1px dashed #FDBA74', borderRadius: '10px', padding: '8px 10px', lineHeight: 1.45 }}>
          카카오 공유 문구 예시: {KAKAO_SHARE_MESSAGES[0]}
        </div>
      </section>

      <section style={{ marginBottom: '22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[UGC_COPY.honestReviews, UGC_COPY.palatability].map((line) => (
            <div key={line} style={{
              fontSize: '12px', fontWeight: 600, color: '#4B5563', padding: '10px', borderRadius: '14px',
              background: '#FFFBEB', border: '1px solid #FDE68A', lineHeight: 1.4, minHeight: '58px', display: 'flex', alignItems: 'center',
            }}>
              {line}
            </div>
          ))}
        </div>
      </section>

      {/* 이벤트/쿠폰 배너 */}
      {visibleEvents.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleEvents.map(ev => (
              <div key={ev.id} style={{ background: '#FEF9C3', borderRadius: '18px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', border: '1px solid #FCD34D' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tag size={18} color="#374151" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#92400E', color: '#fff', padding: '2px 8px', borderRadius: '999px' }}>{ev.badge}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#713F12', marginBottom: '2px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{ev.desc}</div>
                  {ev.code && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#854D0E', marginTop: '6px', background: 'rgba(255,255,255,0.7)', display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontFamily: 'monospace', border: '1px dashed #F59E0B' }}>
                      {ev.code}
                    </div>
                  )}
                </div>
                <button onClick={() => setClosedEvents(prev => [...prev, ev.id])} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  <X size={16} />
                </button>
              </div>
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
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock size={20} /> 최근 본 제품</span>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280', fontWeight: 600 }}>
              더보기 <ChevronRight size={16} />
            </button>
          </h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 6).map(p => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '100px', cursor: 'pointer' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '100px', height: '100px', borderRadius: '14px', objectFit: 'cover', marginBottom: '6px' }} />
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '24px', fontWeight: 800 }}>카테고리별 탐색</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
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
              <div style={{ 
                width: '100%', aspectRatio: '1/1', background: 'linear-gradient(145deg, #FFFDF0 0%, #FFF6CC 100%)', 
                borderRadius: '24px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', marginBottom: '10px', fontSize: '28px',
                border: '1px solid rgba(250, 204, 21, 0.22)'
              }}>
                {item.emoji}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563' }}>{item.name}</span>
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
    <section style={{ marginBottom: '34px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
            {icon}
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, margin: 0 }}>{subtitle}</p>
        </div>
        <button onClick={onMore} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>
          더보기 <ChevronRight size={15} />
        </button>
      </div>
      <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {products.map((product, idx) => (
          <div key={product.id} style={{ flex: '0 0 290px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, width: '22px', height: '22px', borderRadius: '999px', background: '#CA8A04', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
              {idx + 1}
            </div>
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
