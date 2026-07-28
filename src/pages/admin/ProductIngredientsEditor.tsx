import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import { searchIngredients, type AdminIngredient, type ProductIngredientLink, type RiskLevel } from '../../lib/adminApi';

const RISK_TAG: Record<RiskLevel, { tag: string; label: string }> = {
  safe: { tag: 'green', label: '안전' },
  caution: { tag: 'orange', label: '주의' },
  danger: { tag: 'red', label: '위험' },
};

interface Props {
  value: ProductIngredientLink[];
  onChange: (next: ProductIngredientLink[]) => void;
  /** 검색 결과가 없을 때 성분 사전 관리로 안내한다(자동 생성하지 않는다). */
  onRequestCreateIngredient?: (name: string) => void;
  disabled?: boolean;
}

/**
 * 제품 ↔ 원재료 연결 편집기.
 *
 * 표기 순서(sort_order)는 분석 엔진의 "제1원료" 판정에 쓰이므로 위/아래 이동으로
 * 명시 제어한다. 드래그앤드롭 라이브러리는 추가하지 않았다 — 신규 의존성 없이
 * 키보드로도 조작 가능한 버튼 방식이 관리자 데스크톱 환경에서 더 안정적이다.
 */
const ProductIngredientsEditor: React.FC<Props> = ({
  value,
  onChange,
  onRequestCreateIngredient,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminIngredient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      setResults(await searchIngredients(term));
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : String(err));
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSearch(query), 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, runSearch]);

  const reindex = (rows: ProductIngredientLink[]) =>
    rows.map((row, index) => ({ ...row, sortOrder: index }));

  const addIngredient = (ingredient: AdminIngredient) => {
    if (disabled) return;
    if (value.some((row) => row.ingredientId === ingredient.id)) {
      setNotice('이미 추가된 원재료입니다.');
      return;
    }
    setNotice(null);
    onChange(
      reindex([
        ...value,
        {
          ingredientId: ingredient.id,
          nameKo: ingredient.name_ko,
          nameEn: ingredient.name_en,
          riskLevel: ingredient.risk_level,
          sortOrder: value.length,
        },
      ]),
    );
  };

  const removeAt = (index: number) => {
    if (disabled) return;
    onChange(reindex(value.filter((_, i) => i !== index)));
  };

  const move = (index: number, direction: -1 | 1) => {
    if (disabled) return;
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(reindex(next));
  };

  return (
    <div className="admin-ingredient-editor">
      <div className="admin-form-legend">
        원재료 구성 ({value.length}개) — 표기 순서가 분석의 제1원료 판정에 사용됩니다
      </div>

      <div className="admin-search-wrap" style={{ margin: '8px 0 10px' }}>
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-pi-search" className="admin-visually-hidden">
          원재료 검색
        </label>
        <input
          id="admin-pi-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotice(null);
          }}
          placeholder="성분 사전에서 원재료 검색 (한글/영문)"
          disabled={disabled}
        />
      </div>

      {query.trim() && (
        <div className="admin-picker-list" style={{ maxHeight: 190 }}>
          {searching ? (
            <div className="admin-empty">검색 중…</div>
          ) : searchError ? (
            <div className="admin-empty">검색 실패: {searchError}</div>
          ) : results.length === 0 ? (
            <div className="admin-empty">
              &quot;{query.trim()}&quot; 성분이 사전에 없습니다.
              {onRequestCreateIngredient && (
                <button
                  type="button"
                  className="admin-btn-soft"
                  style={{ marginLeft: 10 }}
                  onClick={() => onRequestCreateIngredient(query.trim())}
                >
                  성분 사전에 등록하기
                </button>
              )}
            </div>
          ) : (
            results.map((ingredient) => {
              const already = value.some((row) => row.ingredientId === ingredient.id);
              return (
                <button
                  type="button"
                  key={ingredient.id}
                  className="admin-picker-item"
                  onClick={() => addIngredient(ingredient)}
                  disabled={disabled || already}
                >
                  <span className="admin-item-main">
                    {ingredient.name_ko}
                    <span className={`admin-tag ${RISK_TAG[ingredient.risk_level].tag}`} style={{ marginLeft: 8 }}>
                      {RISK_TAG[ingredient.risk_level].label}
                    </span>
                  </span>
                  <span className="admin-item-sub">
                    {ingredient.name_en || '-'} {already ? '· 이미 추가됨' : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {notice && (
        <p className="admin-form-error" role="alert">
          {notice}
        </p>
      )}

      {value.length === 0 ? (
        <div className="admin-empty" style={{ marginTop: 10 }}>
          연결된 원재료가 없습니다. 위에서 검색해 추가해 주세요.
          <br />
          원재료가 없으면 사용자 화면에서 성분 분석이 &quot;정보 부족&quot;으로 표시됩니다.
        </div>
      ) : (
        <ol className="admin-ingredient-list">
          {value.map((row, index) => (
            <li key={row.ingredientId} className="admin-ingredient-row">
              <span className="admin-ingredient-order">{index + 1}</span>
              <span className="admin-ingredient-name">
                {row.nameKo}
                {index === 0 && <span className="admin-tag blue" style={{ marginLeft: 8 }}>제1원료</span>}
                <span className={`admin-tag ${RISK_TAG[row.riskLevel]?.tag ?? 'green'}`} style={{ marginLeft: 6 }}>
                  {RISK_TAG[row.riskLevel]?.label ?? row.riskLevel}
                </span>
                {row.nameEn && <span className="admin-item-sub"> {row.nameEn}</span>}
              </span>
              <span className="admin-actions">
                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={() => move(index, -1)}
                  disabled={disabled || index === 0}
                  aria-label={`${row.nameKo} 위로 이동`}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn"
                  onClick={() => move(index, 1)}
                  disabled={disabled || index === value.length - 1}
                  aria-label={`${row.nameKo} 아래로 이동`}
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  className="admin-icon-btn delete"
                  onClick={() => removeAt(index)}
                  disabled={disabled}
                  aria-label={`${row.nameKo} 연결 해제`}
                >
                  <X size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {onRequestCreateIngredient && (
        <button
          type="button"
          className="admin-btn-soft"
          style={{ marginTop: 10 }}
          onClick={() => onRequestCreateIngredient('')}
          disabled={disabled}
        >
          <Plus size={14} /> 성분 사전 관리로 이동
        </button>
      )}
    </div>
  );
};

export default ProductIngredientsEditor;
