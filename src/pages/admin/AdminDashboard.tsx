import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowUpRight, Package, ShoppingCart, Users, FlaskConical } from 'lucide-react';

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

const RECENT_ACTIVITIES = [
  { type: 'OCR', user: '사용자_772', target: '금사료 프리미엄', time: '3분 전' },
  { type: '검색', user: '사용자_102', target: '눈물 사료 추천', time: '12분 전' },
  { type: '리포트', user: '사용자_405', target: '오리젠 피트앤트림', time: '24분 전' },
  { type: 'OCR', user: '사용자_291', target: '로얄캐닌 인도어', time: '1시간 전' },
];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    ingredients: 0,
    orders: 0,
  });
  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStats = async () => {
      const [u, p, i, o, c] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('ingredients').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('main_category'),
      ]);

      setStats({
        users: u.count || 0,
        products: p.count || 0,
        ingredients: i.count || 0,
        orders: o.count || 0,
      });

      const counts: Record<string, number> = {};
      c.data?.forEach((item) => {
        const cat = item.main_category || '기타';
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setCategoryStats(counts);
    };

    fetchStats();
  }, []);

  const cards = useMemo(
    () => [
      {
        label: '누적 회원수',
        value: stats.users,
        icon: <Users size={18} />,
        trend: '+12.5%',
      },
      {
        label: '전체 제품수',
        value: stats.products,
        icon: <Package size={18} />,
        trend: '+4.2%',
      },
      {
        label: '분석 성분수',
        value: stats.ingredients,
        icon: <FlaskConical size={18} />,
        trend: '+8.7%',
      },
      {
        label: '누적 주문수',
        value: stats.orders,
        icon: <ShoppingCart size={18} />,
        trend: '+15.8%',
      },
    ],
    [stats]
  );

  return (
    <div>
      <div className="admin-grid-cards">
        {cards.map((card) => (
          <article className="admin-card" key={card.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="admin-stat-label">{card.label}</span>
              <span style={{ color: '#4f46e5' }}>{card.icon}</span>
            </div>
            <div className="admin-stat-value">{card.value.toLocaleString()}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#059669', fontWeight: 800 }}>
              <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} /> {card.trend}
            </div>
          </article>
        ))}
      </div>

      <div className="admin-two-col">
        <article className="admin-card">
          <h3 className="admin-card-title">카테고리별 제품 분포</h3>
          {MAIN_CATEGORIES.map((cat) => {
            const count = categoryStats[cat] || 0;
            const percentage = stats.products > 0 ? (count / stats.products) * 100 : 0;
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
          })}
        </article>

        <article className="admin-card">
          <h3 className="admin-card-title">최근 분석 활동</h3>
          {RECENT_ACTIVITIES.map((activity, i) => (
            <div className="admin-activity-item" key={`${activity.user}-${i}`}>
              <div
                className="admin-activity-dot"
                style={{
                  background:
                    activity.type === 'OCR'
                      ? '#6366f1'
                      : activity.type === '검색'
                      ? '#f59e0b'
                      : '#10b981',
                }}
              />
              <div className="admin-activity-body">
                <strong>
                  {activity.user} · {activity.type}
                </strong>
                <p>
                  {activity.target} 분석 · {activity.time}
                </p>
              </div>
            </div>
          ))}
          <button className="admin-btn-soft" style={{ width: '100%', marginTop: 8 }}>
            활동 내역 더보기
          </button>
        </article>
      </div>
    </div>
  );
};

export default AdminDashboard;
