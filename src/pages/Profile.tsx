import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  User,
  Calendar,
  ShoppingBag,
  FileText,
  Activity,
  Heart,
  LogOut,
  LogIn,
  PawPrint,
  ShieldCheck,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { notify } from '../store/useNotification';

export default function Profile() {
  const { profile, updateProfile, orders, fetchOrders, reports, fetchReports, isLoggedIn, signOut, favorites, products } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const favoriteProducts = products.filter((p) => favorites.includes(p.id));
  const [formData, setFormData] = useState(profile);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchOrders, fetchReports]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSave = () => {
    updateProfile(formData);
    notify.success('프로필이 업데이트되었습니다.');
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter((i) => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const concernOptions = ['관절', '피부', '체중', '소화', '눈', '면역'];
  const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소', '유제품'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div>
            <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
              <PawPrint size={13} />
              my pet dashboard
            </span>
            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>{profile.name}의 케어 대시보드</h2>
            <p style={{ fontSize: '14px', color: '#66707C', lineHeight: 1.6 }}>
              프로필, 찜, 주문, 분석 리포트를 한 곳에서 관리하세요.
            </p>
          </div>
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="ui-secondary-button">
              <LogOut size={15} /> 로그아웃
            </button>
          ) : (
            <Link to="/login" className="ui-secondary-button" style={{ textDecoration: 'none' }}>
              <LogIn size={15} /> 로그인
            </Link>
          )}
        </div>

        <div className="ui-grid-3" style={{ marginTop: '18px' }}>
          <div className="ui-info-card">
            <div className="ui-stat-label">찜한 제품</div>
            <div className="ui-stat-value">{favorites.length}</div>
          </div>
          <div className="ui-info-card">
            <div className="ui-stat-label">주문 내역</div>
            <div className="ui-stat-value">{orders.length}</div>
          </div>
          <div className="ui-info-card">
            <div className="ui-stat-label">분석 리포트</div>
            <div className="ui-stat-value">{reports.length}</div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', overflowX: 'auto', paddingBottom: '4px' }}>
        {([
          { key: 'info', label: '프로필 설정' },
          { key: 'favorites', label: `찜 목록 ${favorites.length > 0 ? `(${favorites.length})` : ''}` },
          { key: 'orders', label: '주문 내역' },
          { key: 'reports', label: '분석 리포트' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '11px 16px',
              borderRadius: '999px',
              border: activeTab === tab.key ? 'none' : '1px solid #E5E7EB',
              background: activeTab === tab.key ? '#111827' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#4B5563',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'favorites' ? (
        favoriteProducts.length > 0 ? (
          <div className="ui-grid-2">
            {favoriteProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <EmptyCard
            icon={<Heart color="#D1D5DB" size={32} />}
            text="찜한 제품이 없습니다."
            cta={{ to: '/search', label: '제품 탐색하기' }}
          />
        )
      ) : activeTab === 'info' ? (
        <div className="ui-info-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div className="ui-icon-pill" style={{ width: '52px', height: '52px' }}>
              <User color="var(--primary-dark)" size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '4px' }}>{profile.name}의 프로필</h3>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>이 정보를 기준으로 추천 순서와 적합도 설명이 달라집니다.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '18px' }}>
            <label style={{ display: 'grid', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800 }}>아이 이름</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="ui-input"
                placeholder="반려동물 이름을 입력하세요"
              />
            </label>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px' }}>관심 건강 고민</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {concernOptions.map((opt) => (
                  <ToggleChip
                    key={opt}
                    active={formData.healthConcerns.includes(opt)}
                    label={opt}
                    onClick={() => toggleArrayItem('healthConcerns', opt)}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, marginBottom: '10px', color: '#B42318' }}>알레르기 / 회피 성분</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allergyOptions.map((opt) => (
                  <ToggleChip
                    key={opt}
                    active={formData.allergies.includes(opt)}
                    label={opt}
                    danger
                    onClick={() => toggleArrayItem('allergies', opt)}
                  />
                ))}
              </div>
            </div>

            <button className="btn" style={{ width: '100%', background: '#111827', color: '#fff', fontWeight: 900 }} onClick={handleSave}>
              저장하기
            </button>
          </div>
        </div>
      ) : activeTab === 'orders' ? (
        orders.length > 0 ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            {orders.map((order) => (
              <div key={order.id} className="ui-info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px', fontWeight: 700 }}>
                    <Calendar size={15} />
                    {new Date(order.created_at).toLocaleDateString()}
                  </div>
                  <span className="ui-badge ui-badge-soft">{order.status}</span>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {order.order_items.map((item: any) => (
                    <Link key={item.id} to={`/product/${item.product_id}`} className="ui-list-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <img src={item.products.image_url} alt={item.products.name} style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>{item.products.brand_name}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-dark)', margin: '4px 0' }}>{item.products.name}</div>
                        <div style={{ fontSize: '13px', color: '#5F6772' }}>{item.price_at_purchase.toLocaleString()}원 · {item.quantity}개</div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F2F5' }}>
                  <span style={{ color: '#6B7280', fontWeight: 700 }}>총 결제 금액</span>
                  <strong style={{ fontSize: '18px' }}>{order.total_amount.toLocaleString()}원</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyCard
            icon={<ShoppingBag color="#D1D5DB" size={32} />}
            text="아직 주문 내역이 없습니다."
            cta={{ to: '/', label: '쇼핑 시작하기' }}
          />
        )
      ) : reports && reports.length > 0 ? (
        <div style={{ display: 'grid', gap: '14px' }}>
          {reports.map((report) => {
            const result = report.analysis_json;
            const product = report.products;
            const score = result.scores?.final?.toFixed(0) || 0;
            return (
              <div key={report.id} className="ui-info-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280', fontSize: '13px', fontWeight: 700 }}>
                    <Calendar size={15} />
                    {new Date(report.created_at).toLocaleDateString()}
                  </div>
                  <span className="ui-badge ui-badge-soft">
                    <ShieldCheck size={12} />
                    {score}점
                  </span>
                </div>

                <div className="ui-list-card">
                  {product ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '76px', height: '76px', borderRadius: '16px', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '76px', height: '76px', borderRadius: '16px', background: '#F3F4F6', display: 'grid', placeItems: 'center' }}>
                      <FileText color="#9CA3AF" />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>{product ? product.brand_name : '임의 분석'}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '4px 0 6px' }}>
                      {product ? product.name : 'OCR 추출 성분 분석'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#66707C', lineHeight: 1.55 }}>{result.summary}</div>
                  </div>
                </div>

                {product && (
                  <Link to={`/product/${report.product_id}`} className="ui-secondary-button" style={{ marginTop: '12px', textDecoration: 'none', justifyContent: 'center' }}>
                    해당 제품 상세보기
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyCard
          icon={<Activity color="#D1D5DB" size={32} />}
          text="아직 분석 리포트가 없습니다."
          cta={{ to: '/search', label: '분석하러 가기' }}
        />
      )}
    </div>
  );
}

function ToggleChip({
  active,
  label,
  onClick,
  danger = false,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: '999px',
        border: active ? 'none' : '1px solid #E5E7EB',
        background: active ? (danger ? '#EF4444' : '#111827') : '#fff',
        color: active ? '#fff' : '#4B5563',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function EmptyCard({
  icon,
  text,
  cta,
}: {
  icon: React.ReactNode;
  text: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="ui-info-card" style={{ textAlign: 'center', padding: '56px 20px' }}>
      <div className="ui-icon-pill" style={{ margin: '0 auto 12px', width: '60px', height: '60px' }}>
        {icon}
      </div>
      <p style={{ color: '#9CA3AF', fontSize: '15px', fontWeight: 700 }}>{text}</p>
      <Link to={cta.to} style={{ color: 'var(--primary)', fontWeight: 800, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>
        {cta.label}
      </Link>
    </div>
  );
}
