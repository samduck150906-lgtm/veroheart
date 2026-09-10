import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchDiaryPage, type AdminDiaryRow } from '../../lib/adminApi';

const PAGE_SIZE = 20;

function formatDateTime(date: string, time: string | null): string {
  const normalized = date.replaceAll('-', '.');
  return time ? `${normalized} ${time.slice(0, 5)}` : normalized;
}

const AdminDiary: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const dateFrom = params.get('from') ?? '';
  const dateTo = params.get('to') ?? '';
  const petType = params.get('species') === 'cat' ? 'cat' : params.get('species') === 'dog' ? 'dog' : '';
  const photoParam = params.get('photo');
  const hasPhoto = photoParam === 'yes' ? true : photoParam === 'no' ? false : null;

  const [searchInput, setSearchInput] = useState(search);
  const [rows, setRows] = useState<AdminDiaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
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
  }, [searchInput, search, updateParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchDiaryPage({
        page,
        pageSize: PAGE_SIZE,
        query: search,
        dateFrom,
        dateTo,
        petType,
        hasPhoto,
      });
      setRows(result.rows);
      setTotal(result.total);
      if (result.rows.length === 0 && result.total > 0 && page > 1) updateParams({ page: String(page - 1) });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, hasPhoto, page, petType, search, updateParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>식이 다이어리</h2>
          <p>운영 확인에 필요한 급여 기록만 최소 범위로 표시합니다. 총 {total.toLocaleString()}건</p>
        </div>
        <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div className="admin-query-bar">
        <div className="admin-search-wrap admin-query-search">
          <Search size={16} className="admin-search-icon" />
          <label htmlFor="admin-diary-search" className="admin-visually-hidden">회원, 반려동물, 제품, 메모 검색</label>
          <input
            id="admin-diary-search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="회원, 반려동물, 제품, 메모 검색"
          />
        </div>
        <label className="admin-compact-field">
          <span>시작일</span>
          <input type="date" value={dateFrom} onChange={(event) => updateParams({ from: event.target.value || null, page: null })} />
        </label>
        <label className="admin-compact-field">
          <span>종료일</span>
          <input type="date" value={dateTo} onChange={(event) => updateParams({ to: event.target.value || null, page: null })} />
        </label>
        <label className="admin-compact-field">
          <span>대상</span>
          <select value={petType} onChange={(event) => updateParams({ species: event.target.value || null, page: null })}>
            <option value="">전체</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>
        </label>
        <label className="admin-compact-field">
          <span>사진</span>
          <select value={photoParam ?? ''} onChange={(event) => updateParams({ photo: event.target.value || null, page: null })}>
            <option value="">전체</option>
            <option value="yes">있음</option>
            <option value="no">없음</option>
          </select>
        </label>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table admin-diary-table">
          <thead>
            <tr>
              <th>급여 일시</th>
              <th>회원 / 반려동물</th>
              <th>제품</th>
              <th>급여량</th>
              <th>기호도</th>
              <th>사진</th>
              <th>메모</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  <td colSpan={7}><span className="admin-skeleton admin-skeleton-row" /></td>
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={7}><div className="admin-empty">다이어리 기록을 불러오지 못했습니다. <button type="button" className="admin-btn-soft" onClick={load}>다시 시도</button></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7}><div className="admin-empty">조건에 맞는 다이어리 기록이 없습니다.</div></td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.feedingDate, row.feedingTime)}</td>
                <td>
                  <div className="admin-item-main">{row.memberNickname}</div>
                  <div className="admin-item-sub">{row.petName} · {row.petType.toUpperCase()}</div>
                </td>
                <td className="admin-item-main">{row.productName}</td>
                <td>{row.amount === null ? '-' : `${row.amount.toLocaleString()} ${row.unit ?? ''}`.trim()}</td>
                <td>{row.preferenceLevel === null ? '-' : `${'★'.repeat(row.preferenceLevel)}${'☆'.repeat(5 - row.preferenceLevel)}`}</td>
                <td>
                  {row.imageUrl ? (
                    <a className="admin-photo-link" href={row.imageUrl} target="_blank" rel="noreferrer" aria-label="급여 사진 새 창에서 보기">
                      <ImageIcon size={16} /> 보기
                    </a>
                  ) : '-'}
                </td>
                <td className="admin-truncate" title={row.memo ?? undefined}>{row.memo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="다이어리 목록 페이지">
        <button type="button" className="admin-btn-soft" onClick={() => updateParams({ page: page > 2 ? String(page - 1) : null })} disabled={page <= 1 || loading}>
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">{page} / {totalPages}</span>
        <button type="button" className="admin-btn-soft" onClick={() => updateParams({ page: String(page + 1) })} disabled={page >= totalPages || loading}>
          다음 <ChevronRight size={14} />
        </button>
      </nav>
    </div>
  );
};

export default AdminDiary;
