import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  deleteCategory,
  fetchCategories,
  reorderCategories,
  saveCategory,
  type AdminCategory,
} from '../../lib/adminApi';

interface FormState {
  id?: string;
  name: string;
  hint: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = { name: '', hint: '', isActive: true };

/**
 * 앱 카테고리 관리.
 *
 * 여기서 만든 활성 카테고리가 사용자 앱 홈의 카테고리 카드와 검색 화면 상단 칩으로
 * 그대로 노출된다(순서까지 동일). 이름은 products.main_category 값과 글자 그대로
 * 대조되므로, 이름을 바꾸면 서버가 해당 분류의 제품까지 함께 옮긴다.
 */
const AdminCategories: React.FC = () => {
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await fetchCategories());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setForm({
      id: category.id,
      name: category.name,
      hint: category.hint ?? '',
      isActive: category.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    const name = form.name.trim();
    if (!name) {
      setFormError('카테고리 이름을 입력해 주세요.');
      return;
    }
    if (name.length > 40) {
      setFormError('카테고리 이름이 너무 깁니다. (최대 40자)');
      return;
    }

    setIsSaving(true);
    setFormError('');
    try {
      const result = await saveCategory({
        id: form.id,
        name,
        hint: form.hint.trim() || null,
        isActive: form.isActive,
      });
      notify.success(
        result.movedProducts > 0
          ? `카테고리를 저장하고 제품 ${result.movedProducts.toLocaleString()}개의 분류도 함께 옮겼습니다.`
          : form.id ? '카테고리를 수정했습니다.' : '카테고리를 등록했습니다.',
      );
      setIsModalOpen(false);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setFormError(message);
      notify.error(`저장 실패: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  /** 화면에서 먼저 순서를 바꾸고 서버에 반영한다. 실패하면 서버 상태로 되돌린다. */
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (savingOrder || target < 0 || target >= rows.length) return;

    const previous = rows;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    setSavingOrder(true);
    try {
      await reorderCategories(next.map((row) => row.id));
      setRows(next.map((row, order) => ({ ...row, sortOrder: (order + 1) * 10 })));
    } catch (err) {
      setRows(previous);
      notify.error(`순서 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleActive = async (category: AdminCategory) => {
    if (savingOrder) return;
    setSavingOrder(true);
    try {
      await saveCategory({
        id: category.id,
        name: category.name,
        hint: category.hint,
        isActive: !category.isActive,
      });
      setRows((current) => current.map((row) => (
        row.id === category.id ? { ...row, isActive: !row.isActive } : row
      )));
      notify.success(
        category.isActive
          ? `“${category.name}”을(를) 앱에서 숨겼습니다.`
          : `“${category.name}”을(를) 앱에 노출했습니다.`,
      );
    } catch (err) {
      notify.error(`노출 변경 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      notify.success('카테고리를 삭제했습니다.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const activeCount = rows.filter((row) => row.isActive).length;

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>카테고리 관리</h2>
          <p>총 {rows.length.toLocaleString()}개 · 앱 노출 {activeCount.toLocaleString()}개</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button type="button" className="admin-btn-primary" onClick={openCreate}>
            <Plus size={16} /> 카테고리 등록
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          여기의 <strong>노출 중</strong> 카테고리가 사용자 앱 <strong>홈 화면의 카테고리 카드</strong>와{' '}
          <strong>검색 화면 상단 칩</strong>에 이 순서 그대로 나타납니다. 위/아래 버튼으로 순서를 바꾸면
          앱에도 즉시 반영됩니다.
          <br />
          카테고리 이름은 제품의 <code>대분류</code> 값과 글자 그대로 대조합니다. 이름을 바꾸면 그
          분류로 등록된 제품도 함께 옮겨져 필터가 끊기지 않습니다.
        </p>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 96 }}>순서</th>
              <th>카테고리</th>
              <th>홈 카드 설명</th>
              <th>등록 제품</th>
              <th>앱 노출</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="admin-empty">데이터를 불러오는 중입니다...</div></td></tr>
            ) : loadError ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">
                    카테고리를 불러오지 못했습니다: {loadError}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><div className="admin-empty">등록된 카테고리가 없습니다.</div></td></tr>
            ) : rows.map((row, index) => (
              <tr key={row.id}>
                <td>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || savingOrder}
                      aria-label={`${row.name} 순서 위로`}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1 || savingOrder}
                      aria-label={`${row.name} 순서 아래로`}
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                </td>
                <td>
                  <div className="admin-item-main">{row.name}</div>
                  <div className="admin-item-sub">{index + 1}번째 노출</div>
                </td>
                <td className="admin-item-sub">{row.hint || '-'}</td>
                <td><strong>{row.productCount.toLocaleString()}</strong>개</td>
                <td>
                  <button
                    type="button"
                    className={`admin-visibility-btn ${row.isActive ? 'is-visible' : 'is-hidden'}`}
                    onClick={() => toggleActive(row)}
                    disabled={savingOrder}
                    aria-label={`${row.name} 앱 ${row.isActive ? '비노출' : '노출'}로 변경`}
                  >
                    {row.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                    {row.isActive ? '노출' : '숨김'}
                  </button>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-icon-btn edit"
                      onClick={() => openEdit(row)}
                      aria-label={`${row.name} 수정`}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn delete"
                      onClick={() => setDeleteTarget(row)}
                      aria-label={`${row.name} 삭제`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) setIsModalOpen(false);
        }}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label="카테고리 편집">
            <div className="admin-dialog-heading">
              <h3>{form.id ? '카테고리 수정' : '카테고리 등록'}</h3>
              <button type="button" className="admin-btn-soft" onClick={() => setIsModalOpen(false)} disabled={isSaving} aria-label="닫기">
                <X size={16} />
              </button>
            </div>

            <div className="admin-form-group" style={{ marginTop: 14 }}>
              <label htmlFor="category-name">카테고리 이름 *</label>
              <input
                id="category-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="예: 사료"
                maxLength={40}
              />
            </div>

            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="category-hint">홈 카드 설명</label>
              <input
                id="category-hint"
                value={form.hint}
                onChange={(event) => setForm((prev) => ({ ...prev, hint: event.target.value }))}
                placeholder="예: 매일 먹는 주식"
                maxLength={80}
              />
            </div>

            <label className="admin-visibility-field" htmlFor="category-active" style={{ marginTop: 12 }}>
              <input
                id="category-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span>
                <strong>사용자 앱에 노출</strong>
                <span className="admin-item-sub" style={{ display: 'block', marginTop: 3 }}>
                  꺼 두면 관리자 화면에서만 분류로 쓰이고 앱 홈·검색 칩에는 나오지 않습니다.
                </span>
              </span>
            </label>

            {formError && <div className="admin-form-error">{formError}</div>}

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                취소
              </button>
              <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={isSaving}>
                <Save size={15} /> {isSaving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isDeleting) setDeleteTarget(null);
        }}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label="카테고리 삭제 확인">
            <h3>카테고리를 삭제할까요?</h3>
            <p className="admin-modal-desc">
              “{deleteTarget.name}”을(를) 삭제합니다.
              {deleteTarget.productCount > 0 && (
                <>
                  <br />
                  이 분류로 등록된 제품이 {deleteTarget.productCount.toLocaleString()}개 있어 삭제할 수 없습니다.
                  먼저 제품의 분류를 바꾸거나, 삭제 대신 <strong>앱 노출을 끄기</strong>를 사용하세요.
                </>
              )}
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
                취소
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={confirmDelete}
                disabled={isDeleting || deleteTarget.productCount > 0}
              >
                <Trash2 size={15} /> {isDeleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
