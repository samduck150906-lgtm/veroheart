import AdminCorrectionDialog from './AdminCorrectionDialog';
import { correctFeedingLog } from '../../lib/adminSupportApi';
import { notify } from '../../store/useNotification';
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
  other: { label: '기타', tag: 'gray' },
};

function mealPeriodBadge(value: string | null) {
  if (!value) return null;
  return MEAL_PERIOD_LABEL[value] ?? { label: value, tag: 'gray' };
}

const AdminDiary: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') ?? '';
  const userId = params.get('userId') ?? '';
  const dateFrom = params.get('from') ?? '';
  const dateTo = params.get('to') ?? '';
  const petType = params.get('species') === 'cat' ? 'cat' : params.get('species') === 'dog' ? 'dog' : '';
  const photoParam = params.get('photo');
  const hasPhoto = photoParam === 'yes' ? true : photoParam === 'no' ? false : null;

  const [searchInput, setSearchInput] = useState(search);
  const [rows, setRows] = useState<AdminDiaryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<AdminDiaryRow | null>(null);
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
        ...(userId ? { userId } : {}),
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
  }, [dateFrom, dateTo, hasPhoto, page, petType, search, userId, updateParams]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>식이 다이어리</h2>
          <p>보호자가 앱에서 기록한 급여 일지입니다. 조회·지원 정정 · 총 {total.toLocaleString()}건</p>
        </div>
        <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          <strong>이 화면은 “보호자가 무엇을 언제 먹였는지 앱에 남긴 기록”입니다.</strong> 관리자가 만드는 데이터가
          아니라 사용자가 직접 올린 것이며, 실제로 앱을 쓰는 회원이 있는지·어떤 제품이 실제로 급여되는지 확인하는
          용도입니다. 보호자의 문의를 확인한 뒤 사유를 남겨 정정할 수 있습니다.
        </p>
      </div>

      {userId && <p className="admin-item-sub">선택한 회원의 기록만 표시 중 <button type="button" className="admin-btn-soft" onClick={() => updateParams({userId:null,page:null})}>회원 필터 해제</button></p>}
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
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <tr key={index} aria-hidden="true">
                  <td colSpan={9}><span className="admin-skeleton admin-skeleton-row" /></td>
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={9}><div className="admin-empty">다이어리 기록을 불러오지 못했습니다: {error} <button type="button" className="admin-btn-soft" onClick={load}>다시 시도</button></div></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9}><div className="admin-empty">조건에 맞는 다이어리 기록이 없습니다.</div></td></tr>
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
                <td className="admin-item-main">{row.productName}<div className="admin-item-sub">{({food:'사료',snack:'간식',supplement:'영양제',custom:'직접 입력'} as Record<string,string>)[row.productType ?? ''] ?? '유형 미표기'}</div></td>
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
                <td><button type="button" className="admin-btn-soft" onClick={() => setEditing(row)} aria-label={row.petName + ' 급여 기록 정정'}>정정</button> <a href={'/admin/audit?targetId=' + row.id}>변경 이력</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {editing && <AdminCorrectionDialog title={editing.petName + ' 급여 기록 정정'} onClose={() => setEditing(null)} fields={[
        {key:'feeding_date',label:'급여일',type:'date',value:editing.feedingDate},
        {key:'feeding_time',label:'급여 시각',type:'time',value:editing.feedingTime?.slice(0,5) ?? ''},
        {key:'meal_period',label:'시간대',value:editing.mealPeriod ?? '',options:[{value:'',label:'미지정'},...Object.entries(MEAL_PERIOD_LABEL).map(([value,meta])=>({value,label:meta.label}))]},
        {key:'amount',label:'급여량',type:'number',value:editing.amount === null ? '' : String(editing.amount)},
        {key:'unit',label:'단위',value:editing.unit ?? '',options:['','g','ml','개','정','캡슐','포','스푼'].map(value=>({value,label:value || '미지정'}))},
        {key:'preference_level',label:'기호도',value:editing.preferenceLevel === null ? '' : String(editing.preferenceLevel),options:['','1','2','3','4','5'].map(value=>({value,label:value ? value + '점' : '미지정'}))},
        {key:'memo',label:'메모',type:'textarea',value:editing.memo ?? ''},
        {key:'reaction_note',label:'특이사항',type:'textarea',value:editing.reactionNote ?? ''},
      ]} onSave={async (values, reason) => {
        const expected = {feeding_date:editing.feedingDate,feeding_time:editing.feedingTime,meal_period:editing.mealPeriod,amount:editing.amount,unit:editing.unit,preference_level:editing.preferenceLevel,memo:editing.memo,reaction_note:editing.reactionNote};
        await correctFeedingLog(editing.id,{...values,amount:values.amount ? Number(values.amount) : null,preference_level:values.preference_level ? Number(values.preference_level) : null},expected,reason);
        notify.success('급여 기록을 정정했습니다.'); await load();
      }} />}

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
