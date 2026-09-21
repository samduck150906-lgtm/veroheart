import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, RefreshCw, Save, Search, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  PRODUCT_CLEANUP_BATCH,
  applyProductCleanup,
  fetchProductNames,
  type ProductCleanupResult,
  type ProductNameRow,
} from '../../lib/adminApi';
import {
  buildProductCleanupSuggestions,
  type NameCleanupSuggestion,
} from '../../utils/productNameCleanup';

interface Candidate {
  product: ProductNameRow;
  suggestion: NameCleanupSuggestion;
}

interface Draft { name: string; brandName: string }
type CleanupField = 'name' | 'brand';

function selectionKey(id: string, field: CleanupField) {
  return `${id}:${field}`;
}

function resultLabel(result: ProductCleanupResult): string {
  if (result.status === 'applied') return '적용 완료';
  if (result.status === 'already_applied') return '이미 적용됨';
  if (result.status === 'conflict') return '동시 수정 충돌';
  if (result.status === 'duplicate') return '중복 위험';
  if (result.status === 'not_found') return '제품 없음';
  return '적용 실패';
}

const AdminProductCleanup: React.FC = () => {
  const [rows, setRows] = useState<ProductNameRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [results, setResults] = useState<ProductCleanupResult[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSelected(new Set());
    try {
      const nextRows = await fetchProductNames();
      const suggestions = buildProductCleanupSuggestions(nextRows.map((row) => ({
        id: row.id, name: row.name, brandName: row.brand_name,
      })));
      setRows(nextRows);
      setDrafts(Object.fromEntries(nextRows.map((row) => {
        const suggestion = suggestions.get(row.id);
        return [row.id, {
          name: suggestion?.name ?? row.name,
          brandName: suggestion?.brandName ?? row.brand_name,
        }];
      })));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const suggestionMap = useMemo(() => buildProductCleanupSuggestions(rows.map((row) => ({
    id: row.id, name: row.name, brandName: row.brand_name,
  }))), [rows]);

  const candidates = useMemo<Candidate[]>(() => {
    const query = search.trim().toLowerCase();
    return rows
      .map((product) => ({ product, suggestion: suggestionMap.get(product.id) }))
      .filter((item): item is Candidate => Boolean(item.suggestion?.changed))
      .filter(({ product }) => {
        const draft = drafts[product.id];
        return !query || [product.name, product.brand_name, draft?.name, draft?.brandName]
          .some((value) => value?.toLowerCase().includes(query));
      });
  }, [drafts, rows, search, suggestionMap]);

  const selectedChanges = useMemo(() => candidates.flatMap(({ product }) => {
    const draft = drafts[product.id] ?? { name: product.name, brandName: product.brand_name };
    const fields: CleanupField[] = [];
    if (selected.has(selectionKey(product.id, 'name')) && draft.name.trim() !== product.name) fields.push('name');
    if (selected.has(selectionKey(product.id, 'brand')) && draft.brandName.trim() !== product.brand_name) fields.push('brand');
    return fields.length ? [{ product, draft, fields }] : [];
  }), [candidates, drafts, selected]);

  const selectedProductCount = new Set(selectedChanges.map(({ product }) => product.id)).size;
  const reviewCount = candidates.filter(({ suggestion }) => suggestion.needsReview).length;

  const setDraft = (id: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  };

  const toggle = (id: string, field: CleanupField) => {
    const key = selectionKey(id, field);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const selectAllSafe = () => {
    const next = new Set<string>();
    for (const { product, suggestion } of candidates) {
      const draft = drafts[product.id];
      if (suggestion.nameChanged && !suggestion.nameNeedsReview && draft?.name.trim() !== product.name) {
        next.add(selectionKey(product.id, 'name'));
      }
      if (suggestion.brandChanged && !suggestion.brandNeedsReview && draft?.brandName.trim() !== product.brand_name) {
        next.add(selectionKey(product.id, 'brand'));
      }
    }
    setSelected(next);
  };

  const apply = async () => {
    if (applying || selectedChanges.length === 0) return;
    setApplying(true);
    setConfirmOpen(false);
    setResults([]);
    const allResults: ProductCleanupResult[] = [];
    try {
      for (let offset = 0; offset < selectedChanges.length; offset += PRODUCT_CLEANUP_BATCH) {
        const batch = selectedChanges.slice(offset, offset + PRODUCT_CLEANUP_BATCH);
        const response = await applyProductCleanup(batch.map(({ product, draft, fields }) => ({
          id: product.id,
          expectedName: product.name,
          expectedBrandName: product.brand_name,
          ...(fields.includes('name') ? { name: draft.name.trim() } : {}),
          ...(fields.includes('brand') ? { brandName: draft.brandName.trim() } : {}),
        })));
        allResults.push(...response.results);
      }
      setResults(allResults);
      const applied = allResults.filter((item) => item.status === 'applied' || item.status === 'already_applied').length;
      const blocked = allResults.length - applied;
      if (blocked > 0) notify.warning(`${applied}건 적용, ${blocked}건은 충돌 또는 오류로 적용하지 않았습니다.`);
      else notify.success(`제품 ${applied.toLocaleString()}건을 정리했습니다.`);
      await load();
    } catch (err) {
      setResults(allResults);
      const appliedBeforeError = allResults.filter((item) => item.status === 'applied' || item.status === 'already_applied').length;
      const prefix = appliedBeforeError > 0 ? `${appliedBeforeError}건은 앞선 배치에서 적용되었습니다. ` : '';
      notify.error(`${prefix}나머지 정리 요청을 확인할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`);
      await load();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>제품명·브랜드 검토</h2>
          <p>
            후보 {candidates.length.toLocaleString()}건 · 선택 제품 {selectedProductCount.toLocaleString()}건
            {selected.size > 0 && ` (${selected.size.toLocaleString()}개 필드)`}
            {reviewCount > 0 && ` · 확인 필요 ${reviewCount.toLocaleString()}건`}
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={() => void load()} disabled={loading || applying}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button type="button" className="admin-btn-soft" onClick={selectAllSafe} disabled={loading || applying}>
            <Check size={15} /> 안전한 제안 전체 선택
          </button>
          <button type="button" className="admin-btn-soft" onClick={() => setSelected(new Set())} disabled={applying || selected.size === 0}>
            <X size={15} /> 전체 선택 해제
          </button>
          <button type="button" className="admin-btn-primary" onClick={() => setConfirmOpen(true)} disabled={applying || selectedChanges.length === 0}>
            <Save size={15} /> 선택 {selectedProductCount.toLocaleString()}건 검토
          </button>
        </div>
      </div>

      <div className="admin-card admin-cleanup-guidance">
        광고·배송 문구만 보수적으로 제거합니다. 중량·수량·포장 구성과 맛·단백질원·기능 정보는 SKU를 구분할 수 있어 자동 삭제하지 않습니다.
        수집 출처 브랜드의 첫 단어는 검토 후보일 뿐 자동 확정하지 않으며, 제품명과 브랜드는 각각 선택할 수 있습니다.
      </div>

      {selectedChanges.length > PRODUCT_CLEANUP_BATCH && (
        <div className="admin-cleanup-notice" role="status">
          선택한 {selectedChanges.length.toLocaleString()}건은 서버 제한에 맞춰 {PRODUCT_CLEANUP_BATCH}건씩 나누어 적용합니다.
        </div>
      )}

      {results.length > 0 && (
        <section className="admin-card admin-cleanup-results" aria-label="최근 적용 결과">
          <strong>최근 적용 결과</strong>
          {results.map((result) => (
            <div key={`${result.id}-${result.status}`}>
              <code>{result.id}</code> · {resultLabel(result)}{result.message ? ` · ${result.message}` : ''}
            </div>
          ))}
        </section>
      )}

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-cleanup-search" className="admin-visually-hidden">현재 또는 제안 제품명·브랜드 검색</label>
        <input id="admin-cleanup-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="현재 또는 제안 제품명·브랜드 검색" />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-cleanup-table">
          <thead><tr><th>제품</th><th>현재 값</th><th>제안 및 직접 수정</th><th>근거·위험</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4}><div className="admin-empty">제품을 불러오는 중입니다…</div></td></tr>
              : loadError ? <tr><td colSpan={4}><div className="admin-empty">제품을 불러오지 못했습니다: {loadError}</div></td></tr>
                : candidates.length === 0 ? <tr><td colSpan={4}><div className="admin-empty">조건에 맞는 검토 후보가 없습니다.</div></td></tr>
                  : candidates.map(({ product, suggestion }) => {
                    const draft = drafts[product.id] ?? { name: product.name, brandName: product.brand_name };
                    const nameChanged = draft.name.trim() !== product.name;
                    const brandChanged = draft.brandName.trim() !== product.brand_name;
                    return (
                      <tr key={product.id}>
                        <td className="admin-cleanup-product-cell">
                          {product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <div className="admin-cleanup-image-empty">이미지 없음</div>}
                          <code>{product.id}</code>
                        </td>
                        <td>
                          <div className="admin-item-main admin-cleanup-name">{product.name}</div>
                          <div className="admin-item-sub">{product.brand_name}</div>
                        </td>
                        <td>
                          <label className={`admin-cleanup-field${nameChanged ? ' changed' : ''}`}>
                            <input aria-label={`${product.id} 제품명 선택`} type="checkbox" checked={selected.has(selectionKey(product.id, 'name'))} onChange={() => toggle(product.id, 'name')} disabled={applying || !nameChanged} />
                            <span>제품명</span>
                            <input aria-label={`${product.id} 제안 제품명`} value={draft.name} onChange={(event) => setDraft(product.id, 'name', event.target.value)} disabled={applying} />
                          </label>
                          <label className={`admin-cleanup-field${brandChanged ? ' changed' : ''}`}>
                            <input aria-label={`${product.id} 브랜드 선택`} type="checkbox" checked={selected.has(selectionKey(product.id, 'brand'))} onChange={() => toggle(product.id, 'brand')} disabled={applying || !brandChanged} />
                            <span>브랜드</span>
                            <input aria-label={`${product.id} 제안 브랜드`} value={draft.brandName} onChange={(event) => setDraft(product.id, 'brandName', event.target.value)} disabled={applying} />
                          </label>
                        </td>
                        <td>
                          {suggestion.needsReview ? <span className="admin-tag orange"><AlertTriangle size={11} /> 확인 필요</span> : <span className="admin-tag green">자동 적용 가능</span>}
                          {suggestion.reasons.map((reason) => <div className="admin-item-sub" key={reason}>· {reason}</div>)}
                          {suggestion.risks.map((risk) => <div className="admin-cleanup-risk" key={risk}>· {risk}</div>)}
                        </td>
                      </tr>
                    );
                  })}
          </tbody>
        </table>
      </div>

      {confirmOpen && (
        <div className="admin-cleanup-modal-backdrop" role="presentation">
          <section className="admin-cleanup-modal" role="dialog" aria-modal="true" aria-labelledby="cleanup-confirm-title">
            <div className="admin-cleanup-modal-header">
              <div><h3 id="cleanup-confirm-title">변경 내용을 최종 확인하세요</h3><p>{selectedProductCount}개 제품, {selectedChanges.reduce((sum, item) => sum + item.fields.length, 0)}개 필드 적용</p></div>
              <button type="button" className="admin-icon-btn" onClick={() => setConfirmOpen(false)} aria-label="확인 창 닫기"><X size={18} /></button>
            </div>
            <div className="admin-cleanup-preview-list">
              {selectedChanges.map(({ product, draft, fields }) => (
                <article key={product.id}>
                  <code>{product.id}</code>
                  {fields.includes('name') && <div><strong>제품명</strong> {product.name} <span>→</span> <mark>{draft.name.trim()}</mark></div>}
                  {fields.includes('brand') && <div><strong>브랜드</strong> {product.brand_name} <span>→</span> <mark>{draft.brandName.trim()}</mark></div>}
                </article>
              ))}
            </div>
            <div className="admin-actions">
              <button type="button" className="admin-btn-soft" onClick={() => setConfirmOpen(false)}>취소</button>
              <button type="button" className="admin-btn-primary" onClick={() => void apply()}>확인 후 적용</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminProductCleanup;
