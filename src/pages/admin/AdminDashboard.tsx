import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  ArrowDownRight,
  ArrowUpRight,
  FlaskConical,
  Link2,
  NotebookPen,
  Package,
  Users,
  AlertCircle,
} from 'lucide-react';
import { fetchDashboard, type DashboardPayload } from '../../lib/adminApi';

const MAIN_CATEGORIES = [
  '사료',
  '간식',
  '영양제',
  '구강관리',
  '피부·목욕·위생',
  '눈·귀 케어',
  '배변/위생',
  '생활용품',
];

/** 실제 기간 비교로 산출한 증감률. 직전 기간이 0이면 비율을 만들 수 없어 null 을 준다. */
function deltaPercent(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const AdminDashboard: React.FC = () => {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryStats, setCategoryStats] = useState<Record<string, number> | null>(null);
  const [categoryError, setCategoryError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchDashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setCategoryError(false);
    try {
      // 전건 조회 대신 카테고리별 count 쿼리(main_category 인덱스 사용)
      const results = await Promise.all(
        MAIN_CATEGORIES.map(async (category) => {
          const { count, error: err } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('main_category', category);
          if (err) throw err;
          return [category, count ?? 0] as const;
        }),
      );
      setCategoryStats(Object.fromEntries(results));
    } catch {
      setCategoryError(true);
      setCategoryStats(null);
    }
  }, []);

  useEffect(() => {
    // 대시보드 지표를 로드한다. 카드별로 독립 실패해도 화면 전체는 유지된다.
    load();
    loadCategories();
  }, [load, loadCategories]);

  const metrics = payload?.metrics;

  const cards = useMemo(
    () => [
      {
        label: '전체 제품수',
        value: metrics?.products ?? null,
        icon: <Package size={18} />,
        delta: deltaPercent(metrics?.productsLast7 ?? null, metrics?.productsPrev7 ?? null),
        deltaLabel: '최근 7일 vs 직전 7일',
        to: '/admin/products',
      },
      {
        label: '분석 성분수',
        value: metrics?.ingredients ?? null,
        icon: <FlaskConical size={18} />,
        delta: null,
        deltaLabel: null,
        to: '/admin/ingredients',
      },
      {
        label: '제품–원재료 연결',
        value: metrics?.productIngredientLinks ?? null,
        icon: <Link2 size={18} />,
        delta: null,
        deltaLabel: null,
        to: '/admin/products',
      },
      {
        label: '누적 회원수',
        value: metrics?.users ?? null,
        icon: <Users size={18} />,
        delta: deltaPercent(metrics?.usersLast7 ?? null, metrics?.usersPrev7 ?? null),
        deltaLabel: '최근 7일 vs 직전 7일',
        to: '/admin/members',
      },
      {
        label: '검토 대기 미매칭 성분',
        value: metrics?.unmatchedPending ?? null,
        icon: <AlertCircle size={18} />,
        delta: null,
        deltaLabel: null,
        to: '/admin/unmatched-ingredients',
      },
      {
        label: '최근 7일 다이어리 기록',
        value: metrics?.feedingLogsLast7 ?? null,
        icon: <NotebookPen size={18} />,
        delta: null,
        deltaLabel: null,
        to: null,
      },
    ],
    [metrics],
  );

  const totalProducts = metrics?.products ?? 0;

  return (
    <div>
      {error && (
        <div className="admin-card" style={{ marginBottom: 14 }}>
          <strong>지표를 불러오지 못했습니다.</strong>
          <p className="admin-item-sub" style={{ marginTop: 6 }}>{error}</p>
          <button type="button" className="admin-btn-soft" style={{ marginTop: 10 }} onClick={load}>
            다시 시도
          </button>
        </div>
      )}

      <div className="admin-grid-cards">
        {cards.map((card) => {
          const body = (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="admin-stat-label">{card.label}</span>
                <span style={{ color: '#4f46e5' }}>{card.icon}</span>
              </div>
              <div className="admin-stat-value">
                {loading ? <span className="admin-skeleton" /> : card.value === null ? '–' : card.value.toLocaleString()}
              </div>
              {card.delta !== null && (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    fontWeight: 800,
                    color: card.delta >= 0 ? '#059669' : '#dc2626',
                  }}
                >
                  {card.delta >= 0 ? (
                    <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} />
                  ) : (
                    <ArrowDownRight size={12} style={{ verticalAlign: 'middle' }} />
                  )}{' '}
                  {card.delta >= 0 ? '+' : ''}
                  {card.delta.toFixed(1)}%
                  <span className="admin-item-sub" style={{ marginLeft: 6 }}>{card.deltaLabel}</span>
                </div>
              )}
            </>
          );
          return card.to ? (
            <Link className="admin-card admin-card-link" key={card.label} to={card.to}>
              {body}
            </Link>
          ) : (
            <article className="admin-card" key={card.label}>
              {body}
            </article>
          );
        })}
      </div>

      <div className="admin-two-col">
        <article className="admin-card">
          <h3 className="admin-card-title">카테고리별 제품 분포</h3>
          {categoryError ? (
            <div className="admin-empty">
              카테고리 분포를 불러오지 못했습니다.
              <button type="button" className="admin-btn-soft" style={{ marginLeft: 10 }} onClick={loadCategories}>
                다시 시도
              </button>
            </div>
          ) : categoryStats === null ? (
            <div className="admin-empty">불러오는 중입니다…</div>
          ) : (
            MAIN_CATEGORIES.map((cat) => {
              const count = categoryStats[cat] ?? 0;
              const percentage = totalProducts > 0 ? (count / totalProducts) * 100 : 0;
              return (
                <div className="admin-progress-item" key={cat}>
                  <div className="admin-progress-row">
                    <span>{cat}</span>
                    <strong>
                      {count}개 ({percentage.toFixed(1)}%)
                    </strong>
                  </div>
                  <div className="admin-progress-track">
                    <div className="admin-progress-fill" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </article>

        <article className="admin-card">
          <h3 className="admin-card-title">최근 운영 활동</h3>
          {loading ? (
            <div className="admin-empty">불러오는 중입니다…</div>
          ) : !payload ? (
            <div className="admin-empty">표시할 활동이 없습니다.</div>
          ) : (
            <>
              {payload.recentProducts.map((item) => (
                <div className="admin-activity-item" key={`p-${item.id}`}>
                  <div className="admin-activity-dot" style={{ background: '#6366f1' }} />
                  <div className="admin-activity-body">
                    <strong>제품 등록 · {item.brand_name}</strong>
                    <p>
                      {item.name} · {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {payload.recentIngredients.map((item) => (
                <div className="admin-activity-item" key={`i-${item.id}`}>
                  <div className="admin-activity-dot" style={{ background: '#10b981' }} />
                  <div className="admin-activity-body">
                    <strong>성분 등록 · {item.risk_level}</strong>
                    <p>
                      {item.name_ko} · {formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
              {payload.recentUnmatched.map((item) => (
                <div className="admin-activity-item" key={`u-${item.id}`}>
                  <div className="admin-activity-dot" style={{ background: '#f59e0b' }} />
                  <div className="admin-activity-body">
                    <strong>미매칭 성분 · {item.occurrences}회</strong>
                    <p>
                      {item.raw_name} · {formatDate(item.last_seen_at)}
                    </p>
                  </div>
                </div>
              ))}
              {payload.recentProducts.length === 0 &&
                payload.recentIngredients.length === 0 &&
                payload.recentUnmatched.length === 0 && (
                  <div className="admin-empty">아직 기록된 운영 활동이 없습니다.</div>
                )}
            </>
          )}
          <Link className="admin-btn-soft" style={{ width: '100%', marginTop: 8 }} to="/admin/unmatched-ingredients">
            미매칭 성분 검수하기
          </Link>
        </article>
      </div>
    </div>
  );
};

export default AdminDashboard;
