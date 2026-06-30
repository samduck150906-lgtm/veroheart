// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Star, ChevronRight, Megaphone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { matchesSpecies, matchesCategory } from '../utils/rankingFilters';
import { displayBrand } from '../utils/brandLabel';
import ProductImage from '../components/ProductImage';
// 등급 색은 단일 토큰(src/theme/tokens.ts)에서만 가져온다.
import { gradeColor } from '../theme/tokens';

const CATEGORY_FILTERS = ['전체', '사료', '간식', '영양제'];
const SPECIES_FILTERS = ['전체', '강아지', '고양이'];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const navigate = useNavigate();
  const { products } = useStore();
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [speciesFilter, setSpeciesFilter] = useState('전체');

  const sponsored = useMemo(() =>
    products
      .filter(p => p.isSponsored && matchesSpecies(p, speciesFilter))
      .sort((a, b) => (a.sponsorOrder ?? 0) - (b.sponsorOrder ?? 0))
  , [products, speciesFilter]);

  const ranked = useMemo(() => {
    const base = products.filter(p =>
      !p.isSponsored && matchesSpecies(p, speciesFilter) && matchesCategory(p, categoryFilter)
    );
    return [...base].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 30);
  }, [products, speciesFilter, categoryFilter]);

  const avgRating = ranked.length > 0
    ? (ranked.reduce((s, p) => s + (p.averageRating || 0), 0) / ranked.length).toFixed(1)
    : '0.0';
  const totalReviews = ranked.reduce((s, p) => s + (p.reviewsCount || 0), 0);

  return (
    <div style={{ paddingBottom: 90 }}>
      <Helmet><title>인기 랭킹 | 베로로</title></Helmet>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>이번 주 랭킹</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', fontWeight: 500, marginBottom: 16 }}>
          평점 기준 상위 상품
        </p>

        {/* Species Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {SPECIES_FILTERS.map(f => (
            <button key={f} onClick={() => setSpeciesFilter(f)}
              style={{
                minHeight: 44, padding: '0 18px', borderRadius: 22, border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                background: speciesFilter === f ? '#191F28' : '#fff',
                color: speciesFilter === f ? '#fff' : '#4E5968',
                boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {CATEGORY_FILTERS.map(f => (
            <button key={f} onClick={() => setCategoryFilter(f)}
              style={{
                flexShrink: 0, minHeight: 38, padding: '0 14px', borderRadius: 19,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${categoryFilter === f ? '#F5C518' : '#E5E8EB'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: categoryFilter === f ? '#FEF6E0' : '#fff',
                color: categoryFilter === f ? '#CA8A04' : '#6B7684',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: '총 상품', value: `${ranked.length}개` },
            { label: '평균 평점', value: `⭐ ${avgRating}` },
            { label: '총 리뷰', value: `${totalReviews.toLocaleString()}개` },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: '#fff', borderRadius: 14, padding: '12px 10px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
            }}>
              <div style={{ fontSize: stat.pending ? 12.5 : 15, fontWeight: 800, color: stat.pending ? '#B0B8C1' : '#191F28', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#4E5968', marginBottom: 6 }}>
              {categoryFilter === '전체' && speciesFilter === '전체'
                ? '아직 표시할 상품이 없어요'
                : '이 조건에 맞는 상품이 없어요'}
            </p>
            <p style={{ fontSize: 13, marginBottom: 18 }}>필터를 바꾸거나 전체에서 둘러보세요</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(categoryFilter !== '전체' || speciesFilter !== '전체') && (
                <button
                  onClick={() => { setCategoryFilter('전체'); setSpeciesFilter('전체'); }}
                  style={{ background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}
                >필터 초기화</button>
              )}
              <button
                onClick={() => navigate('/search')}
                style={{ background: '#fff', border: '1.5px solid #E5E8EB', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer' }}
              >검색으로 둘러보기</button>
            </div>
          </div>
        ) : ranked.map((product, idx) => (
          <div
            key={product.id}
            onClick={() => navigate(`/product/${product.id}`)}
            style={{
              background: '#fff', borderRadius: 16, padding: '14px 16px',
              boxShadow: idx < 3 ? '0 2px 16px rgba(245,197,24,0.15)' : '0 1px 4px rgba(30,41,59,0.06)',
              cursor: 'pointer',
              border: idx < 3 ? '1.5px solid rgba(245,197,24,0.25)' : '1.5px solid transparent',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
              {idx < 3
                ? <span style={{ fontSize: 22 }}>{MEDALS[idx]}</span>
                : <span style={{ fontSize: 16, fontWeight: 800, color: '#B0B8C1' }}>{idx + 1}</span>
              }
            </div>
            <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
              <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {displayBrand(product.brand, product.name) && (
                <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 1 }}>{displayBrand(product.brand, product.name)}</div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
                {product.name.length > 28 ? product.name.slice(0, 28) + '…' : product.name}
              </div>
              {product.averageRating > 0 && (
                <div style={{ fontSize: 11, color: '#6B7684', marginTop: 3 }}>
                  ⭐ {Number(product.averageRating).toFixed(1)}
                  {product.reviewsCount > 0 && ` · ${product.reviewsCount.toLocaleString()}개 리뷰`}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 4 }}>
                {product.price ? `${product.price.toLocaleString()}원` : ''}
              </div>
              <ChevronRight size={16} color="#B0B8C1" />
            </div>
          </div>
        ))}
      </div>

      {/* ─── 스폰서 섹션 (랭킹과 완전 분리) ─── */}
      {sponsored.length > 0 && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px dashed var(--hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, padding: '0 16px' }}>
            <Megaphone size={15} color="var(--ink-faint)" strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: 0.4 }}>스폰서</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 500 }}>— 이 영역은 브랜드 광고로 운영되며 랭킹 순위에 영향을 주지 않습니다.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>
            {sponsored.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 12px',
                  borderRadius: 12,
                  background: '#F9FAFB',
                  border: '1px solid var(--hairline)',
                  marginBottom: 10,
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--fill)' }}>
                  <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)' }}>{displayBrand(p.brand, p.name)}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB',
                    }}>{p.sponsorLabel || '광고'}</span>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <Star size={11} fill="#E8A800" color="#E8A800" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>{p.averageRating?.toFixed(1)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                    {p.price?.toLocaleString()}원
                  </div>
                  <ChevronRight size={14} color="var(--ink-300)" style={{ marginTop: 4 }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── 랭킹 기준 설명 ─── */}
      <div style={{ margin: '24px 16px 0', padding: '14px 16px', borderRadius: '14px', background: 'var(--fill)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-soft)', marginBottom: '6px' }}>📊 랭킹 산출 기준</div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', lineHeight: 1.6, fontWeight: 500 }}>
          평점·리뷰를 기준으로 한 인기 순위입니다. 랭킹은 주간 단위로 갱신됩니다.
        </div>
      </div>

    </div>
  );
}
