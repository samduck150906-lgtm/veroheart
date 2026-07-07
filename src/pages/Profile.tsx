import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, LogOut, LogIn, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TossCard, TossButton, TossChip, TossInput, TossSectionTitle } from '../components/TossUI';
import ProductCard from '../components/ProductCard';
import type { SupabaseOrderItem } from '../types';

const PROFILE_STEP_META = [
  { title: '이름', prompt: '우리 아이의 이름은 무엇인가요?' },
  { title: '종', prompt: '강아지인가요, 고양이인가요?' },
  { title: '나이', prompt: '나이대를 선택해주세요.' },
  { title: '몸무게', prompt: '현재 몸무게를 입력해주세요.' },
  { title: '알레르기', prompt: '알레르기가 있는 성분이 있나요? (복수 선택)' },
  { title: '건강 고민', prompt: '신경 쓰이는 건강 고민이 있나요? (복수 선택)' },
];

const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];
const concernOptions = ['피부·모질', '관절', '소화기', '비만·다이어트', '신장·비뇨기', '심장', '면역', '눈', '구강'];

export default function Profile() {
  const { userId, isLoggedIn, profile, updateProfile, orders, fetchOrders, logout, favorites, products } = useStore();
  const [activeTab, setActiveTab] = useState<'info' | 'favorites' | 'orders'>('info');
  const [formData, setFormData] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);
  const navigate = useNavigate();

  const favoriteProducts = products.filter((p) => favorites.includes(p.id));
  
  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab, fetchOrders, userId]);

  const handleSignOut = async () => {
    await logout();
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
                  border: formData.species === sp ? 'none' : '1px solid var(--line)',
                  backgroundColor: formData.species === sp ? 'var(--primary-dark)' : 'var(--surface-elevated)',
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
                  border: formData.age === age ? 'none' : '1px solid var(--line)',
                  backgroundColor: formData.age === age ? 'var(--primary)' : 'var(--surface-elevated)',
                  color: formData.age === age ? 'var(--text-dark)' : 'var(--text-dark)',
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
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>kg</span>
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
                  border: formData.allergies.includes(opt) ? 'none' : '1px solid var(--line)',
                  backgroundColor: formData.allergies.includes(opt) ? 'var(--danger)' : 'var(--surface-elevated)',
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
                  border: formData.healthConcerns.includes(opt) ? 'none' : '1px solid var(--line)',
                  backgroundColor: formData.healthConcerns.includes(opt) ? 'var(--primary-dark)' : 'var(--surface-elevated)',
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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!userId) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 20px', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <User size={40} color="var(--line)" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px' }}>
          로그인이 필요해요
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
          프로필을 설정하고 아이의 건강 맞춤<br/>사료 분석을 시작해보세요!
        </p>
        <button 
          className="btn btn-primary" 
          style={{ width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '20px', fontWeight: 800, fontSize: '16px' }}
          onClick={() => navigate('/login')}
        >
          로그인 / 회원가입 하기
        </button>
      </div>
    );
  }

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
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: 'var(--surface-alt)', borderRadius: '24px' }}>
              <Heart color="var(--line)" size={40} style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>찜한 제품이 없습니다.</p>
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
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '4px' }}>
                마이 펫 · {profileStep + 1} / {stepCount}
              </div>
              <TossSectionTitle title={step.title} style={{ marginBottom: '0' }} />
            </div>
          </div>

          <div
            style={{
              height: '4px',
              borderRadius: '999px',
              background: 'var(--surface-alt)',
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

          <p style={{ margin: '0 0 22px', fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.5 }}>
            {step.prompt}
          </p>

          <div style={{ marginBottom: '28px' }}>{profileStepBody}</div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
            <TossButton
              variant="outline"
              onClick={() => setProfileStep((s) => Math.max(0, s - 1))}
              disabled={profileStep === 0}
              style={{ flex: 1 }}
            >
              이전
            </TossButton>
            <TossButton
              variant="soft"
              onClick={() => setProfileStep((s) => Math.min(stepCount - 1, s + 1))}
              disabled={profileStep === stepCount - 1}
              style={{ flex: 1 }}
            >
              다음
            </TossButton>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px' }} onClick={handleSave}>
            변경 사항 저장
          </button>
          
          <div style={{ marginTop: '32px', borderTop: '1px solid var(--line)', paddingTop: '24px' }}>
            <button 
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </TossCard>
      ) : activeTab === 'orders' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.length > 0 ? (
            orders.map(order => (
              <div key={order.id} className="card" style={{ padding: '20px', border: '1px solid var(--surface-alt)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px dashed var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: '14px', color: 'var(--text-dark)', fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <DeliveryStatus status={order.status} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.order_items.map((item: SupabaseOrderItem) => (
                    <Link key={item.id} to={`/product/${item.product_id}`} style={{ display: 'flex', gap: '12px', textDecoration: 'none', color: 'inherit' }}>
                      <img src={item.products.image_url} alt={item.products.name} loading="lazy" decoding="async" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.products.brand_name}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, margin: '2px 0' }}>{item.products.name}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.price_at_purchase.toLocaleString()}원 · {item.quantity}개</div>
                      </div>
                      <ChevronRight size={20} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
                    </Link>
                  ))}
                </div>

                {/* 배송 타임라인 */}
                <DeliveryTimeline status={order.status} />

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>총 결제 금액</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)' }}>{order.total_amount.toLocaleString()}원</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: 'var(--surface-alt)', borderRadius: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--shadow-card)' }}>
                <ShoppingBag color="var(--text-muted)" size={32} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>아직 주문 내역이 없습니다.</p>
              <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>첫 쇼핑 시작하기</Link>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginTop: '20px', padding: '16px', background: 'var(--surface-alt)', borderRadius: '14px' }}>
      {DELIVERY_STEPS.map((step, idx) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: idx <= activeIdx ? 'var(--primary-dark)' : 'var(--line)',
              color: idx <= activeIdx ? '#fff' : 'var(--text-muted)', fontSize: '12px', fontWeight: 800
            }}>
              {idx < activeIdx ? '✓' : idx + 1}
            </div>
            <span style={{ fontSize: '10px', fontWeight: 600, marginTop: '4px', color: idx <= activeIdx ? 'var(--primary-dark)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {step.label}
            </span>
          </div>
          {idx < DELIVERY_STEPS.length - 1 && (
            <div style={{ flex: 1, height: '2px', backgroundColor: idx < activeIdx ? 'var(--primary-dark)' : 'var(--line)', margin: '0 2px', marginBottom: '14px' }} />
          )}
        </div>
      ))}
    </div>
  );
}
