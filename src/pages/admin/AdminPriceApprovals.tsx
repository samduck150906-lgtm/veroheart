import React, { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, TrendingDown, TrendingUp, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  fetchPriceProposals,
  reviewPriceProposal,
  runCoupangPriceSync,
  type PriceProposal,
  type PriceProposalStatus,
  type PriceSyncRun,
} from '../../lib/adminApi';

const PAGE_SIZE = 20;

const STATUS_FILTERS: { key: PriceProposalStatus | 'all'; label: string }[] = [
  { key: 'pending', label: '요청중' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '거절됨' },
  { key: 'all', label: '전체' },
];

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '-';
  return `₩${value.toLocaleString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

/**
 * 판매가 변동 승인.
 *
 * 판매처에서 가격이 바뀌어도 앱에 바로 반영하지 않는다. 변동을 감지하면 여기에
 * '요청중'으로 쌓이고, 승인해야 제품 가격이 바뀐다. 잘못된 외부 값이 그대로
 * 보호자에게 노출되는 것을 막기 위한 단계다.
 */
const AdminPriceApprovals: React.FC = () => {
  const [rows, setRows] = useState<PriceProposal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<PriceProposalStatus | 'all'>('pending');
  const [lastRun, setLastRun] = useState<PriceSyncRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchPriceProposals({ page, pageSize: PAGE_SIZE, status });
      setRows(result.rows);
      setTotal(result.total);
      setLastRun(result.lastRun);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (proposal: PriceProposal, decision: 'approve' | 'reject') => {
    if (busyId) return;
    setBusyId(proposal.id);
    try {
      const result = await reviewPriceProposal(proposal.id, decision);
      notify.success(
        decision === 'approve'
          ? `“${proposal.productName}” 가격을 ${formatPrice(result.appliedPrice)}로 반영했습니다.`
          : `“${proposal.productName}” 가격 변동을 거절했습니다.`,
      );
      await load();
    } catch (err) {
      notify.error(`처리 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await runCoupangPriceSync();
      notify.success(
        `제품 ${result.checked}건을 확인해 변동 ${result.changed}건을 찾았습니다.`
        + (result.failed > 0 ? ` (실패 ${result.failed}건)` : ''),
      );
      if (result.failures.length > 0) notify.error(result.failures[0]);
      await load();
    } catch (err) {
      notify.error(`동기화 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>판매가 승인</h2>
          <p>
            {STATUS_FILTERS.find((item) => item.key === status)?.label} {total.toLocaleString()}건
            {lastRun && ` · 마지막 확인 ${formatDateTime(lastRun.started_at)} (확인 ${lastRun.checked} · 변동 ${lastRun.changed}${lastRun.failed > 0 ? ` · 실패 ${lastRun.failed}` : ''})`}
          </p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading || syncing}>
            <RefreshCw size={15} /> 새로고침
          </button>
          <button type="button" className="admin-btn-primary" onClick={sync} disabled={syncing}>
            <RefreshCw size={15} /> {syncing ? '확인 중…' : '지금 판매가 확인'}
          </button>
        </div>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          판매처(쿠팡)에서 가격이 바뀌면 여기에 <strong>요청중</strong>으로 쌓입니다.
          <strong>승인</strong>을 눌러야 제품 가격이 바뀌고 앱에 반영됩니다 — 외부 값이 그대로
          보호자에게 나가지 않도록 한 단계를 둡니다.
          <br />
          <strong>지금 판매가 확인</strong>은 한 번에 25건씩, 확인한 지 가장 오래된 제품부터 봅니다.
          여러 번 누르면 전체를 한 바퀴 돕니다.
        </p>
        {lastRun?.error && (
          <p className="admin-item-sub" style={{ color: '#b45309', marginTop: 8 }}>
            마지막 실행 오류: {lastRun.error}
          </p>
        )}
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
              <th>제품</th>
              <th>현재 가격</th>
              <th>제안 가격</th>
              <th>변동</th>
              <th>감지</th>
              <th>상태</th>
              <th style={{ textAlign: 'right' }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="admin-empty">데이터를 불러오는 중입니다…</div></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    가격 제안을 불러오지 못했습니다: {error}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">
                    {status === 'pending' ? '승인을 기다리는 가격 변동이 없습니다.' : '해당하는 기록이 없습니다.'}
                  </div>
                </td>
              </tr>
            ) : rows.map((row) => {
              const base = row.livePrice ?? row.currentPrice ?? 0;
              const diff = row.proposedPrice - base;
              const rose = diff > 0;
              // 감지 이후 누군가 수동으로 가격을 바꿨다면 승인 전에 알려 준다.
              const movedSince = row.livePrice !== null
                && row.currentPrice !== null
                && row.livePrice !== row.currentPrice;
              return (
                <tr key={row.id}>
                  <td>
                    <div className="admin-item-cell">
                      {row.imageUrl
                        ? <img src={row.imageUrl} alt="" loading="lazy" decoding="async" />
                        : <div className="admin-thumb-empty" aria-hidden="true" />}
                      <div>
                        <div className="admin-item-main admin-cleanup-name">{row.productName}</div>
                        <div className="admin-item-sub">{row.brandName}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong>{formatPrice(row.livePrice ?? row.currentPrice)}</strong>
                    {movedSince && (
                      <div className="admin-item-sub" style={{ color: '#b45309' }}>
                        감지 시점 {formatPrice(row.currentPrice)}에서 바뀜
                      </div>
                    )}
                  </td>
                  <td><strong>{formatPrice(row.proposedPrice)}</strong></td>
                  <td>
                    <span className={`admin-tag ${rose ? 'red' : 'green'}`}>
                      {rose ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {rose ? '+' : ''}{diff.toLocaleString()}원
                    </span>
                  </td>
                  <td>
                    <div>{formatDateTime(row.detectedAt)}</div>
                    {row.sourceUrl && (
                      <a className="admin-item-sub" href={row.sourceUrl} target="_blank" rel="noreferrer">
                        판매처 <ExternalLink size={11} />
                      </a>
                    )}
                  </td>
                  <td>
                    <span className={`admin-tag ${
                      row.status === 'pending' ? 'orange' : row.status === 'approved' ? 'green' : 'gray'
                    }`}>
                      {row.status === 'pending' ? '요청중' : row.status === 'approved' ? '승인됨' : '거절됨'}
                    </span>
                    {row.reviewedBy && <div className="admin-item-sub">{row.reviewedBy}</div>}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {row.status === 'pending' ? (
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn-primary"
                          onClick={() => review(row, 'approve')}
                          disabled={busyId !== null}
                        >
                          <Check size={14} /> {busyId === row.id ? '처리 중' : '승인'}
                        </button>
                        <button
                          type="button"
                          className="admin-btn-soft"
                          onClick={() => review(row, 'reject')}
                          disabled={busyId !== null}
                        >
                          <X size={14} /> 거절
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

      <nav className="admin-pagination" aria-label="가격 제안 페이지">
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

export default AdminPriceApprovals;
