import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, EyeOff, RotateCcw, Search, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  fetchUnmatchedPage,
  ignoreUnmatchedIngredient,
  mapUnmatchedIngredient,
  reopenUnmatchedIngredient,
  searchIngredients,
  type AdminIngredient,
  type UnmatchedIngredientRow,
  type UnmatchedStatus,
} from '../../lib/adminApi';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { key: UnmatchedStatus | 'all'; label: string }[] = [
  { key: 'pending', label: '검토 대기' },
  { key: 'mapped', label: '매핑 완료' },
  { key: 'ignored', label: '무시' },
  { key: 'all', label: '전체' },
];

const STATUS_TAG: Record<string, { tag: string; label: string }> = {
  pending: { tag: 'orange', label: '검토 대기' },
  mapped: { tag: 'green', label: '매핑 완료' },
  resolved: { tag: 'green', label: '매핑 완료' },
  ignored: { tag: 'blue', label: '무시' },
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 미매칭 원료명 검수 큐.
 *
 * 안전 규칙: 여기서의 매핑은 검수 상태와 매핑 대상만 기록한다. 사용자 점수·위험도
 * 판정에는 즉시 반영되지 않으며, canonical 승격은 별도 Phase 2 절차를 따른다.
 */
const AdminUnmatched: React.FC = () => {
  const [rows, setRows] = useState<UnmatchedIngredientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<UnmatchedStatus | 'all'>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<UnmatchedIngredientRow | null>(null);
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidates, setCandidates] = useState<AdminIngredient[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const candidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUnmatchedPage({ page, pageSize: PAGE_SIZE, status, search });
      setRows(result.rows);
      setTotal(result.total);
      if (result.rows.length === 0 && result.total > 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    // 필터/페이지 변경 시 큐를 다시 조회한다.
    load();
  }, [load]);

  // 상세 패널이 열리면 원문과 같은 이름부터 후보로 제안한다.
  useEffect(() => {
    if (!selected) return;
    setCandidateQuery(selected.raw_name);
    setNote(selected.review_note ?? '');
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    if (candidateTimer.current) clearTimeout(candidateTimer.current);
    const term = candidateQuery.trim();
    candidateTimer.current = setTimeout(async () => {
      if (!term) {
        setCandidates([]);
        return;
      }
      setCandidateLoading(true);
      try {
        setCandidates(await searchIngredients(term, 15));
      } catch {
        setCandidates([]);
      } finally {
        setCandidateLoading(false);
      }
    }, 250);
    return () => {
      if (candidateTimer.current) clearTimeout(candidateTimer.current);
    };
  }, [candidateQuery, selected]);

  const closePanel = () => {
    setSelected(null);
    setCandidates([]);
    setCandidateQuery('');
    setNote('');
  };

  const handleMap = async (ingredient: AdminIngredient) => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await mapUnmatchedIngredient(selected.id, ingredient.id, note.trim() || undefined);
      notify.success(`"${selected.raw_name}" → ${ingredient.name_ko} 로 매핑했습니다.`);
      closePanel();
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleIgnore = async (row: UnmatchedIngredientRow) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await ignoreUnmatchedIngredient(row.id, note.trim() || undefined);
      notify.success('무시 처리했습니다.');
      if (selected?.id === row.id) closePanel();
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (row: UnmatchedIngredientRow) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await reopenUnmatchedIngredient(row.id);
      notify.success('검토 대기 상태로 되돌렸습니다.');
      if (selected?.id === row.id) closePanel();
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>미매칭 성분 검수</h2>
          <p>
            성분 사전에서 찾지 못한 원료명 큐 · 총 {total.toLocaleString()}건
          </p>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.6 }}>
          여기서의 매핑은 <strong>검수 기록</strong>입니다. 사용자에게 보이는 점수·위험도 판정은 즉시 바뀌지 않으며,
          canonical 승격은 Phase 2 별도 절차(드라이런 → 검증 → 적용)를 따릅니다.
        </p>
      </div>

      <div className="admin-filter-row">
        {STATUS_FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.key}
            className={`admin-chip ${status === filter.key ? 'active' : ''}`}
            onClick={() => {
              setStatus(filter.key);
              setPage(1);
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-unmatched-search" className="admin-visually-hidden">
          미매칭 원료명 검색
        </label>
        <input
          id="admin-unmatched-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="원료명 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>원료명</th>
              <th>발생 횟수</th>
              <th>상태</th>
              <th>최초 발견</th>
              <th>최근 발견</th>
              <th style={{ textAlign: 'right' }}>검수</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">
                    큐를 불러오지 못했습니다.
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">
                    {status === 'pending'
                      ? '검토 대기 중인 미매칭 성분이 없습니다.'
                      : '조건에 맞는 항목이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const meta = STATUS_TAG[row.status] ?? STATUS_TAG.pending;
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="admin-item-main">{row.raw_name}</div>
                      <div className="admin-item-sub">{row.normalized_name}</div>
                    </td>
                    <td>
                      <strong>{row.occurrences.toLocaleString()}</strong>
                    </td>
                    <td>
                      <span className={`admin-tag ${meta.tag}`}>{meta.label}</span>
                      {row.reviewed_by && <div className="admin-item-sub">검수: {row.reviewed_by}</div>}
                    </td>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{formatDate(row.last_seen_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn-soft"
                          onClick={() => setSelected(row)}
                          disabled={submitting}
                        >
                          매핑
                        </button>
                        {row.status === 'pending' ? (
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleIgnore(row)}
                            disabled={submitting}
                            aria-label={`${row.raw_name} 무시 처리`}
                          >
                            <EyeOff size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-icon-btn"
                            onClick={() => handleReopen(row)}
                            disabled={submitting}
                            aria-label={`${row.raw_name} 되돌리기`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="미매칭 성분 페이지">
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          aria-label="다음 페이지"
        >
          다음 <ChevronRight size={14} />
        </button>
      </nav>

      {selected && (
        <div className="admin-modal-backdrop" onClick={() => !submitting && closePanel()}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-label="미매칭 성분 매핑" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>&quot;{selected.raw_name}&quot; 매핑</h3>
              <button type="button" className="admin-btn-soft" onClick={closePanel} aria-label="닫기" disabled={submitting}>
                <X size={16} />
              </button>
            </div>

            <p className="admin-modal-desc">
              발생 {selected.occurrences.toLocaleString()}회 · 최근 {formatDate(selected.last_seen_at)}
            </p>

            <div className="admin-form-group">
              <label htmlFor="unmatched-candidate">연결할 성분 검색</label>
              <input
                id="unmatched-candidate"
                value={candidateQuery}
                onChange={(e) => setCandidateQuery(e.target.value)}
                placeholder="성분 사전에서 검색"
              />
            </div>

            <div className="admin-picker-list" style={{ maxHeight: 220 }}>
              {candidateLoading ? (
                <div className="admin-empty">검색 중…</div>
              ) : candidates.length === 0 ? (
                <div className="admin-empty">
                  일치하는 성분이 없습니다. 성분 사전에 먼저 등록한 뒤 매핑해 주세요.
                </div>
              ) : (
                candidates.map((ingredient) => (
                  <button
                    type="button"
                    key={ingredient.id}
                    className="admin-picker-item"
                    onClick={() => handleMap(ingredient)}
                    disabled={submitting}
                  >
                    <span className="admin-item-main">
                      <Check size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                      {ingredient.name_ko}
                    </span>
                    <span className="admin-item-sub">{ingredient.name_en || '-'} · {ingredient.risk_level}</span>
                  </button>
                ))
              )}
            </div>

            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="unmatched-note">검수 메모 (선택)</label>
              <textarea
                id="unmatched-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="판단 근거를 남겨두면 이후 검수에 도움이 됩니다."
              />
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => handleIgnore(selected)} disabled={submitting}>
                무시 처리
              </button>
              <button type="button" className="admin-btn-soft" onClick={closePanel} disabled={submitting}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUnmatched;
