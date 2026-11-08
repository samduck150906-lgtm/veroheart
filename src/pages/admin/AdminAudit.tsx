import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAdminAudit, type AdminAudit } from '../../lib/adminSupportApi';

const TABLES: Record<string, string> = {
  products: '제품',
  ingredients: '원료',
  pets: '반려동물',
  pet_feeding_logs: '급여 기록',
  reviews: '별점',
  product_requests: '제품 요청',
  product_scan_submissions: '스캔 검토',
  users: '회원',
  app_settings: '시스템 설정',
};
export default function AdminAudit() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1),
    table = params.get('table') ?? '',
    targetId = params.get('targetId') ?? '';
  const [input, setInput] = useState(targetId);
  const [data, setData] = useState<{ rows: AdminAudit[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const update = (key: string, value: string) => {
    setLoading(true);
    setRevision((v) => v + 1);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.delete('page');
      if (value) n.set(key, value);
      else n.delete(key);
      return n;
    });
  };
  useEffect(() => {
    let active = true;
    fetchAdminAudit({ page, pageSize: 20, table, targetId })
      .then((v) => {
        if (active) {
          setData(v);
          setError('');
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : '변경 이력 조회 실패');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, table, targetId, revision]);
  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h2>관리자 변경 이력</h2>
          <p>
            총 {data.total}건 · 처리 담당자와 사유·변경 전후 값을 확인합니다.
          </p>
        </div>
        <button
          className="admin-btn-soft"
          onClick={() => {
            setLoading(true);
            setRevision((v) => v + 1);
          }}
        >
          새로고침
        </button>
      </div>
      <form
        className="admin-query-bar"
        onSubmit={(e) => {
          e.preventDefault();
          update('targetId', input.trim());
        }}
      >
        <label>
          관리 대상{' '}
          <select
            value={table}
            onChange={(e) => update('table', e.target.value)}
          >
            <option value="">전체</option>
            {Object.entries(TABLES).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          대상 ID{' '}
          <input
            value={input}
            maxLength={100}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="submit" className="admin-btn-soft">
          검색
        </button>
      </form>
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p>변경 이력을 불러오는 중…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>담당자</th>
                <th>작업</th>
                <th>대상</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? (
                data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                    <td>{r.actor}</td>
                    <td>
                      {r.action === 'supportCorrection'
                        ? '지원 정정'
                        : r.action}
                    </td>
                    <td>
                      {TABLES[r.target_table] ?? r.target_table}
                      <div className="admin-item-sub">{r.target_id}</div>
                    </td>
                    <td>
                      <details>
                        <summary>
                          {typeof r.detail?.reason === 'string'
                            ? r.detail.reason
                            : '처리 내용 보기'}
                        </summary>
                        <pre
                          style={{
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'anywhere',
                            maxWidth: 520,
                          }}
                        >
                          {JSON.stringify(r.detail, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>변경 이력이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <nav className="admin-pagination" aria-label="변경 이력 페이지">
        <button
          className="admin-btn-soft"
          disabled={loading || page <= 1}
          onClick={() => {
            setLoading(true);
            setParams((p) => {
              const n = new URLSearchParams(p);
              n.set('page', String(page - 1));
              return n;
            });
          }}
        >
          이전
        </button>
        <span>
          {page} / {Math.max(1, Math.ceil(data.total / 20))}
        </span>
        <button
          className="admin-btn-soft"
          disabled={loading || page * 20 >= data.total}
          onClick={() => {
            setLoading(true);
            setParams((p) => {
              const n = new URLSearchParams(p);
              n.set('page', String(page + 1));
              return n;
            });
          }}
        >
          다음
        </button>
      </nav>
    </div>
  );
}
