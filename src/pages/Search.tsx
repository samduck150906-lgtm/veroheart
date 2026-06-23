// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Heart, FlaskConical, Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';
import { TossFilterSection } from '../components/TossUI';

import { SEARCH_EMPTY, SEARCH_NO_RESULTS, INGREDIENT_DICT } from '../copy/ui';

const CORE_COPY = { ocr: '반려동물의 체질과 알레르기, 건강 고민을 조합하여 딱 맞는 완벽한 한 끼를 찾아보세요.' };

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
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFilterOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', backgroundColor: '#fff', borderRadius: '20px 20px 0 0', padding: '24px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <TossFilterSection title="제외 성분 검색">
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <FlaskConical size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="제외할 성분 검색..."
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {ingredientSearch && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', background: '#fff' }}>
                  {filteredIngList.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>{INGREDIENT_DICT.notFound}</div>
                  ) : filteredIngList.map(ing => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', borderBottom: '1px solid #F3F4F6' }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ing.risk_level === 'danger' ? '#EF4444' : ing.risk_level === 'caution' ? '#F59E0B' : '#10B981', flexShrink: 0 }} />
                      {ing.name_ko}
                      <Plus size={14} style={{ marginLeft: 'auto', color: '#9CA3AF' }} />
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>선택한 성분이 포함된 제품은 검색에서 제외됩니다.</p>
            </TossFilterSection>

            <div style={{ position: 'sticky', bottom: 0, paddingTop: '40px', paddingBottom: '24px', backgroundColor: '#fff', display: 'flex', gap: '12px' }}>
              <button type="button" onClick={resetFilters} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Trash2 size={18} /> 초기화</button>
              <button type="button" onClick={() => setIsFilterOpen(false)} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: 'var(--brand)', color: 'var(--ink-on-brand)', fontWeight: 800, border: 'none', cursor: 'pointer' }}>결과 보기</button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Feed Modal */}
      {isStandardFeedModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '500px', backgroundColor: '#fff', borderRadius: '24px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 900 }}>한국표준사료 성분사전</h2>
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>공식 표준 성분 데이터를 확인해보세요 (총 {standardFeedData.length}개)</p>
              </div>
              <button onClick={() => setIsStandardFeedModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <SearchIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input 
                type="text" 
                placeholder="어떤 성분이 궁금하신가요? (예: 귀리)" 
                value={standardFeedSearch}
                onChange={(e) => setStandardFeedSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '12px', border: '1px solid #E5E7EB', outline: 'none', fontSize: '14px', backgroundColor: '#F9FAFB' }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E7EB', borderRadius: '12px' }}>
              {filteredStandardFeed.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>{SEARCH_NO_RESULTS.title}</div>
              ) : (
                filteredStandardFeed.map((item: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '16px', borderBottom: '1px solid #E5E7EB',
                      display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#1F2937', fontSize: '15px' }}>{item.name_ko}</div>
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>{item.name_en || '-'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                      <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조단백질</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.protein}%</div>
                      </div>
                      <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조지방</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.fat}%</div>
                      </div>
                      <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>수분</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.moisture}%</div>
                      </div>
                      <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조섬유</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.fiber}%</div>
                      </div>
                      <div style={{ background: '#F3F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조회분</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.ash}%</div>
                      </div>
                    </div>
                  </div>
                )))
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
