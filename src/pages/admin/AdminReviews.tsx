import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchAdminReviews,
  moderateReview,
  type AdminReview,
} from '../../lib/adminSupportApi';
import { notify } from '../../store/useNotification';
import AdminCorrectionDialog from './AdminCorrectionDialog';

export default function AdminReviews() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const query = params.get('q') ?? '',
    userId = params.get('userId') ?? '',
    status = params.get('status') ?? '';
  const [input, setInput] = useState(query);
  const [data, setData] = useState<{ rows: AdminReview[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [target, setTarget] = useState<AdminReview | null>(null);
  const update = (values: Record<string, string>) => {
    setRevision((v) => v + 1);
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('page');
      Object.entries(values).forEach(([k, v]) =>
        v ? next.set(k, v) : next.delete(k),
      );
      return next;
    });
  };
  useEffect(() => {
    let active = true;
    fetchAdminReviews({
      page,
      pageSize: 20,
      query,
      userId,
      hidden: status === 'hidden' ? true : status === 'visible' ? false : null,
    })
      .then((value) => {
        if (active) {
          setData(value);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : '별점 조회 실패');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, query, userId, status, revision]);
  return (
    <div>
      <div className="admin-toolbar">
        <div>
          <h2>별점 관리</h2>
          <p>
            총 {data.total}건 · 숨김·복구 시 공개 리뷰 수와 평균이 함께
            갱신됩니다.
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
          setLoading(true);
          update({ q: input.trim() });
        }}
      >
        <label>
          회원 닉네임·제품·브랜드 검색{' '}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={100}
          />
        </label>
        <button type="submit" className="admin-btn-soft">
          검색
        </button>
        <label>
          노출 상태{' '}
          <select
            value={status}
            onChange={(e) => {
              setLoading(true);
              update({ status: e.target.value });
            }}
          >
            <option value="">전체</option>
            <option value="visible">공개</option>
            <option value="hidden">숨김</option>
          </select>
        </label>
        {userId && (
          <button
            type="button"
            className="admin-btn-soft"
            onClick={() => {
              setLoading(true);
              update({ userId: '' });
            }}
          >
            회원 필터 해제
          </button>
        )}
      </form>
      {error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p>별점을 불러오는 중…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>작성일</th>
                <th>회원</th>
                <th>제품</th>
                <th>별점</th>
                <th>노출</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length ? (
                data.rows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.created_at).toLocaleString('ko-KR')}</td>
                    <td>{row.users?.nickname ?? '탈퇴 회원'}</td>
                    <td>
                      <a
                        href={
                          '/admin/products?q=' +
                          encodeURIComponent(row.products?.name ?? '')
                        }
                      >
                        {row.products?.name ?? '삭제된 제품'}
                      </a>
                    </td>
                    <td>{row.rating}점</td>
                    <td>{row.is_hidden ? '숨김' : '공개'}</td>
                    <td>
                      <button
                        className="admin-btn-soft"
                        onClick={() => setTarget(row)}
                      >
                        {row.is_hidden ? '복구' : '숨김'}
                      </button>{' '}
                      <a href={'/admin/audit?targetId=' + row.id}>변경 이력</a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>조건에 맞는 별점이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <nav className="admin-pagination" aria-label="별점 페이지">
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
      {target && (
        <AdminCorrectionDialog
          title={target.is_hidden ? '별점 복구' : '별점 숨김'}
          fields={[]}
          onClose={() => setTarget(null)}
          onSave={async (_, reason) => {
            await moderateReview(target, reason);
            notify.success(
              target.is_hidden ? '별점을 복구했습니다.' : '별점을 숨겼습니다.',
            );
            setLoading(true);
            setRevision((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
