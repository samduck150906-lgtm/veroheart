import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, Heart, LogOut, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

export default function Profile() {
  const { profile, updateProfile, orders, fetchOrders, reports, fetchReports, isLoggedIn, signOut, favorites, products } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const favoriteProducts = products.filter(p => favorites.includes(p.id));
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
    alert('프로필이 업데이트되었습니다! ✨');
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter(i => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const concernOptions = ['관절', '피부', '체중', '소화', '눈'];
  const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* 로그인/로그아웃 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        {isLoggedIn ? (
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
            <LogOut size={15} /> 로그아웃
          </button>
        ) : (
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#111827', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            <LogIn size={15} /> 로그인 / 회원가입
          </Link>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '32px', borderBottom: '1px solid #eee', padding: '0 4px', overflowX: 'auto' }}>
        {([
          { key: 'info', label: '프로필 설정' },
          { key: 'favorites', label: `찜 목록 ${favorites.length > 0 ? `(${favorites.length})` : ''}` },
          { key: 'orders', label: '주문 내역' },
          { key: 'reports', label: '분석 리포트' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none', border: 'none', padding: '12px 4px', fontSize: '15px', fontWeight: 800,
              color: activeTab === tab.key ? 'var(--primary-dark)' : '#BBC2CC',
              borderBottom: activeTab === tab.key ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'favorites' ? (
        <div>
          {favoriteProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {favoriteProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#F9FAFB', borderRadius: '24px' }}>
              <Heart color="#D1D5DB" size={40} style={{ margin: '0 auto 16px' }} />
              <p style={{ color: '#9CA3AF', fontSize: '15px' }}>찜한 제품이 없습니다.</p>
              <Link to="/search" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>제품 탐색하기</Link>
            </div>
          )}
        </div>
      ) : activeTab === 'info' ? (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User color="#fff" size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{profile.name}의 정보</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>아이의 건강 상태에 맞춘 성분 분석을 제공합니다.</p>
            </div>
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px' }}>아이 이름</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none' }}
              placeholder="반려견 이름을 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px' }}>관심 건강 고민</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {concernOptions.map(opt => (
                <button 
                  key={opt}
                  onClick={() => toggleArrayItem('healthConcerns', opt)}
                  style={{
                    padding: '10px 18px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                    border: formData.healthConcerns.includes(opt) ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: formData.healthConcerns.includes(opt) ? 'var(--primary-dark)' : '#fff',
                    color: formData.healthConcerns.includes(opt) ? '#fff' : 'var(--text-dark)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: formData.healthConcerns.includes(opt) ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                  }}
                >{opt}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--danger)', marginBottom: '12px' }}>알레르기 / 회피 성분</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {allergyOptions.map(opt => (
                <button 
                  key={opt}
                  onClick={() => toggleArrayItem('allergies', opt)}
                  style={{
                    padding: '10px 18px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                    border: formData.allergies.includes(opt) ? 'none' : '1px solid #E5E7EB',
                    backgroundColor: formData.allergies.includes(opt) ? 'var(--danger)' : '#fff',
                    color: formData.allergies.includes(opt) ? '#fff' : 'var(--text-dark)',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: formData.allergies.includes(opt) ? '0 4px 12px rgba(239,68,68,0.2)' : 'none'
                  }}
                >{opt}</button>
              ))}
            </div>
          </div>

          <button className="btn" style={{ width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px', backgroundColor: '#1F2937', color: '#fff' }} onClick={handleSave}>
            변경 사항 저장
          </button>
        </div>
      ) : activeTab === 'orders' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.length > 0 ? (
            orders.map(order => (
              <div key={order.id} className="card" style={{ padding: '20px', border: '1px solid #EEF0F3' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <DeliveryStatus status={order.status} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.order_items.map((item: any) => (
                    <Link key={item.id} to={`/product/${item.product_id}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                      <img src={item.products.image_url} alt={item.products.name} style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.products.brand_name}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0' }}>{item.products.name}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.price_at_purchase.toLocaleString()}원 · {item.quantity}개</div>
                      </div>
                      <ChevronRight size={20} color="#9CA3AF" style={{ alignSelf: 'center' }} />
                    </Link>
                  ))}
                </div>

                {/* 배송 타임라인 */}
                <DeliveryTimeline status={order.status} />

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>총 결제 금액</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)' }}>{order.total_amount.toLocaleString()}원</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#F9FAFB', borderRadius: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShoppingBag color="#D1D5DB" size={32} />
              </div>
              <p style={{ color: '#9CA3AF', fontSize: '15px' }}>아직 주문 내역이 없습니다.</p>
              <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>첫 쇼핑 시작하기</Link>
            </div>
          )}
        </div>
      ) : activeTab === 'reports' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {reports && reports.length > 0 ? (
            reports.map(report => {
              const result = report.analysis_json;
              const product = report.products; // linked product
              const scoreColor = result.scores?.final >= 80 ? '#10B981' : (result.scores?.final >= 60 ? '#F59E0B' : '#EF4444');

              return (
                <div key={report.id} className="card" style={{ padding: '20px', border: '1px solid #EEF0F3', borderRadius: '20px', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={16} color="var(--text-muted)" />
                      <span style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: 600 }}>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {product ? (
                      <img src={product.image_url} alt={product.name} style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #F3F4F6' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText color="#9CA3AF" />
                      </div>
                    )}
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{product ? product.brand_name : '임의 분석'}</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0', color: '#1F2937' }}>{product ? product.name : 'OCR 추출 성분 분석'}</div>
                      <div style={{ fontSize: '13px', color: '#6B7280', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {result.summary}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ 
                        width: '50px', height: '50px', borderRadius: '50%', border: `3px solid ${scoreColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: scoreColor, fontWeight: 900, fontSize: '16px'
                      }}>
                        {result.scores?.final?.toFixed(0) || 0}
                      </div>
                    </div>
                  </div>

                  {product && (
                    <Link to={`/product/${report.product_id}`} style={{ display: 'block', marginTop: '16px', padding: '12px', textAlign: 'center', backgroundColor: '#F9FAFB', borderRadius: '12px', fontSize: '14px', fontWeight: 700, color: '#4B5563', textDecoration: 'none' }}>
                      해당 제품 상세보기
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: '#F9FAFB', borderRadius: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Activity color="#D1D5DB" size={32} />
              </div>
              <p style={{ color: '#9CA3AF', fontSize: '15px' }}>저장된 분석 리포트가 없습니다.</p>
              <Link to="/search" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>사료 검색 및 분석하기</Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const DELIVERY_STEPS = [
  { key: 'pending', label: '주문 확인' },
  { key: 'paid', label: '결제 완료' },
  { key: 'shipped', label: '배송 중' },
  { key: 'completed', label: '배송 완료' },
];

function DeliveryStatus({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: '#FEF3C7', text: '#92400E', label: '주문 확인 중' },
    paid: { bg: '#DBEAFE', text: '#1E40AF', label: '결제 완료' },
    shipped: { bg: '#D1FAE5', text: '#065F46', label: '배송 중' },
    completed: { bg: '#E0E7FF', text: '#3730A3', label: '배송 완료' },
    cancelled: { bg: '#FEE2E2', text: '#991B1B', label: '취소됨' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ fontSize: '13px', fontWeight: 700, color: c.text, backgroundColor: c.bg, padding: '4px 12px', borderRadius: '12px' }}>
      {c.label}
    </span>
  );
}

function DeliveryTimeline({ status }: { status: string }) {
  const currentIdx = DELIVERY_STEPS.findIndex(s => s.key === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginTop: '20px', padding: '16px', background: '#F9FAFB', borderRadius: '14px' }}>
      {DELIVERY_STEPS.map((step, idx) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: idx <= activeIdx ? 'var(--primary-dark)' : '#E5E7EB',
              color: idx <= activeIdx ? '#fff' : '#9CA3AF', fontSize: '12px', fontWeight: 800
            }}>
              {idx < activeIdx ? '✓' : idx + 1}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, marginTop: '4px', color: idx <= activeIdx ? 'var(--primary-dark)' : '#9CA3AF', whiteSpace: 'nowrap' }}>
              {step.label}
            </span>
          </div>
          {idx < DELIVERY_STEPS.length - 1 && (
            <div style={{ flex: 1, height: '2px', backgroundColor: idx < activeIdx ? 'var(--primary-dark)' : '#E5E7EB', margin: '0 2px', marginBottom: '14px' }} />
          )}
        </div>
      ))}
    </div>
  );
}
