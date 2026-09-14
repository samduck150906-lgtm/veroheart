import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Eye, MessageSquare, NotebookPen, PawPrint, Search, UserMinus, X } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  deleteMember,
  fetchMemberDetail,
  fetchMembers,
  type AdminMember,
  type AdminMemberDetail,
} from '../../lib/adminApi';

const PAGE_SIZE = 20;

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 마지막 접속일은 "언제 마지막으로 왔는지"가 핵심이라 경과일을 함께 보여 준다. */
function formatLastSeen(value: string | null): { text: string; stale: boolean } {
  if (!value) return { text: '기록 없음', stale: true };
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return { text: '기록 없음', stale: true };
  const days = Math.floor((Date.now() - timestamp) / 86_400_000);
  if (days <= 0) return { text: '오늘', stale: false };
  if (days === 1) return { text: '어제', stale: false };
  if (days < 30) return { text: `${days}일 전`, stale: false };
  return { text: `${days}일 전`, stale: true };
}

function providerLabel(provider: string | null | undefined): string {
  if (!provider) return '미확인';
  const labels: Record<string, string> = {
    email: '이메일',
    kakao: '카카오',
    google: '구글',
    apple: '애플',
  };
  return labels[provider.toLowerCase()] ?? provider;
}

function visibleLoginId(member: AdminMember): string {
  return member.loginId || member.email || member.id;
}

function visibleLoginKind(member: AdminMember): string {
  return member.loginIdKind || (member.email ? 'email' : 'internal');
}

function loginIdKindLabel(kind: string): string {
  const labels: Record<string, string> = {
    email: '이메일 아이디',
    phone: '휴대전화 아이디',
    provider: '소셜 계정 ID',
    internal: '내부 ID 대체 표시',
  };
  return labels[kind] ?? '로그인 아이디';
}

/**
 * 회원 목록 (읽기 전용).
 *
 * 운영 정책: 가입 누락 방지를 위해 Supabase Auth 계정을 원본으로 조회하되,
 * 비밀번호·인증 시크릿은 절대 조회하거나 표시하지 않는다.
 */
const AdminMembers: React.FC = () => {
  const [rows, setRows] = useState<AdminMember[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<AdminMember | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [withdrawConfirm, setWithdrawConfirm] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
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

  const openDetail = async (member: AdminMember) => {
    setDetailLoading(true);
    try {
      setDetail(await fetchMemberDetail(member.id));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openWithdraw = (member: AdminMember) => {
    setWithdrawTarget(member);
    setWithdrawReason('');
    setWithdrawConfirm('');
  };

  const confirmWithdraw = async () => {
    if (!withdrawTarget || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      const result = await deleteMember(withdrawTarget.id, withdrawReason);
      notify.success(
        `“${withdrawTarget.nickname}” 회원을 탈퇴 처리했습니다. ` +
        `(반려동물 ${result.petCount}건 · 다이어리 ${result.diaryCount}건 함께 삭제)`,
      );
      setWithdrawTarget(null);
      setDetail((current) => (current?.id === withdrawTarget.id ? null : current));
      await load();
    } catch (err) {
      notify.error(`탈퇴 처리 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue((current) => (current === value ? null : current)), 1500);
    } catch {
      setCopiedValue(null);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>회원 관리</h2>
          <p>총 {total.toLocaleString()}명 · 조회와 탈퇴 처리만 가능합니다</p>
        </div>
      </div>

      <div className="admin-search-wrap">
        <Search size={16} className="admin-search-icon" />
        <label htmlFor="admin-member-search" className="admin-visually-hidden">
          이메일 또는 닉네임 검색
        </label>
        <input
          id="admin-member-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="이메일 또는 닉네임 검색"
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>로그인 아이디</th>
              <th>닉네임</th>
              <th>가입 경로</th>
              <th>활동</th>
              <th>가입일</th>
              <th>마지막 접속일</th>
              <th style={{ textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="admin-empty">데이터를 불러오는 중입니다...</div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7}>
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
                <td colSpan={7}>
                  <div className="admin-empty">표시할 회원이 없습니다.</div>
                </td>
              </tr>
            ) : (
              rows.map((member) => {
                const loginId = visibleLoginId(member);
                const loginKind = visibleLoginKind(member);
                return (
                <tr key={member.id}>
                  <td>
                    <div className="admin-copyable-value">
                      <div>
                        <div className="admin-item-main admin-member-email">{loginId}</div>
                        <span className={`admin-tag ${member.emailConfirmed ? 'green' : 'gray'}`}>
                          {loginIdKindLabel(loginKind)}
                          {loginKind === 'email' ? (member.emailConfirmed ? ' · 인증됨' : ' · 미인증') : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="admin-copy-btn"
                        onClick={() => copyValue(loginId)}
                        aria-label={`${loginId} 복사`}
                        title="로그인 아이디 복사"
                      >
                        {copiedValue === loginId ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="admin-item-main">{member.nickname}</div>
                    {member.profileMissing && <span className="admin-tag orange">프로필 미생성</span>}
                  </td>
                  <td><span className="admin-tag blue">{providerLabel(member.provider)}</span></td>
                  <td>
                    <div className="admin-member-activity">
                      <span title="반려동물"><PawPrint size={12} /> {member.petCount}</span>
                      <span title="다이어리 기록"><NotebookPen size={12} /> {member.diaryCount}</span>
                      <span title="작성 리뷰"><MessageSquare size={12} /> {member.reviewCount}</span>
                    </div>
                  </td>
                  <td>{formatDate(member.createdAt)}</td>
                  <td>
                    <div className="admin-item-main">{formatDate(member.lastSignInAt)}</div>
                    <span className={`admin-tag ${formatLastSeen(member.lastSignInAt).stale ? 'gray' : 'green'}`}>
                      {formatLastSeen(member.lastSignInAt).text}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-actions">
                      <button type="button" className="admin-icon-btn edit" onClick={() => openDetail(member)} aria-label={`${member.nickname} 상세 보기`}>
                        <Eye size={14} />
                      </button>
                      <button type="button" className="admin-icon-btn delete" onClick={() => openWithdraw(member)} aria-label={`${member.nickname} 탈퇴 처리`} title="탈퇴 처리">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
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

      {(detailLoading || detail) && (
        <div className="admin-modal-backdrop" onClick={() => !detailLoading && setDetail(null)}>
          <div className="admin-modal admin-member-detail" role="dialog" aria-modal="true" aria-label="회원 상세" onClick={(event) => event.stopPropagation()}>
            <div className="admin-dialog-heading">
              <div>
                <h3>회원 상세</h3>
                <p className="admin-item-sub">비밀번호·인증 시크릿은 표시하지 않습니다.</p>
              </div>
              <button type="button" className="admin-btn-soft" onClick={() => setDetail(null)} disabled={detailLoading} aria-label="상세 닫기"><X size={16} /></button>
            </div>
            {detailLoading ? (
              <div className="admin-empty">회원 정보를 불러오는 중입니다…</div>
            ) : detail ? (
              <>
                <div className="admin-detail-summary">
                  <div>
                    <span>로그인 아이디</span>
                    <strong className="admin-detail-copyable">
                      {visibleLoginId(detail)}
                      <button type="button" className="admin-copy-btn" onClick={() => copyValue(visibleLoginId(detail))} aria-label="로그인 아이디 복사">
                        {copiedValue === visibleLoginId(detail) ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </strong>
                  </div>
                  <div><span>닉네임</span><strong>{detail.nickname}</strong></div>
                  <div><span>가입 경로</span><strong>{providerLabel(detail.provider)}</strong></div>
                  <div><span>프로필</span><strong>{detail.profileMissing ? '미생성' : '정상'}</strong></div>
                  <div>
                    <span>내부 식별자</span>
                    <strong className="admin-detail-copyable">
                      {detail.id}
                      <button type="button" className="admin-copy-btn" onClick={() => copyValue(detail.id)} aria-label="내부 식별자 복사">
                        {copiedValue === detail.id ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </strong>
                  </div>
                  <div><span>가입일</span><strong>{formatDate(detail.createdAt)}</strong></div>
                  <div>
                    <span>마지막 접속일</span>
                    <strong>
                      {formatDate(detail.lastSignInAt)}
                      <span className="admin-item-sub" style={{ marginLeft: 6 }}>
                        {formatLastSeen(detail.lastSignInAt).text}
                      </span>
                    </strong>
                  </div>
                  <div><span><PawPrint size={13} /> 반려동물</span><strong>{detail.petCount.toLocaleString()}</strong></div>
                  <div><span><NotebookPen size={13} /> 다이어리</span><strong>{detail.diaryCount.toLocaleString()}</strong></div>
                  <div><span><MessageSquare size={13} /> 작성 리뷰</span><strong>{detail.reviewCount.toLocaleString()}</strong></div>
                </div>
                <h4 className="admin-section-title">반려동물</h4>
                {detail.pets.length === 0 ? (
                  <div className="admin-empty">등록된 반려동물이 없습니다.</div>
                ) : (
                  <div className="admin-pet-grid">
                    {detail.pets.map((pet) => (
                      <article className="admin-pet-card" key={pet.id}>
                        <div className="admin-pet-card-heading">
                          <strong>{pet.name}</strong>
                          <span className="admin-tag yellow">{pet.petType.toUpperCase()}</span>
                        </div>
                        <dl>
                          <div><dt>품종</dt><dd>{pet.breed || '-'}</dd></div>
                          <div><dt>라이프 스테이지</dt><dd>{pet.ageGroup}</dd></div>
                          <div><dt>체중</dt><dd>{pet.weight === null ? '-' : `${pet.weight} kg`}</dd></div>
                          <div><dt>알레르기</dt><dd>{pet.allergies.join(', ') || '없음'}</dd></div>
                          <div><dt>건강 고민</dt><dd>{pet.conditions.join(', ') || '없음'}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="admin-empty">회원 정보를 불러오지 못했습니다.</div>
            )}
            {detail && (
              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn-danger"
                  onClick={() => openWithdraw(detail)}
                >
                  <UserMinus size={15} /> 탈퇴 처리
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {withdrawTarget && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isWithdrawing) setWithdrawTarget(null);
          }}
        >
          <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label="회원 탈퇴 확인">
            <h3>회원을 탈퇴 처리할까요?</h3>
            <p className="admin-modal-desc">
              <strong>{withdrawTarget.nickname}</strong>({visibleLoginId(withdrawTarget)}) 계정을 삭제합니다.
              <br />
              등록된 반려동물 {withdrawTarget.petCount.toLocaleString()}마리, 다이어리 기록{' '}
              {withdrawTarget.diaryCount.toLocaleString()}건, 리뷰 {withdrawTarget.reviewCount.toLocaleString()}건이
              함께 삭제되며 <strong>되돌릴 수 없습니다.</strong>
            </p>

            <div className="admin-form-group" style={{ marginTop: 14 }}>
              <label htmlFor="withdraw-reason">탈퇴 사유 (감사 로그에 기록)</label>
              <input
                id="withdraw-reason"
                value={withdrawReason}
                onChange={(event) => setWithdrawReason(event.target.value)}
                placeholder="예: 본인 요청, 약관 위반"
                maxLength={500}
              />
            </div>

            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="withdraw-confirm">확인을 위해 <code>탈퇴</code> 를 입력해 주세요</label>
              <input
                id="withdraw-confirm"
                value={withdrawConfirm}
                onChange={(event) => setWithdrawConfirm(event.target.value)}
                placeholder="탈퇴"
                autoComplete="off"
              />
            </div>

            <div className="admin-modal-footer">
              <button type="button" className="admin-btn-soft" onClick={() => setWithdrawTarget(null)} disabled={isWithdrawing}>
                취소
              </button>
              <button
                type="button"
                className="admin-btn-danger"
                onClick={confirmWithdraw}
                disabled={isWithdrawing || withdrawConfirm.trim() !== '탈퇴'}
              >
                <UserMinus size={15} /> {isWithdrawing ? '처리 중…' : '탈퇴 처리'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMembers;
