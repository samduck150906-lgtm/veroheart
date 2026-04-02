import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Package, 
  FlaskConical, 
  Activity,
  ArrowUpRight,
  PieChart,
  BarChart3,
  Search,
  ShoppingCart
} from 'lucide-react';

const MAIN_CATEGORIES = [
  '사료', '간식', '영양제', '구강관리', '피부·목욕·위생', '눈·귀 케어', '배변/위생', '생활용품'
];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    ingredients: 0,
    orders: 0
  });

  const [categoryStats, setCategoryStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [u, p, i, o, c] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('ingredients').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('main_category')
    ]);

    setStats({
      users: u.count || 0,
      products: p.count || 0,
      ingredients: i.count || 0,
      orders: o.count || 0
    });

    // Calculate category breakdown
    const counts: Record<string, number> = {};
    c.data?.forEach(item => {
      const cat = item.main_category || '기타';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    setCategoryStats(counts);
  };

  const cards = [
    { label: '누적 회원수', value: stats.users, icon: <Users size={24} />, color: '#6366f1', trend: '+12.5%' },
    { label: '전체 제품수', value: stats.products, icon: <Package size={24} />, color: '#10b981', trend: '+4.2%' },
    { label: '분석 성분수', value: stats.ingredients, icon: <FlaskConical size={24} />, color: '#f59e0b', trend: '+32.1%' },
    { label: '누적 주문수', value: stats.orders, icon: <ShoppingCart size={24} />, color: '#ec4899', trend: '+15.8%' }
  ];

  return (
    <div className="admin-dashboard animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#111827' }}>베로로 대시보드</h1>
        <p style={{ color: '#6B7280', marginTop: '4px' }}>플랫폼의 주요 지표와 활동 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {cards.map((card, idx) => (
          <div key={idx} className="stat-card" style={{ 
            backgroundColor: '#fff', padding: '24px', borderRadius: '24px', 
            border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '20px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
          }}>
            <div className="stat-icon" style={{ 
              width: '60px', height: '60px', borderRadius: '18px', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: `${card.color}15`, color: card.color 
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280' }}>{card.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#111827' }}>{card.value.toLocaleString()}</span>
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                  <ArrowUpRight size={12} /> {card.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* Category Breakdown */}
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #E5E7EB', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#4F46E5" /> 카테고리별 제품 분포
            </h3>
            <span style={{ fontSize: '13px', color: '#6B7280' }}>최근 업데이트: 오늘 12:45</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {MAIN_CATEGORIES.map(cat => {
              const count = categoryStats[cat] || 0;
              const percentage = stats.products > 0 ? (count / stats.products) * 100 : 0;
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                    <span style={{ color: '#374151' }}>{cat}</span>
                    <span style={{ color: '#6B7280' }}>{count}개 ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${percentage}%`, height: '100%', backgroundColor: '#4F46E5', 
                      borderRadius: '4px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' 
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Analytics */}
        <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #E5E7EB', padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="#EC4899" /> 최근 분석 활동
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { type: 'OCR', user: '사용자_772', target: '금사료 프리미엄', time: '3분 전' },
              { type: 'Search', user: '사용자_102', target: '눈물 사료 추천', time: '12분 전' },
              { type: 'Report', user: '사용자_405', target: '오리젠 피트앤트림', time: '24분 전' },
              { type: 'OCR', user: '사용자_291', target: '로얄캐닌 인도어', time: '1시간 전' },
            ].map((activity, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ 
                  padding: '10px', backgroundColor: '#F3F4F6', borderRadius: '12px',
                  color: activity.type === 'OCR' ? '#4F46E5' : '#EC4899'
                }}>
                  {activity.type === 'OCR' ? <Search size={16} /> : <PieChart size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937' }}>
                    {activity.user} <span style={{ fontWeight: 400, color: '#6B7280' }}>님이 {activity.target} 분석</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{activity.time} • {activity.type}</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ 
            width: '100%', marginTop: '32px', backgroundColor: '#F9FAFB', 
            border: '1px solid #E5E7EB', padding: '12px', borderRadius: '12px',
            fontSize: '14px', fontWeight: 700, color: '#4B5563', cursor: 'pointer'
          }}>
            활동 내역 더보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
