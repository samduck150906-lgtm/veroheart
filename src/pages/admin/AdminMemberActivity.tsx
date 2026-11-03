import { useEffect, useState } from 'react';
import {
  fetchMemberActivity,
  type AdminActivity,
} from '../../lib/adminSupportApi';
import { resolveBrandLabel } from '../../utils/productDisplay';

export default function AdminMemberActivity({ userId }: { userId: string }) {
  const [data, setData] = useState<AdminActivity | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetchMemberActivity(userId)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : '활동 조회 실패');
      });
    return () => {
      active = false;
    };
  }, [userId]);
  const product = (row: AdminActivity['favorites'][number]) => (
    <a
      href={`/admin/products?q=${encodeURIComponent(row.products?.name ?? '')}`}
    >
      {resolveBrandLabel({ brand: row.products?.brand_name })}{' '}
      {row.products?.name ?? '삭제된 제품'}
    </a>
  );
  return (
    <section aria-label="회원 활동">
      <h4 className="admin-section-title">회원 활동</h4>
      <div className="admin-toolbar">
        <a className="admin-btn-soft" href={`/admin/diary?userId=${userId}`}>
          이 회원의 급여 기록
        </a>
        <a className="admin-btn-soft" href={`/admin/reviews?userId=${userId}`}>
          이 회원의 별점
        </a>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p>회원 활동을 불러오는 중…</p>
      ) : (
        <>
          <p className="admin-item-sub">각 목록은 최근 20건까지 표시합니다.</p>
          <h5>찜 {data.favoriteCount}건</h5>
          {data.favorites.length ? (
            <ul>
              {data.favorites.map((r) => (
                <li key={r.product_id}>{product(r)}</li>
              ))}
            </ul>
          ) : (
            <p>저장한 제품 없음</p>
          )}
          <h5>최근 조회 {data.recentCount}건</h5>
          {data.recentViews.length ? (
            <ul>
              {data.recentViews.map((r) => (
                <li key={r.product_id}>{product(r)}</li>
              ))}
            </ul>
          ) : (
            <p>조회 기록 없음</p>
          )}
          <h5>제품 등록 요청 {data.requestCount}건</h5>
          {data.requests.length ? (
            <ul>
              {data.requests.map((r) => (
                <li key={r.id}>
                  {r.requested_name} ·{' '}
                  {(
                    {
                      pending: '대기',
                      registered: '등록함',
                      rejected: '반려',
                    } as Record<string, string>
                  )[r.status] ?? r.status}
                </li>
              ))}
            </ul>
          ) : (
            <p>등록 요청 없음</p>
          )}
          <a href="/admin/product-requests">제품 등록 요청 관리 열기</a>
        </>
      )}
    </section>
  );
}
