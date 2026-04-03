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
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';
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

  const filterCount = useMemo(() => {
    let count = 0;
    const petChanged = filters.targetPetType !== defaultPetFromProfile(profile);
    if (petChanged || filters.targetPetType === 'all') count++;
    if (excludedIngredients.length > 0) count++;
    if (filters.dietPreset) count++;
    if (filters.healthConcerns.length > 0) count += filters.healthConcerns.length;
    if (filters.targetLifeStage) count++;
    if (filters.formulation) count++;
    if (filters.priceBand !== 'any') count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [filters, excludedIngredients.length, sortBy, profile]);

  useEffect(() => {
    getAllIngredients().then(setAllIngredients);
  }, []);

  const filteredIngList = allIngredients.filter(i =>
    i.name_ko.includes(ingredientSearch) && !excludedIngredients.includes(i.name_ko)
  ).slice(0, 20);

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
    const arr = [...searchResults];
    if (sortBy === 'price_asc') arr.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc') arr.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating') arr.sort((a, b) => b.averageRating - a.averageRating);
    return arr;
  }, [searchResults, sortBy]);

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
      {/* Sticky search bar + filters */}
      <div style={{
        position: 'sticky', top: 0,
        backgroundColor: 'rgba(255, 251, 248, 0.96)',
        zIndex: 10, padding: '12px 0 8px',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '16px', padding: '0 16px',
          marginBottom: '12px',
          border: '1.5px solid rgba(232, 90, 60, 0.12)',
          boxShadow: '0 2px 12px rgba(43, 38, 36, 0.06)',
          height: '48px',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        }}>
          <SearchIcon size={18} color="var(--text-light)" />
          <input
            type="text"
            placeholder="상품명, 브랜드, 성분을 입력하세요"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              width: '100%', marginLeft: '10px', fontSize: '15px',
              color: 'var(--text-dark)', fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', width: '22px', height: '22px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-label="검색어 지우기"
            >
              <X size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            style={{
              marginLeft: '8px', background: filterCount > 0 ? 'rgba(255, 107, 74, 0.1)' : 'none',
              border: filterCount > 0 ? '1px solid rgba(232, 90, 60, 0.2)' : 'none',
              cursor: 'pointer',
              color: filterCount > 0 ? 'var(--primary)' : 'var(--text-light)',
              width: '32px', height: '32px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', flexShrink: 0,
              transition: 'all var(--transition-fast)',
            }}
            aria-label="필터 열기"
          >
            <SlidersHorizontal size={17} />
            {filterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: 'var(--primary)', color: '#fff',
                fontSize: '9px', fontWeight: 800,
                width: '16px', height: '16px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {filterCount}
              </span>
            )}
          </button>
        </div>

        {/* 반려동물 필터 */}
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '7px' }}>
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
                    padding: '9px 4px', borderRadius: '12px',
                    border: active ? '2px solid var(--primary)' : '1.5px solid rgba(0,0,0,0.07)',
                    background: active
                      ? 'linear-gradient(145deg, rgba(255,107,74,0.12), rgba(232,90,60,0.06))'
                      : 'var(--surface-elevated)',
                    color: active ? 'var(--primary-dark)' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: '11px', cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    boxShadow: active ? '0 2px 8px rgba(255,107,74,0.18)' : 'none',
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 가격대 */}
        <div className="no-scrollbar" style={{
          display: 'flex', gap: '7px', overflowX: 'auto',
          paddingBottom: '4px', marginBottom: '8px',
        }}>
          {PRICE_BAND_LABELS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilters(f => ({ ...f, priceBand: id }))}
              style={{
                flexShrink: 0, padding: '7px 13px', borderRadius: '999px',
                fontSize: '12px', fontWeight: 700,
                border: filters.priceBand === id ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
                backgroundColor: filters.priceBand === id ? 'var(--primary)' : 'var(--surface-elevated)',
                color: filters.priceBand === id ? '#fff' : '#6B7280',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: filters.priceBand === id ? '0 2px 8px rgba(255,107,74,0.25)' : 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 정렬 + 빠른 목적 */}
        <div className="no-scrollbar" style={{
          display: 'flex', gap: '7px', overflowX: 'auto',
          paddingBottom: '4px', marginBottom: '8px', alignItems: 'center',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', flexShrink: 0 }}>정렬</span>
          {([
            { id: 'default' as const, label: '추천순' },
            { id: 'price_asc' as const, label: '가격↑' },
            { id: 'price_desc' as const, label: '가격↓' },
            { id: 'rating' as const, label: '평점순' },
          ]).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSortBy(id)}
              style={{
                flexShrink: 0, padding: '6px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                border: sortBy === id ? '1px solid rgba(0,0,0,0.1)' : '1px solid transparent',
                backgroundColor: sortBy === id ? 'rgba(0,0,0,0.07)' : 'transparent',
                color: sortBy === id ? '#374151' : '#6B7280', cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              {label}
            </button>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', flexShrink: 0 }} />
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
            style={{
              flexShrink: 0, padding: '6px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
              border: 'none',
              backgroundColor: filters.dietPreset ? 'rgba(255, 107, 74, 0.1)' : 'transparent',
              color: filters.dietPreset ? 'var(--primary)' : '#6B7280', cursor: 'pointer',
            }}
          >
            다이어트
          </button>
          <button
            type="button"
            onClick={() => setFilters(f => ({ ...f, targetLifeStage: f.targetLifeStage === '시니어' ? '' : '시니어' }))}
            style={{
              flexShrink: 0, padding: '6px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
              border: 'none',
              backgroundColor: filters.targetLifeStage === '시니어' ? 'rgba(255, 107, 74, 0.1)' : 'transparent',
              color: filters.targetLifeStage === '시니어' ? 'var(--primary)' : '#6B7280', cursor: 'pointer',
            }}
          >
            시니어
          </button>
        </div>

        {/* 카테고리 칩 */}
        <div className="no-scrollbar" style={{
          display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px',
        }}>
          {SEARCH_MAIN_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              type="button"
              onClick={() => {
                setCategory(cat.name);
                setFilters(f => ({ ...f, subCategory: '' }));
              }}
              style={{
                padding: '9px 16px', borderRadius: '999px', fontSize: '13px', whiteSpace: 'nowrap',
                border: category === cat.name ? 'none' : '1.5px solid rgba(0,0,0,0.08)',
                backgroundColor: category === cat.name ? 'var(--primary)' : 'var(--surface-elevated)',
                color: category === cat.name ? '#fff' : '#4B5563',
                cursor: 'pointer', fontWeight: 600,
                transition: 'all var(--transition-fast)',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: category === cat.name ? '0 2px 8px rgba(255,107,74,0.25)' : 'var(--shadow-sm)',
              }}
            >
              <cat.icon size={15} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div style={{ marginTop: '12px' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: '14px',
        }}>
          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            총 <strong style={{ color: '#111827' }}>{displayResults.length}</strong>개의 상품
            {isLoading && (
              <span style={{
                marginLeft: '8px', fontSize: '12px', color: 'var(--primary)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                검색 중…
              </span>
            )}
          </span>
          {filterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600,
              }}
            >
              <X size={13} /> 필터 초기화
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card" style={{ padding: '12px', animationDelay: `${i * 0.05}s` }}>
                <div className="skeleton" style={{ width: '100%', height: '90px', borderRadius: '12px', marginBottom: '10px' }} />
                <div className="skeleton-text" style={{ width: '60%', marginBottom: '6px' }} />
                <div className="skeleton-text" style={{ width: '90%', marginBottom: '6px' }} />
                <div className="skeleton-text" style={{ width: '40%' }} />
              </div>
            ))}
          </div>
        ) : displayResults.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Filter size={28} color="#D1D5DB" />
            </div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
              검색 결과가 없어요
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-light)', lineHeight: 1.6 }}>
              필터를 조정하거나 다른 키워드로<br />검색해 보세요.
            </p>
            {filterCount > 0 && (
              <button
                onClick={resetFilters}
                style={{
                  marginTop: '16px', padding: '12px 24px',
                  background: 'var(--primary)', color: '#fff',
                  border: 'none', borderRadius: '12px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '14px',
                }}
              >
                필터 초기화
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {displayResults.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      {isFilterOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 100, display: 'flex', justifyContent: 'flex-end',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsFilterOpen(false); }}
        >
          <div
            className="animate-slide-up"
            style={{
              width: '88%', maxWidth: '400px',
              backgroundColor: '#fff', height: '100%',
              overflowY: 'auto', padding: '24px',
              borderRadius: '0',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '28px',
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>상세 필터</h2>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                style={{
                  background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <FilterSection title="반려동물">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <FilterChip label="전체" selected={filters.targetPetType === ''} onClick={() => setFilters({ ...filters, targetPetType: '' })} />
                <FilterChip label="강아지" selected={filters.targetPetType === 'dog'} onClick={() => setFilters({ ...filters, targetPetType: 'dog' })} />
                <FilterChip label="고양이" selected={filters.targetPetType === 'cat'} onClick={() => setFilters({ ...filters, targetPetType: 'cat' })} />
                <FilterChip label="공용 제품만" selected={filters.targetPetType === 'all'} onClick={() => setFilters({ ...filters, targetPetType: 'all' })} />
              </div>
            </FilterSection>

            <FilterSection title="가격대">
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
            </FilterSection>

            <FilterSection title="생애 단계">
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
            </FilterSection>

            <FilterSection title="급여 형태">
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
            </FilterSection>

            <FilterSection title="건강 고민">
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
            </FilterSection>

            <FilterSection title="특화 · 다이어트">
              <button
                type="button"
                onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
                style={{
                  width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px',
                  border: filters.dietPreset ? '2px solid var(--primary)' : '1.5px solid #E5E7EB',
                  background: filters.dietPreset ? 'rgba(255, 107, 74, 0.06)' : '#fff',
                  cursor: 'pointer', fontWeight: 700, color: '#374151', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {filters.dietPreset && <Check size={16} color="var(--primary)" />}
                다이어트·저칼로리·체중 관련 상품 우선
              </button>
            </FilterSection>

            <FilterSection title="성분 제외 필터">
              {excludedIngredients.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {excludedIngredients.map(name => (
                    <div key={name} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '6px 12px', background: '#FEF2F2',
                      borderRadius: '20px', border: '1px solid #FECACA',
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>{name}</span>
                      <button
                        type="button"
                        onClick={() => setExcludedIngredients(prev => prev.filter(i => i !== name))}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: 0, color: '#EF4444', display: 'flex',
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <FlaskConical size={15} style={{
                  position: 'absolute', left: '12px', top: '50%',
                  transform: 'translateY(-50%)', color: '#9CA3AF',
                }} />
                <input
                  type="text"
                  placeholder="제외할 성분 검색..."
                  value={ingredientSearch}
                  onChange={e => setIngredientSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '12px 12px 12px 36px',
                    borderRadius: '12px', border: '1.5px solid #E5E7EB',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              {ingredientSearch && (
                <div style={{
                  maxHeight: '160px', overflowY: 'auto',
                  border: '1px solid #E5E7EB', borderRadius: '12px', background: '#fff',
                }}>
                  {filteredIngList.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
                      검색 결과 없음
                    </div>
                  ) : filteredIngList.map(ing => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                      style={{
                        width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center',
                        gap: '8px', fontSize: '14px', borderBottom: '1px solid #F3F4F6',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: ing.risk_level === 'danger' ? '#EF4444' : ing.risk_level === 'caution' ? '#F59E0B' : '#10B981',
                        flexShrink: 0,
                      }} />
                      {ing.name_ko}
                      <Plus size={13} style={{ marginLeft: 'auto', color: '#9CA3AF' }} />
                    </button>
                  ))}
                </div>
              )}
            </FilterSection>

            <div style={{
              position: 'sticky', bottom: 0, paddingTop: '32px', paddingBottom: '24px',
              backgroundColor: '#fff', display: 'flex', gap: '10px',
            }}>
              <button
                type="button"
                onClick={resetFilters}
                style={{
                  flex: 1, padding: '16px', borderRadius: '14px',
                  border: '1.5px solid #E5E7EB', backgroundColor: '#fff',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  color: 'var(--text-muted)',
                }}
              >
                <Trash2 size={16} /> 초기화
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                style={{
                  flex: 2, padding: '16px', borderRadius: '14px',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
                  color: '#fff', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,107,74,0.3)',
                }}
              >
                적용하기
                {filterCount > 0 && (
                  <span style={{
                    marginLeft: '8px', background: 'rgba(255,255,255,0.25)',
                    padding: '2px 8px', borderRadius: '999px', fontSize: '12px',
                  }}>
                    {filterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <h3 style={{
        fontSize: '15px', fontWeight: 800, marginBottom: '14px',
        color: '#1F2937', letterSpacing: '-0.01em',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '9px 18px', borderRadius: '999px', fontSize: '13px',
        border: '1.5px solid',
        borderColor: selected ? 'var(--primary)' : '#E5E7EB',
        backgroundColor: selected ? 'var(--primary)' : 'transparent',
        color: selected ? '#fff' : '#4B5563', fontWeight: 600, cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        display: 'flex', alignItems: 'center', gap: '4px',
        boxShadow: selected ? '0 2px 8px rgba(255,107,74,0.2)' : 'none',
      }}
    >
      {selected && <Check size={14} />}
      {label}
    </button>
  );
}
