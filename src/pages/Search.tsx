// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Heart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';

const SPECIES_FILTERS = ['전체', '강아지', '고양이'];
const DETAIL_FILTERS = ['사료', '간식', '영양제', '그레인프리', '유기농', '고단백'];
const SORT_OPTIONS = ['평점순', '가격순', '이름순'];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

function GradeTag({ grade }) {
  const c = GRADE_COLORS[grade] || GRADE_COLORS.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>
      {grade}등급
    </span>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, profile, isLoggedIn, favorites, toggleFavorite, addToComparison } = useStore();

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [speciesFilter, setSpeciesFilter] = useState('전체');
  const [detailFilter, setDetailFilter] = useState<string | null>(null);
  const [sort, setSort] = useState('평점순');
  const [inCompare, setInCompare] = useState<Record<string, boolean>>({});

  const favoriteSet = new Set(favorites || []);

  const filtered = useMemo(() => {
    let list = products;
    if (speciesFilter === '강아지') list = list.filter(p => p.targetPetType === 'dog' || p.targetPetType === 'all');
    if (speciesFilter === '고양이') list = list.filter(p => p.targetPetType === 'cat' || p.targetPetType === 'all');
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.mainCategory || '').toLowerCase().includes(q)
      );
    }
    if (detailFilter) {
      list = list.filter(p =>
        (p.mainCategory || '').includes(detailFilter) ||
        (p.category || '').includes(detailFilter) ||
        (p.name || '').includes(detailFilter)
      );
    }
    return [...list].sort((a, b) => {
      if (sort === '평점순') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sort === '가격순') return (a.price || 0) - (b.price || 0);
      if (sort === '이름순') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, speciesFilter, query, detailFilter, sort]);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '12px 16px 8px', position: 'sticky', top: 0, background: '#F7F4EE', zIndex: 10 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 14, padding: '0 16px',
          boxShadow: '0 1px 4px rgba(30,41,59,0.08)',
        }}>
          <SearchIcon size={18} color="#8B95A1" strokeWidth={2.2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="사료, 브랜드명 검색..."
            style={{ flex: 1, height: 46, border: 'none', outline: 'none', fontSize: 15, color: '#191F28', background: 'transparent' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B95A1', fontSize: 18 }}>✕</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '8px 16px', overflowX: 'auto' }}>
        {SPECIES_FILTERS.map(f => (
          <button key={f} onClick={() => setSpeciesFilter(f)}
            style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 700,
              background: speciesFilter === f ? '#191F28' : '#fff',
              color: speciesFilter === f ? '#fff' : '#4E5968',
              boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
            }}
          >{f}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px', overflowX: 'auto' }}>
        {DETAIL_FILTERS.map(f => (
          <button key={f} onClick={() => setDetailFilter(detailFilter === f ? null : f)}
            style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20,
              border: `1.5px solid ${detailFilter === f ? '#F5C518' : '#E5E8EB'}`,
              cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: detailFilter === f ? '#FEF6E0' : '#fff',
              color: detailFilter === f ? '#CA8A04' : '#6B7684',
            }}
          >{f}</button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
        <span style={{ fontSize: 13, color: '#8B95A1', fontWeight: 600 }}>총 {filtered.length}개</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {SORT_OPTIONS.map(s => (
            <button key={s} onClick={() => setSort(s)}
              style={{
                padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: sort === s ? '#F5C518' : 'transparent',
                color: sort === s ? '#191F28' : '#8B95A1',
              }}
            >{s}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center', color: '#B0B8C1' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#4E5968', marginBottom: 6 }}>검색 결과가 없어요</p>
          <p style={{ fontSize: 13 }}>다른 검색어나 필터를 시도해 보세요</p>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(product => {
            const score = (isLoggedIn && profile?.name && profile.name !== '우리 아이')
              ? calculateCompatibilityScore(product, profile)
              : null;
            const grade = score != null ? gradeFromScore(score) : null;
            const isFav = favoriteSet.has(product.id);

            return (
              <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  background: '#fff', borderRadius: 18, padding: '16px',
                  boxShadow: '0 2px 10px rgba(30,41,59,0.06)', cursor: 'pointer',
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                }}
              >
                <div style={{
                  width: 72, height: 72, borderRadius: 14,
                  background: '#F7F4EE', overflow: 'hidden', flexShrink: 0,
                }}>
                  <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                    {grade && <GradeTag grade={grade} />}
                    {score != null && (
                      <span style={{ background: '#F0EDE8', color: '#4E5968', fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>
                        궁합 {score}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28', lineHeight: 1.4, marginBottom: 4 }}>
                    {product.name.length > 30 ? product.name.slice(0, 30) + '…' : product.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {product.averageRating > 0 && <span style={{ fontSize: 12, color: '#6B7684' }}>⭐ {Number(product.averageRating).toFixed(1)}</span>}
                    {product.reviewsCount > 0 && <>
                      <span style={{ fontSize: 12, color: '#B0B8C1' }}>·</span>
                      <span style={{ fontSize: 12, color: '#6B7684' }}>{product.reviewsCount.toLocaleString()}개 리뷰</span>
                    </>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(product.id); }}
                        style={{
                          width: 34, height: 34, borderRadius: 10, border: '1.5px solid #E5E8EB',
                          background: isFav ? '#FFF0ED' : '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        <Heart size={15} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#B0B8C1'} strokeWidth={2} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          addToComparison(product.id);
                          setInCompare(prev => ({ ...prev, [product.id]: true }));
                          navigate('/comparison');
                        }}
                        style={{
                          height: 34, padding: '0 12px', borderRadius: 10,
                          border: inCompare[product.id] ? '1.5px solid #F5C518' : '1.5px solid #E5E8EB',
                          background: inCompare[product.id] ? '#FEF6E0' : '#fff',
                          fontSize: 12, fontWeight: 700,
                          color: inCompare[product.id] ? '#CA8A04' : '#6B7684', cursor: 'pointer',
                        }}
                      >{inCompare[product.id] ? '비교중' : '비교+'}</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
