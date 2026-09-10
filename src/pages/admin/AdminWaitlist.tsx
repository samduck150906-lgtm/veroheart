import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchWaitlistPage, type AdminWaitlistRow } from '../../lib/adminApi';
import { waitlistRowsToCsv } from '../../lib/adminCsv';
import { notify } from '../../store/useNotification';

const PAGE_SIZE = 20;
const EXPORT_PAGE_SIZE = 100;
const EXPORT_LIMIT = 5000;

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const part = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}.${part(date.getMonth() + 1)}.${part(date.getDate())} ${part(date.getHours())}:${part(date.getMinutes())}`;
}

const AdminWaitlist: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const source = params.get('source') ?? '';
  const consentParam = params.get('marketing');
  const marketingConsent = consentParam === 'yes' ? true : consentParam === 'no' ? false : null;
  const [searchInput, setSearchInput] = useState(search);
  const [rows, setRows] = useState<AdminWaitlistRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  }, [setParams]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (searchInput !== search) updateParams({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [search, searchInput, updateParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchWaitlistPage({ page, pageSize: PAGE_SIZE, query: search, source, marketingConsent });
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [marketingConsent, page, search, source]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const exported: AdminWaitlistRow[] = [];
      const maxRows = Math.min(total, EXPORT_LIMIT);
      for (let currentPage = 1; exported.length < maxRows; currentPage += 1) {
        const result = await fetchWaitlistPage({
          page: currentPage,
          pageSize: EXPORT_PAGE_SIZE,
          query: search,
          source,
          marketingConsent,
        });
        exported.push(...result.rows);
        if (result.rows.length < EXPORT_PAGE_SIZE) break;
      }
      const blob = new Blob([`\uFEFF${waitlistRowsToCsv(exported.slice(0, EXPORT_LIMIT))}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `veroro-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify.success(`${Math.min(exported.length, EXPORT_LIMIT).toLocaleString()}건을 CSV로 내보냈습니다.`);
      if (total > EXPORT_LIMIT) notify.warning(`개인정보 보호와 브라우저 부하를 위해 최대 ${EXPORT_LIMIT.toLocaleString()}건만 내보냈습니다.`);
    } catch {
      notify.error('CSV 내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>대기자 명단</h2>
          <p>출시 알림 신청자 {total.toLocaleString()}명 · 운영 목적 외 사용 금지</p>
        </div>
        <div className="admin-actions">
          <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}><RefreshCw size={15} /> 새로고침</button>
          <button type="button" className="admin-btn-primary" onClick={exportCsv} disabled={exporting || loading || total === 0}>
            <Download size={15} /> {exporting ? '내보내는 중…' : 'CSV 내보내기'}
          </button>
        </div>
      </div>

      <div className="admin-query-bar">
        <div className="admin-search-wrap admin-query-search">
          <Search size={16} className="admin-search-icon" />
          <label htmlFor="admin-waitlist-search" className="admin-visually-hidden">이메일 검색</label>
          <input id="admin-waitlist-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="이메일 검색" />
        </div>
        <label className="admin-compact-field">
          <span>유입 경로</span>
          <input value={source} onChange={(event) => updateParams({ source: event.target.value.trim() || null, page: null })} placeholder="예: landing" />
        </label>
        <label className="admin-compact-field">
          <span>마케팅 동의</span>
          <select value={consentParam ?? ''} onChange={(event) => updateParams({ marketing: event.target.value || null, page: null })}>
            <option value="">전체</option>
            <option value="yes">동의</option>
            <option value="no">미동의</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>이메일</th><th>전화번호</th><th>유입 경로</th><th>마케팅</th><th>개인정보</th><th>등록일</th></tr></thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => <tr key={index} aria-hidden="true"><td colSpan={6}><span className="admin-skeleton admin-skeleton-row" /></td></tr>)
            ) : error ? (
              <tr><td colSpan={6}><div className="admin-empty">대기자 명단을 불러오지 못했습니다. <button type="button" className="admin-btn-soft" onClick={load}>다시 시도</button></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><div className="admin-empty">조건에 맞는 신청자가 없습니다.</div></td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td className="admin-item-main">{row.email}</td>
                <td>{row.phone || '-'}</td>
                <td><span className="admin-tag yellow">{row.source}</span></td>
                <td><span className={`admin-tag ${row.marketingConsent ? 'green' : 'gray'}`}>{row.marketingConsent ? '동의' : '미동의'}</span></td>
                <td><span className={`admin-tag ${row.privacyConsent ? 'green' : 'red'}`}>{row.privacyConsent ? '동의' : '확인 필요'}</span></td>
                <td>{formatDate(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="대기자 명단 페이지">
        <button type="button" className="admin-btn-soft" onClick={() => updateParams({ page: page > 2 ? String(page - 1) : null })} disabled={page <= 1 || loading}><ChevronLeft size={14} /> 이전</button>
        <span className="admin-pagination-label">{page} / {totalPages}</span>
        <button type="button" className="admin-btn-soft" onClick={() => updateParams({ page: String(page + 1) })} disabled={page >= totalPages || loading}>다음 <ChevronRight size={14} /></button>
      </nav>
    </div>
  );
};

export default AdminWaitlist;
