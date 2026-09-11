import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Database, AlertTriangle } from 'lucide-react';
import { notify } from '../../store/useNotification';
import standardFeedData from '../../data/standard_feed_data.json';
import {
  deleteIngredient,
  fetchIngredients,
  getIngredientUsage,
  saveIngredient,
  type AdminIngredient,
  type AdminIngredientInput,
  type RiskLevel,
} from '../../lib/adminApi';

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

const INGREDIENT_CATEGORIES = [
  '동물성 단백질',
  '식물성 단백질',
  '탄수화물·곡물',
  '지방·오일',
  '과일·채소·식이섬유',
  '비타민·미네랄',
  '기능성 성분',
  '보존료·산화방지제',
  '유산균·프리바이오틱스',
  '첨가물·기호성',
  '조사료',
  '기타',
];

const NUTRITION_FIELDS = [
  ['moisture_pct', '수분'],
  ['crude_protein_pct', '조단백질'],
  ['crude_fat_pct', '조지방'],
  ['crude_ash_pct', '조회분'],
  ['crude_fiber_pct', '조섬유'],
] as const;

const STANDARD_FEED_SOURCE = '한국표준사료성분표 2022';

type IngredientSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'risk';
type NutritionFilter = '전체' | 'linked' | 'missing';

function hasStructuredNutrition(ingredient: AdminIngredient): boolean {
  return NUTRITION_FIELDS.some(
    ([key]) => ingredient[key] !== null && ingredient[key] !== undefined,
  );
}

function registrationTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatRegistrationDate(value: string | null | undefined): string {
  const timestamp = registrationTime(value);
  if (timestamp === null) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp);
}

function splitTerms(value: string): string[] {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

function standardFeedCategory(id: number): string {
  if (id >= 29 && id <= 57) return '식물성 단백질';
  if (id >= 58 && id <= 78) return '과일·채소·식이섬유';
  if (id >= 79 && id <= 87) return '기능성 성분';
  if (id >= 88 && id <= 133) return '조사료';
  if (id >= 134 && id <= 137) return '식물성 단백질';
  if (id >= 138 && id <= 142) return '탄수화물·곡물';
  if (id === 143) return '기능성 성분';
  if (id >= 144 && id <= 167) return '동물성 단백질';
  if (id >= 168 && id <= 174) return '지방·오일';
  if (id >= 175 && id <= 182) return '비타민·미네랄';
  return '탄수화물·곡물';
}

function standardFeedTags(item: StandardFeedItem): string[] {
  return [
    item.protein >= 20 ? '고단백' : null,
    item.fat >= 10 ? '고지방' : null,
    item.fiber >= 5 ? '식이섬유' : null,
    item.ash >= 8 ? '미네랄' : null,
  ].filter((tag): tag is string => Boolean(tag));
}

function standardFeedSafety(item: StandardFeedItem): { risk: RiskLevel; cautions: string[] } {
  const name = `${item.name_ko} ${item.name_en}`.toLowerCase();
  if (/커피|coffee/.test(name)) {
    return { risk: 'danger', cautions: ['카페인 잔류 가능성이 있어 반려동물 급여 금지'] };
  }
  if (/포도|grape/.test(name)) {
    return { risk: 'danger', cautions: ['개에게 급여 금지'] };
  }
  if ((item.id >= 58 && item.id <= 78) || (item.id >= 88 && item.id <= 143) || item.id >= 175 ||
      /겨자|면실|채종|mustard|cottonseed|rapeseed/.test(name)) {
    return { risk: 'caution', cautions: ['축산용 표준사료 자료이므로 반려동물 적용 전 수의영양 검토 필요'] };
  }
  return { risk: 'safe', cautions: [] };
}

const RISK_META: Record<RiskLevel, { label: string; color: string; tag: string }> = {
  safe: { label: '안전', color: '#10B981', tag: 'green' },
  caution: { label: '주의', color: '#F59E0B', tag: 'orange' },
  danger: { label: '위험', color: '#EF4444', tag: 'red' },
};

type FormState = AdminIngredientInput & { id?: string };

const EMPTY_FORM: FormState = {
  name_ko: '',
  name_en: '',
  risk_level: 'safe',
  description: '',
  category: '',
  aliases: [],
  nutrition_tags: [],
  caution_conditions: [],
  allergy_triggers: [],
  moisture_pct: null,
  crude_protein_pct: null,
  crude_fat_pct: null,
  crude_ash_pct: null,
  crude_fiber_pct: null,
  nutrition_source: '',
};

const AdminIngredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [riskFilter, setRiskFilter] = useState<'전체' | RiskLevel>('전체');
  const [nutritionFilter, setNutritionFilter] = useState<NutritionFilter>('전체');
  const [sortOrder, setSortOrder] = useState<IngredientSort>('newest');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isStandardFeedModalOpen, setIsStandardFeedModalOpen] = useState(false);
  const [standardFeedSearch, setStandardFeedSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<AdminIngredient | null>(null);
  const [deleteUsage, setDeleteUsage] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadIngredients = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setIngredients(await fetchIngredients());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      notify.error(`성분 조회 실패: ${message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 마운트 시 성분 목록 로드. 로딩 상태 갱신은 의도된 동작이다.
    loadIngredients();
  }, [loadIngredients]);

  const availableCategories = useMemo(
    () => [...new Set([
      ...INGREDIENT_CATEGORIES,
      ...ingredients.map((item) => item.category).filter((value): value is string => Boolean(value)),
    ])]
      .sort((a, b) => a.localeCompare(b, 'ko-KR')),
    [ingredients],
  );

  const visibleIngredients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const riskWeight: Record<RiskLevel, number> = { danger: 0, caution: 1, safe: 2 };
    const filtered = ingredients.filter((ingredient) => {
      const matchesQuery = !q ||
        ingredient.name_ko.toLowerCase().includes(q) ||
        (ingredient.name_en ?? '').toLowerCase().includes(q) ||
        (ingredient.category ?? '').toLowerCase().includes(q) ||
        (ingredient.description ?? '').toLowerCase().includes(q) ||
        (ingredient.aliases ?? []).some((alias) => alias.toLowerCase().includes(q));
      const matchesCategory = categoryFilter === '전체' || ingredient.category === categoryFilter;
      const matchesRisk = riskFilter === '전체' || ingredient.risk_level === riskFilter;
      const nutritionLinked = hasStructuredNutrition(ingredient);
      const matchesNutrition = nutritionFilter === '전체' ||
        (nutritionFilter === 'linked' ? nutritionLinked : !nutritionLinked);
      return matchesQuery && matchesCategory && matchesRisk && matchesNutrition;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'name-asc') return a.name_ko.localeCompare(b.name_ko, 'ko-KR');
      if (sortOrder === 'name-desc') return b.name_ko.localeCompare(a.name_ko, 'ko-KR');
      if (sortOrder === 'risk') {
        return riskWeight[a.risk_level] - riskWeight[b.risk_level] || a.name_ko.localeCompare(b.name_ko, 'ko-KR');
      }
      const aTime = registrationTime(a.created_at);
      const bTime = registrationTime(b.created_at);
      if (aTime === null && bTime === null) return a.name_ko.localeCompare(b.name_ko, 'ko-KR');
      if (aTime === null) return 1;
      if (bTime === null) return -1;
      return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
    });
  }, [categoryFilter, ingredients, nutritionFilter, riskFilter, searchTerm, sortOrder]);

  const filtersActive = Boolean(searchTerm.trim()) || categoryFilter !== '전체' ||
    riskFilter !== '전체' || nutritionFilter !== '전체';

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('전체');
    setRiskFilter('전체');
    setNutritionFilter('전체');
  };

  const stats = useMemo(
    () => ({
      safe: ingredients.filter((i) => i.risk_level === 'safe').length,
      caution: ingredients.filter((i) => i.risk_level === 'caution').length,
      danger: ingredients.filter((i) => i.risk_level === 'danger').length,
      classified: ingredients.filter((i) => Boolean(i.category)).length,
      nutrition: ingredients.filter((i) =>
        hasStructuredNutrition(i),
      ).length,
    }),
    [ingredients],
  );

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (ingredient: AdminIngredient) => {
    setForm({
      id: ingredient.id,
      name_ko: ingredient.name_ko,
      name_en: ingredient.name_en ?? '',
      risk_level: ingredient.risk_level,
      description: ingredient.description ?? '',
      category: ingredient.category ?? '',
      aliases: ingredient.aliases ?? [],
      nutrition_tags: ingredient.nutrition_tags ?? [],
      caution_conditions: ingredient.caution_conditions ?? [],
      allergy_triggers: ingredient.allergy_triggers ?? [],
      moisture_pct: ingredient.moisture_pct ?? null,
      crude_protein_pct: ingredient.crude_protein_pct ?? null,
      crude_fat_pct: ingredient.crude_fat_pct ?? null,
      crude_ash_pct: ingredient.crude_ash_pct ?? null,
      crude_fiber_pct: ingredient.crude_fiber_pct ?? null,
      nutrition_source: ingredient.nutrition_source ?? '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const validate = (state: FormState): string | null => {
    if (!state.name_ko.trim()) return '한글 성분명을 입력해 주세요.';
    if (state.name_ko.trim().length > 200) return '한글 성분명이 너무 깁니다. (최대 200자)';
    if ((state.name_en ?? '').length > 200) return '영문 성분명이 너무 깁니다. (최대 200자)';
    if ((state.description ?? '').length > 2000) return '설명이 너무 깁니다. (최대 2000자)';
    if (!state.id && !state.category) return '신규 성분의 분류를 선택해 주세요.';
    if (!['safe', 'caution', 'danger'].includes(state.risk_level)) return '위험도를 선택해 주세요.';
    for (const [key, label] of NUTRITION_FIELDS) {
      const value = state[key];
      if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0 || value > 100)) {
        return `${label}은(는) 0~100 사이 숫자로 입력해 주세요.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (isSaving) return; // 중복 클릭 방지
    const invalid = validate(form);
    if (invalid) {
      setFormError(invalid);
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      // anon 클라이언트 직접 쓰기 금지 — 전부 admin-write Edge Function 경유
      await saveIngredient({
        id: form.id,
        name_ko: form.name_ko.trim(),
        name_en: (form.name_en ?? '').trim() || null,
        risk_level: form.risk_level,
        description: (form.description ?? '').trim() || null,
        category: (form.category ?? '').trim() || null,
        aliases: splitTerms((form.aliases ?? []).join(',')),
        nutrition_tags: splitTerms((form.nutrition_tags ?? []).join(',')),
        caution_conditions: splitTerms((form.caution_conditions ?? []).join('\n')),
        allergy_triggers: splitTerms((form.allergy_triggers ?? []).join(',')),
        moisture_pct: form.moisture_pct ?? null,
        crude_protein_pct: form.crude_protein_pct ?? null,
        crude_fat_pct: form.crude_fat_pct ?? null,
        crude_ash_pct: form.crude_ash_pct ?? null,
        crude_fiber_pct: form.crude_fiber_pct ?? null,
        nutrition_source: (form.nutrition_source ?? '').trim() || null,
      });
      notify.success(form.id ? '성분 정보가 수정되었습니다.' : '신규 성분이 등록되었습니다.');
      setIsModalOpen(false);
      await loadIngredients();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message);
      notify.error(`저장 실패: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const requestDelete = async (ingredient: AdminIngredient) => {
    setDeleteTarget(ingredient);
    setDeleteUsage(null);
    try {
      setDeleteUsage(await getIngredientUsage(ingredient.id));
    } catch {
      // 사용량 조회 실패 시에도 삭제 시도는 가능하다(서버가 최종 검증한다).
      setDeleteUsage(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteIngredient(deleteTarget.id);
      notify.success('성분이 삭제되었습니다.');
      setDeleteTarget(null);
      await loadIngredients();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStandardFeed = useMemo(() => {
    const q = standardFeedSearch.trim().toLowerCase();
    const items = standardFeedData as StandardFeedItem[];
    if (!q) return items.slice(0, 100);
    return items
      .filter(
        (item) =>
          item.name_ko.toLowerCase().includes(q) || item.name_en.toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [standardFeedSearch]);

  const handleSelectStandardFeed = (item: StandardFeedItem) => {
    const safety = standardFeedSafety(item);
    setForm((prev) => ({
      ...prev,
      // 기존 성분 편집 시 관리자가 붙인 이름/설명/위험도를 덮어쓰지 않고 영양값만 연결한다.
      name_ko: prev.id ? prev.name_ko : item.name_ko,
      name_en: prev.id ? prev.name_en : item.name_en,
      description: prev.description || `${item.name_ko}의 표준 사료 영양 성분 데이터`,
      category: prev.category || standardFeedCategory(item.id),
      nutrition_tags: standardFeedTags(item),
      risk_level: prev.id ? prev.risk_level : safety.risk,
      caution_conditions: prev.id ? prev.caution_conditions : safety.cautions,
      moisture_pct: item.moisture,
      crude_protein_pct: item.protein,
      crude_fat_pct: item.fat,
      crude_ash_pct: item.ash,
      crude_fiber_pct: item.fiber,
      nutrition_source: STANDARD_FEED_SOURCE,
    }));
    setIsStandardFeedModalOpen(false);
  };

  const deleteBlocked = (deleteUsage ?? 0) > 0;

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>성분 사전 관리</h2>
          <p>기존 성분 수정 · 표준 영양값 연결 · 신규 성분 등록</p>
        </div>
        <button type="button" className="admin-btn-primary" onClick={openCreateModal}>
          <Plus size={16} />
          신규 성분 등록
        </button>
      </div>

      <div className="admin-grid-cards" style={{ marginBottom: 14 }}>
        {(['safe', 'caution', 'danger'] as RiskLevel[]).map((level) => (
          <article className="admin-card" key={level}>
            <span className="admin-stat-label">{RISK_META[level].label} 성분</span>
            <div className="admin-stat-value" style={{ color: RISK_META[level].color }}>
              {stats[level].toLocaleString()}
            </div>
          </article>
        ))}
        <article className="admin-card">
          <span className="admin-stat-label">분류 완료</span>
          <div className="admin-stat-value">{stats.classified.toLocaleString()}</div>
        </article>
        <article className="admin-card">
          <span className="admin-stat-label">구조화 영양값</span>
          <div className="admin-stat-value">{stats.nutrition.toLocaleString()}</div>
        </article>
        <article className="admin-card">
          <span className="admin-stat-label">전체 성분</span>
          <div className="admin-stat-value">{ingredients.length.toLocaleString()}</div>
        </article>
      </div>

      <div className="admin-query-bar admin-ingredient-query-bar">
        <div className="admin-search-wrap admin-query-search">
          <Search size={16} className="admin-search-icon" />
          <label htmlFor="admin-ingredient-search" className="admin-visually-hidden">
            성분명 검색
          </label>
          <input
            id="admin-ingredient-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="성분명·영문명·동의어·분류·설명 검색"
          />
        </div>
        <label className="admin-compact-field">
          <span>분류</span>
          <select
            aria-label="성분 분류 필터"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="전체">전체 분류</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="admin-compact-field">
          <span>위험도</span>
          <select
            aria-label="성분 위험도 필터"
            value={riskFilter}
            onChange={(event) => setRiskFilter(event.target.value as '전체' | RiskLevel)}
          >
            <option value="전체">전체 위험도</option>
            <option value="danger">위험</option>
            <option value="caution">주의</option>
            <option value="safe">안전</option>
          </select>
        </label>
        <label className="admin-compact-field">
          <span>영양 DB</span>
          <select
            aria-label="영양 DB 필터"
            value={nutritionFilter}
            onChange={(event) => setNutritionFilter(event.target.value as NutritionFilter)}
          >
            <option value="전체">전체</option>
            <option value="linked">연결됨</option>
            <option value="missing">미등록</option>
          </select>
        </label>
        <label className="admin-compact-field">
          <span>보이는 순서</span>
          <select
            aria-label="성분 정렬 순서"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as IngredientSort)}
          >
            <option value="newest">최근 등록순</option>
            <option value="oldest">오래된 등록순</option>
            <option value="name-asc">이름 가나다순</option>
            <option value="name-desc">이름 가나다 역순</option>
            <option value="risk">위험도 높은순</option>
          </select>
        </label>
      </div>

      <div className="admin-filter-summary" aria-live="polite">
        <span>전체 {ingredients.length.toLocaleString()}개 중 <strong>{visibleIngredients.length.toLocaleString()}개</strong> 표시</span>
        {filtersActive && (
          <button type="button" className="admin-btn-soft" onClick={resetFilters}>필터 초기화</button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>성분명</th>
              <th>위험도</th>
              <th>분류</th>
              <th>영양 DB</th>
              <th>등록일</th>
              <th>설명</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    성분을 불러오지 못했습니다.
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={loadIngredients}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : visibleIngredients.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    {ingredients.length === 0
                      ? '등록된 성분이 없습니다. "신규 성분 등록"으로 사전을 채워주세요.'
                      : '검색 조건에 맞는 성분이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : (
              visibleIngredients.map((ingredient) => (
                <tr key={ingredient.id}>
                  <td>
                    <div className="admin-item-main">{ingredient.name_ko}</div>
                    <div className="admin-item-sub">{ingredient.name_en || '-'}</div>
                  </td>
                  <td>
                    <span className={`admin-tag ${RISK_META[ingredient.risk_level]?.tag ?? 'green'}`}>
                      {RISK_META[ingredient.risk_level]?.label ?? ingredient.risk_level}
                    </span>
                  </td>
                  <td>{ingredient.category || '-'}</td>
                  <td>
                    {hasStructuredNutrition(ingredient)
                      ? <span className="admin-tag green">연결됨</span>
                      : <span className="admin-tag gray">미등록</span>}
                  </td>
                  <td className="admin-registration-date">{formatRegistrationDate(ingredient.created_at)}</td>
                  <td>{ingredient.description || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-icon-btn edit"
                        onClick={() => openEditModal(ingredient)}
                        aria-label={`${ingredient.name_ko} 수정`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="admin-icon-btn delete"
                        onClick={() => requestDelete(ingredient)}
                        aria-label={`${ingredient.name_ko} 삭제`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => !isSaving && setIsModalOpen(false)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? '성분 정보 수정' : '신규 성분 등록'}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{form.id ? '성분 정보 수정' : '신규 성분 등록'}</h3>
              <button
                type="button"
                className="admin-btn-soft"
                onClick={() => setIsModalOpen(false)}
                aria-label="모달 닫기"
                disabled={isSaving}
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              className="admin-standard-feed-btn"
              onClick={() => setIsStandardFeedModalOpen(true)}
            >
              <Database size={18} /> {form.id ? '기존 성분에 표준 영양값 연결' : '한국표준사료성분표 데이터에서 불러오기'}
            </button>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label htmlFor="ing-name-ko">한글 성분명*</label>
                <input
                  id="ing-name-ko"
                  value={form.name_ko}
                  onChange={(e) => setForm({ ...form, name_ko: e.target.value })}
                  aria-invalid={Boolean(formError) && !form.name_ko.trim()}
                  aria-describedby={formError ? 'ing-form-error' : undefined}
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="ing-name-en">영문 성분명</label>
                <input
                  id="ing-name-en"
                  value={form.name_en ?? ''}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                />
              </div>

              <div className="admin-form-group admin-form-span-2">
                <span className="admin-form-legend">위험도 레벨*</span>
                <div className="admin-risk-row" role="radiogroup" aria-label="위험도 레벨">
                  {(['safe', 'caution', 'danger'] as RiskLevel[]).map((level) => {
                    const active = form.risk_level === level;
                    return (
                      <button
                        type="button"
                        key={level}
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm({ ...form, risk_level: level })}
                        className={`admin-risk-btn ${active ? 'active' : ''}`}
                        style={
                          active
                            ? { backgroundColor: RISK_META[level].color, borderColor: RISK_META[level].color }
                            : undefined
                        }
                      >
                        {RISK_META[level].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="admin-form-group">
                <label htmlFor="ing-category">성분 분류</label>
                <select
                  id="ing-category"
                  value={form.category ?? ''}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">선택하세요</option>
                  {form.category && !INGREDIENT_CATEGORIES.includes(form.category) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                  {INGREDIENT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label htmlFor="ing-aliases">동의어·다른 표기</label>
                <input
                  id="ing-aliases"
                  value={(form.aliases ?? []).join(', ')}
                  onChange={(e) => setForm({ ...form, aliases: e.target.value.split(',') })}
                  placeholder="예: 치킨, 계육 (쉼표로 구분)"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ing-allergies">알레르기 태그</label>
                <input
                  id="ing-allergies"
                  value={(form.allergy_triggers ?? []).join(', ')}
                  onChange={(e) => setForm({ ...form, allergy_triggers: e.target.value.split(',') })}
                  placeholder="예: 닭고기, 가금류"
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="ing-nutrition-tags">영양·기능 태그</label>
                <input
                  id="ing-nutrition-tags"
                  value={(form.nutrition_tags ?? []).join(', ')}
                  onChange={(e) => setForm({ ...form, nutrition_tags: e.target.value.split(',') })}
                  placeholder="예: 고단백, 오메가3"
                />
              </div>

              <div className="admin-form-group admin-form-span-2">
                <label htmlFor="ing-cautions">주의 조건</label>
                <textarea
                  id="ing-cautions"
                  value={(form.caution_conditions ?? []).join('\n')}
                  onChange={(e) => setForm({ ...form, caution_conditions: e.target.value.split('\n') })}
                  rows={2}
                  placeholder="조건별로 줄을 나눠 입력하세요. 예: 신장 질환은 수의사 상담"
                />
              </div>

              <div className="admin-form-group admin-form-span-2">
                <span className="admin-form-legend">구조화 영양값 (%)</span>
                <div className="admin-nutrition-fields">
                  {NUTRITION_FIELDS.map(([key, label]) => (
                    <label key={key} htmlFor={`ing-${key}`}>
                      <span>{label}</span>
                      <input
                        id={`ing-${key}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={form[key] ?? ''}
                        onChange={(e) => setForm({
                          ...form,
                          [key]: e.target.value === '' ? null : Number(e.target.value),
                        })}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-form-group admin-form-span-2">
                <label htmlFor="ing-nutrition-source">영양정보 출처</label>
                <input
                  id="ing-nutrition-source"
                  value={form.nutrition_source ?? ''}
                  onChange={(e) => setForm({ ...form, nutrition_source: e.target.value })}
                  placeholder="예: 한국표준사료성분표 2022"
                />
              </div>

              <div className="admin-form-group admin-form-span-2">
                <label htmlFor="ing-description">설명 및 가이드</label>
                <textarea
                  id="ing-description"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                />
              </div>
            </div>

            {formError && (
              <p id="ing-form-error" className="admin-form-error" role="alert">
                {formError}
              </p>
            )}

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                취소
              </button>
              <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중…' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStandardFeedModalOpen && (
        <div className="admin-modal-backdrop" style={{ zIndex: 1100 }} onClick={() => setIsStandardFeedModalOpen(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label="한국표준사료성분 DB 검색" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>한국표준사료성분 DB 검색</h3>
              <button type="button" className="admin-btn-soft" onClick={() => setIsStandardFeedModalOpen(false)} aria-label="모달 닫기">
                <X size={16} />
              </button>
            </div>

            <div className="admin-search-wrap" style={{ marginTop: 14 }}>
              <Search size={16} className="admin-search-icon" />
              <label htmlFor="std-feed-search" className="admin-visually-hidden">
                표준사료성분 검색
              </label>
              <input
                id="std-feed-search"
                value={standardFeedSearch}
                onChange={(e) => setStandardFeedSearch(e.target.value)}
                placeholder="성분명 검색..."
              />
            </div>

            <div className="admin-picker-list">
              {filteredStandardFeed.length === 0 ? (
                <div className="admin-empty">검색 결과가 없습니다.</div>
              ) : (
                filteredStandardFeed.map((item) => (
                  <button
                    type="button"
                    key={`${item.id}-${item.name_ko}`}
                    className="admin-picker-item"
                    onClick={() => handleSelectStandardFeed(item)}
                  >
                    <span className="admin-item-main">{item.name_ko}</span>
                    <span className="admin-item-sub">{item.name_en}</span>
                    <span className="admin-item-sub">
                      단백질: {item.protein}% | 지방: {item.fat}% | 수분: {item.moisture}% | 회분: {item.ash}%
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" style={{ zIndex: 1200 }} onClick={() => !isDeleting && setDeleteTarget(null)}>
          <div className="admin-modal admin-modal-sm" role="alertdialog" aria-modal="true" aria-label="성분 삭제 확인" onClick={(e) => e.stopPropagation()}>
            <h3>
              <AlertTriangle size={18} style={{ verticalAlign: '-3px', marginRight: 6, color: '#f59e0b' }} />
              성분을 삭제할까요?
            </h3>
            <p className="admin-modal-desc">
              <strong>{deleteTarget.name_ko}</strong>
              {deleteUsage === null
                ? ' — 연결된 제품 수를 확인하는 중입니다.'
                : deleteBlocked
                  ? ` 은(는) ${deleteUsage}개 제품에 연결되어 있어 삭제할 수 없습니다. 먼저 제품 관리에서 연결을 해제해 주세요.`
                  : ' 은(는) 연결된 제품이 없어 안전하게 삭제할 수 있습니다. 삭제 후에는 되돌릴 수 없습니다.'}
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                취소
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting || deleteBlocked || deleteUsage === null}
              >
                {isDeleting ? '삭제 중…' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminIngredients;
