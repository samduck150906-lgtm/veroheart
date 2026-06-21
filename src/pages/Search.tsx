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
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { TossFilterSection, TossChip, TossButton } from '../components/TossUI';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { getRecommendationBreakdown } from '../utils/score';
import { useStore } from '../store/useStore';
import standardFeedData from '../data/standard_feed_data.json';
import { 
  SEARCH_MAIN_CATEGORIES, 
  resolveCategoryFromSearchParams 
} from '../constants/productCategories';
import { 
  PRICE_BAND_LABELS, 
  FORMULATION_OPTIONS, 
  HEALTH_CONCERN_OPTIONS, 
  LIFE_STAGE_OPTIONS, 
  priceBandToMinMax,
  type PriceBand
} from '../constants/searchFilters';

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
        border: '1.5px solid rgba(79, 70, 229, 0.15)',
        fontSize: '15px',
        fontWeight: 500,
        outline: 'none',
        background: '#F8FAFC',
        color: '#0F172A',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#4F46E5';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.15)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none', display: 'flex' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
    </span>
  </div>
);

function defaultPetFromProfile(profile: { species?: string } | undefined): '' | 'dog' | 'cat' | 'all' {
  if (profile?.species === 'Cat') return 'cat';
  if (profile?.species === 'Dog') return 'dog';
  return '';
}

export default function Search() {
  const { profile, isLoggedIn } = useStore();
  const hasPetProfile = isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const category = resolveCategoryFromSearchParams(searchParams.get('category'));

  const setCategory = (name: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (name === '전체') next.delete('category');
        else next.set('category', name);
        return next;
      },
      { replace: false }
    );
  };

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'rating'>('default');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    targetPetType: defaultPetFromProfile(profile) as '' | 'dog' | 'cat' | 'all',
    targetLifeStage: '',
    formulation: '',
    subCategory: '',
    healthConcerns: [] as string[],
    dietPreset: false,
    priceBand: 'any' as PriceBand,
  });

  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);

  // Synchronize URL search params (query, concern) with states
  useEffect(() => {
    const urlQuery = searchParams.get('query');
    if (urlQuery != null) {
      setQuery(urlQuery);
    }
    const urlConcern = searchParams.get('concern');
    if (urlConcern != null) {
      setFilters(prev => {
        if (prev.healthConcerns.includes(urlConcern)) return prev;
        return {
          ...prev,
          healthConcerns: [urlConcern]
        };
      });
    }
    const urlDiet = searchParams.get('diet');
    if (urlDiet === 'true') {
      setFilters(prev => ({ ...prev, dietPreset: true }));
    }
  }, [searchParams]);
  
  const [isStandardFeedModalOpen, setIsStandardFeedModalOpen] = useState(false);
  const [standardFeedSearch, setStandardFeedSearch] = useState('');
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Load all ingredients for auto-completion
  useEffect(() => {
    async function loadIngs() {
      try {
        const ings = await getAllIngredients();
        setAllIngredients(ings || []);
      } catch (err) {
        console.error('Failed to load ingredients', err);
      }
    }
    loadIngs();
  }, []);

  const filteredIngList = useMemo(() => {
    if (!ingredientSearch.trim()) return [];
    return allIngredients.filter(ing => 
      ing.name_ko.toLowerCase().includes(ingredientSearch.toLowerCase())
    );
  }, [ingredientSearch, allIngredients]);

  const filteredStandardFeed = standardFeedData.filter((item: any) => 
    item.name_ko.toLowerCase().includes(standardFeedSearch.toLowerCase()) ||
    item.name_en.toLowerCase().includes(standardFeedSearch.toLowerCase())
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const pet = filters.targetPetType;
        const { priceMin, priceMax } = priceBandToMinMax(filters.priceBand);
        
        const results = await searchProducts(query, category, excludedIngredients, {
          targetPetType: pet === '' ? undefined : pet,
          targetLifeStage: filters.targetLifeStage || undefined,
          formulation: filters.formulation || undefined,
          subCategory: filters.subCategory || undefined,
          healthConcerns: filters.healthConcerns,
          dietPreset: filters.dietPreset,
          priceMin: priceMin ?? 0,
          priceMax: priceMax ?? 999999,
        });
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, category, filters, excludedIngredients]);

  const displayResults = useMemo(() => {
    if (sortBy === 'default') {
      if (hasPetProfile) {
        return [...searchResults]
          .map((product) => {
            const breakdown = getRecommendationBreakdown(product, profile);
            return { product, breakdown, score: breakdown.total };
          })
          .sort((a, b) => b.score - a.score);
      } else {
        // default sorting for non-profile users: sort by reviewsCount and averageRating
        return [...searchResults]
          .map((product) => ({ product, breakdown: null, score: null }))
          .sort((a, b) => {
            if ((b.product.reviewsCount ?? 0) !== (a.product.reviewsCount ?? 0)) {
              return (b.product.reviewsCount ?? 0) - (a.product.reviewsCount ?? 0);
            }
            return (b.product.averageRating ?? 0) - (a.product.averageRating ?? 0);
          });
      }
    }

    const arr = [...searchResults];
    if (sortBy === 'price_asc') arr.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') arr.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') arr.sort((a, b) => b.averageRating - a.averageRating);
    return arr.map((product) => ({
      product,
      breakdown: null,
      score: null,
    }));
  }, [searchResults, sortBy, profile, hasPetProfile]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchResults, sortBy]);

  const toggleHealthConcern = (concern: string) => {
    setFilters(prev => ({
      ...prev,
      healthConcerns: prev.healthConcerns.includes(concern)
        ? prev.healthConcerns.filter(c => c !== concern)
        : [...prev.healthConcerns, concern]
    }));
  };

  const resetFilters = () => {
    setFilters({
      targetPetType: defaultPetFromProfile(profile),
      targetLifeStage: '',
      formulation: '',
      subCategory: '',
      healthConcerns: [],
      dietPreset: false,
      priceBand: 'any',
    });
    setExcludedIngredients([]);
    setSortBy('default');
  };

  const setPetFilter = (p: '' | 'dog' | 'cat' | 'all') => {
    setFilters(f => ({ ...f, targetPetType: p }));
  };

  const filterButtonActive = 
    filters.targetPetType !== defaultPetFromProfile(profile) ||
    filters.targetLifeStage !== '' ||
    filters.formulation !== '' ||
    filters.healthConcerns.length > 0 ||
    filters.dietPreset ||
    filters.priceBand !== 'any' ||
    excludedIngredients.length > 0;

  const pagedResults = displayResults.slice(0, visibleCount);
  const hasMore = visibleCount < displayResults.length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <Helmet>
        <title>상품 검색 | 베로로</title>
        <meta name="description" content="반려동물 맞춤 사료·간식을 성분, 가격, 건강 고민으로 검색하고 비교해 보세요." />
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
          <span style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>사람이 검수한 데이터를 우선 노출해요</span>
        </div>
      </div>

      {/* Species filter row */}
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 0' }}>
        {([
          { key: '' as const, label: '전체' },
          { key: 'dog' as const, label: '강아지' },
          { key: 'cat' as const, label: '고양이' },
          { key: 'all' as const, label: '공용' },
        ]).map(({ key, label }) => (
          <FilterChip
            key={key}
            label={label}
            selected={filters.targetPetType === key}
            onClick={() => setPetFilter(key)}
            style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
          />
        ))}
      </div>

      {/* Price band chips scroll */}
      <div className="rail" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 20px 0', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {PRICE_BAND_LABELS.map(({ id, label }) => (
          <FilterChip
            key={id}
            label={label}
            selected={filters.priceBand === id}
            onClick={() => setFilters(f => ({ ...f, priceBand: id }))}
          />
        ))}
      </div>

      {/* Diet preset, life stage & reset buttons scroll */}
      <div className="rail" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 20px 0', alignItems: 'center', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <FilterChip
          label="다이어트·체중"
          selected={filters.dietPreset}
          onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
        />
        <FilterChip
          label="시니어"
          selected={filters.targetLifeStage === '시니어'}
          onClick={() => setFilters(f => ({ ...f, targetLifeStage: f.targetLifeStage === '시니어' ? '' : '시니어' }))}
        />
        
        {/* Action Button: Detail Filter */}
        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          style={{
            flexShrink: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 13.5, fontWeight: 700, padding: '8px 14px', borderRadius: 999,
            color: filterButtonActive ? 'var(--brand-deep)' : 'var(--ink-soft)',
            background: filterButtonActive ? 'var(--brand-tint)' : 'var(--surface)',
            border: `1px solid ${filterButtonActive ? 'var(--brand-line)' : 'var(--hairline)'}`,
            transition: 'all .15s ease'
          }}
        >
          <SlidersHorizontal size={14} />상세 필터
        </button>

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
              key={c}
              onClick={() => {
                setCategory(c);
                setFilters(f => ({ ...f, subCategory: '' }));
              }}
              style={{ flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none',
                padding: '0 0 10px', position: 'relative', fontSize: 14, fontWeight: on ? 700 : 500,
                color: on ? 'var(--ink)' : 'var(--ink-faint)' }}
            >
              {c}
              {on && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: 'var(--ink)' }} />}
            </button>
          );
        })}
      </div>

      {/* Result Count and Sort choices */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          총 <b style={{ color: 'var(--ink)' }}>{displayResults.length}</b>개
          {isLoading && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--ink-faint)' }}>불러오는 중…</span>}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {([
            { id: 'default' as const, label: hasPetProfile ? '맞춤 추천순' : '추천순' },
            { id: 'price_asc' as const, label: '가격 낮은순' },
            { id: 'price_desc' as const, label: '가격 높은순' },
            { id: 'rating' as const, label: '평점순' },
          ]).map(({ id, label }) => (
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
          <div style={{ margin: '10px 0 16px', padding: '12px 14px', borderRadius: '18px', background: 'var(--brand-tint)', border: '1px solid var(--brand-line)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-deep)', letterSpacing: 0.2 }}>Pet Nutrition Curation</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginTop: 1 }}>
              {profile.name} 맞춤 최적 순서
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', lineHeight: 1.4, marginTop: 4 }}>
              제조사 성분 실측치와 알레르기 유발 유무, 질병 고민 해결 적합도 및 수의 분석 점수를 매칭해 추천합니다.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {pagedResults.map(({ product, breakdown, score }) => (
            <div key={product.id}>
              <ProductCard product={product} />
              {hasPetProfile && breakdown && score != null && breakdown.reasons && breakdown.reasons.length > 0 && (
                <div style={{ marginTop: '-10px', marginBottom: '14px', padding: '0 4px', fontSize: '11.5px', color: 'var(--brand-deep)', fontWeight: 600 }}>
                  궁합 상세: {breakdown.reasons.slice(0, 2).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            style={{
              display: 'block', width: '100%', marginTop: '20px',
              padding: '14px', borderRadius: '14px',
              border: '1px solid var(--hairline)',
              background: 'var(--surface)', color: 'var(--ink-soft)',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            }}
          >
            더 보기 ({visibleCount} / {displayResults.length}개)
          </button>
        )}

        {displayResults.length === 0 && !isLoading && (
          <div style={{ padding: '54px 28px', textAlign: 'center' }}>
            <SearchIcon size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>조건에 맞는 제품이 없어요</div>
          </div>
        )}
      </div>

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
                  border: filters.dietPreset ? '2px solid var(--primary)' : '1px solid #E5E7EB',
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
                    <div style={{ padding: '12px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>검색 결과 없음</div>
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
              <button type="button" onClick={() => setIsFilterOpen(false)} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>결과 보기</button>
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
                <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>검색 결과가 없습니다.</div>
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
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, selected, onClick, style }: { label: string, selected: boolean, onClick: () => void, style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontSize: 13.5,
        fontWeight: selected ? 700 : 500,
        padding: '8px 14px',
        borderRadius: 999,
        color: selected ? 'var(--ink-on-brand)' : 'var(--ink-soft)',
        background: selected ? 'var(--ink)' : 'var(--surface)',
        border: `1px solid ${selected ? 'var(--ink)' : 'var(--hairline)'}`,
        transition: 'all .15s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        ...style,
      }}
    >
      {selected && <Check size={14} />}
      {label}
    </button>
  );
}
