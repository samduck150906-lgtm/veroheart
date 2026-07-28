import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { fetchMembers, type AdminMember } from '../../lib/adminApi';

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 회원 목록 (읽기 전용).
 *
 * 운영 정책: 관리자 콘솔은 회원의 비밀번호를 보거나 바꿀 수 없다. 이메일 등
 * 식별 정보는 auth 스키마에 있어 이 화면에서 조회하지 않는다(최소 수집 원칙).
 */
const AdminMembers: React.FC = () => {
  const [rows, setRows] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMembers(page, PAGE_SIZE, search);
      setRows(result.rows);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    // 페이지/검색 변경 시 서버에서 다시 조회한다.
    load();
  }, [load]);

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>회원 관리</h2>
          <p>총 {total.toLocaleString()}명 · 읽기 전용</p>
        </div>
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-member-search" className="admin-visually-hidden">
          닉네임 검색
        </label>
        <input
          id="admin-member-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="닉네임 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>닉네임</th>
              <th>회원 ID</th>
              <th>반려동물 수</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4}>
                  <div className="admin-empty">
                    회원 목록을 불러오지 못했습니다.
                    <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={load}>
                      다시 시도
                    </button>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="admin-empty">표시할 회원이 없습니다.</div>
                </td>
              </tr>
            ) : (
              rows.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="admin-item-main">{member.nickname}</div>
                  </td>
                  <td className="admin-item-sub">{member.id.slice(0, 8)}</td>
                  <td>
                    <strong>{member.petCount}</strong>
                  </td>
                  <td>{formatDate(member.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="admin-pagination" aria-label="회원 목록 페이지">
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
          aria-label="이전 페이지"
        >
          <ChevronLeft size={14} /> 이전
        </button>
        <span className="admin-pagination-label">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="admin-btn-soft"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
          aria-label="다음 페이지"
        >
          다음 <ChevronRight size={14} />
        </button>
      </nav>
    </div>
  );
};

export default AdminMembers;
