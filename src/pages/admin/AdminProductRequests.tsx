import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  fetchProductRequests,
  reviewProductRequest,
  type AdminProductRequest,
  type ProductRequestStatus,
} from '../../lib/adminApi';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { key: ProductRequestStatus | 'all'; label: string }[] = [
  { key: 'pending', label: '대기' },
  { key: 'registered', label: '등록함' },
  { key: 'rejected', label: '반려' },
  { key: 'all', label: '전체' },
];

const STATUS_BADGE: Record<ProductRequestStatus, { label: string; tag: string }> = {
  pending: { label: '대기', tag: 'orange' },
  registered: { label: '등록함', tag: 'green' },
  rejected: { label: '반려', tag: 'gray' },
};

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

/**
 * 사용자 제품 등록 요청.
 *
 * 검색 결과가 없을 때 사용자가 남긴 요청이 쌓인다. 검색 로그가 없는 지금,
 * 이 목록이 "어떤 제품을 먼저 채워야 하는가"에 대한 유일한 근거다.
 * 같은 제품을 여러 사람이 요청했으면 요청 수를 함께 보여 준다.
 */
const AdminProductRequests: React.FC = () => {
  const [rows, setRows] = useState<AdminProductRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ProductRequestStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProductRequests({ page, pageSize: PAGE_SIZE, status });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (request: AdminProductRequest, next: ProductRequestStatus) => {
    if (busyId) return;
    setBusyId(request.id);
    try {
      await reviewProductRequest(request.id, next);
      notify.success(
        next === 'registered'
          ? `“${request.requestedName}”을(를) 등록함으로 표시했습니다.`
          : `“${request.requestedName}” 요청을 반려했습니다.`,
      );
      await load();
    } catch (err) {
      notify.error(`처리 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>제품 등록 요청</h2>
          <p>{STATUS_FILTERS.find((item) => item.key === status)?.label} {total.toLocaleString()}건</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
            <RefreshCw size={15} /> 새로고침
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          사용자가 검색했지만 결과가 없어 등록을 요청한 제품입니다.
          <strong>요청 수</strong>가 여러 건이면 그만큼 여러 사람이 같은 제품을 찾고 있다는 뜻입니다 —
          무엇부터 채울지 정하는 근거로 쓰세요.
          <br />
          제품을 실제로 만드는 것은 <strong>제품 관리</strong>에서 하고, 여기서는 처리 여부만 표시합니다.
        </p>
      </div>

      <div className="admin-filter-row">
        {STATUS_FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.key}
            className={`admin-chip ${status === filter.key ? 'active' : ''}`}
            onClick={() => { setStatus(filter.key); setPage(1); }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>요청 제품</th>
              <th style={{ width: 80 }}>요청 수</th>
              <th style={{ width: 120 }}>요청자</th>
              <th style={{ width: 140 }}>요청 시각</th>
              <th style={{ width: 100 }}>상태</th>
              <th style={{ textAlign: 'right', width: 180 }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="admin-empty">요청을 불러오는 중입니다…</div></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">
                    요청을 불러오지 못했습니다: {error}
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
                    {status === 'pending' ? '대기 중인 등록 요청이 없습니다.' : '해당하는 요청이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => {
              const badge = STATUS_BADGE[row.status];
              return (
                <tr key={row.id}>
                  <td>
                    <div className="admin-item-main admin-cleanup-name">{row.requestedName}</div>
                    {row.searchQuery && row.searchQuery !== row.requestedName && (
                      <div className="admin-item-sub">검색어: {row.searchQuery}</div>
                    )}
                    {row.note && <div className="admin-item-sub">{row.note}</div>}
                    {row.productUrl && (
                      <a className="admin-item-sub" href={row.productUrl} target="_blank" rel="noreferrer">
                        제품 링크 <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td>
                    {row.requestCount > 1
                      ? <span className="admin-tag red">{row.requestCount}명</span>
                      : <span className="admin-item-sub">1명</span>}
                  </td>
                  <td><div className="admin-item-sub">{row.nickname}</div></td>
                  <td><div className="admin-item-sub">{formatDateTime(row.createdAt)}</div></td>
                  <td>
                    <span className={`admin-tag ${badge.tag}`}>{badge.label}</span>
                    {row.reviewedBy && <div className="admin-item-sub">{row.reviewedBy}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {row.status === 'pending' ? (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={() => review(row, 'registered')}
                          disabled={busyId !== null}
                        >
                          <Check size={14} /> {busyId === row.id ? '처리 중' : '등록함'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-soft"
                          onClick={() => review(row, 'rejected')}
                          disabled={busyId !== null}
                        >
                          <X size={14} /> 반려
                        </button>
                      </div>
                    ) : (
                      <span className="admin-item-sub">{formatDateTime(row.reviewedAt)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="등록 요청 페이지">
        <button type="button" className="admin-btn-soft" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">{page} / {totalPages}</span>
        <button type="button" className="admin-btn-soft" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
          다음 <ChevronRight size={14} />
        </button>
      </nav>
    </div>
  );
};

export default AdminProductRequests;
