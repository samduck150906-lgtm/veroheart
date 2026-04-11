import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { SupabaseOrderItem } from '../types';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, Heart, LogOut, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { TossButton, TossCard, TossChip, TossSectionTitle, TossInput } from '../components/TossUI';

export default function Profile() {
  const { profile, updateProfile, orders, fetchOrders, reports, fetchReports, isLoggedIn, signOut, favorites, products } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const favoriteProducts = products.filter(p => favorites.includes(p.id));
  const [formData, setFormData] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);

  const concernOptions = ['관절', '피부', '체중', '소화', '눈'];
  const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];
  const PROFILE_STEP_META = [
    { title: '이름', prompt: '반려동물의 이름을 알려주세요.' },
    { title: '종', prompt: '강아지인가요, 고양이인가요?' },
    { title: '나이', prompt: '나이에 가까운 단계를 골라 주세요.' },
    { title: '몸무게', prompt: '몸무게를 알고 있다면 입력해 주세요. (선택)' },
    { title: '알레르기', prompt: '피해야 할 알레르기·회피 성분이 있다면 모두 선택해 주세요.' },
    { title: '건강 고민', prompt: '요즘 가장 신경 쓰이는 고민을 골라 주세요. (복수 선택)' },
  ] as const;

  useEffect(() => {
    queueMicrotask(() => {
      setFormData(profile);
      setProfileStep(0);
    });
  }, [profile]);
  
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchOrders, fetchReports]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSave = async () => {
    await updateProfile(formData);
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter(i => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const stepCount = PROFILE_STEP_META.length;
  const step = PROFILE_STEP_META[profileStep];

  const profileStepBody = (() => {
    switch (profileStep) {
      case 0:
        return (
          <TossInput
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value })}
            placeholder="예: 로니"
          />
        );
      case 1:
        return (
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['Dog', 'Cat'] as const).map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => setFormData({ ...formData, species: sp })}
                style={{
                  flex: 1,
                  padding: '16px 14px',
                  borderRadius: '16px',
                  fontSize: '15px',
                  fontWeight: 800,
                  border: formData.species === sp ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: formData.species === sp ? 'var(--primary-dark)' : '#fff',
                  color: formData.species === sp ? '#fff' : 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                {sp === 'Dog' ? '강아지' : '고양이'}
              </button>
            ))}
          </div>
        );
      case 2:
        return (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: '아기', age: 1 },
              { label: '성인', age: 4 },
              { label: '시니어', age: 10 },
            ].map(({ label, age }) => (
              <button
                key={label}
                type="button"
                onClick={() => setFormData({ ...formData, age })}
                style={{
                  padding: '12px 20px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: formData.age === age ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: formData.age === age ? 'var(--primary)' : '#fff',
                  color: formData.age === age ? '#111827' : 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        );
      case 3:
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TossInput
              value={formData.weightKg != null ? String(formData.weightKg) : ''}
              onChange={(v) => {
                const n = parseFloat(v.replace(/[^0-9.]/g, ''));
                setFormData({
                  ...formData,
                  weightKg: Number.isFinite(n) && n > 0 ? n : undefined,
                });
              }}
              placeholder="예: 5.2"
            />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#64748B' }}>kg</span>
          </div>
        );
      case 4:
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {allergyOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleArrayItem('allergies', opt)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: formData.allergies.includes(opt) ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: formData.allergies.includes(opt) ? 'var(--danger)' : '#fff',
                  color: formData.allergies.includes(opt) ? '#fff' : 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      case 5:
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {concernOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleArrayItem('healthConcerns', opt)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '999px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: formData.healthConcerns.includes(opt) ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: formData.healthConcerns.includes(opt) ? 'var(--primary-dark)' : '#fff',
                  color: formData.healthConcerns.includes(opt) ? '#fff' : 'var(--text-dark)',
                  cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* 로그인/로그아웃 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        {isLoggedIn ? (
          <TossButton variant="outline" onClick={handleSignOut} style={{ width: 'auto', height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={15} /> 로그아웃
          </TossButton>
        ) : (
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-dark)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            <LogIn size={15} /> 로그인 / 회원가입
          </Link>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '0 2px', overflowX: 'auto' }}>
        {([
          { key: 'info', label: '프로필 설정' },
          { key: 'favorites', label: `찜 목록 ${favorites.length > 0 ? `(${favorites.length})` : ''}` },
          { key: 'orders', label: '주문 내역' },
          { key: 'reports', label: '분석 리포트' },
        ] as const).map(tab => (
          <TossChip key={tab.key} label={tab.label} active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)} />
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
        <TossCard style={{ padding: '28px 22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User color="#fff" size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', marginBottom: '4px' }}>
                마이 펫 · {profileStep + 1} / {stepCount}
              </div>
              <TossSectionTitle title={step.title} style={{ marginBottom: '0' }} />
            </div>
          </div>

          <div
            style={{
              height: '4px',
              borderRadius: '999px',
              background: '#EEF2F6',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${((profileStep + 1) / stepCount) * 100}%`,
                borderRadius: '999px',
                background: 'linear-gradient(90deg, var(--primary) 0%, var(--primary-dark) 100%)',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <p style={{ margin: '0 0 22px', fontSize: '16px', fontWeight: 700, color: '#334155', lineHeight: 1.5 }}>
            {step.prompt}
          </p>

          <div style={{ marginBottom: '28px' }}>{profileStepBody}</div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <TossButton
              type="button"
              variant="outline"
              style={{ flex: 1, height: '50px' }}
              disabled={profileStep === 0}
              onClick={() => setProfileStep((s) => Math.max(0, s - 1))}
            >
              이전
            </TossButton>
            {profileStep < stepCount - 1 ? (
              <TossButton type="button" style={{ flex: 1, height: '50px' }} onClick={() => setProfileStep((s) => Math.min(stepCount - 1, s + 1))}>
                다음
              </TossButton>
            ) : (
              <TossButton type="button" style={{ flex: 1, height: '50px' }} onClick={handleSave}>
                저장
              </TossButton>
            )}
          </div>
        </TossCard>
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
                  {order.order_items.map((item: SupabaseOrderItem) => (
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
