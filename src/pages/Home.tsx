import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles,
  Clock,
  ChevronRight,
  X,
  Tag,
  ShieldCheck,
  Search,
  Star,
  HeartHandshake,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_HERO, CORE_COPY, UGC_COPY } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';

export default function Home() {
  const { products, profile, recentViews } = useStore();
  const navigate = useNavigate();
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const visibleEvents = MOCK_EVENTS.filter((e) => !closedEvents.includes(e.id));

  const personalRecs = useMemo(
    () =>
      products
        .filter((p) => {
          if (!p.targetPetType) return true;
          const petType = profile.species === 'Dog' ? 'dog' : 'cat';
          return p.targetPetType === petType || p.targetPetType === 'all';
        })
        .filter((p) => {
          const directMatch = p.healthConcerns?.some((c) => profile.healthConcerns.includes(c));
          const ingredientMatch = p.ingredients.some((ing) =>
            profile.healthConcerns.some((c) => ing.purpose.includes(c))
          );
          return directMatch || ingredientMatch;
        })
        .slice(0, 4),
    [products, profile]
  );

  const trendProducts = useMemo(
    () => [...products].sort((a, b) => b.averageRating * b.reviewsCount - a.averageRating * a.reviewsCount).slice(0, 4),
    [products]
  );

  const quickLinks = [
    {
      title: `${profile.name} 맞춤 탐색`,
      desc: profile.healthConcerns.length > 0 ? `${profile.healthConcerns.join(', ')} 중심 추천 보기` : '아이 정보 기준 추천 받기',
      onClick: () => navigate('/search'),
    },
    {
      title: '성분 바로 검색',
      desc: '브랜드, 제품명, 성분명으로 탐색',
      onClick: () => navigate('/search'),
    },
    {
      title: '랭킹 살펴보기',
      desc: '리뷰와 평점 높은 제품 확인',
      onClick: () => navigate('/ranking'),
    },
  ];

  return (
    <div>
      <Helmet>
        <title>베로로 — 화해처럼 쉽게 보는 반려동물 쇼핑</title>
        <meta
          name="description"
          content="성분, 리뷰, 랭킹, 맞춤 추천까지 한 번에 확인하는 반려동물 쇼핑 경험"
        />
      </Helmet>

      <section className="ui-hero-panel" style={{ marginBottom: '20px', padding: '22px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '12px', display: 'inline-flex' }}>
          <Sparkles size={14} />
          오늘의 발견
        </span>
        <h2 style={{ fontSize: '26px', lineHeight: 1.28, marginBottom: '10px', fontWeight: 900 }}>
          {HOME_HERO.headline}
        </h2>
        <p style={{ fontSize: '15px', color: '#5C636E', lineHeight: 1.6, marginBottom: '16px' }}>{HOME_HERO.sub}</p>
        <div className="ui-highlight-box" style={{ marginBottom: '12px' }}>
          {HOME_HERO.customTable}
        </div>
        <p style={{ fontSize: '12px', color: '#8A9099', lineHeight: 1.55 }}>{HOME_HERO.footnote}</p>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <div className="ui-section-head">
          <div>
            <div className="ui-section-kicker">quick start</div>
            <h2 className="ui-section-title">무엇부터 볼지 바로 정해드릴게요</h2>
          </div>
        </div>
        <div className="ui-grid-3">
          {quickLinks.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              className="ui-action-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span className="ui-badge ui-badge-muted">{item.title}</span>
                <ChevronRight size={16} color="#9AA1AA" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.45 }}>{item.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '28px' }}>
        <div className="ui-section-head">
          <div>
            <div className="ui-section-kicker">browse by category</div>
            <h2 className="ui-section-title">카테고리별로 바로 탐색</h2>
          </div>
          <button type="button" className="ui-text-button" onClick={() => navigate('/search')}>
            전체 보기 <ChevronRight size={15} />
          </button>
        </div>
        <div className="ui-category-grid">
          {HOME_CATEGORY_ITEMS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
              className="ui-category-card"
            >
              <div className="ui-category-icon">{item.emoji}</div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#525A65', lineHeight: 1.35 }}>{item.name}</div>
            </button>
          ))}
        </div>
      </section>

      {visibleEvents.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <div className="ui-section-head">
            <div>
              <div className="ui-section-kicker">benefits</div>
              <h2 className="ui-section-title">지금 받을 수 있는 혜택</h2>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {visibleEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  background: ev.color,
                  borderRadius: '20px',
                  padding: '16px',
                  display: 'flex',
                  gap: '12px',
                  border: '1px solid rgba(17,24,39,0.05)',
                  position: 'relative',
                }}
              >
                <div className="ui-icon-pill">
                  <Tag size={17} color="#374151" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span className="ui-badge ui-badge-dark">{ev.badge}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#111827', marginBottom: '4px' }}>{ev.title}</div>
                  <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5 }}>{ev.desc}</div>
                  {ev.code && (
                    <div style={{ marginTop: '8px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                      {ev.code}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setClosedEvents((prev) => [...prev, ev.id])}
                  style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', position: 'absolute', right: '10px', top: '10px' }}
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '28px' }}>
        <div className="ui-grid-3">
          {[
            { icon: ShieldCheck, title: '성분 검증', text: CORE_COPY.dangerHighlight },
            { icon: Search, title: 'OCR 탐색', text: CORE_COPY.ocr },
            { icon: HeartHandshake, title: '리뷰 신뢰도', text: UGC_COPY.honestReviews },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="ui-info-card">
              <div className="ui-icon-pill" style={{ marginBottom: '12px' }}>
                <Icon size={18} color="var(--primary-dark)" />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, marginBottom: '6px', color: 'var(--text-dark)' }}>{title}</div>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#67707C' }}>{text}</div>
            </div>
          ))}
        </div>
      </section>

      {personalRecs.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <div className="ui-section-head">
            <div>
              <div className="ui-section-kicker">for {profile.name}</div>
              <h2 className="ui-section-title">{profile.name}에게 맞는 추천</h2>
            </div>
            <button type="button" className="ui-text-button" onClick={() => navigate('/search')}>
              더 보기 <ChevronRight size={15} />
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#67707C', marginBottom: '14px', lineHeight: 1.55 }}>
            {profile.healthConcerns.length > 0
              ? `${profile.healthConcerns.join(', ')} 고민을 기준으로 관련도가 높은 제품을 먼저 보여드려요.`
              : '등록된 프로필 정보를 바탕으로 추천 순서를 조정해 보여드려요.'}
          </p>
          <div className="ui-grid-2">
            {personalRecs.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '28px' }}>
        <div className="ui-section-head">
          <div>
            <div className="ui-section-kicker">trending now</div>
            <h2 className="ui-section-title">평점과 리뷰가 함께 좋은 제품</h2>
          </div>
          <button type="button" className="ui-text-button" onClick={() => navigate('/ranking')}>
            랭킹 보기 <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          {trendProducts.map((product, index) => (
            <button
              key={product.id}
              type="button"
              onClick={() => navigate(`/product/${product.id}`)}
              className="ui-list-card"
            >
              <div className="ui-rank-index">{index + 1}</div>
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{ width: '76px', height: '76px', borderRadius: '18px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '4px' }}>{product.brand}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px', lineHeight: 1.45 }}>{product.name}</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="ui-badge ui-badge-soft">
                    <Star size={12} fill="#FFB020" color="#FFB020" />
                    {product.averageRating.toFixed(1)}
                  </span>
                  <span className="ui-badge ui-badge-muted">리뷰 {product.reviewsCount.toLocaleString()}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <TargetedAd />

      {recentViews.length > 0 && (
        <section style={{ margin: '28px 0' }}>
          <div className="ui-section-head">
            <div>
              <div className="ui-section-kicker">recently viewed</div>
              <h2 className="ui-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} />
                최근 본 제품
              </h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
            {recentViews.slice(0, 6).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  flex: '0 0 126px',
                  background: '#fff',
                  border: '1px solid rgba(232, 90, 60, 0.08)',
                  borderRadius: '18px',
                  padding: '10px',
                  cursor: 'pointer',
                }}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: '14px', objectFit: 'cover', marginBottom: '10px' }}
                />
                <div style={{ fontSize: '11px', color: '#8A9099', fontWeight: 700, marginBottom: '4px', textAlign: 'left' }}>{product.brand}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#31363F', lineHeight: 1.45, textAlign: 'left' }}>{product.name}</div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
