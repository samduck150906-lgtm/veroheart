// @ts-nocheck
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, LogOut, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TossCard, TossInput, TossButton, TossChip, TossSectionTitle } from '../components/TossUI';
import { Button } from '../components/Button';
import ProductCard from '../components/ProductCard';
import { notify } from '../store/useNotification';

const PROFILE_STEP_META = [
  { title: '이름', prompt: '반려동물의 이름을 알려주세요.' },
  { title: '종류', prompt: '반려동물의 종류를 알려주세요.' },
  { title: '나이', prompt: '반려동물의 나이를 알려주세요.' },
  { title: '체중', prompt: '반려동물의 체중을 알려주세요.' },
  { title: '알레르기', prompt: '피해야 할 알레르기 성분이 있나요?' },
  { title: '건강 고민', prompt: '어떤 건강 고민이 있나요?' }
];

const concernOptions = [
  '비만', '관절 질환', '신장 질환', '당뇨', '심장 질환',
  '피부 민감', '소화 예민', '구강 질환', '암/종양', '눈/귀 질환'
];

type SupabaseOrderItem = any;

export default function Profile() {
  const { 
    userId, 
    isLoggedIn, 
    profile, 
    updateProfile, 
    orders, 
    fetchOrders, 
    reports, 
    fetchReports, 
    logout,
    favorites,
    products
  } = useStore();

  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const [formData, setFormData] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);
  const navigate = useNavigate();
  
  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchOrders, fetchReports, userId]);

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  const handleSave = async () => {
    await updateProfile(formData);
  };

  const handleNext = () => {
    if (profileStep < PROFILE_STEP_META.length - 1) {
      setProfileStep(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  const handlePrev = () => {
    if (profileStep > 0) {
      setProfileStep(prev => prev - 1);
    }
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field] || [];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter(i => i !== value) });
    } else {
      setFormData({ ...formData, [field]: [...list, value] });
    }
  };

  const stepCount = PROFILE_STEP_META.length;
  const step = PROFILE_STEP_META[profileStep];
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];

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
                  border: formData.age === age ? 'none' : '1px solid #E2E8F0',
                  backgroundColor: formData.age === age ? 'var(--primary-dark)' : '#FFFFFF',
                  color: formData.age === age ? '#FFFFFF' : 'var(--text-dark)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
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

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const Pill = ({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '11px 16px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: on ? 700 : 500,
        color: on ? 'var(--ink-on-brand)' : 'var(--ink-soft)',
        background: on ? 'var(--ink)' : 'var(--surface)',
        border: `1px solid ${on ? 'var(--ink)' : 'var(--hairline)'}`,
        transition: 'all .15s ease',
      }}
    >
      {children}
    </button>
  );

  if (!userId) {
    return (
      <div className="animate-fade-in" style={{ padding: '60px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4 }}>
        <Helmet><title>마이 펫 | 베로로</title></Helmet>
        <div style={{
          width: 76, height: 76, borderRadius: 999, background: 'var(--brand-tint)', border: '1px solid var(--brand-line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14
        }}>
          <User size={34} color="var(--brand-deep)" />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>로그인이 필요해요</h2>
        <p style={{ margin: '8px 0 22px', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 260 }}>
          프로필을 설정하면 우리 아이 건강에 맞춘<br />사료 분석과 큐레이션을 시작할 수 있어요
        </p>
        <button
          onClick={() => navigate('/auth')}
          style={{
            cursor: 'pointer', padding: '15px 28px', borderRadius: 14,
            background: 'var(--brand)', color: 'var(--ink-on-brand)', fontSize: 15, fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-sm)'
          }}
        >
          로그인 / 회원가입 하기
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <Helmet><title>마이 펫 | 베로로</title></Helmet>
      
      {/* Pet Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px 16px' }}>
        <div style={{ width: 58, height: 58, borderRadius: 999, overflow: 'hidden', border: '2px solid var(--brand-line)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--brand-tint)', fontSize: '28px' }}>
          {profile.species === 'Cat' ? '🐱' : '🐶'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>{profile.name || '우리 아이'}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            {profile.breed || '믹스견'} · {profile.species === 'Cat' ? '고양이' : '강아지'} · {profile.age || 0}세 · {profile.weightKg || 0}kg
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rail" style={{ display: 'flex', gap: 20, overflowX: 'auto', padding: '0 20px', borderBottom: '1px solid var(--hairline)', msOverflowStyle: 'none', scrollbarWidth: 'none', marginBottom: '20px' }}>
        {([
          { key: 'info' as const, label: '프로필 설정' },
          { key: 'favorites' as const, label: `찜 목록 ${favorites.length}` },
          { key: 'orders' as const, label: '주문 내역' },
          { key: 'reports' as const, label: '분석 리포트' },
        ]).map((t) => {
          const on = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                flexShrink: 0, cursor: 'pointer', background: 'none', border: 'none',
                padding: '0 0 11px', position: 'relative', fontSize: 14, fontWeight: on ? 700 : 500, color: on ? 'var(--ink)' : 'var(--ink-faint)'
              }}
            >
              {t.label}
              {on && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, background: 'var(--ink)' }} />}
            </button>
          );
        })}
      </div>

      <div style={{ paddingTop: '8px' }}>
        {activeTab === 'info' && (
          <div style={{ padding: '6px 20px 24px' }}>
            {/* progress */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-deep)' }}>STEP {profileStep + 1} / {stepCount}</span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{step.title}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--hairline)', overflow: 'hidden', marginBottom: 22 }}>
              <div style={{ width: `${((profileStep + 1) / stepCount) * 100}%`, height: '100%', background: 'var(--brand)', transition: 'width .25s ease' }} />
            </div>

            <div style={{ minHeight: 168 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{step.prompt}</h3>
                </div>

                {profileStep === 0 && (
                  <input
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="예: 체다"
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                      border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                    }}
                  />
                )}

                {profileStep === 1 && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <Pill on={formData.species === 'Dog'} onClick={() => setFormData({ ...formData, species: 'Dog' })}>강아지</Pill>
                    <Pill on={formData.species === 'Cat'} onClick={() => setFormData({ ...formData, species: 'Cat' })}>고양이</Pill>
                  </div>
                )}

                {profileStep === 2 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: '아기', age: 1 },
                      { label: '성견', age: 4 },
                      { label: '시니어', age: 10 },
                    ].map(({ label, age }) => (
                      <Pill key={label} on={formData.age === age} onClick={() => setFormData({ ...formData, age })}>
                        {label}
                      </Pill>
                    ))}
                  </div>
                )}

                {profileStep === 3 && (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <input
                      type="number"
                      value={formData.weightKg != null ? formData.weightKg : ''}
                      onChange={(e) => {
                        const n = parseFloat(e.target.value);
                        setFormData({
                          ...formData,
                          weightKg: Number.isFinite(n) && n > 0 ? n : undefined,
                        });
                      }}
                      style={{
                        width: 120, boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                        border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                      }}
                      placeholder="6.2"
                    />
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-soft)' }}>kg</span>
                  </div>
                )}

                {profileStep === 4 && (
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                    {allergyOptions.map((opt) => (
                      <Pill key={opt} on={formData.allergies?.includes(opt)} onClick={() => toggleArrayItem('allergies', opt)}>
                        {opt}
                      </Pill>
                    ))}
                  </div>
                )}

                {profileStep === 5 && (
                  <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                    {concernOptions.map((opt) => (
                      <Pill key={opt} on={formData.healthConcerns?.includes(opt)} onClick={() => toggleArrayItem('healthConcerns', opt)}>
                        {opt}
                      </Pill>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              {profileStep > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    cursor: 'pointer', flex: '0 0 auto', padding: '15px 22px', borderRadius: 14,
                    background: 'var(--surface)', border: '1px solid var(--hairline)', fontSize: 15, fontWeight: 600, color: 'var(--ink-soft)'
                  }}
                >
                  이전
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  cursor: 'pointer', flex: 1, padding: '15px', borderRadius: 14, background: 'var(--brand)', color: 'var(--ink-on-brand)',
                  fontSize: 15, fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-sm)'
                }}
              >
                {profileStep === stepCount - 1 ? '변경 사항 저장' : '다음'}
              </button>
            </div>

            <div style={{ padding: '32px 0 0' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', cursor: 'pointer', padding: '14px', borderRadius: 13,
                  background: 'none', border: '1px solid var(--hairline)', fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)'
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div style={{ padding: '4px 20px 20px' }}>
            {favoriteProducts.length > 0 ? (
              favoriteProducts.map(p => <ProductCard key={p.id} product={p} />)
            ) : (
              <div style={{ padding: '54px 28px', textAlign: 'center' }}>
                <Heart size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>아직 찜한 제품이 없어요</div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)',
                    background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', padding: '11px 20px', borderRadius: 12
                  }}
                >
                  제품 탐색하기
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.length > 0 ? (
              orders.map(order => (
                <div key={order.id} style={{ padding: 16, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--hairline)', paddingBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <DeliveryStatus status={order.status} />
                  </div>
                  {order.order_items.map((item: SupabaseOrderItem) => (
                    <div key={item.id} onClick={() => navigate(`/product/${item.product_id}`)} style={{ display: 'flex', gap: 13, alignItems: 'center', cursor: 'pointer' }}>
                      <img src={item.products.image_url} alt={item.products.name} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--hairline)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{item.products.brand_name}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.products.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>{item.price_at_purchase.toLocaleString()}원 · {item.quantity}개</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--hairline)', paddingTop: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>총 결제 금액</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{order.total_amount.toLocaleString()}원</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '54px 28px', textAlign: 'center' }}>
                <ShoppingBag size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>아직 주문 내역이 없어요</div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)',
                    background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', padding: '11px 20px', borderRadius: 12
                  }}
                >
                  제품 보러 가기
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reports && reports.length > 0 ? (
              reports.map(report => {
                const result = report.analysis_json;
                const product = report.products;
                const finalScore = result.scores?.final || 0;
                const scoreGrade = finalScore >= 80 ? '안전' : (finalScore >= 60 ? '주의' : '경고');
                const gradeColor = scoreGrade === '안전' ? 'var(--safe)' : (scoreGrade === '주의' ? 'var(--warning)' : 'var(--danger)');
                const gradeBg = scoreGrade === '안전' ? 'var(--safe-tint)' : (scoreGrade === '주의' ? 'var(--caution-tint)' : 'var(--danger-tint)');

                return (
                  <div key={report.id} style={{ padding: 16, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{new Date(report.created_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product ? product.name : 'OCR 추출 성분 분석'}</div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: gradeColor, padding: '4px 10px', borderRadius: 999, background: gradeBg }}>{scoreGrade}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {product?.image_url && (
                        <img src={product.image_url} alt={product.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--hairline)' }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ height: 8, borderRadius: 99, background: 'var(--hairline)', overflow: 'hidden' }}>
                          <div style={{ width: `${finalScore}%`, height: '100%', background: gradeColor }} />
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-soft)' }}>
                          성분 안전 점수 <b style={{ color: 'var(--ink)' }}>{finalScore.toFixed(0)}</b>/100
                        </div>
                      </div>
                    </div>
                    {product && (
                      <button
                        onClick={() => navigate(`/product/${report.product_id}`)}
                        style={{
                          width: '100%', cursor: 'pointer', padding: '10px', borderRadius: 10,
                          background: 'none', border: '1px solid var(--hairline)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)'
                        }}
                      >
                        상세 리포트 보기
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '54px 28px', textAlign: 'center' }}>
                <Activity size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 16 }}>저장된 분석 리포트가 없어요</div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)',
                    background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', padding: '11px 20px', borderRadius: 12
                  }}
                >
                  사료 분석하러 가기
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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

