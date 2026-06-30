// @ts-nocheck
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, LogOut, Heart, Crown } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TossCard, TossInput, TossButton, TossChip, TossSectionTitle } from '../components/TossUI';
import { Button } from '../components/Button';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { displayBrand } from '../utils/brandLabel';
import { notify } from '../store/useNotification';
import { FAVORITES_EMPTY } from '../copy/ui';

const TABS = ['찜', '구매내역'];

function ScoreCircle({ score }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#fff" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const { 
    userId, 
    isLoggedIn, 
    profile, 
    updateProfile, 
    orders,
    fetchOrders,
    logout,
    signOut,
    favorites,
    products,
    membershipTier,
  } = useStore();

  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
  const [formData, setFormData] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);
  const [weightKgStr, setWeightKgStr] = useState(profile?.weightKg != null ? String(profile.weightKg) : '');
  const navigate = useNavigate();
  
  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setFormData(profile);
      if (profile.weightKg != null && parseFloat(weightKgStr) !== profile.weightKg) {
        setWeightKgStr(String(profile.weightKg));
      } else if (profile.weightKg == null) {
        setWeightKgStr('');
      }
    }
  }, [tabParam]);

  const [formData, setFormData] = useState(profile);
  const [editForm, setEditForm] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('찜');

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchOrders, fetchReports, userId]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
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
            value={formData?.name || ''}
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
                  border: formData?.species === sp ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: formData?.species === sp ? 'var(--primary-dark)' : '#fff',
                  color: formData?.species === sp ? '#fff' : 'var(--text-dark)',
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
                  border: formData?.age === age ? 'none' : '1px solid #E2E8F0',
                  backgroundColor: formData?.age === age ? 'var(--primary-dark)' : '#FFFFFF',
                  color: formData?.age === age ? '#FFFFFF' : 'var(--text-dark)',
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
              value={weightKgStr}
              onChange={(v) => {
                setWeightKgStr(v);
                const n = parseFloat(v.replace(/[^0-9.]/g, ''));
                if (Number.isFinite(n) && n >= 0) {
                  setFormData(prev => ({
                    ...prev,
                    weightKg: n
                  }));
                }
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
                  border: (formData?.allergies || []).includes(opt) ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: (formData?.allergies || []).includes(opt) ? 'var(--danger)' : '#fff',
                  color: (formData?.allergies || []).includes(opt) ? '#fff' : 'var(--text-dark)',
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
                  border: (formData?.healthConcerns || []).includes(opt) ? 'none' : '1px solid #E5E7EB',
                  backgroundColor: (formData?.healthConcerns || []).includes(opt) ? 'var(--primary-dark)' : '#fff',
                  color: (formData?.healthConcerns || []).includes(opt) ? '#fff' : 'var(--text-dark)',
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
    navigate('/login');
  };

  if (!userId) {
    return (
      <div className="animate-fade-in" style={{ padding: '40px 20px', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Helmet>
          <title>마이 펫 | 베로로</title>
          <meta name="description" content="베로로에서 반려동물 프로필을 등록하고 맞춤 추천을 받아보세요." />
        </Helmet>
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <User size={40} color="#D1D5DB" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px' }}>
          로그인이 필요해요
        </h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
          프로필을 설정하고 아이의 건강 맞춤<br/>사료 분석을 시작해보세요!
        </p>
        <Button 
          title="로그인 / 회원가입 하기"
          style={{ width: '100%', maxWidth: '320px', borderRadius: '20px', fontSize: '16px' }}
          onClick={() => navigate('/auth')}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>마이 펫 | 베로로</title>
        <meta name="description" content="반려동물 프로필, 찜한 사료, 주문 내역, 분석 리포트를 한곳에서 관리하세요." />
      </Helmet>
      {/* 로그인/로그아웃 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        {isLoggedIn ? (
          <TossButton variant="outline" onClick={handleSignOut} style={{ width: 'auto', height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={15} /> 로그아웃
          </TossButton>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {isLoggedIn ? '펫 정보를 등록해보세요' : '로그인 후 펫 정보를 등록해보세요'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          style={{
            flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#F5C518', fontSize: 14, fontWeight: 700, color: '#191F28',
          }}
        >
          {hasPetProfile ? '정보 수정하기' : (isLoggedIn ? '펫 등록하기' : '로그인하기')}
        </button>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            style={{
              height: 46, padding: '0 20px', borderRadius: 12,
              border: '1.5px solid #E5E8EB', cursor: 'pointer',
              background: '#fff', fontSize: 14, fontWeight: 600, color: '#6B7684',
            }}
          >
            로그아웃
          </button>
        )}
      </div>

      {/* Pet Info Card */}
      {hasPetProfile && (
        <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 1px 8px rgba(30,41,59,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>🐾 펫 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: '이름', value: profile.name },
              { label: '종류', value: profile.species === 'Cat' ? '고양이' : '강아지' },
              { label: '품종', value: profile.breed || '-' },
              { label: '나이', value: profile.age ? `${profile.age}살` : '-' },
              { label: '체중', value: profile.weightKg ? `${profile.weightKg}kg` : '-' },
              { label: '성별', value: profile.gender || '-' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#F7F4EE', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ margin: '16px 0 0', borderBottom: '1px solid #EAEDF0' }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, height: 44, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === tab ? 800 : 600,
                color: activeTab === tab ? '#191F28' : '#8B95A1',
                borderBottom: activeTab === tab ? '2.5px solid #F5C518' : '2.5px solid transparent',
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {activeTab === '찜' && (
          favoriteProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#B0B8C1' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>❤️</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#4E5968' }}>찜한 상품이 없어요</p>
              <p style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>마음에 드는 상품에 하트를 눌러 저장해두세요</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/search')}
                  style={{ background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
                  상품 둘러보기
                </button>
                {!hasPetProfile && (
                  <button onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
                    style={{ background: '#fff', border: '1.5px solid #E5E8EB', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer' }}>
                    반려동물 등록하고 맞춤 추천 받기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {favoriteProducts.map(product => {
                const brandLabel = displayBrand(product.brand, product.name);
                return (
                  <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                    style={{ background: '#fff', borderRadius: 16, padding: '14px', boxShadow: '0 1px 6px rgba(30,41,59,0.06)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                      <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {brandLabel && <div style={{ fontSize: 11, color: '#8B95A1' }}>{brandLabel}</div>}
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
                        {product.name.length > 25 ? product.name.slice(0, 25) + '…' : product.name}
                      </div>
                      {product.price > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginTop: 4 }}>{product.price.toLocaleString()}원</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === 'favorites' && (
          <div style={{ padding: '4px 20px 20px' }}>
            {favoriteProducts.length > 0 ? (
              (() => {
                const scored = [...favoriteProducts].sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {scored.map((p) => {
                      return (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/product/${p.id}`)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 13,
                            padding: '13px 0', borderBottom: '1px solid var(--hairline)',
                            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                            borderBottomColor: 'var(--hairline)',
                          }}
                        >
                          {/* thumbnail */}
                          <div style={{ width: 68, height: 68, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'var(--fill)', position: 'relative' }}>
                            <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>

                          {/* info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 2 }}>{p.brand}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {p.name}
                            </div>
                          </div>

                          {/* price */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink)' }}>
                              {p.price?.toLocaleString()}원
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            ) : (
              <div style={{ padding: '54px 28px', textAlign: 'center' }}>
                <Heart size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{FAVORITES_EMPTY.title}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 6 }}>{FAVORITES_EMPTY.description}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>{FAVORITES_EMPTY.hint}</div>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)',
                    background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', padding: '11px 20px', borderRadius: 12
                  }}
                >
                  {FAVORITES_EMPTY.cta}
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
