import { useCallback, useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';

import {
  fetchAdminScanEvidence,
  fetchAdminScanSubmissions,
  reviewAdminScanSubmission,
  type AdminScanEvidence,
  type AdminScanSubmission,
} from '../../lib/adminApi';
import { notify } from '../../store/useNotification';

const PAGE_SIZE = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('ko-KR');
}

export default function AdminScanSubmissions() {
  const [rows, setRows] = useState<AdminScanSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('needs_review');
  const [errorCode, setErrorCode] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminScanSubmission | null>(null);
  const [evidence, setEvidence] = useState<AdminScanEvidence | null>(null);
  const [reason, setReason] = useState('');
  const [targetProductId, setTargetProductId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminScanSubmissions({ page, pageSize: PAGE_SIZE, status, errorCode, dateFrom, dateTo });
      setRows(result.rows);
      setTotal(result.total);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '스캔 대기열을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, errorCode, page, status]);

  useEffect(() => { void load(); }, [load]);

  const open = async (row: AdminScanSubmission) => {
    setSelected(row);
    setReason('');
    setTargetProductId('');
    setEvidence(null);
    try {
      setEvidence(await fetchAdminScanEvidence(row.id));
    } catch {
      notify.error('증빙 사진을 불러오지 못했습니다.');
    }
  };

  const review = async (decision: 'merge' | 'reject' | 'retry') => {
    if (!selected || !reason.trim()) return;
    if (decision === 'merge' && !UUID.test(targetProductId.trim())) return;
    setBusy(true);
    try {
      await reviewAdminScanSubmission({
        id: selected.id,
        decision,
        ...(decision === 'merge' ? { targetProductId: targetProductId.trim() } : {}),
        reason: reason.trim(),
      });
      notify.success(decision === 'merge' ? '기존 제품에 연결했습니다.' : decision === 'reject' ? '반려했습니다.' : '재시도 상태로 돌렸습니다.');
      setSelected(null);
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '처리하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap"><h2>스캔 검토 대기열</h2><p>{total.toLocaleString()}건</p></div>
        <button type="button" className="admin-btn-soft" onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> 새로고침</button>
      </div>

      <div className="admin-card" style={{ marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(140px,1fr))', gap: 12 }}>
        <label className="admin-item-sub">상태
          <select aria-label="상태" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="needs_review">검토 필요</option><option value="failed">실패</option><option value="all">전체</option>
          </select>
        </label>
        <label className="admin-item-sub">오류 코드<input aria-label="오류 코드" value={errorCode} onChange={(event) => { setErrorCode(event.target.value); setPage(1); }} placeholder="예: extraction_failed" /></label>
        <label className="admin-item-sub">시작일<input aria-label="시작일" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} /></label>
        <label className="admin-item-sub">종료일<input aria-label="종료일" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} /></label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>제품</th><th>바코드</th><th>상태 / 오류</th><th>접수 시각</th><th style={{ textAlign: 'right' }}>처리</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5}><div className="admin-empty">불러오는 중입니다…</div></td></tr>
              : rows.length === 0 ? <tr><td colSpan={5}><div className="admin-empty">해당하는 스캔이 없습니다.</div></td></tr>
                : rows.map((row) => (
                  <tr key={row.id}>
                    <td><div className="admin-item-main">{row.productName ?? '제품명 미확인'}</div><div className="admin-item-sub">{row.brandName ?? '브랜드 미확인'}</div></td>
                    <td><code>{row.scannedBarcode ?? '-'}</code></td>
                    <td><span className={`admin-tag ${row.status === 'failed' ? 'red' : 'orange'}`}>{row.status}</span>{row.errorCode && <div className="admin-item-sub">{row.errorCode}</div>}</td>
                    <td><div className="admin-item-sub">{formatDate(row.createdAt)}</div></td>
                    <td style={{ textAlign: 'right' }}><button type="button" className="admin-btn-soft" onClick={() => void open(row)}><Eye size={14} /> 처리 열기</button></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <section className="admin-card" style={{ marginTop: 16 }}>
          <div className="admin-title-wrap"><h3>{selected.productName ?? '제품명 미확인'}</h3><p>{selected.id}</p></div>
          {evidence && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
              {Object.entries(evidence).flatMap(([category, urls]) => urls.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="admin-btn-soft">{category} 사진</a>
              )))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="admin-item-sub">대상 제품 ID<input aria-label="대상 제품 ID" value={targetProductId} onChange={(event) => setTargetProductId(event.target.value)} placeholder="UUID 전체 입력" /></label>
            <label className="admin-item-sub">처리 사유<input aria-label="처리 사유" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="판단 근거를 기록" /></label>
          </div>
          <div className="admin-actions" style={{ marginTop: 14 }}>
            <button type="button" className="admin-btn-primary" disabled={busy || !reason.trim() || !UUID.test(targetProductId.trim())} onClick={() => void review('merge')}>기존 제품에 병합</button>
            <button type="button" className="admin-btn-soft" disabled={busy || !reason.trim()} onClick={() => void review('retry')}>재시도</button>
            <button type="button" className="admin-btn-soft" disabled={busy || !reason.trim()} onClick={() => void review('reject')}>반려</button>
          </div>
        </section>
      )}

      <nav className="admin-pagination" aria-label="스캔 대기열 페이지">
        <button type="button" className="admin-btn-soft" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>이전</button>
        <span className="admin-pagination-label">{page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
        <button type="button" className="admin-btn-soft" disabled={page * PAGE_SIZE >= total || loading} onClick={() => setPage((value) => value + 1)}>다음</button>
      </nav>
    </div>
  );
}
