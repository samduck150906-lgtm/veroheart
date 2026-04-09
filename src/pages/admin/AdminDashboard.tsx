import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ClipboardCheck,
  FlaskConical,
  Package,
  PieChart,
  Search,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  AdminBadge,
  AdminInlineStat,
  AdminMetricCard,
  AdminPageHeader,
  AdminSectionCard,
} from '../../components/admin/AdminUI';

const MAIN_CATEGORIES = [
  '사료', '간식', '영양제', '구강관리', '피부·목욕·위생', '눈·귀 케어', '배변/위생', '생활용품',
];

const RECENT_ACTIVITY = [
  { type: 'OCR', user: '사용자_772', target: '금사료 프리미엄', time: '3분 전' },
  { type: 'Search', user: '사용자_102', target: '눈물 사료 추천', time: '12분 전' },
  { type: 'Report', user: '사용자_405', target: '오리젠 피트앤트림', time: '24분 전' },
  { type: 'OCR', user: '사용자_291', target: '로얄캐닌 인도어', time: '1시간 전' },
] as const;

type DashboardStats = {
  users: number;
  products: number;
  ingredients: number;
  orders: number;
  verifiedProducts: number;
  pendingProducts: number;
  needsReviewProducts: number;
};

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    users: 0,
    products: 0,
    ingredients: 0,
    orders: 0,
    verifiedProducts: 0,
    pendingProducts: 0,
    needsReviewProducts: 0,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [u, p, i, o, productMeta] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('ingredients').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('main_category, verification_status'),
    ]);

    const counts: Record<string, number> = {};
    let verifiedProducts = 0;
    let pendingProducts = 0;
    let needsReviewProducts = 0;

    productMeta.data?.forEach((item) => {
      const category = item.main_category || '기타';
      counts[category] = (counts[category] || 0) + 1;

      if (item.verification_status === 'verified') verifiedProducts += 1;
      else if (item.verification_status === 'needs_review') needsReviewProducts += 1;
      else pendingProducts += 1;
    });

    setCategoryStats(counts);
    setStats({
      users: u.count || 0,
      products: p.count || 0,
      ingredients: i.count || 0,
      orders: o.count || 0,
      verifiedProducts,
      pendingProducts,
      needsReviewProducts,
    });
  };

  const metricCards = [
    {
      label: '누적 회원수',
      value: stats.users.toLocaleString(),
      icon: <Users size={22} />,
      tone: 'indigo' as const,
      delta: '+12.5%',
      footnote: '가입 및 재방문 사용자 포함',
    },
    {
      label: '등록 제품',
      value: stats.products.toLocaleString(),
      icon: <Package size={22} />,
      tone: 'emerald' as const,
      delta: '+4.2%',
      footnote: '실제 카탈로그 기준 등록 수',
    },
    {
      label: '분석 성분 사전',
      value: stats.ingredients.toLocaleString(),
      icon: <FlaskConical size={22} />,
      tone: 'amber' as const,
      delta: '+32.1%',
      footnote: '성분 사전과 설명 메타데이터',
    },
    {
      label: '누적 주문',
      value: stats.orders.toLocaleString(),
      icon: <ShoppingCart size={22} />,
      tone: 'rose' as const,
      delta: '+15.8%',
      footnote: '외부 구매 전환 포함 주문 지표',
    },
  ];

  const verificationRate = stats.products > 0
    ? ((stats.verifiedProducts / stats.products) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="admin-page-stack animate-fade-in">
      <AdminPageHeader
        eyebrow="operations overview"
        title="베로로 운영 대시보드"
        description="카탈로그 품질, 검수 진행도, 운영 주요 지표를 한눈에 보는 B2B SaaS형 관리자 홈입니다."
      />

      <div className="admin-grid-4">
        {metricCards.map((card) => (
          <AdminMetricCard key={card.label} {...card} />
        ))}
      </div>

      <div className="admin-grid-3">
        <AdminInlineStat label="검수 완료" value={`${stats.verifiedProducts}개`} hint={`완료율 ${verificationRate}%`} />
        <AdminInlineStat label="검수 대기" value={`${stats.pendingProducts}개`} hint="운영 확인이 필요한 상품" />
        <AdminInlineStat label="재검토 필요" value={`${stats.needsReviewProducts}개`} hint="정보 보강 또는 수정 필요" />
      </div>

      <div className="admin-layout-main-grid">
        <div className="admin-page-stack">
          <AdminSectionCard
            title="카테고리별 제품 분포"
            description="실제 등록 제품이 어떤 카테고리에 집중되어 있는지 확인하고, 카탈로그 보강 우선순위를 판단합니다."
            action={<AdminBadge tone="indigo">오늘 12:45 동기화</AdminBadge>}
          >
            <div className="admin-card-list">
              {MAIN_CATEGORIES.map((category) => {
                const count = categoryStats[category] || 0;
                const percentage = stats.products > 0 ? (count / stats.products) * 100 : 0;
                return (
                  <div key={category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '16px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>{category}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>
                        {count}개 · {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ height: '10px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminSectionCard>

          <div className="admin-grid-2">
            <AdminSectionCard
              title="검수 파이프라인"
              description="데이터 신뢰를 위해 검수 우선순위를 계속 관리합니다."
            >
              <div className="admin-card-list">
                {[
                  { label: '검수 완료', value: stats.verifiedProducts, tone: 'emerald' as const },
                  { label: '검수 대기', value: stats.pendingProducts, tone: 'amber' as const },
                  { label: '재검토 필요', value: stats.needsReviewProducts, tone: 'rose' as const },
                ].map((item) => (
                  <div key={item.label} className="admin-list-item">
                    <div className="admin-list-icon" style={{ background: item.tone === 'emerald' ? '#DCFCE7' : item.tone === 'amber' ? '#FEF3C7' : '#FFE4E6', color: item.tone === 'emerald' ? '#047857' : item.tone === 'amber' ? '#B45309' : '#BE123C' }}>
                      <ClipboardCheck size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{item.label}</div>
                      <div style={{ marginTop: '4px', fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>{item.value.toLocaleString()}개</div>
                    </div>
                    <AdminBadge tone={item.tone}>{item.label}</AdminBadge>
                  </div>
                ))}
              </div>
            </AdminSectionCard>

            <AdminSectionCard
              title="운영 체크리스트"
              description="데이터 신뢰를 위해 AI 외 수동 검증이 필요한 영역입니다."
            >
              <div className="admin-card-list">
                {[
                  '신규 제품 등록 시 제조사/브랜드/가격 출처 교차 확인',
                  '검수 완료 전에는 쿠팡 상품 ID와 전성분 연결 여부 확인',
                  '재검토 필요 상품은 건강 태그와 성분 설명을 우선 보강',
                ].map((item) => (
                  <div key={item} className="admin-list-item">
                    <div className="admin-list-icon"><Activity size={18} /></div>
                    <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.6, color: '#334155' }}>{item}</div>
                  </div>
                ))}
              </div>
            </AdminSectionCard>
          </div>
        </div>

        <div className="admin-page-stack">
          <AdminSectionCard
            title="최근 분석 활동"
            description="유저가 가장 많이 탐색 중인 제품/질환 키워드를 파악합니다."
            action={<AdminBadge tone="slate">Live feed</AdminBadge>}
          >
            <div className="admin-card-list">
              {RECENT_ACTIVITY.map((activity) => (
                <div key={`${activity.user}-${activity.time}`} className="admin-list-item">
                  <div className="admin-list-icon" style={{ background: activity.type === 'OCR' ? '#EEF2FF' : '#FFE4E6', color: activity.type === 'OCR' ? '#4F46E5' : '#E11D48' }}>
                    {activity.type === 'OCR' ? <Search size={18} /> : <PieChart size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{activity.user}</div>
                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#475569', lineHeight: 1.55 }}>
                      {activity.target} 분석
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '12px', color: '#94A3B8' }}>
                      {activity.time} · {activity.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="운영 스냅샷"
            description="검수와 카탈로그 상태를 빠르게 요약합니다."
          >
            <div className="admin-card-list">
              <div className="admin-list-item">
                <div className="admin-list-icon"><BarChart3 size={18} /></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B' }}>카탈로그 품질</div>
                  <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900, color: '#0F172A' }}>
                    검수 완료 {verificationRate}%
                  </div>
                </div>
              </div>
              <div className="admin-list-item">
                <div className="admin-list-icon"><Package size={18} /></div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748B' }}>보강 필요 카테고리</div>
                  <div style={{ marginTop: '4px', fontSize: '16px', fontWeight: 900, color: '#0F172A' }}>
                    {Object.entries(categoryStats).sort((a, b) => a[1] - b[1])[0]?.[0] || '데이터 없음'}
                  </div>
                </div>
              </div>
            </div>
          </AdminSectionCard>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
