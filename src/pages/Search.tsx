import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  X,
  Trash2,
  Plus,
  FlaskConical,
  Package,
  SlidersHorizontal,
  Search as SearchIcon,
  Clock,
  Database,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import StateView from '../components/StateView';
import BottomSheet from '../components/BottomSheet';
import { ProductGridSkeleton } from '../components/Skeleton';
import type { Product } from '../types';
import { TossFilterSection, TossSearchBar } from '../components/TossUI';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';
import standardFeedData from '../data/standard_feed_data.json';
import { rankProductsForProfile } from '../utils/score';
import FilterChip from '../components/ui/FilterChip';
import { COMPANY } from '../constants/companyInfo';
import { buildSearchSuggestions, deriveBrandOptions, type Suggestion } from '../utils/searchSuggestions';

interface StandardFeedItem {
  id: number;
  name_ko: string;
  name_en: string;
  moisture: number;
  protein: number;
  fat: number;
  ash: number;
  fiber: number;
}

function resolveCategoryFromSearchParams(category: string | null): string {
  return category ?? '전체';
}

/** 추천 키워드(증상·목적) chip — 성분·목적 기반 탐색 보조(인기·순위 아님) */
const SYMPTOM_KEYWORDS = ['눈물', '알러지', '다이어트', '관절', '피부', '노령견', '치석', '소화'];

const RECENT_KEY = 'vh_recent_searches';
const RECENT_MAX = 8;

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((v) => typeof v === 'string').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* localStorage 미지원/차단 시 무시 */
  }
}

const LIFE_STAGE_OPTIONS = [
  { value: '퍼피', label: '퍼피·키튼' },
  { value: '어덜트', label: '어덜트' },
  { value: '시니어', label: '시니어·노령' },
  { value: '올스테이지', label: '올스테이지' },
];

const FORMULATION_OPTIONS = ['건식', '습식', '반습식', '동결건조', '생식', '영양제'];

const HEALTH_CONCERN_OPTIONS = [
  '피부·모질', '관절', '소화기', '비만·다이어트', '심장', '신장·비뇨기',
  '간', '면역', '눈', '구강', '스트레스·분리불안', '임신·수유',
];

const SEARCH_MAIN_CATEGORIES = ['전체', '건식사료', '습식사료', '간식', '영양제'];

function defaultPetFromProfile(profile: { species?: string } | undefined): '' | 'dog' | 'cat' | 'all' {
  if (profile?.species === 'Cat') return 'cat';
  if (profile?.species === 'Dog') return 'dog';
  return '';
}

export default function Search() {
  const { profile, products } = useStore();
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

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  // URL 의 ?q= 가 바뀌면(키워드 재클릭·뒤로/앞으로 이동) 검색어를 동기화한다.
  const qParam = searchParams.get('q') ?? '';
  useEffect(() => {
    if (qParam) setQuery(qParam);
  }, [qParam]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'rating'>('default');

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    targetPetType: defaultPetFromProfile(profile) as '' | 'dog' | 'cat' | 'all',
    targetLifeStage: '',
    formulation: '',
    subCategory: '',
    brand: '',
    healthConcerns: [] as string[],
    dietPreset: false,
  });

  const [showSuggest, setShowSuggest] = useState(false);
  const brandOptions = useMemo(() => deriveBrandOptions(products), [products]);

  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [isStandardFeedModalOpen, setIsStandardFeedModalOpen] = useState(false);
  const [standardFeedSearch, setStandardFeedSearch] = useState('');
  const [allIngredients, setAllIngredients] = useState<{ id: string; name_ko: string; risk_level: string }[]>([]);
  const [ingredientSearch, setIngredientSearch] = useState('');

  const suggestions = useMemo<Suggestion[]>(
    () => buildSearchSuggestions(query, products, allIngredients),
    [query, products, allIngredients],
  );

  const filteredIngList = useMemo(
    () => ingredientSearch
      ? allIngredients.filter(i =>
          i.name_ko.toLowerCase().includes(ingredientSearch.toLowerCase()) &&
          !excludedIngredients.includes(i.name_ko)
        )
      : [],
    [allIngredients, ingredientSearch, excludedIngredients]
  );

  const filteredStandardFeed = (standardFeedData as StandardFeedItem[]).filter((item) =>
    item.name_ko.toLowerCase().includes(standardFeedSearch.toLowerCase()) ||
    item.name_en.toLowerCase().includes(standardFeedSearch.toLowerCase())
  );

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
          brand: filters.brand || undefined,
          healthConcerns: filters.healthConcerns,
          dietPreset: filters.dietPreset,
        });
        setSearchResults(results);
        if (query.trim() && results.length > 0) {
          const t = query.trim();
          setRecentSearches((prev) => {
            const next = [t, ...prev.filter((v) => v !== t)].slice(0, RECENT_MAX);
            saveRecentSearches(next);
            return next;
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, category, filters, excludedIngredients]);

  useEffect(() => {
    getAllIngredients().then(setAllIngredients).catch(console.error);
  }, []);

  const displayResults = useMemo(() => {
    if (sortBy === 'default') {
      return rankProductsForProfile(searchResults, profile).map(({ product, breakdown, score }) => ({
        product,
        breakdown,
        score,
      }));
    }
    const arr = [...searchResults];
    if (sortBy === 'rating') arr.sort((a, b) => b.averageRating - a.averageRating);
    return arr.map((product) => ({ product, breakdown: null, score: null }));
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
      brand: '',
      healthConcerns: [],
      dietPreset: false,
    });
    setExcludedIngredients([]);
    setSortBy('default');
  };

  const recordRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setRecentSearches((prev) => {
      const next = [t, ...prev.filter((v) => v !== t)].slice(0, RECENT_MAX);
      saveRecentSearches(next);
      return next;
    });
  };

  const removeRecent = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((v) => v !== term);
      saveRecentSearches(next);
      return next;
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const applyKeyword = (kw: string) => {
    setQuery(kw);
    recordRecent(kw);
    setShowSuggest(false);
  };

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setShowSuggest(true);
  };

  const applySuggestion = (s: Suggestion) => {
    if (s.kind === 'brand') {
      setFilters((f) => ({ ...f, brand: s.label }));
      setQuery('');
    } else {
      setQuery(s.label);
    }
    recordRecent(s.label);
    setShowSuggest(false);
  };

  /** 활성 필터 개수 — 필터 버튼 배지에 노출 (종 필터는 기본값이라 카운트 제외) */
  const activeFilterCount =
    (filters.targetLifeStage ? 1 : 0) +
    (filters.formulation ? 1 : 0) +
    (filters.subCategory ? 1 : 0) +
    (filters.brand ? 1 : 0) +
    filters.healthConcerns.length +
    (filters.dietPreset ? 1 : 0) +
    excludedIngredients.length;

  const showDiscovery = query.trim() === '';

  return (
    <div className="animate-fade-in" style={{ paddingTop: '8px', paddingBottom: '100px' }}>
      <h1 style={{ margin: '0 0 14px', fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
        제품 탐색
      </h1>

      {/* 검색 + 필터 */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '12px' }}>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <TossSearchBar value={query} onChange={handleQueryChange} placeholder="제품·브랜드·성분 검색" />
          {showSuggest && query.trim() !== '' && suggestions.length > 0 && (
            <SearchSuggestionList suggestions={suggestions} onPick={applySuggestion} />
          )}
        </div>
        <button
          type="button"
          aria-label="필터 열기"
          onClick={() => setIsFilterOpen(true)}
          style={{
            position: 'relative', flexShrink: 0, width: '52px', borderRadius: '14px', cursor: 'pointer',
            border: activeFilterCount > 0 ? 'none' : '1px solid var(--line)',
            background: activeFilterCount > 0 ? 'var(--primary)' : 'var(--surface-elevated)',
            color: 'var(--text-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SlidersHorizontal size={20} />
          {activeFilterCount > 0 && (
            <span className="filter-count" style={{ position: 'absolute', top: '-6px', right: '-6px' }}>{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* 카테고리 */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {SEARCH_MAIN_CATEGORIES.map((name) => {
          const active = category === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => { setCategory(name); setFilters(f => ({ ...f, subCategory: '' })); }}
              style={{
                flexShrink: 0, padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
                border: active ? 'none' : '1px solid var(--line)',
                background: active ? 'var(--text-dark)' : 'var(--surface-elevated)',
                color: active ? '#fff' : 'var(--text-muted)',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {/* 정렬 + 성분사전 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {([{ id: 'default', label: '추천순' }, { id: 'rating', label: '평점순' }] as const).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSortBy(id)}
              style={{
                padding: '6px 12px', borderRadius: '999px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', border: 'none',
                background: sortBy === id ? 'var(--surface-alt)' : 'transparent',
                color: sortBy === id ? 'var(--text-dark)' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIsStandardFeedModalOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Database size={14} /> 성분사전
        </button>
      </div>

      {/* 검색어 없을 때: 최근 검색 + 추천 키워드 */}
      {showDiscovery && (
        <div style={{ marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {recentSearches.length > 0 && (
            <div>
              <div className="search-block-label">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={13} /> 최근 검색
                </span>
                <button type="button" className="search-chip-clear" onClick={clearRecent}>전체 삭제</button>
              </div>
              <div className="search-chip-row">
                {recentSearches.map((term) => (
                  <span key={term} className="search-chip search-chip--recent">
                    <button
                      type="button"
                      onClick={() => applyKeyword(term)}
                      style={{ border: 'none', background: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
                    >
                      {term}
                    </button>
                    <button type="button" className="search-chip-remove" onClick={() => removeRecent(term)} aria-label={`${term} 최근 검색 삭제`}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="search-block-label">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>추천 키워드</span>
            </div>
            <div className="search-chip-row">
              {SYMPTOM_KEYWORDS.map((kw) => (
                <button key={kw} type="button" className="search-chip search-chip--symptom" onClick={() => applyKeyword(kw)}>
                  #{kw}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 결과 수 */}
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
          {isLoading ? (
            '불러오는 중…'
          ) : (
            <>총 <strong style={{ color: 'var(--text-dark)', fontWeight: 800 }}>{displayResults.length}</strong>개</>
          )}
        </span>
      </div>

      {isLoading && displayResults.length === 0 && <ProductGridSkeleton count={6} />}

      <div className="ui-grid-2" style={{ alignItems: 'stretch' }}>
        {displayResults.map(({ product, breakdown }) => (
          <ProductCard key={product.id} product={product} grid note={breakdown?.reasons[0]} />
        ))}
      </div>

      {displayResults.length === 0 && !isLoading && (
        <StateView
          variant="empty"
          title="검색 결과가 없어요"
          description="검색어를 바꾸거나 필터를 넓혀 보세요. 찾는 제품이 없다면 등록을 요청해 주세요."
          action={{ label: '필터 조정', onClick: () => setIsFilterOpen(true) }}
          secondaryAction={{
            label: '＋ 제품 등록 요청하기',
            onClick: () => {
              const q = query.trim();
              const subject = encodeURIComponent(`[제품 등록 요청] ${q}`.trim());
              const body = encodeURIComponent(
                `등록을 요청하는 제품명: ${q}\n브랜드/용량(선택): \n제품 링크(선택): \n\n※ 베로로 검색에서 찾을 수 없어 등록을 요청합니다.`,
              );
              window.location.href = `mailto:${COMPANY.email}?subject=${subject}&body=${body}`;
            },
          }}
          minHeight={280}
        />
      )}

      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="필터"
        headerRight={activeFilterCount > 0 ? <span className="filter-count">{activeFilterCount}</span> : undefined}
        footer={
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={resetFilters}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid var(--line)', background: 'var(--surface-elevated)', color: 'var(--text-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Trash2 size={18} /> 초기화
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="ui-press"
              style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'var(--primary)', color: 'var(--text-dark)', fontWeight: 800, border: 'none', cursor: 'pointer' }}
            >
              {isLoading ? '불러오는 중…' : `${displayResults.length.toLocaleString()}개 결과 보기`}
            </button>
          </div>
        }
      >
        <TossFilterSection title="반려동물">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <FilterChip label="전체" selected={filters.targetPetType === ''} onClick={() => setFilters({ ...filters, targetPetType: '' })} />
            <FilterChip label="강아지" selected={filters.targetPetType === 'dog'} onClick={() => setFilters({ ...filters, targetPetType: 'dog' })} />
            <FilterChip label="고양이" selected={filters.targetPetType === 'cat'} onClick={() => setFilters({ ...filters, targetPetType: 'cat' })} />
            <FilterChip label="공용 제품만" selected={filters.targetPetType === 'all'} onClick={() => setFilters({ ...filters, targetPetType: 'all' })} />
          </div>
        </TossFilterSection>

        <TossFilterSection title="생애 단계">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {LIFE_STAGE_OPTIONS.map(({ value, label }) => (
              <FilterChip
                key={value}
                label={label}
                selected={filters.targetLifeStage === value}
                onClick={() => setFilters({ ...filters, targetLifeStage: filters.targetLifeStage === value ? '' : value })}
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
              border: filters.dietPreset ? '2px solid var(--primary)' : '1px solid var(--line)',
              background: filters.dietPreset ? 'rgba(250, 204, 21, 0.16)' : 'var(--surface-alt)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-dark)',
            }}
          >
            {filters.dietPreset ? '✓ ' : ''}다이어트·저칼로리·체중 관련 상품 우선 (태그 일치)
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
            상품에 등록된 건강 태그(비만, 다이어트, 체중 등) 중 하나라도 있으면 표시됩니다.
          </p>
        </TossFilterSection>

        <TossFilterSection title="급여 형태">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {FORMULATION_OPTIONS.map(form => (
              <FilterChip
                key={form}
                label={form}
                selected={filters.formulation === form}
                onClick={() => setFilters({ ...filters, formulation: filters.formulation === form ? '' : form })}
              />
            ))}
          </div>
        </TossFilterSection>

        {brandOptions.length > 0 && (
          <TossFilterSection title="브랜드">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {brandOptions.map((brand) => (
                <FilterChip
                  key={brand}
                  label={brand}
                  selected={filters.brand === brand}
                  onClick={() => setFilters((f) => ({ ...f, brand: f.brand === brand ? '' : brand }))}
                />
              ))}
            </div>
          </TossFilterSection>
        )}

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
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--danger-bg)', borderRadius: '20px', border: '1px solid var(--danger-line)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger-strong)' }}>{name}</span>
                  <button type="button" onClick={() => setExcludedIngredients(prev => prev.filter(i => i !== name))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--danger-strong)', display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ position: 'relative', marginBottom: '8px' }}>
            <FlaskConical size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="제외할 성분 검색..."
              value={ingredientSearch}
              onChange={e => setIngredientSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid var(--line)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'var(--surface-alt)', color: 'var(--text-dark)' }}
            />
          </div>
          {ingredientSearch && (
            <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface-elevated)' }}>
              {filteredIngList.length === 0 ? (
                <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>검색 결과 없음</div>
              ) : filteredIngList.map(ing => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                  style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-dark)', borderBottom: '1px solid var(--line)' }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: ing.risk_level === 'danger' ? '#EF4444' : ing.risk_level === 'caution' ? '#F59E0B' : '#10B981', flexShrink: 0 }} />
                  {ing.name_ko}
                  <Plus size={14} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                </button>
              ))}
            </div>
          )}
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>선택한 성분이 포함된 제품은 검색에서 제외됩니다.</p>
        </TossFilterSection>
      </BottomSheet>

      {/* 성분사전 모달 */}
      {isStandardFeedModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--surface-elevated)', borderRadius: '24px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800 }}>한국표준사료 성분사전</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>공식 표준 성분 데이터 (총 {standardFeedData.length}개)</p>
              </div>
              <button onClick={() => setIsStandardFeedModalOpen(false)} aria-label="닫기" style={{ padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <SearchIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="어떤 성분이 궁금하신가요? (예: 귀리)"
                value={standardFeedSearch}
                onChange={(e) => setStandardFeedSearch(e.target.value)}
                style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: '12px', border: '1px solid var(--line)', outline: 'none', fontSize: '14px', backgroundColor: 'var(--surface-alt)', color: 'var(--text-dark)' }}
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid var(--line)', borderRadius: '12px' }}>
              {filteredStandardFeed.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>검색 결과가 없습니다.</div>
              ) : (
                filteredStandardFeed.map((item, idx: number) => (
                  <div key={idx} style={{ padding: '16px', borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-dark)', fontSize: '15px' }}>{item.name_ko}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.name_en || '-'}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                      {[
                        { label: '조단백질', v: item.protein },
                        { label: '조지방', v: item.fat },
                        { label: '수분', v: item.moisture },
                        { label: '조섬유', v: item.fiber },
                        { label: '조회분', v: item.ash },
                      ].map(({ label, v }) => (
                        <div key={label} style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{v}%</div>
                        </div>
                      ))}
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

/* ── 검색 자동완성 드롭다운 (브랜드·제품·성분 제안) ─────────────────── */
const SUGGEST_BADGE: Record<Suggestion['kind'], string> = {
  brand: '브랜드',
  product: '제품',
  ingredient: '성분',
};

function riskDotColor(risk?: string): string {
  if (risk === 'danger') return '#EF4444';
  if (risk === 'caution' || risk === 'warning') return '#F59E0B';
  return '#10B981';
}

export function SearchSuggestionList({
  suggestions,
  onPick,
}: {
  suggestions: Suggestion[];
  onPick: (s: Suggestion) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="검색 제안"
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        zIndex: 20,
        borderRadius: '14px',
        border: '1px solid var(--line)',
        background: 'var(--surface-elevated)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      {suggestions.map((s, i) => {
        const Icon = s.kind === 'brand' ? Package : s.kind === 'ingredient' ? FlaskConical : SearchIcon;
        return (
          <button
            key={`${s.kind}:${s.label}`}
            type="button"
            role="option"
            aria-selected={false}
            onClick={() => onPick(s)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '11px 14px',
              background: 'none',
              border: 'none',
              borderTop: i === 0 ? 'none' : '1px solid var(--surface-alt)',
              cursor: 'pointer',
              textAlign: 'left',
              color: 'var(--text-dark)',
            }}
          >
            {s.kind === 'ingredient' ? (
              <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: riskDotColor(s.risk) }} />
              </span>
            ) : (
              <Icon size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.label}
              {s.kind === 'product' && s.brand && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>{s.brand}</span>
              )}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--surface-alt)', borderRadius: '999px', padding: '3px 9px', flexShrink: 0 }}>
              {SUGGEST_BADGE[s.kind]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
