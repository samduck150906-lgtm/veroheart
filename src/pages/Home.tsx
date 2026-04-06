import { useState, type ReactNode } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Clock, ChevronRight, X, Tag, Flame, Stethoscope, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_HERO, CORE_COPY, UGC_COPY } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../data/mock';

export default function Home() {
  const { products, profile, recentViews } = useStore();
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
        <title>베로로 — 성분 분석 &amp; 집사들의 찐 리뷰</title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
      </Helmet>

      <section style={{
        marginBottom: '22px', padding: '20px 18px', borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255, 245, 240, 0.9) 100%)',
        border: '1px solid rgba(232, 90, 60, 0.12)', boxShadow: 'var(--shadow-md)',
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

      <section style={{ marginBottom: '22px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {[UGC_COPY.honestReviews, UGC_COPY.palatability].map((line) => (
            <div key={line} style={{
              fontSize: '12px', fontWeight: 600, color: '#4B5563', padding: '10px', borderRadius: '12px',
              background: '#F9FAFB', border: '1px solid #F3F4F6', lineHeight: 1.4, minHeight: '58px', display: 'flex', alignItems: 'center',
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
              <div key={ev.id} style={{ background: ev.color, borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tag size={18} color="#374151" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#111827', color: '#fff', padding: '2px 8px', borderRadius: '6px' }}>{ev.badge}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '2px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{ev.desc}</div>
                  {ev.code && (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginTop: '6px', background: 'rgba(0,0,0,0.05)', display: 'inline-block', padding: '4px 10px', borderRadius: '8px', fontFamily: 'monospace' }}>
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
          subtitle={`${profile.healthConcerns.join(', ')} 고민 기준`}
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
        subtitle="현재 프로필 건강 고민 기반"
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
                width: '100%', aspectRatio: '1/1', background: 'linear-gradient(145deg, #FFF5F0 0%, #FFE8E0 100%)', 
                borderRadius: '24px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', marginBottom: '10px', fontSize: '28px',
                border: '1px solid rgba(232, 90, 60, 0.1)'
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
            <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, width: '22px', height: '22px', borderRadius: '999px', background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
              {idx + 1}
            </div>
            <ProductCard product={product} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
