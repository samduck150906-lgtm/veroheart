import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Download, ExternalLink, RefreshCw, Save, Search, Upload } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  NUTRITION_KEYS,
  NUTRITION_LABELS,
  PRODUCT_FACTS_BATCH,
  fetchProductFacts,
  saveProductFacts,
  type NutritionKey,
  type ProductFactsFilter,
  type ProductFactsRow,
} from '../../lib/adminApi';
import { checkBarcode, findDuplicateBarcodes } from '../../utils/barcode';
import { parseProductFactsCsv, toProductFactsCsv } from '../../utils/productFactsCsv';

const FILTERS: { key: ProductFactsFilter; label: string }[] = [
  { key: 'missing', label: '둘 다 없음' },
  { key: 'missing_barcode', label: '바코드 없음' },
  { key: 'missing_nutrition', label: '영양정보 없음' },
  { key: 'all', label: '전체' },
];

/** 화면에서 편집 중인 값. 저장 전까지 원본과 따로 들고 있는다. */
interface Draft {
  barcode: string;
  kcal: string;
  nutrition: Record<NutritionKey, string>;
}

function toDraft(row: ProductFactsRow): Draft {
  return {
    barcode: row.barcode ?? '',
    kcal: row.kcalPer100g === null ? '' : String(row.kcalPer100g),
    nutrition: Object.fromEntries(
      NUTRITION_KEYS.map((key) => [key, row.nutrition[key] === null ? '' : String(row.nutrition[key])]),
    ) as Record<NutritionKey, string>,
  };
}

function draftChanged(row: ProductFactsRow, draft: Draft): boolean {
  const original = toDraft(row);
  return draft.barcode !== original.barcode
    || draft.kcal !== original.kcal
    || NUTRITION_KEYS.some((key) => draft.nutrition[key] !== original.nutrition[key]);
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * 바코드·보장성분 입력.
 *
 * 앱의 첫 화면 기능이 "바코드 스캔하기"인데 등록된 바코드가 하나도 없어서 어떤
 * 제품도 스캔되지 않는다. 영양정보도 거의 비어 있어 맞춤 추천이 쓸 근거가 없다.
 * 이 두 값을 채우는 것만 하는 화면이다 — 제품의 다른 값은 건드리지 않는다.
 *
 * 459개를 화면에서 한 줄씩 치는 것은 현실적이지 않아 CSV 로 내보내고 다시
 * 올리는 경로를 같이 뒀다. 여러 사람이 나눠 채울 수 있다.
 */
const AdminProductFacts: React.FC = () => {
  const [rows, setRows] = useState<ProductFactsRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [filter, setFilter] = useState<ProductFactsFilter>('missing');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProductFacts({ filter, search });
      setRows(result);
      setDrafts(Object.fromEntries(result.map((row) => [row.id, toDraft(row)])));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const changed = useMemo(
    () => rows.filter((row) => drafts[row.id] && draftChanged(row, drafts[row.id])),
    [rows, drafts],
  );

  /** 같은 화면 안의 바코드 중복 — 저장을 눌러 DB 오류를 보기 전에 알려 준다. */
  const duplicates = useMemo(() => {
    const byId = new Map<string, string>();
    const groups = findDuplicateBarcodes(
      rows.map((row) => ({ id: row.id, barcode: drafts[row.id]?.barcode ?? '' })),
    );
    for (const ids of groups.values()) {
      for (const id of ids) byId.set(id, '같은 바코드를 쓴 제품이 화면에 또 있습니다.');
    }
    return byId;
  }, [rows, drafts]);

  const invalidCount = useMemo(
    () => rows.filter((row) => {
      const draft = drafts[row.id];
      return draft ? !checkBarcode(draft.barcode).valid : false;
    }).length,
    [rows, drafts],
  );

  const update = (id: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  };

  const updateNutrition = (id: string, key: NutritionKey, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], nutrition: { ...current[id].nutrition, [key]: value } },
    }));
  };

  const exportCsv = () => {
    const csv = toProductFactsCsv(rows);
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `veroro-제품데이터-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success(`제품 ${rows.length.toLocaleString()}건을 CSV 로 내보냈습니다.`);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const known = new Set(rows.map((row) => row.id));
    const { rows: parsed, errors } = parseProductFactsCsv(text, known);

    if (errors.length > 0) {
      // 한 줄이라도 틀리면 반영하지 않는다 — 절반만 들어간 상태가 더 헷갈린다.
      notify.error(`CSV 에 문제가 ${errors.length}건 있습니다: ${errors[0]}`);
      return;
    }

    setDrafts((current) => {
      const next = { ...current };
      for (const item of parsed) {
        if (!next[item.id]) continue;
        next[item.id] = {
          barcode: item.barcode ?? '',
          kcal: item.kcalPer100g === null ? '' : String(item.kcalPer100g),
          nutrition: Object.fromEntries(
            NUTRITION_KEYS.map((key) => [
              key,
              item.nutrition[key] === null ? '' : String(item.nutrition[key]),
            ]),
          ) as Record<NutritionKey, string>,
        };
      }
      return next;
    });
    notify.success(`CSV ${parsed.length.toLocaleString()}행을 불러왔습니다. 확인 후 저장을 눌러 주세요.`);
  };

  const save = async () => {
    if (saving || changed.length === 0) return;
    if (invalidCount > 0) {
      notify.error('바코드 형식이 맞지 않는 항목이 있습니다. 먼저 고쳐 주세요.');
      return;
    }
    if (duplicates.size > 0) {
      notify.error('같은 바코드를 쓴 제품이 있습니다. 먼저 고쳐 주세요.');
      return;
    }

    setSaving(true);
    try {
      let total = 0;
      for (let offset = 0; offset < changed.length; offset += PRODUCT_FACTS_BATCH) {
        const batch = changed.slice(offset, offset + PRODUCT_FACTS_BATCH);
        const result = await saveProductFacts(batch.map((row) => {
          const draft = drafts[row.id];
          return {
            id: row.id,
            name: row.name,
            barcode: draft.barcode.trim() || null,
            kcalPer100g: toNumberOrNull(draft.kcal),
            nutrition: Object.fromEntries(
              NUTRITION_KEYS.map((key) => [key, toNumberOrNull(draft.nutrition[key])]),
            ) as Record<NutritionKey, number | null>,
          };
        }));
        total += result.saved;
      }
      notify.success(`제품 ${total.toLocaleString()}건을 저장했습니다.`);
      await load();
    } catch (err) {
      notify.error(`저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>바코드·영양정보 입력</h2>
          <p>
            {rows.length.toLocaleString()}건 · 수정 {changed.length.toLocaleString()}건
            {invalidCount > 0 && ` · 바코드 오류 ${invalidCount.toLocaleString()}건`}
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading || saving}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button type="button" className="admin-btn-soft" onClick={exportCsv} disabled={loading || rows.length === 0}>
            <Download size={15} /> CSV 내보내기
          </button>
          <button
            type="button"
            className="admin-btn-soft"
            onClick={() => fileInput.current?.click()}
            disabled={loading || saving}
          >
            <Upload size={15} /> CSV 가져오기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="admin-visually-hidden"
            aria-label="CSV 파일 선택"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importCsv(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className="admin-btn-primary"
            onClick={save}
            disabled={saving || changed.length === 0}
          >
            <Save size={15} /> {saving ? '저장 중…' : `${changed.length.toLocaleString()}건 저장`}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          앱의 <strong>바코드 스캔</strong>은 여기 입력된 값으로 제품을 찾습니다.
          잘못된 바코드는 스캔이 안 되는 것보다 나쁩니다 — 엉뚱한 제품의 성분 분석이 보호자에게 보입니다.
          그래서 체크숫자를 계산해 오타를 걸러 냅니다.
          <br />
          <strong>CSV 내보내기 → 엑셀에서 채우기 → 가져오기</strong> 순서로 여러 사람이 나눠 채울 수 있습니다.
          엑셀에서 열 때 바코드 열은 <strong>텍스트 서식</strong>으로 지정해야 앞자리 0 이 사라지지 않습니다.
          <br />
          보장성분은 모두 <strong>백분율(%)</strong>, 칼로리는 <strong>100g당 kcal</strong> 입니다.
        </p>
      </div>

      <div className="admin-filter-row">
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item.key}
            className={`admin-chip ${filter === item.key ? 'active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-facts-search" className="admin-visually-hidden">제품명 또는 브랜드 검색</label>
        <input
          id="admin-facts-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제품명 또는 브랜드 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>제품</th>
              <th style={{ width: 190 }}>바코드</th>
              <th style={{ width: 96 }}>100g당 kcal</th>
              {NUTRITION_KEYS.map((key) => (
                <th key={key} style={{ width: 78 }}>{NUTRITION_LABELS[key]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3 + NUTRITION_KEYS.length}><div className="admin-empty">제품을 불러오는 중입니다…</div></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={3 + NUTRITION_KEYS.length}>
                  <div className="admin-empty">
                    {error}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3 + NUTRITION_KEYS.length}>
                  <div className="admin-empty">
                    {search.trim() ? '조건에 맞는 제품이 없습니다.' : '입력할 제품이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => {
              const draft = drafts[row.id];
              if (!draft) return null;
              const check = checkBarcode(draft.barcode);
              const duplicate = duplicates.get(row.id);
              const problem = !check.valid ? check.message : duplicate ?? null;
              return (
                <tr key={row.id}>
                  <td>
                    <div className="admin-item-cell">
                      {row.imageUrl
                        ? <img src={row.imageUrl} alt="" loading="lazy" decoding="async" />
                        : <div className="admin-thumb-empty" aria-hidden="true" />}
                      <div>
                        <div className="admin-item-main admin-cleanup-name">{row.name}</div>
                        <div className="admin-item-sub">
                          {row.brandName}
                          {row.sourceUrl && (
                            <>
                              {' · '}
                              <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                                판매처 <ExternalLink size={10} />
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <input
                      value={draft.barcode}
                      onChange={(event) => update(row.id, { barcode: event.target.value })}
                      placeholder="8801234567893"
                      inputMode="numeric"
                      aria-label={`${row.name} 바코드`}
                      aria-invalid={problem ? true : undefined}
                      style={problem ? { borderColor: '#dc2626' } : undefined}
                    />
                    {problem && (
                      <div className="admin-item-sub" style={{ color: '#b91c1c', marginTop: 4 }}>
                        <AlertTriangle size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                        {problem}
                      </div>
                    )}
                    {!problem && check.message && (
                      <div className="admin-item-sub" style={{ marginTop: 4 }}>{check.message}</div>
                    )}
                  </td>
                  <td>
                    <input
                      value={draft.kcal}
                      onChange={(event) => update(row.id, { kcal: event.target.value })}
                      inputMode="decimal"
                      aria-label={`${row.name} 100g당 칼로리`}
                    />
                  </td>
                  {NUTRITION_KEYS.map((key) => (
                    <td key={key}>
                      <input
                        value={draft.nutrition[key]}
                        onChange={(event) => updateNutrition(row.id, key, event.target.value)}
                        inputMode="decimal"
                        aria-label={`${row.name} ${NUTRITION_LABELS[key]}`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProductFacts;
