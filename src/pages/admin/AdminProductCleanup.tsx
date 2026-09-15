import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, RefreshCw, Save, Search } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  PRODUCT_CLEANUP_BATCH,
  applyProductCleanup,
  fetchProductNames,
  type ProductNameRow,
} from '../../lib/adminApi';
import { suggestProductNameCleanup, type NameCleanupSuggestion } from '../../utils/productNameCleanup';

interface Candidate {
  product: ProductNameRow;
  suggestion: NameCleanupSuggestion;
}

/**
 * 제품명·브랜드 일괄 정리.
 *
 * 대량 임포트가 쿠팡 판매 제목을 그대로 넣어서 제품명 뒤에 옵션 문자열
 * (`, 1개, 100g, 꿀고구마맛`)과 키워드 나열이 붙어 있고, 브랜드 자리에는 수집 출처
 * ('쿠팡검색')가 들어 있는 제품이 많다.
 *
 * 자동으로 덮어쓰지 않는다. 제안을 만들어 보여 주고, 운영자가 고른 것만 저장한다.
 * 이름은 앱의 검색·비교에 그대로 쓰이므로 사람이 한 번 보는 편이 안전하다.
 */
const AdminProductCleanup: React.FC = () => {
  const [rows, setRows] = useState<ProductNameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setSelected(new Set());
    try {
      setRows(await fetchProductNames());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const candidates = useMemo<Candidate[]>(() => {
    const query = search.trim().toLowerCase();
    return rows
      .map((product) => ({
        product,
        suggestion: suggestProductNameCleanup({ name: product.name, brandName: product.brand_name }),
      }))
      .filter(({ suggestion }) => suggestion.changed)
      .filter(({ product }) => !query
        || product.name.toLowerCase().includes(query)
        || product.brand_name.toLowerCase().includes(query));
  }, [rows, search]);

  const reviewCount = candidates.filter(({ suggestion }) => suggestion.needsReview).length;
  const selectedList = candidates.filter(({ product }) => selected.has(product.id));

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** 사람 확인이 필요한 항목은 '전체 선택'에서 제외한다 — 실수로 함께 적용되지 않게. */
  const selectAllSafe = () => {
    setSelected(new Set(
      candidates.filter(({ suggestion }) => !suggestion.needsReview).map(({ product }) => product.id),
    ));
  };

  const apply = async () => {
    if (applying || selectedList.length === 0) return;
    setApplying(true);
    try {
      let applied = 0;
      // Edge Function 한 요청당 상한이 있어 나눠 보낸다.
      for (let offset = 0; offset < selectedList.length; offset += PRODUCT_CLEANUP_BATCH) {
        const batch = selectedList.slice(offset, offset + PRODUCT_CLEANUP_BATCH);
        const result = await applyProductCleanup(batch.map(({ product, suggestion }) => ({
          id: product.id,
          name: suggestion.name,
          brandName: suggestion.brandName,
        })));
        applied += result.applied;
      }
      notify.success(`제품 ${applied.toLocaleString()}건의 이름·브랜드를 정리했습니다.`);
      await load();
    } catch (err) {
      notify.error(`정리 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>제품명 정리</h2>
          <p>
            정리 제안 {candidates.length.toLocaleString()}건 · 선택 {selectedList.length.toLocaleString()}건
            {reviewCount > 0 && ` · 확인 필요 ${reviewCount.toLocaleString()}건`}
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading || applying}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button type="button" className="admin-btn-soft" onClick={selectAllSafe} disabled={loading || applying}>
            <Check size={15} /> 안전한 항목 전체 선택
          </button>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={apply}
            disabled={applying || selectedList.length === 0}
          >
            <Save size={15} /> {applying ? '적용 중…' : `선택 ${selectedList.length.toLocaleString()}건 적용`}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          판매처에서 가져온 제품명에는 <code>, 1개, 100g, 꿀고구마맛</code> 같은 <strong>판매 옵션</strong>과
          홍보 키워드가 붙어 있습니다. 여기서는 그 꼬리만 잘라 낸 이름을 제안합니다.
          주원료·연령·기능·맛처럼 <strong>제품을 구분하는 정보는 자르지 않습니다.</strong>
          <br />
          브랜드가 수집 출처(<code>쿠팡검색</code>)인 제품은 정리된 제품명의 첫 단어를 브랜드로 제안합니다.
          <br />
          바꾸기 전 값은 감사 로그에 남으므로, 잘못 적용해도 무엇이 어떻게 바뀌었는지 확인할 수 있습니다.
        </p>
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-cleanup-search" className="admin-visually-hidden">제품명 또는 브랜드 검색</label>
        <input
          id="admin-cleanup-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제품명 또는 브랜드 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>선택</th>
              <th>현재</th>
              <th style={{ width: 32 }} aria-label="변경" />
              <th>정리 제안</th>
              <th style={{ width: 200 }}>정리 내용</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="admin-empty">제품을 불러오는 중입니다…</div></td></tr>
            ) : loadError ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    제품을 불러오지 못했습니다: {loadError}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty">
                    {search.trim() ? '조건에 맞는 정리 대상이 없습니다.' : '정리할 제품명이 없습니다. 모두 깔끔합니다.'}
                  </div>
                </td>
              </tr>
            ) : candidates.map(({ product, suggestion }) => (
              <tr key={product.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggle(product.id)}
                    disabled={applying}
                    aria-label={`${product.name} 정리 선택`}
                  />
                </td>
                <td>
                  <div className="admin-item-main admin-cleanup-name">{product.name}</div>
                  <div className="admin-item-sub">{product.brand_name}</div>
                </td>
                <td aria-hidden="true" style={{ color: '#94a3b8' }}><ArrowRight size={16} /></td>
                <td>
                  <div className="admin-item-main admin-cleanup-name">
                    {suggestion.needsReview ? (
                      <span className="admin-item-sub">자동으로 정리할 수 없습니다 — 직접 수정해 주세요.</span>
                    ) : suggestion.name}
                  </div>
                  <div className="admin-item-sub">
                    {suggestion.brandName !== product.brand_name ? (
                      <strong style={{ color: '#166534' }}>{suggestion.brandName}</strong>
                    ) : suggestion.brandName}
                  </div>
                </td>
                <td>
                  {suggestion.needsReview && (
                    <span className="admin-tag orange">
                      <AlertTriangle size={11} /> 확인 필요
                    </span>
                  )}
                  {suggestion.reasons.map((reason) => (
                    <div className="admin-item-sub" key={reason}>· {reason}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductCleanup;
