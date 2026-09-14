import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { fetchDiaryPage, type AdminDiaryRow } from '../../lib/adminApi';

const PAGE_SIZE = 20;

function formatDateTime(date: string, time: string | null): string {
  const normalized = date.replaceAll('-', '.');
  return time ? `${normalized} ${time.slice(0, 5)}` : normalized;
}

/** 앱 입력 화면과 같은 구분을 관리자에서도 같은 말로 보여 준다. */
const MEAL_PERIOD_LABEL: Record<string, { label: string; tag: string }> = {
  morning: { label: '아침', tag: 'yellow' },
  lunch: { label: '점심', tag: 'blue' },
  dinner: { label: '저녁', tag: 'gray' },
  snack: { label: '간식', tag: 'green' },
};

function mealPeriodBadge(value: string | null) {
  if (!value) return null;
  return MEAL_PERIOD_LABEL[value] ?? { label: value, tag: 'gray' };
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
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
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
    } catch (err) {
      // 원인을 감추면 "Edge Function 미배포"인지 "권한 문제"인지 구분할 수 없었다.
      setError(err instanceof Error ? err.message : String(err));
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
          <p>보호자가 앱에서 기록한 급여 일지입니다. 읽기 전용 · 총 {total.toLocaleString()}건</p>
        </div>
        <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          <strong>이 화면은 “보호자가 무엇을 언제 먹였는지 앱에 남긴 기록”입니다.</strong> 관리자가 만드는 데이터가
          아니라 사용자가 직접 올린 것이며, 실제로 앱을 쓰는 회원이 있는지·어떤 제품이 실제로 급여되는지 확인하는
          용도입니다. 여기서는 수정·삭제하지 않고 조회만 합니다.
        </p>
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
              <th>시간대</th>
              <th>회원 / 반려동물</th>
              <th>제품</th>
              <th>급여량</th>
              <th>기호도</th>
              <th>사진</th>
              <th>메모 · 특이사항</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  <td colSpan={8}><span className="admin-skeleton admin-skeleton-row" /></td>
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={8}><div className="admin-empty">다이어리 기록을 불러오지 못했습니다: {error} <button type="button" className="admin-btn-soft" onClick={load}>다시 시도</button></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8}><div className="admin-empty">조건에 맞는 다이어리 기록이 없습니다.</div></td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.feedingDate, row.feedingTime)}</td>
                <td>
                  {(() => {
                    const badge = mealPeriodBadge(row.mealPeriod as string | null);
                    return badge ? <span className={`admin-tag ${badge.tag}`}>{badge.label}</span> : '-';
                  })()}
                </td>
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
                <td className="admin-truncate" title={[row.memo, row.reactionNote].filter(Boolean).join(' / ') || undefined}>
                  <div>{row.memo || '-'}</div>
                  {row.reactionNote && (
                    <div className="admin-item-sub" style={{ color: '#b45309' }}>특이사항: {row.reactionNote}</div>
                  )}
                </td>
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
