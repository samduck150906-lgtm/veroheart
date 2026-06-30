// @ts-nocheck
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Filter,
  X,
  Check,
  Trash2,
  Plus,
  FlaskConical,
  Dog,
  Cat,
  LayoutGrid,
  Package,
  SlidersHorizontal,
  Sparkles,
  Search as SearchIcon,
  Database,
  BookOpen
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { TossFilterSection, TossChip, TossButton } from '../components/TossUI';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { displayBrand } from '../utils/brandLabel';
import ProductImage from '../components/ProductImage';
import { TossFilterSection } from '../components/TossUI';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';
import STANDARD_FEED_DATA from '../data/standard_feed_data.json';

import { SEARCH_EMPTY, SEARCH_NO_RESULTS, INGREDIENT_DICT } from '../copy/ui';

const CORE_COPY = { ocr: '반려동물의 체질과 알레르기, 건강 고민을 조합하여 딱 맞는 완벽한 한 끼를 찾아보세요.' };

const TossSearchBar = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div style={{ position: 'relative' }}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || '검색'}
      style={{
        width: '100%',
        padding: '14px 16px 14px 44px',
        borderRadius: '14px',
        border: '1.5px solid var(--hairline)',
        fontSize: '15px',
        fontWeight: 500,
        outline: 'none',
        background: 'var(--fill)',
        color: 'var(--ink)',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--brand)';
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--brand-tint)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--hairline)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none', display: 'flex' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </span>
  </div>
);


export default function Search() {
  const { profile, isLoggedIn } = useStore();
  const hasPetProfile = isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = resolveCategoryFromSearchParams(searchParams.get('category'));

  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [speciesFilter, setSpeciesFilter] = useState('전체');
  const [detailFilter, setDetailFilter] = useState<string | null>(null);
  const [sort, setSort] = useState('평점순');
  const [inCompare, setInCompare] = useState<Record<string, boolean>>({});

  // 제외 성분 필터 모달
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);

  // 한국표준사료 성분사전 모달
  const [isStandardFeedModalOpen, setIsStandardFeedModalOpen] = useState(false);
  const [standardFeedSearch, setStandardFeedSearch] = useState('');

  const favoriteSet = new Set(favorites || []);

  const standardFeedData = STANDARD_FEED_DATA as any[];

  const filteredIngList = useMemo(() => {
    const q = ingredientSearch.trim().toLowerCase();
    if (!q) return [];
    return INGREDIENT_OPTIONS.filter(i => i.name_ko.toLowerCase().includes(q)).slice(0, 30);
  }, [ingredientSearch]);

  const filteredStandardFeed = useMemo(() => {
    const q = standardFeedSearch.trim().toLowerCase();
    if (!q) return standardFeedData;
    return standardFeedData.filter(i =>
      (i.name_ko || '').toLowerCase().includes(q) || (i.name_en || '').toLowerCase().includes(q)
    );
  }, [standardFeedSearch, standardFeedData]);

  const resetFilters = () => {
    setSpeciesFilter('전체');
    setDetailFilter(null);
    setSort('평점순');
    setExcludedIngredients([]);
    setIngredientSearch('');
  };

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
    if (excludedIngredients.length) {
      list = list.filter(p =>
        !(p.ingredients || []).some(ing =>
          excludedIngredients.some(ex => (ing.nameKo || '').includes(ex))
        )
      );
    }
    return [...list].sort((a, b) => {
      if (sort === '평점순') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sort === '가격순') return (a.price || 0) - (b.price || 0);
      if (sort === '이름순') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, speciesFilter, query, detailFilter, sort, excludedIngredients]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <Helmet>
        <title>제품 검색 | 베로로</title>
        <meta name="description" content="반려동물 종류, 가격대, 건강 고민에 따라 사료를 정밀하게 탐색하세요." />
      </Helmet>
      
      {/* Search Box */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 16px', borderRadius: 12,
          background: 'var(--fill)', border: '1px solid transparent' }}>
          <SearchIcon size={18} stroke="var(--ink-faint)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="상품명, 브랜드, 성분명으로 검색"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'none', fontSize: 14.5, color: 'var(--ink)', fontFamily: 'inherit' }}
          />
          {query && <X size={16} stroke="var(--ink-faint)" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 9 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, color: 'var(--brand-deep)', background: 'var(--brand-tint)', border: '1px solid var(--brand-line)' }}>
            <Sparkles size={11} /> 공식 검수 데이터
          </div>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: 'var(--text-muted)', fontWeight: 500 }}>
            검색과 추천은 직접 정리한 제조사/성분 데이터와 프로필 기준으로 계산하며, AI는 해석 보조에만 사용됩니다.
          </p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <TossSearchBar
            value={query}
            onChange={setQuery}
            placeholder="상품명, 브랜드, 성분명으로 검색"
          />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>반려동물</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {([
              { key: '' as const, label: '전체', Icon: LayoutGrid },
              { key: 'dog' as const, label: '강아지', Icon: Dog },
              { key: 'cat' as const, label: '고양이', Icon: Cat },
              { key: 'all' as const, label: '공용', Icon: Package },
            ]).map(({ key, label, Icon }) => {
              const active = filters.targetPetType === key;
              return (
                <button
                  key={key || 'any'}
                  type="button"
                  onClick={() => setPetFilter(key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                    padding: '12px 6px',
                    borderRadius: '12px',
                    border: active ? '1px solid var(--text-dark)' : '1px solid var(--border-subtle)',
                    background: active ? 'var(--text-dark)' : 'var(--surface-elevated)',
                    color: active ? '#FFFFFF' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  {label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '6px' }}>공용은 강아지·고양이 모두에게 맞는 상품만 보여줍니다.</p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>가격대</p>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {PRICE_BAND_LABELS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilters(f => ({ ...f, priceBand: id }))}
                style={{
                  flexShrink: 0,
                  padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                  border: filters.priceBand === id ? '1px solid var(--text-dark)' : '1px solid var(--border-subtle)',
                  backgroundColor: filters.priceBand === id ? 'var(--text-dark)' : 'var(--surface-elevated)',
                  color: filters.priceBand === id ? '#FFFFFF' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <span style={{ width: 1, background: 'var(--hairline)', margin: '4px 2px', alignSelf: 'stretch' }} />

        <button
          onClick={resetFilters}
          style={{ flexShrink: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', background: 'none', border: 'none', padding: '8px 6px' }}
        >
          <X size={14} />초기화
        </button>
      </div>

      {/* Dictionary entry buttons */}
      <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8 }}>
        <button
          onClick={() => navigate('/dictionary')}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
            color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '11px 14px', borderRadius: '14px', border: '1px solid var(--brand-line)', cursor: 'pointer', justifyContent: 'center'
          }}
        >
          <BookOpen size={14} /> 성분사전
        </button>
        <button
          onClick={() => setIsStandardFeedModalOpen(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700,
            color: 'var(--safe)', background: 'var(--safe-tint)', padding: '11px 14px', borderRadius: '14px', border: '1px solid var(--hairline)', cursor: 'pointer', justifyContent: 'center'
          }}
        >
          <Database size={14} /> 표준사료 사전
        </button>
      </div>

      {/* Category scroll tabs */}
      <div className="rail" style={{ display: 'flex', gap: 18, overflowX: 'auto', padding: '16px 20px 0',
        borderBottom: '1px solid var(--hairline)', marginTop: 14, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {['전체', ...SEARCH_MAIN_CATEGORIES.map(c => c.name)].map((c) => {
          const on = (c === '전체' && !category) || (category === c);
          return (
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
              style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                border: filters.dietPreset ? '1px solid var(--text-dark)' : '1px solid var(--border-subtle)',
                backgroundColor: filters.dietPreset ? 'var(--text-dark)' : 'var(--surface-elevated)',
                color: filters.dietPreset ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              다이어트·체중
            </button>
            <button
              type="button"
              onClick={() =>
                setFilters(f => ({
                  ...f,
                  targetLifeStage: f.targetLifeStage === '시니어' ? '' : '시니어',
                }))
              }
              style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                border: filters.targetLifeStage === '시니어' ? '1px solid var(--text-dark)' : '1px solid var(--border-subtle)',
                backgroundColor: filters.targetLifeStage === '시니어' ? 'var(--text-dark)' : 'var(--surface-elevated)',
                color: filters.targetLifeStage === '시니어' ? '#fff' : 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              노령(시니어)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)' }}>정렬</span>
          {([
            { id: 'default' as const, label: '추천순' },
            { id: 'price_asc' as const, label: '가격 낮은순' },
            { id: 'price_desc' as const, label: '가격 높은순' },
            { id: 'rating' as const, label: '평점순' },
          ]).map(({ id, label }) => (
            <TossChip key={id} label={label} active={sortBy === id} onClick={() => setSortBy(id)} />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#B0B8C1' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <p style={{ fontWeight: 700, fontSize: 16, color: '#4E5968', marginBottom: 6 }}>검색 결과가 없어요</p>
          <p style={{ fontSize: 13, marginBottom: 18 }}>다른 검색어나 필터를 시도해 보세요</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              key={id}
              onClick={() => setSortBy(id)}
              style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                fontSize: 12.5, fontWeight: sortBy === id ? 700 : 500, color: sortBy === id ? 'var(--brand-deep)' : 'var(--ink-faint)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Result list container */}
      <div style={{ padding: '4px 20px 0' }}>
        {hasPetProfile && sortBy === 'default' && displayResults.length > 0 && (
          <div style={{ margin: '10px 0 16px', padding: '11px 14px', borderRadius: '14px', background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1, flexShrink: 0 }}>
              {profile.species === 'Cat' ? '🐱' : '🐾'}
            </span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                {profile.name} 맞춤 순으로 정렬됐어요
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--brand-deep)', fontWeight: 600, marginTop: '2px' }}>
                알레르기·건강고민·성분 안전 점수 반영
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(product => {
            const isFav = favoriteSet.has(product.id);
            const brandLabel = displayBrand(product.brand, product.name);
            const tags = (product.healthConcerns || []).slice(0, 2);

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pagedResults.map(({ product, breakdown, score }) => (
            <div key={product.id}>
              <ProductCard product={product} />
              {hasPetProfile && breakdown && breakdown.allergyHits?.length > 0 && (
                <div style={{ marginTop: '-8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', background: '#FFF1F2', padding: '3px 9px', borderRadius: '6px', border: '1px solid #FECDD3' }}>
                    ⚠ {breakdown.allergyHits.join(', ')} 포함 — 안전 점수 상한 적용
                  </span>
                </div>
              )}
              {hasPetProfile && breakdown && !breakdown.allergyHits?.length && breakdown.matchedConcerns?.length > 0 && (
                <div style={{ marginTop: '-8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '3px 9px', borderRadius: '6px' }}>
                    ✓ {breakdown.matchedConcerns.join(', ')} 고민 연관
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {brandLabel && <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 2 }}>{brandLabel}</div>}
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
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                      {tags.map(t => (
                        <span key={t} style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '2px 7px', borderRadius: 6 }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFilterOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <div className="animate-slide-in-right" style={{ width: '85%', maxWidth: '400px', backgroundColor: '#fff', height: '100%', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>상세 필터</h2>
              <button type="button" onClick={() => setIsFilterOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <TossFilterSection title="반려동물">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <FilterChip label="전체" selected={filters.targetPetType === ''} onClick={() => setFilters({ ...filters, targetPetType: '' })} />
                <FilterChip label="강아지" selected={filters.targetPetType === 'dog'} onClick={() => setFilters({ ...filters, targetPetType: 'dog' })} />
                <FilterChip label="고양이" selected={filters.targetPetType === 'cat'} onClick={() => setFilters({ ...filters, targetPetType: 'cat' })} />
                <FilterChip label="공용 제품만" selected={filters.targetPetType === 'all'} onClick={() => setFilters({ ...filters, targetPetType: 'all' })} />
              </div>
            </TossFilterSection>

            <TossFilterSection title="가격대">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {PRICE_BAND_LABELS.map(({ id, label }) => (
                  <FilterChip
                    key={id}
                    label={label}
                    selected={filters.priceBand === id}
                    onClick={() => setFilters({ ...filters, priceBand: id })}
                  />
                ))}
              </div>
            </TossFilterSection>

            <TossFilterSection title="생애 단계">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {LIFE_STAGE_OPTIONS.map(({ value, label }) => (
                  <FilterChip
                    key={value}
                    label={label}
                    selected={filters.targetLifeStage === value}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        targetLifeStage: filters.targetLifeStage === value ? '' : value,
                      })
                    }
                  />
                ))}
              </div>
            </TossFilterSection>

            <TossFilterSection title="특화 · 다이어트">
              <button
                type="button"
                onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px',
                  border: filters.dietPreset ? '2px solid var(--brand)' : '1px solid var(--hairline)',
                  background: filters.dietPreset ? 'rgba(250, 204, 21, 0.16)' : '#fff', cursor: 'pointer', fontWeight: 700, color: '#374151',
                }}
              >
                {filters.dietPreset ? '✓ ' : ''}다이어트·저칼로리·체중 관련 상품 우선 (태그 일치)
              </button>
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.5 }}>
                상품에 등록된 건강 태그(비만, 다이어트, 체중 등) 중 하나라도 있으면 표시됩니다. DB에 태그가 없으면 결과가 비어 있을 수 있습니다.
              </p>
            </TossFilterSection>

            <TossFilterSection title="급여 형태">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {FORMULATION_OPTIONS.map(form => (
                  <FilterChip
                    key={form}
                    label={form}
                    selected={filters.formulation === form}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        formulation: filters.formulation === form ? '' : form,
                      })
                    }
                  />
                ))}
              </div>
            </TossFilterSection>

            <TossFilterSection title="건강 고민 (복수 선택 · OR)">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {HEALTH_CONCERN_OPTIONS.map(concern => (
                  <FilterChip
                    key={concern}
                    label={concern}
                    selected={filters.healthConcerns.includes(concern)}
                    onClick={() => toggleHealthConcern(concern)}
                  />
                ))}
              </div>
            </TossFilterSection>

            <TossFilterSection title="성분 제외 필터">
              {excludedIngredients.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {excludedIngredients.map(name => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#FEF2F2', borderRadius: '20px', border: '1px solid #FECACA' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>{name}</span>
                      <button type="button" onClick={() => setExcludedIngredients(prev => prev.filter(i => i !== name))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#EF4444', display: 'flex' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <FlaskConical size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8B95A1' }} />
                <input
                  type="text"
                  placeholder="제외할 성분 검색..."
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid #E5E8EB', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {ingredientSearch && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid #E5E8EB', borderRadius: '12px', background: '#fff' }}>
                  {filteredIngList.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#8B95A1', textAlign: 'center' }}>{INGREDIENT_DICT.notFound}</div>
                  ) : filteredIngList.map(ing => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', borderBottom: '1px solid #F2F4F6' }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ing.risk_level === 'danger' ? '#F04452' : ing.risk_level === 'caution' ? '#F59E0B' : '#10B981', flexShrink: 0 }} />
                      {ing.name_ko}
                      <Plus size={14} style={{ marginLeft: 'auto', color: '#8B95A1' }} />
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#8B95A1', marginTop: '6px' }}>선택한 성분이 포함된 제품은 검색에서 제외됩니다.</p>
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
                <p style={{ fontSize: '12px', color: '#6B7684', marginTop: '2px' }}>공식 표준 성분 데이터를 확인해보세요 (총 {standardFeedData.length}개)</p>
              </div>
              <button onClick={() => setIsStandardFeedModalOpen(false)} style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <SearchIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8B95A1' }} />
              <input 
                type="text" 
                placeholder="어떤 성분이 궁금하신가요? (예: 귀리)" 
                value={standardFeedSearch}
                onChange={(e) => setStandardFeedSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '12px', border: '1px solid #E5E8EB', outline: 'none', fontSize: '14px', backgroundColor: '#F9FAFB' }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #E5E8EB', borderRadius: '12px' }}>
              {filteredStandardFeed.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#8B95A1', fontSize: '14px' }}>{SEARCH_NO_RESULTS.title}</div>
              ) : (
                filteredStandardFeed.map((item: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '16px', borderBottom: '1px solid #E5E8EB',
                      display: 'flex', flexDirection: 'column', gap: '8px'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: '#1F2937', fontSize: '15px' }}>{item.name_ko}</div>
                      <div style={{ fontSize: '12px', color: '#6B7684' }}>{item.name_en || '-'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                      <div style={{ background: '#F2F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7684', fontWeight: 600 }}>조단백질</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.protein}%</div>
                      </div>
                      <div style={{ background: '#F2F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7684', fontWeight: 600 }}>조지방</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.fat}%</div>
                      </div>
                      <div style={{ background: '#F2F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7684', fontWeight: 600 }}>수분</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.moisture}%</div>
                      </div>
                      <div style={{ background: '#F2F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7684', fontWeight: 600 }}>조섬유</div>
                        <div style={{ fontSize: '13px', color: '#111827', fontWeight: 800 }}>{item.fiber}%</div>
                      </div>
                      <div style={{ background: '#F2F4F6', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7684', fontWeight: 600 }}>조회분</div>
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

function FilterChip({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: '999px', fontSize: '13px', border: '1px solid',
        borderColor: selected ? 'var(--text-dark)' : 'var(--border-subtle)',
        backgroundColor: selected ? 'var(--text-dark)' : 'transparent',
        color: selected ? '#fff' : 'var(--text-muted)', fontWeight: 500, cursor: 'pointer', transition: 'background-color 0.2s, color 0.2s',
        display: 'flex', alignItems: 'center', gap: '4px'
      }}
    >
      {selected && <Check size={14} strokeWidth={2} />}
      {label}
    </button>
  );
}
