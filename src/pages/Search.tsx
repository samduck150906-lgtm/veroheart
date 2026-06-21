// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, Heart } from 'lucide-react';
import { MVP_PRODUCTS } from '../data/mvpMock';

const SPECIES_FILTERS = ['전체', '강아지', '고양이'];
const DETAIL_FILTERS = ['사료', '간식', '영양제', '그레인프리', '유기농', '고단백'];
const SORT_OPTIONS = ['궁합순', '평점순', '가격순'];

function GradeTag({ grade }) {
  const colors = { A: { bg: '#E7F8F0', color: '#15B36B' }, B: { bg: '#FEF6E0', color: '#E8A800' }, C: { bg: '#FFF0ED', color: '#F04452' } };
  const c = colors[grade] || colors.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>{grade}등급</span>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('전체');
  const [detailFilter, setDetailFilter] = useState(null);
  const [sort, setSort] = useState('궁합순');
  const [liked, setLiked] = useState({});
  const [inCompare, setInCompare] = useState({});

  const filtered = MVP_PRODUCTS.filter(p => {
    if (speciesFilter === '강아지' && p.targetPetType !== 'dog') return false;
    if (speciesFilter === '고양이' && p.targetPetType !== 'cat') return false;
    if (query && !p.fullName.toLowerCase().includes(query.toLowerCase()) && !p.brand.includes(query)) return false;
    return true;
  }).sort((a, b) => {
    if (sort === '궁합순') return b.compatibilityScore - a.compatibilityScore;
    if (sort === '평점순') return b.averageRating - a.averageRating;
    if (sort === '가격순') return a.price - b.price;
    return 0;
  });

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

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(product => (
          <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
            style={{
              background: '#fff', borderRadius: 18, padding: '16px',
              boxShadow: '0 2px 10px rgba(30,41,59,0.06)', cursor: 'pointer',
              display: 'flex', gap: 14, alignItems: 'flex-start',
            }}
          >
            <div style={{
              width: 72, height: 72, borderRadius: 14,
              background: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, flexShrink: 0,
            }}>{product.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                <GradeTag grade={product.grade} />
                <span style={{ background: '#F0EDE8', color: '#4E5968', fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>
                  궁합 {product.compatibilityScore}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28', lineHeight: 1.4, marginBottom: 4 }}>{product.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#6B7684' }}>⭐ {product.averageRating}</span>
                <span style={{ fontSize: 12, color: '#B0B8C1' }}>·</span>
                <span style={{ fontSize: 12, color: '#6B7684' }}>{product.reviewsCount.toLocaleString()}개 리뷰</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setLiked(prev => ({ ...prev, [product.id]: !prev[product.id] })); }}
                    style={{
                      width: 34, height: 34, borderRadius: 10, border: '1.5px solid #E5E8EB',
                      background: liked[product.id] ? '#FFF0ED' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >
                    <Heart size={15} fill={liked[product.id] ? '#F04452' : 'none'} color={liked[product.id] ? '#F04452' : '#B0B8C1'} strokeWidth={2} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setInCompare(prev => ({ ...prev, [product.id]: true })); navigate('/comparison'); }}
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
        ))}
      </div>
    </div>
  );
}
