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
  PawPrint,
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
const UNCATEGORIZED_LABEL = '미분류';
const CATEGORY_PAGE_SIZE = 1000;

function categoryLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : UNCATEGORIZED_LABEL;
}

/**
 * 고정 카테고리만 따로 count하면 목록 밖 값과 NULL 제품이 합계에서 사라진다.
 * 모든 제품의 main_category를 페이지 끝까지 읽어 실제 제품 총수와 같은 모집단을 집계한다.
 */
async function fetchCategoryStats(): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};
  let offset = 0;

  while (offset < 100_000) {
    const { data, count, error } = await supabase
      .from('products')
      .select('main_category', { count: 'exact' })
      .range(offset, offset + CATEGORY_PAGE_SIZE - 1);
    if (error) throw error;

    const batch = (data ?? []) as { main_category: string | null }[];
    for (const row of batch) {
      const label = categoryLabel(row.main_category);
      stats[label] = (stats[label] ?? 0) + 1;
    }

    offset += batch.length;
    if (batch.length < CATEGORY_PAGE_SIZE || (count !== null && offset >= count)) return stats;
  }

  throw new Error('제품 카테고리 집계 범위를 초과했습니다.');
}

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
      setCategoryStats(await fetchCategoryStats());
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
        to: '/admin/users',
      },
      {
        label: '전체 반려동물',
        value: metrics?.pets ?? null,
        icon: <PawPrint size={18} />,
        delta: null,
        deltaLabel: null,
        to: '/admin/users',
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
        to: '/admin/diary',
      },
    ],
    [metrics],
  );

  const totalProducts = metrics?.products ?? 0;
  const categoryTotal = useMemo(
    () => Object.values(categoryStats ?? {}).reduce((sum, count) => sum + count, 0),
    [categoryStats],
  );
  const displayedCategories = useMemo(() => {
    if (!categoryStats) return MAIN_CATEGORIES;
    const extras = Object.keys(categoryStats)
      .filter((category) => !MAIN_CATEGORIES.includes(category) && category !== UNCATEGORIZED_LABEL)
      .sort((a, b) => a.localeCompare(b, 'ko-KR'));
    return [
      ...MAIN_CATEGORIES,
      ...extras,
      ...(UNCATEGORIZED_LABEL in categoryStats ? [UNCATEGORIZED_LABEL] : []),
    ];
  }, [categoryStats]);
  const hasProductTotal = metrics?.products !== null && metrics?.products !== undefined;
  const categoryCountsMatch = hasProductTotal && categoryStats !== null && totalProducts === categoryTotal;
  const categoryDenominator = totalProducts > 0 ? totalProducts : categoryTotal;

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
                <span style={{ color: '#9b7b00' }}>{card.icon}</span>
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
          <div className="admin-card-title-row">
            <h3 className="admin-card-title">카테고리별 제품 분포</h3>
            {categoryStats !== null && (
              <span className={`admin-tag ${!hasProductTotal || categoryCountsMatch ? 'green' : 'red'}`}>
                분류 합계 {categoryTotal.toLocaleString()}
                {hasProductTotal ? ` / 전체 ${totalProducts.toLocaleString()}` : ''}
              </span>
            )}
          </div>
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
            displayedCategories.map((cat) => {
              const count = categoryStats[cat] ?? 0;
              const percentage = categoryDenominator > 0 ? (count / categoryDenominator) * 100 : 0;
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
          {(categoryStats?.[UNCATEGORIZED_LABEL] ?? 0) > 0 && (
            <p className="admin-item-sub admin-category-note">
              미분류는 제품의 대분류(main_category)가 아직 입력되지 않은 항목입니다.
            </p>
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
                  <div className="admin-activity-dot" style={{ background: '#d4a900' }} />
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
