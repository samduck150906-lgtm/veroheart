import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, RefreshCw, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  fetchTrashPage,
  purgeTrashItem,
  restoreTrashItem,
  type AdminTrashItem,
  type TrashEntityType,
} from '../../lib/adminApi';

const PAGE_SIZE = 20;

const TYPE_FILTERS: { key: TrashEntityType | ''; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'product', label: '제품' },
  { key: 'ingredient', label: '성분' },
];

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function daysSince(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

/**
 * 삭제 복원(휴지통).
 *
 * 제품·성분 삭제는 삭제 직전 상태를 스냅샷으로 남긴다. 여기서 되살리면 제품은
 * 원재료 연결·보장성분·리뷰까지 함께 복원된다. 완전히 지우고 싶을 때만
 * '영구 삭제'를 쓴다 — 그 뒤에는 되돌릴 수 없다.
 */
const AdminTrash: React.FC = () => {
  const [rows, setRows] = useState<AdminTrashItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<TrashEntityType | ''>('');
  const [includeRestored, setIncludeRestored] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<AdminTrashItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTrashPage({ page, pageSize: PAGE_SIZE, entityType, includeRestored });
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [entityType, includeRestored, page]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = async (item: AdminTrashItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await restoreTrashItem(item.id);
      notify.success(`“${item.label}”을(를) 복원했습니다.`);
      await load();
    } catch (err) {
      notify.error(`복원 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const confirmPurge = async () => {
    if (!purgeTarget || busyId) return;
    setBusyId(purgeTarget.id);
    try {
      await purgeTrashItem(purgeTarget.id);
      notify.success(`“${purgeTarget.label}”을(를) 영구 삭제했습니다.`);
      setPurgeTarget(null);
      await load();
    } catch (err) {
      notify.error(`영구 삭제 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>휴지통</h2>
          <p>복원 대기 {total.toLocaleString()}건</p>
        </div>
        <button type="button" className="admin-btn-soft" onClick={load} disabled={loading}>
          <RefreshCw size={15} /> 새로고침
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <p className="admin-item-sub" style={{ lineHeight: 1.7 }}>
          제품·성분을 삭제하면 바로 사라지지 않고 여기에 보관됩니다. <strong>복원</strong>을 누르면
          제품은 원재료 연결·보장성분·리뷰까지 함께 되살아납니다.
          <br />
          <strong>영구 삭제</strong>는 되돌릴 수 없습니다. 확실히 필요 없을 때만 사용하세요.
        </p>
      </div>

      <div className="admin-filter-row">
        {TYPE_FILTERS.map((filter) => (
          <button
            type="button"
            key={filter.key || 'all'}
            className={`admin-chip ${entityType === filter.key ? 'active' : ''}`}
            onClick={() => { setEntityType(filter.key); setPage(1); }}
          >
            {filter.label}
          </button>
        ))}
        <button
          type="button"
          className={`admin-chip ${includeRestored ? 'active' : ''}`}
          onClick={() => { setIncludeRestored((value) => !value); setPage(1); }}
        >
          복원된 항목 포함
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>항목</th>
              <th>유형</th>
              <th>삭제한 사람</th>
              <th>삭제 시각</th>
              <th>상태</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="admin-empty">데이터를 불러오는 중입니다...</div></td></tr>
            ) : error ? (
              <tr>
                <td colSpan={6}>
                  <div className="admin-empty">
                    휴지통을 불러오지 못했습니다: {error}
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><div className="admin-empty">휴지통이 비어 있습니다.</div></td></tr>
            ) : rows.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="admin-item-main">{item.label}</div>
                  {item.subLabel && <div className="admin-item-sub">{item.subLabel}</div>}
                </td>
                <td>
                  <span className={`admin-tag ${item.entityType === 'product' ? 'blue' : 'yellow'}`}>
                    {item.entityType === 'product'
                      ? <><ShoppingBag size={11} /> 제품</>
                      : <><FlaskConical size={11} /> 성분</>}
                  </span>
                </td>
                <td className="admin-item-sub">{item.deletedBy}</td>
                <td>
                  <div>{formatDateTime(item.deletedAt)}</div>
                  <div className="admin-item-sub">{daysSince(item.deletedAt)}일 경과</div>
                </td>
                <td>
                  {item.restoredAt ? (
                    <span className="admin-tag green">복원됨 · {formatDateTime(item.restoredAt)}</span>
                  ) : (
                    <span className="admin-tag orange">복원 대기</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-btn-soft"
                      onClick={() => restore(item)}
                      disabled={busyId !== null || Boolean(item.restoredAt)}
                    >
                      <RotateCcw size={14} /> {busyId === item.id ? '처리 중' : '복원'}
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn delete"
                      onClick={() => setPurgeTarget(item)}
                      disabled={busyId !== null}
                      aria-label={`${item.label} 영구 삭제`}
                      title="영구 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="휴지통 페이지">
        <button type="button" className="admin-btn-soft" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">{page} / {totalPages}</span>
        <button type="button" className="admin-btn-soft" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
          다음 <ChevronRight size={14} />
        </button>
      </nav>

      {purgeTarget && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !busyId) setPurgeTarget(null);
        }}>
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label="영구 삭제 확인">
            <h3>영구 삭제할까요?</h3>
            <p className="admin-modal-desc">
              “{purgeTarget.label}”의 백업 스냅샷을 지웁니다. 이후에는 <strong>복원할 수 없습니다.</strong>
            </p>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setPurgeTarget(null)} disabled={busyId !== null}>
                취소
              </button>
              <button type="button" className="admin-btn-danger" onClick={confirmPurge} disabled={busyId !== null}>
                <Trash2 size={15} /> {busyId ? '삭제 중…' : '영구 삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrash;
