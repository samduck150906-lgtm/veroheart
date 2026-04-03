import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  User, ChevronRight, Calendar, ShoppingBag, FileText, Activity,
  Heart, LogOut, LogIn, Check,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { notify } from '../store/useNotification';

const SPECIES_OPTIONS: { key: 'Dog' | 'Cat'; label: string; emoji: string }[] = [
  { key: 'Dog', label: '강아지', emoji: '🐶' },
  { key: 'Cat', label: '고양이', emoji: '🐱' },
];

const CONCERN_OPTIONS = ['관절', '피부', '체중', '소화', '눈'];
const ALLERGY_OPTIONS = ['닭고기', '소고기', '연어', '곡물', '인공색소'];

export default function Profile() {
  const {
    profile, updateProfile, orders, fetchOrders, reports,
    fetchReports, isLoggedIn, signOut, favorites, products,
  } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const [formData, setFormData] = useState(profile);
  const [saved, setSaved] = useState(false);

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
    setSaved(true);
    notify.success('프로필이 업데이트되었습니다! ✨');
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter(i => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const tabs = [
    { key: 'info' as const, label: '프로필' },
    { key: 'favorites' as const, label: `찜 ${favorites.length > 0 ? `(${favorites.length})` : ''}` },
    { key: 'orders' as const, label: '주문' },
    { key: 'reports' as const, label: '리포트' },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Profile Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px', padding: '20px', borderRadius: '20px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(255,245,240,0.9) 100%)',
        border: '1px solid rgba(232, 90, 60, 0.1)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255,107,74,0.3)',
            fontSize: '24px',
          }}>
            {profile.species === 'Dog' ? '🐶' : profile.species === 'Cat' ? '🐱' : '🐾'}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>
              {profile.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {isLoggedIn ? '로그인 중' : '비로그인 상태'}
            </div>
          </div>
        </div>
        {isLoggedIn ? (
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: '1.5px solid #E5E7EB',
              borderRadius: '12px', padding: '8px 14px',
              fontSize: '13px', fontWeight: 600, color: '#6B7280', cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
          >
            <LogOut size={14} /> 로그아웃
          </button>
        ) : (
          <Link
            to="/login"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #111827, #374151)',
              borderRadius: '12px', padding: '8px 14px',
              fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <LogIn size={14} /> 로그인
          </Link>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex', marginBottom: '24px',
        background: 'var(--surface-elevated)',
        borderRadius: '14px', padding: '4px',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, border: 'none', padding: '10px 4px',
              fontSize: '13px', fontWeight: activeTab === tab.key ? 800 : 500,
              color: activeTab === tab.key ? 'var(--primary-dark)' : 'var(--text-light)',
              borderRadius: '10px',
              background: activeTab === tab.key
                ? 'linear-gradient(145deg, rgba(255,107,74,0.1), rgba(232,90,60,0.06))'
                : 'none',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
            } as React.CSSProperties}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: 프로필 설정 */}
      {activeTab === 'info' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.02em',
            }}>
              아이 이름
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-base"
              placeholder="반려동물 이름을 입력하세요"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.02em',
            }}>
              종류
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {SPECIES_OPTIONS.map(({ key, label, emoji }) => {
                const active = formData.species === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormData({ ...formData, species: key })}
                    style={{
                      flex: 1, padding: '14px', borderRadius: '14px',
                      border: active ? '2px solid var(--primary)' : '1.5px solid #E5E7EB',
                      background: active ? 'rgba(255,107,74,0.06)' : '#fff',
                      cursor: 'pointer', fontWeight: 700, fontSize: '14px',
                      color: active ? 'var(--primary-dark)' : '#6B7280',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'all var(--transition-fast)',
                      boxShadow: active ? '0 2px 8px rgba(255,107,74,0.15)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{emoji}</span> {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.02em',
            }}>
              건강 고민
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {CONCERN_OPTIONS.map(opt => {
                const active = formData.healthConcerns.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleArrayItem('healthConcerns', opt)}
                    style={{
                      padding: '10px 18px', borderRadius: '999px', fontSize: '14px', fontWeight: 600,
                      border: active ? 'none' : '1.5px solid #E5E7EB',
                      backgroundColor: active ? 'var(--primary)' : '#fff',
                      color: active ? '#fff' : 'var(--text-dark)',
                      cursor: 'pointer', transition: 'all var(--transition-fast)',
                      boxShadow: active ? '0 3px 10px rgba(255,107,74,0.3)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {active && <Check size={14} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 700,
              color: 'var(--danger)', marginBottom: '8px', letterSpacing: '0.02em',
            }}>
              알레르기 / 회피 성분
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {ALLERGY_OPTIONS.map(opt => {
                const active = formData.allergies.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggleArrayItem('allergies', opt)}
                    style={{
                      padding: '10px 18px', borderRadius: '999px', fontSize: '14px', fontWeight: 600,
                      border: active ? 'none' : '1.5px solid #E5E7EB',
                      backgroundColor: active ? 'var(--danger)' : '#fff',
                      color: active ? '#fff' : 'var(--text-dark)',
                      cursor: 'pointer', transition: 'all var(--transition-fast)',
                      boxShadow: active ? '0 3px 10px rgba(239,68,68,0.25)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    {active && <Check size={14} />}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSave}
            style={{
              width: '100%', padding: '16px', borderRadius: '16px',
              fontWeight: 800, fontSize: '16px',
              background: saved
                ? 'linear-gradient(135deg, #10B981, #059669)'
                : 'linear-gradient(135deg, #1F2937, #374151)',
              color: '#fff', border: 'none', cursor: 'pointer',
              transition: 'all var(--transition-smooth)',
              boxShadow: saved ? '0 4px 14px rgba(16,185,129,0.3)' : '0 4px 14px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            {saved ? <><Check size={18} /> 저장 완료!</> : '변경 사항 저장'}
          </button>
        </div>
      )}

      {/* Tab: 찜 목록 */}
      {activeTab === 'favorites' && (
        <div>
          {favoriteProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {favoriteProducts.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Heart color="#D1D5DB" size={28} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                찜한 제품이 없어요
              </p>
              <p style={{ fontSize: '14px', color: 'var(--text-light)' }}>
                마음에 드는 제품을 찜해보세요!
              </p>
              <Link
                to="/search"
                style={{
                  display: 'inline-block', marginTop: '16px',
                  padding: '12px 24px', background: 'var(--primary)',
                  color: '#fff', borderRadius: '12px', fontWeight: 700,
                  fontSize: '14px', textDecoration: 'none',
                }}
              >
                제품 탐색하기
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab: 주문 내역 */}
      {activeTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {orders.length > 0 ? (
            orders.map(order => (
              <div key={order.id} className="card" style={{ padding: '18px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px dashed #E5E7EB',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={15} color="var(--text-muted)" />
                    <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600 }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <DeliveryStatus status={order.status} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.order_items.map((item: any) => (
                    <Link
                      key={item.id}
                      to={`/product/${item.product_id}`}
                      style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }}
                    >
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.products.brand_name}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0' }}>{item.products.name}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {item.price_at_purchase.toLocaleString()}원 · {item.quantity}개
                        </div>
                      </div>
                      <ChevronRight size={18} color="#D1D5DB" style={{ alignSelf: 'center' }} />
                    </Link>
                  ))}
                </div>

                <DeliveryTimeline status={order.status} />

                <div style={{
                  marginTop: '16px', paddingTop: '14px',
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>총 결제 금액</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)' }}>
                    {order.total_amount.toLocaleString()}원
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <ShoppingBag color="#D1D5DB" size={28} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                아직 주문 내역이 없어요
              </p>
              <Link
                to="/"
                style={{
                  display: 'inline-block', marginTop: '16px',
                  padding: '12px 24px', background: 'var(--primary)',
                  color: '#fff', borderRadius: '12px', fontWeight: 700,
                  fontSize: '14px', textDecoration: 'none',
                }}
              >
                첫 쇼핑 시작하기
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab: 분석 리포트 */}
      {activeTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports && reports.length > 0 ? (
            reports.map(report => {
              const result = report.analysis_json;
              const product = report.products;
              const scoreColor = result.scores?.final >= 80 ? '#10B981' : (result.scores?.final >= 60 ? '#F59E0B' : '#EF4444');
              return (
                <div key={report.id} className="card" style={{ padding: '18px' }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px dashed #E5E7EB',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={15} color="var(--text-muted)" />
                      <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600 }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px' }}>
                    {product ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        style={{ width: '72px', height: '72px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #F3F4F6' }}
                      />
                    ) : (
                      <div style={{
                        width: '72px', height: '72px', borderRadius: '12px',
                        backgroundColor: '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <FileText color="#9CA3AF" size={24} />
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {product ? product.brand_name : '임의 분석'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, margin: '4px 0', color: '#1F2937' }}>
                        {product ? product.name : 'OCR 추출 성분 분석'}
                      </div>
                      <div className="line-clamp-2" style={{ fontSize: '13px', color: '#6B7280' }}>
                        {result.summary}
                      </div>
                    </div>

                    <div style={{
                      width: '50px', height: '50px', borderRadius: '50%',
                      border: `3px solid ${scoreColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: scoreColor, fontWeight: 900, fontSize: '16px', flexShrink: 0,
                    }}>
                      {result.scores?.final?.toFixed(0) || 0}
                    </div>
                  </div>

                  {product && (
                    <Link
                      to={`/product/${report.product_id}`}
                      style={{
                        display: 'block', marginTop: '14px', padding: '11px',
                        textAlign: 'center', backgroundColor: '#F9FAFB',
                        borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                        color: '#4B5563', textDecoration: 'none',
                        border: '1px solid #F3F4F6',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      해당 제품 상세보기
                    </Link>
                  )}
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Activity color="#D1D5DB" size={28} />
              </div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
                저장된 분석 리포트가 없어요
              </p>
              <Link
                to="/search"
                style={{
                  display: 'inline-block', marginTop: '16px',
                  padding: '12px 24px', background: 'var(--primary)',
                  color: '#fff', borderRadius: '12px', fontWeight: 700,
                  fontSize: '14px', textDecoration: 'none',
                }}
              >
                사료 검색 및 분석하기
              </Link>
            </div>
          )}
        </div>
      )}
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
    <span style={{
      fontSize: '12px', fontWeight: 700, color: c.text,
      backgroundColor: c.bg, padding: '4px 12px', borderRadius: '999px',
    }}>
      {c.label}
    </span>
  );
}

function DeliveryTimeline({ status }: { status: string }) {
  const currentIdx = DELIVERY_STEPS.findIndex(s => s.key === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      marginTop: '16px', padding: '14px',
      background: '#F9FAFB', borderRadius: '12px',
    }}>
      {DELIVERY_STEPS.map((step, idx) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: idx <= activeIdx ? 'var(--primary)' : '#E5E7EB',
              color: idx <= activeIdx ? '#fff' : '#9CA3AF',
              fontSize: '11px', fontWeight: 800,
              boxShadow: idx <= activeIdx ? '0 2px 6px rgba(255,107,74,0.3)' : 'none',
              transition: 'all var(--transition-smooth)',
            }}>
              {idx < activeIdx ? '✓' : idx + 1}
            </div>
            <span style={{
              fontSize: '9px', fontWeight: 600, marginTop: '3px',
              color: idx <= activeIdx ? 'var(--primary-dark)' : '#9CA3AF',
              whiteSpace: 'nowrap',
            }}>
              {step.label}
            </span>
          </div>
          {idx < DELIVERY_STEPS.length - 1 && (
            <div style={{
              flex: 1, height: '2px',
              background: idx < activeIdx
                ? 'linear-gradient(90deg, var(--primary), var(--primary-soft))'
                : '#E5E7EB',
              margin: '0 2px', marginBottom: '16px',
              transition: 'background var(--transition-smooth)',
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
