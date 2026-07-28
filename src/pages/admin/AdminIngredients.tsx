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
  '단백질원',
  '탄수화물원',
  '지방원',
  '비타민·미네랄',
  '기능성 성분',
  '보존료·산화방지제',
  '유산균',
  '기타',
];

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
};

const AdminIngredients: React.FC = () => {
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredIngredients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter(
      (ingredient) =>
        ingredient.name_ko.toLowerCase().includes(q) ||
        (ingredient.name_en ?? '').toLowerCase().includes(q),
    );
  }, [ingredients, searchTerm]);

  const stats = useMemo(
    () => ({
      safe: ingredients.filter((i) => i.risk_level === 'safe').length,
      caution: ingredients.filter((i) => i.risk_level === 'caution').length,
      danger: ingredients.filter((i) => i.risk_level === 'danger').length,
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
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const validate = (state: FormState): string | null => {
    if (!state.name_ko.trim()) return '한글 성분명을 입력해 주세요.';
    if (state.name_ko.trim().length > 200) return '한글 성분명이 너무 깁니다. (최대 200자)';
    if ((state.name_en ?? '').length > 200) return '영문 성분명이 너무 깁니다. (최대 200자)';
    if ((state.description ?? '').length > 2000) return '설명이 너무 깁니다. (최대 2000자)';
    if (!['safe', 'caution', 'danger'].includes(state.risk_level)) return '위험도를 선택해 주세요.';
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
    setForm((prev) => ({
      ...prev,
      name_ko: item.name_ko,
      name_en: item.name_en,
      description: `수분: ${item.moisture}% / 조단백질: ${item.protein}% / 조지방: ${item.fat}% / 조회분: ${item.ash}% / 조섬유: ${item.fiber}% (출처: 한국표준사료성분표 2022)`,
      risk_level: 'safe',
    }));
    setIsStandardFeedModalOpen(false);
  };

  const deleteBlocked = (deleteUsage ?? 0) > 0;

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>성분 사전 관리</h2>
          <p>총 {ingredients.length.toLocaleString()}개 성분</p>
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
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-ingredient-search" className="admin-visually-hidden">
          성분명 검색
        </label>
        <input
          id="admin-ingredient-search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="성분명(한글/영문) 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>성분명</th>
              <th>위험도</th>
              <th>분류</th>
              <th>설명</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    성분을 불러오지 못했습니다.
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={loadIngredients}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    {ingredients.length === 0
                      ? '등록된 성분이 없습니다. "신규 성분 등록"으로 사전을 채워주세요.'
                      : '검색 조건에 맞는 성분이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : (
              filteredIngredients.map((ingredient) => (
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

            {!form.id && (
              <button
                type="button"
                className="admin-standard-feed-btn"
                onClick={() => setIsStandardFeedModalOpen(true)}
              >
                <Database size={18} /> 한국표준사료성분표 데이터에서 불러오기
              </button>
            )}

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
                  {INGREDIENT_CATEGORIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
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
