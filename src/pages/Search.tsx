import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon,
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
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { CORE_COPY } from '../copy/marketing';
import { rankProductsForProfile } from '../utils/score';
import { SEARCH_MAIN_CATEGORIES, resolveCategoryFromSearchParams } from '../constants/productCategories';
import {
  priceBandToMinMax,
  PRICE_BAND_LABELS,
  FORMULATION_OPTIONS,
  HEALTH_CONCERN_OPTIONS,
  LIFE_STAGE_OPTIONS,
  type PriceBand,
} from '../constants/searchFilters';

function defaultPetFromProfile(profile: { species?: string } | undefined): '' | 'dog' | 'cat' | 'all' {
  if (profile?.species === 'Cat') return 'cat';
  if (profile?.species === 'Dog') return 'dog';
  return '';
}

export default function Search() {
  const { profile } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [searchResults, setSearchResults] = useState<any[]>([]);
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

  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [allIngredients, setAllIngredients] = useState<{ id: string; name_ko: string; risk_level: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');

  const { priceMin, priceMax } = priceBandToMinMax(filters.priceBand);

  const filterButtonActive = useMemo(() => {
    const petChanged = filters.targetPetType !== defaultPetFromProfile(profile);
    return (
      excludedIngredients.length > 0 ||
      filters.dietPreset ||
      filters.healthConcerns.length > 0 ||
      !!filters.targetLifeStage ||
      !!filters.formulation ||
      !!filters.subCategory ||
      filters.priceBand !== 'any' ||
      sortBy !== 'default' ||
      filters.targetPetType === 'all' ||
      petChanged
    );
  }, [filters, excludedIngredients.length, sortBy, profile]);

  useEffect(() => {
    getAllIngredients().then(setAllIngredients);
  }, []);

  const filteredIngList = allIngredients.filter(i =>
    i.name_ko.includes(ingredientSearch) && !excludedIngredients.includes(i.name_ko)
  ).slice(0, 20);

  const activeFilterChips = useMemo(() => {
    const chips: string[] = [];
    if (category !== '전체') chips.push(category);
    if (filters.targetPetType === 'dog') chips.push('강아지');
    if (filters.targetPetType === 'cat') chips.push('고양이');
    if (filters.targetPetType === 'all') chips.push('공용');
    if (filters.targetLifeStage) chips.push(filters.targetLifeStage);
    if (filters.formulation) chips.push(filters.formulation);
    if (filters.dietPreset) chips.push('다이어트·체중');
    chips.push(...filters.healthConcerns);
    chips.push(...excludedIngredients.map((name) => `제외:${name}`));
    if (filters.priceBand !== 'any') {
      const label = PRICE_BAND_LABELS.find((item) => item.id === filters.priceBand)?.label;
      if (label) chips.push(label);
    }
    return chips;
  }, [category, excludedIngredients, filters]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const pet = filters.targetPetType;
        const results = await searchProducts(query, category, excludedIngredients, {
          targetPetType: pet === '' ? undefined : pet,
          targetLifeStage: filters.targetLifeStage || undefined,
          formulation: filters.formulation || undefined,
          subCategory: filters.subCategory || undefined,
          healthConcerns: filters.healthConcerns,
          dietPreset: filters.dietPreset,
          priceMin,
          priceMax,
        });
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, category, filters, excludedIngredients, priceMin, priceMax]);

  const displayResults = useMemo(() => {
    if (sortBy === 'default') {
      return rankProductsForProfile(searchResults, profile).map(({ product, breakdown, score }) => ({
        product,
        breakdown,
        score,
      }));
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
  }, [searchResults, sortBy, profile]);

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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
          <div>
            <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
              <Sparkles size={14} />
              취향 기반 탐색
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>조건을 조합해 정확하게 좁혀보세요</h2>
            <p style={{ fontSize: '13px', lineHeight: 1.55, color: '#66707C' }}>{CORE_COPY.ocr}</p>
          </div>
        </div>

        <div style={{ 
          display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '20px', padding: '14px 16px', marginBottom: '14px',
          border: '1px solid rgba(232, 90, 60, 0.12)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <SearchIcon size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="상품명, 브랜드, 성분명으로 검색" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              width: '100%', marginLeft: '12px', fontSize: '16px', color: '#1F2937'
            }}
          />
          {query && <X size={18} className="text-gray-400 cursor-pointer" onClick={() => setQuery('')} />}
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
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    padding: '10px 6px', borderRadius: '14px', border: active ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.08)',
                    background: active ? 'rgba(255, 107, 74, 0.12)' : 'var(--surface-elevated)',
                    color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
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
                  padding: '8px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                  border: filters.priceBand === id ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: filters.priceBand === id ? 'var(--primary)' : '#fff',
                  color: filters.priceBand === id ? '#fff' : '#4B5563',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>빠른 목적</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
              style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                border: filters.dietPreset ? 'none' : '1px solid #E5E7EB',
                backgroundColor: filters.dietPreset ? 'var(--primary)' : '#fff',
                color: filters.dietPreset ? '#fff' : '#4B5563', cursor: 'pointer',
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
                padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                border: filters.targetLifeStage === '시니어' ? 'none' : '1px solid #E5E7EB',
                backgroundColor: filters.targetLifeStage === '시니어' ? 'var(--primary)' : '#fff',
                color: filters.targetLifeStage === '시니어' ? '#fff' : '#4B5563', cursor: 'pointer',
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
            <button
              key={id}
              type="button"
              onClick={() => setSortBy(id)}
              style={{
                padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                border: sortBy === id ? 'none' : '1px solid #E5E7EB',
                backgroundColor: sortBy === id ? 'rgba(0,0,0,0.08)' : 'transparent',
                color: '#374151', cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: '14px',
              border: filterButtonActive ? '1px solid rgba(255, 107, 74, 0.35)' : '1px solid #E5E7EB',
              background: filterButtonActive ? 'rgba(255, 107, 74, 0.12)' : '#fff',
              color: filterButtonActive ? 'var(--primary-dark)' : '#4B5563',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={16} />
            상세 필터
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="ui-text-button"
            style={{ padding: 0 }}
          >
            <Trash2 size={14} />
            초기화
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {SEARCH_MAIN_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              type="button"
              onClick={() => {
                setCategory(cat.name);
                setFilters(f => ({ ...f, subCategory: '' }));
              }}
              style={{
                padding: '10px 18px', borderRadius: '24px', fontSize: '14px', whiteSpace: 'nowrap',
                border: category === cat.name ? 'none' : '1px solid #E5E7EB',
                backgroundColor: category === cat.name ? 'var(--primary)' : '#fff',
                color: category === cat.name ? '#fff' : '#4B5563',
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {activeFilterChips.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {activeFilterChips.map((chip) => (
            <span key={chip} className="ui-badge ui-badge-muted">{chip}</span>
          ))}
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <div className="ui-list-card" style={{ marginBottom: '16px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
            총 <strong style={{ color: '#111827' }}>{displayResults.length}</strong>개의 상품
            {isLoading && <span style={{ marginLeft: '8px', fontSize: '12px' }}>불러오는 중…</span>}
            </span>
            <span className="ui-badge ui-badge-soft">
              <Filter size={12} />
              {sortBy === 'default' ? '프로필 추천순' : filterButtonActive ? '필터 적용 중' : '정렬 적용 중'}
            </span>
          </div>
        </div>

        {sortBy === 'default' && displayResults.length > 0 && (
          <div className="ui-info-card" style={{ marginBottom: '16px', padding: '16px 18px' }}>
            <div className="ui-section-kicker">recommendation logic</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '6px' }}>
              {profile.name} 프로필 기반 추천순
            </div>
            <div style={{ fontSize: '13px', color: '#66707C', lineHeight: 1.6 }}>
              알레르기 회피, 건강 고민 매칭, 리뷰 신뢰도, 가격 적정성, 종/연령 적합도를 함께 반영해 정렬합니다.
            </div>
          </div>
        )}

        <div className="ui-grid-2">
          {displayResults.map(({ product, breakdown, score }) => (
            <div key={product.id}>
              <ProductCard product={product} />
              {breakdown && score != null && (
                <div style={{ marginTop: '8px', padding: '0 4px', fontSize: '12px', color: '#66707C', lineHeight: 1.55 }}>
                  <strong style={{ color: '#111827' }}>{score}점 추천</strong>
                  {' · '}
                  {breakdown.reasons.slice(0, 2).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {displayResults.length === 0 && !isLoading && (
          <div className="ui-info-card" style={{ textAlign: 'center', padding: '56px 18px', color: '#9CA3AF' }}>
            검색 결과가 없습니다.<br />
            검색어를 바꾸거나 상세 필터를 넓혀 보세요.
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

            <Section title="반려동물">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <FilterChip label="전체" selected={filters.targetPetType === ''} onClick={() => setFilters({ ...filters, targetPetType: '' })} />
                <FilterChip label="강아지" selected={filters.targetPetType === 'dog'} onClick={() => setFilters({ ...filters, targetPetType: 'dog' })} />
                <FilterChip label="고양이" selected={filters.targetPetType === 'cat'} onClick={() => setFilters({ ...filters, targetPetType: 'cat' })} />
                <FilterChip label="공용 제품만" selected={filters.targetPetType === 'all'} onClick={() => setFilters({ ...filters, targetPetType: 'all' })} />
              </div>
            </Section>

            <Section title="가격대">
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
            </Section>

            <Section title="생애 단계">
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
            </Section>

            <Section title="특화 · 다이어트">
              <button
                type="button"
                onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px',
                  border: filters.dietPreset ? '2px solid var(--primary)' : '1px solid #E5E7EB',
                  background: filters.dietPreset ? 'rgba(255, 107, 74, 0.08)' : '#fff', cursor: 'pointer', fontWeight: 700, color: '#374151',
                }}
              >
                {filters.dietPreset ? '✓ ' : ''}다이어트·저칼로리·체중 관련 상품 우선 (태그 일치)
              </button>
              <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px', lineHeight: 1.5 }}>
                상품에 등록된 건강 태그(비만, 다이어트, 체중 등) 중 하나라도 있으면 표시됩니다. DB에 태그가 없으면 결과가 비어 있을 수 있습니다.
              </p>
            </Section>

            <Section title="급여 형태">
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
            </Section>

            <Section title="건강 고민 (복수 선택 · OR)">
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
            </Section>

            <Section title="성분 제외 필터">
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
            </Section>

            <div style={{ position: 'sticky', bottom: 0, paddingTop: '40px', paddingBottom: '24px', backgroundColor: '#fff', display: 'flex', gap: '12px' }}>
              <button type="button" onClick={resetFilters} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '1px solid #E5E7EB', backgroundColor: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Trash2 size={18} /> 초기화</button>
              <button type="button" onClick={() => setIsFilterOpen(false)} style={{ flex: 2, padding: '18px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}>결과 보기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: '#1F2937' }}>{title}</h3>
      {children}
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 20px', borderRadius: '24px', fontSize: '14px', border: '1px solid',
        borderColor: selected ? 'var(--primary)' : '#E5E7EB',
        backgroundColor: selected ? 'var(--primary)' : 'transparent',
        color: selected ? '#fff' : '#4B5563', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '4px'
      }}
    >
      {selected && <Check size={16} />}
      {label}
    </button>
  );
}
