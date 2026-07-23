import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Filter,
  X,
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
  Clock,
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import StateView from '../components/StateView';
import BottomSheet from '../components/BottomSheet';
import { ProductGridSkeleton } from '../components/Skeleton';
import type { Product } from '../types';
import { TossFilterSection, TossSearchBar, TossChip, TossButton } from '../components/TossUI';
import { searchProducts, getAllIngredients } from '../lib/supabase';
import { useStore } from '../store/useStore';
import standardFeedData from '../data/standard_feed_data.json';
import { Database } from 'lucide-react';
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

type CategoryEntry = { name: string; icon: React.ElementType };
const SEARCH_MAIN_CATEGORIES: CategoryEntry[] = [
  { name: '전체', icon: LayoutGrid },
  { name: '건식사료', icon: Package },
  { name: '습식사료', icon: Package },
  { name: '간식', icon: Package },
  { name: '영양제', icon: FlaskConical },
];

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
  // URL 의 ?q= 가 바뀌면(급상승 키워드 재클릭·뒤로/앞으로 이동) 검색어를 동기화한다.
  // 입력 중에는 URL q 를 바꾸지 않으므로(카테고리만 동기화) 타이핑과 충돌하지 않는다.
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

  const filterButtonActive =
    filters.targetLifeStage !== '' ||
    filters.formulation !== '' ||
    filters.subCategory !== '' ||
    filters.brand !== '' ||
    filters.healthConcerns.length > 0 ||
    filters.dietPreset ||
    excludedIngredients.length > 0;

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
      brand: '',
      healthConcerns: [],
      dietPreset: false,
    });
    setExcludedIngredients([]);
    setSortBy('default');
  };

  const setPetFilter = (p: '' | 'dog' | 'cat' | 'all') => {
    setFilters(f => ({ ...f, targetPetType: p }));
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

  /** 활성 필터 개수 — 상세 필터 버튼 배지에 노출 */
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
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
          <div>
            <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
              <Sparkles size={14} />
              취향 기반 탐색
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '6px' }}>조건을 조합해 정확하게 좁혀보세요</h2>
          </div>
        </div>

        <div
          style={{
            marginBottom: '14px',
            padding: '12px 14px',
            borderRadius: '16px',
            background: 'var(--surface-alt)',
            border: '1px solid rgba(124, 111, 156, 0.2)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#8B7CF6', marginBottom: '4px' }}>
            사람이 검수한 데이터 우선
          </div>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: 'var(--text-muted)', fontWeight: 600 }}>
            검색과 추천은 직접 정리한 제조사/성분 데이터와 프로필 기준으로 계산합니다.
          </p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <TossSearchBar
            value={query}
            onChange={handleQueryChange}
            placeholder="상품명, 브랜드, 성분명으로 검색"
          />
          {showSuggest && query.trim() !== '' && suggestions.length > 0 && (
            <SearchSuggestionList suggestions={suggestions} onPick={applySuggestion} />
          )}
        </div>

        {/* 최근 검색 (검색어 없을 때만) */}
        {showDiscovery && recentSearches.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
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
                  <button
                    type="button"
                    className="search-chip-remove"
                    onClick={() => removeRecent(term)}
                    aria-label={`${term} 최근 검색 삭제`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 추천 키워드 (증상·목적) */}
        <div style={{ marginBottom: showDiscovery ? '14px' : '0' }}>
          <div className="search-block-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Sparkles size={13} /> 추천 키워드
            </span>
          </div>
          <div className="search-chip-row">
            {SYMPTOM_KEYWORDS.map((kw) => (
              <button
                key={kw}
                type="button"
                className="search-chip search-chip--symptom"
                onClick={() => applyKeyword(kw)}
              >
                #{kw}
              </button>
            ))}
          </div>
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
                    background: active ? 'rgba(250, 204, 21, 0.18)' : 'var(--surface-elevated)',
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
          <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.04em' }}>빠른 목적</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setFilters(f => ({ ...f, dietPreset: !f.dietPreset }))}
              style={{
                padding: '8px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                border: filters.dietPreset ? 'none' : '1px solid var(--line)',
                backgroundColor: filters.dietPreset ? 'var(--primary)' : 'var(--surface-elevated)',
                color: filters.dietPreset ? '#191F28' : 'var(--text-muted)', cursor: 'pointer',
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
                border: filters.targetLifeStage === '시니어' ? 'none' : '1px solid var(--line)',
                backgroundColor: filters.targetLifeStage === '시니어' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: filters.targetLifeStage === '시니어' ? '#191F28' : 'var(--text-muted)', cursor: 'pointer',
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
            { id: 'rating' as const, label: '평점순' },
          ]).map(({ id, label }) => (
            <TossChip key={id} label={label} active={sortBy === id} onClick={() => setSortBy(id)} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <TossButton variant={filterButtonActive ? 'soft' : 'outline'} onClick={() => setIsFilterOpen(true)} style={{ width: 'auto', height: '40px', padding: '0 14px' }}>
            <SlidersHorizontal size={16} />
            상세 필터
            {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </TossButton>
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
                border: category === cat.name ? 'none' : '1px solid var(--line)',
                backgroundColor: category === cat.name ? 'var(--primary)' : 'var(--surface-elevated)',
                color: category === cat.name ? '#191F28' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <cat.icon size={16} />
              {cat.name}
            </button>
          ))}
        </div>
        
        {/* Standard Feed DB Button */}
        <div style={{ marginTop: '8px', padding: '0 4px' }}>
          <button 
            onClick={() => setIsStandardFeedModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700,
              color: '#059669', background: '#ecfdf5', padding: '8px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer'
            }}
          >
            <Database size={14} /> 한국표준사료 성분사전 검색
          </button>
        </div>
      </section>

      <div style={{ marginTop: '12px' }}>
        <div className="search-sticky-bar">
          <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
            총 <strong style={{ color: 'var(--text-dark)', fontWeight: 900 }}>{displayResults.length}</strong>개의 상품
            {isLoading && <span style={{ marginLeft: '8px', fontSize: '12px' }}>불러오는 중…</span>}
          </span>
          <span className="ui-badge ui-badge-soft">
            <Filter size={12} />
            {sortBy === 'default' ? '프로필 추천순' : filterButtonActive ? '필터 적용 중' : '정렬 적용 중'}
            {activeFilterCount > 0 && ` · ${activeFilterCount}`}
          </span>
        </div>

        {sortBy === 'default' && displayResults.length > 0 && (
          <div className="ui-info-card" style={{ marginBottom: '16px', padding: '16px 18px' }}>
            <div className="ui-section-kicker">recommendation logic</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '6px' }}>
              {profile.name} 프로필 기반 추천순
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              검수 완료 여부, 알레르기 회피, 건강 고민 매칭, 리뷰 신뢰도, 성분 안전성, 종/연령 적합도를 함께 반영해 정렬합니다.
            </div>
          </div>
        )}

        {isLoading && displayResults.length === 0 && <ProductGridSkeleton count={6} />}

        <div className="ui-grid-2" style={{ alignItems: 'stretch' }}>
          {displayResults.map(({ product, breakdown }) => (
            <ProductCard
              key={product.id}
              product={product}
              grid
              note={breakdown?.reasons[0]}
            />
          ))}
        </div>
        
        {displayResults.length === 0 && !isLoading && (
          <StateView
            variant="empty"
            title="검색 결과가 없어요"
            description="검색어를 바꾸거나 상세 필터를 넓혀 보세요. 찾는 제품이 아직 없다면 등록을 요청해 주세요."
            action={{ label: '상세 필터 조정', onClick: () => setIsFilterOpen(true) }}
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
      </div>

      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="상세 필터"
        headerRight={activeFilterCount > 0 ? <span className="filter-count">{activeFilterCount}</span> : undefined}
        footer={
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={resetFilters}
              style={{ flex: 1, padding: '16px', borderRadius: '16px', border: '1px solid #E5E7EB', background: 'var(--surface-elevated)', color: 'var(--text-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <Trash2 size={18} /> 초기화
            </button>
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="ui-press"
              style={{ flex: 2, padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer' }}
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
                  border: filters.dietPreset ? '2px solid var(--primary)' : '1px solid var(--line)',
                  background: filters.dietPreset ? 'rgba(250, 204, 21, 0.16)' : 'var(--surface-alt)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-dark)',
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

            {brandOptions.length > 0 && (
              <TossFilterSection title="브랜드">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {brandOptions.map((brand) => (
                    <FilterChip
                      key={brand}
                      label={brand}
                      selected={filters.brand === brand}
                      onClick={() =>
                        setFilters((f) => ({ ...f, brand: f.brand === brand ? '' : brand }))
                      }
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
                  style={{ width: '100%', padding: '12px 12px 12px 36px', borderRadius: '12px', border: '1px solid var(--line)', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: 'var(--surface-alt)', color: 'var(--text-dark)' }}
                />
              </div>
              {ingredientSearch && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--line)', borderRadius: '12px', background: 'var(--surface-elevated)' }}>
                  {filteredIngList.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>검색 결과 없음</div>
                  ) : filteredIngList.map(ing => (
                    <button
                      key={ing.id}
                      type="button"
                      onClick={() => { setExcludedIngredients(prev => [...prev, ing.name_ko]); setIngredientSearch(''); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-dark)', borderBottom: '1px solid var(--line)' }}
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
      </BottomSheet>

      {/* Standard Feed Modal */}
      {isStandardFeedModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-scale-in" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--surface-elevated)', borderRadius: '24px', padding: '24px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
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
                filteredStandardFeed.map((item, idx: number) => (
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
                      <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조단백질</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{item.protein}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조지방</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{item.fat}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>수분</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{item.moisture}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조섬유</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{item.fiber}%</div>
                      </div>
                      <div style={{ background: 'var(--surface-alt)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#6B7280', fontWeight: 600 }}>조회분</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>{item.ash}%</div>
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
        marginTop: '8px',
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
              <Icon size={16} color="#9CA3AF" style={{ flexShrink: 0 }} />
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

