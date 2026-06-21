// @ts-nocheck
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, LogOut, Heart, Crown } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TossCard, TossInput, TossButton, TossChip, TossSectionTitle } from '../components/TossUI';
import { Button } from '../components/Button';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { getRecommendationBreakdown, gradeFromScore } from '../utils/score';
import { notify } from '../store/useNotification';

const PROFILE_STEP_META = [
  { title: '이름', prompt: '반려동물의 이름을 알려주세요.' },
  { title: '종류', prompt: '반려동물의 종류를 알려주세요.' },
  { title: '크기 구분', prompt: '강아지의 크기 구분을 선택해 주세요.' },
  { title: '나이', prompt: '반려동물의 나이를 선택해 주세요.' },
  { title: '체중', prompt: '반려동물의 체중을 선택해 주세요.' },
  { title: '알레르기', prompt: '피해야 할 알레르기 성분이 있나요?' },
  { title: '건강 고민', prompt: '어떤 건강 고민이 있나요?' },
  { title: '기존 질병', prompt: '앓고 있는 기존 질병이 있나요?' }
];

const BREED_LIST_DOG = ['소형견', '중형견', '대형견'];
const BREED_LIST_CAT = [];

const WEIGHT_OPTIONS = [
  { label: '1kg 미만', value: 0.5 },
  ...Array.from({ length: 49 }, (_, i) => {
    const val = i + 1;
    return { label: `${val}kg`, value: val };
  }),
  { label: '50kg 이상', value: 50 }
];

const AGE_OPTIONS = [
  { label: '1년 미만 (0세)', value: 0 },
  ...Array.from({ length: 20 }, (_, i) => {
    const val = i + 1;
    return { label: `${val}세`, value: val };
  }),
  { label: '20세 이상', value: 20 }
];

const allergyOptions = [
  '닭고기', '소고기', '돼지고기', '오리고기', '양고기', '칠면조',
  '연어', '생선/흰살생선', '계란/달걀', '유제품(우유/치즈)',
  '곡물/글루텐', '밀가루', '대두/콩', '옥수수', '감자/고구마',
  '인공색소/향료', '화학방부제'
];

const healthConcernOptions = [
  '체중 관리 / 비만', '모질 개선 / 탈모', '소화 / 장 건강', '변비 예방',
  '활력 증진 / 면역력', '구강 건강 / 치석', '눈 건강 / 눈물 흔적',
  '귀 건강 / 귓병 예방', '성장기 발달 / 뼈 강화', '요로 건강 / 결석 예방',
  '스트레스 / 불안 완화'
];

const diseaseOptions = [
  '슬개골 탈구 / 관절염', '만성 신장 질환', '당뇨병', '심장 판막 질환 / 심부전',
  '아토피 / 알레르기성 피부염', '췌장염', '갑상선 기능 항진/저하증',
  '부신피질 기능 항진증 (쿠싱)', '요로 결석증', '간 질환 / 간경화',
  '인지기능 장애 증후군 (치매)', '백내장 / 녹내장', '외이도염',
  '종양 / 암', '허니아 (디스크)'
];


function getBreedAvatar(breed?: string, species?: 'Dog' | 'Cat') {
  const normalized = breed?.trim() || '';
  if (species === 'Cat') {
    return { emoji: '🐈', label: '고양이', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' };
  } else {
    if (normalized.includes('소형견')) {
      return { emoji: '🐩', label: '소형견', bg: 'linear-gradient(135deg, #FFF5F5 0%, #FFE3E3 100%)' };
    }
    if (normalized.includes('중형견')) {
      return { emoji: '🐕', label: '중형견', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' };
    }
    if (normalized.includes('대형견')) {
      return { emoji: '🦮', label: '대형견', bg: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)' };
    }
    return { emoji: '🐶', label: breed || '강아지', bg: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)' };
  }
}

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
    products,
    membershipTier,
  } = useStore();

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');

  useEffect(() => {
    if (tabParam === 'favorites' || tabParam === 'orders' || tabParam === 'reports' || tabParam === 'info') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [formData, setFormData] = useState(profile);
  const [editForm, setEditForm] = useState(profile);
  const [profileStep, setProfileStep] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const navigate = useNavigate();
  
  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setFormData(profile);
      setEditForm(profile);
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
  const handleLogout = handleSignOut;

  const handleSave = async () => {
    await updateProfile(formData);
    setJustSaved(true);
  };

  const handleNext = () => {
    if (profileStep === 1 && formData.species === 'Cat') {
      setFormData(prev => ({ ...prev, breed: '고양이' }));
      setProfileStep(3); // skip step 2 (breed selection)
      return;
    }
    if (profileStep < PROFILE_STEP_META.length - 1) {
      setProfileStep(prev => prev + 1);
    } else {
      handleSave();
    }
  };

  const handlePrev = () => {
    if (profileStep === 3 && formData.species === 'Cat') {
      setProfileStep(1); // skip back to step 1
      return;
    }
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

  const isCat = formData.species === 'Cat';
  const stepCount = isCat ? PROFILE_STEP_META.length - 1 : PROFILE_STEP_META.length;
  
  let stepIndexLabel = profileStep + 1;
  if (isCat && profileStep >= 3) {
    stepIndexLabel = profileStep;
  }
  
  const progressPercent = (stepIndexLabel / stepCount) * 100;
  const step = PROFILE_STEP_META[profileStep];
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

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
        color: on ? '#1E293B' : 'var(--ink-soft)',
        background: on ? '#FCD34D' : 'var(--surface)',
        border: `1px solid ${on ? '#CA8A04' : 'var(--hairline)'}`,
        boxShadow: on ? '0 2px 6px rgba(245, 197, 24, 0.2)' : 'none',
        transition: 'all .15s ease',
      }}
    >
      {children}
    </button>
  );

  const hasPetProfile = isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';

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
            {profile.species === 'Cat' ? '고양이' : profile.breed || '소형견'} · {profile.age || 0}세 · {profile.weightKg || 0}kg
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
            {justSaved && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: 'var(--safe-tint)',
                border: '1.5px solid var(--safe)',
                color: 'var(--ink)',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--safe)', fontSize: '15px' }}>🎉 프로필 저장 완료!</span>
                  <button
                    onClick={() => setJustSaved(false)}
                    style={{
                      border: 'none', background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '13px', fontWeight: 700
                    }}
                  >
                    닫기
                  </button>
                </div>
                <p style={{ fontSize: '13.5px', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                  다음과 같이 저장되었습니다:
                </p>
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div>• <b>이름:</b> {profile.name} ({profile.gender || '남아'})</div>
                  <div>• <b>종류:</b> {profile.species === 'Cat' ? '고양이' : '강아지'} ({profile.breed || '품종 없음'})</div>
                  <div>• <b>성향:</b> {profile.personality || '활발함 ⚡'}</div>
                  <div>• <b>나이:</b> {profile.age}세</div>
                  <div>• <b>체중:</b> {profile.weightKg ? `${profile.weightKg}kg` : '입력 없음'}</div>
                  <div>• <b>알레르기 성분:</b> {profile.allergies && profile.allergies.length > 0 ? profile.allergies.join(', ') : '없음'}</div>
                  <div>• <b>건강 고민:</b> {profile.healthConcerns && profile.healthConcerns.length > 0 ? profile.healthConcerns.join(', ') : '없음'}</div>
                </div>
              </div>
            )}

            {hasPetProfile ? (
              isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>프로필 수정</h3>
                  
                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>이름</label>
                    <input
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                        border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                      }}
                      placeholder="이름을 입력해주세요"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>성별</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Pill on={editForm.gender === '남아'} onClick={() => setEditForm({ ...editForm, gender: '남아' })}>남아 ♂</Pill>
                      <Pill on={editForm.gender === '여아'} onClick={() => setEditForm({ ...editForm, gender: '여아' })}>여아 ♀</Pill>
                    </div>
                  </div>

                  {/* Species */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>종류</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Pill on={editForm.species === 'Dog'} onClick={() => setEditForm({ ...editForm, species: 'Dog', breed: '' })}>강아지</Pill>
                      <Pill on={editForm.species === 'Cat'} onClick={() => setEditForm({ ...editForm, species: 'Cat', breed: '' })}>고양이</Pill>
                    </div>
                  </div>

                  {/* Personality */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>성향</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['활발함 ⚡', '온순함 🧸', '애교많음 🥰', '소심함 🥺', '도도함 👑'].map(p => (
                        <Pill key={p} on={editForm.personality === p} onClick={() => setEditForm({ ...editForm, personality: p })}>{p}</Pill>
                      ))}
                    </div>
                  </div>

                  {/* Breed */}
                  {editForm.species === 'Dog' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>크기 구분</label>
                      <select
                        value={editForm.breed || ''}
                        onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                        style={{
                          width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                          border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                        }}
                      >
                        <option value="">크기 구분 선택</option>
                        {BREED_LIST_DOG.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Age */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>나이</label>
                    <select
                      value={editForm.age != null ? editForm.age : ''}
                      onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) })}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                        border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                      }}
                    >
                      <option value="">나이 선택</option>
                      {AGE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Weight */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>체중</label>
                    <select
                      value={editForm.weightKg != null ? editForm.weightKg : ''}
                      onChange={(e) => setEditForm({ ...editForm, weightKg: parseFloat(e.target.value) })}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                        border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                      }}
                    >
                      <option value="">체중 선택</option>
                      {WEIGHT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>알레르기 성분 (복수 선택)</label>
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                      {allergyOptions.map((opt) => {
                        const on = editForm.allergies?.includes(opt);
                        return (
                          <Pill
                            key={opt}
                            on={on}
                            onClick={() => {
                              const list = editForm.allergies || [];
                              const nextList = list.includes(opt) ? list.filter(i => i !== opt) : [...list, opt];
                              setEditForm({ ...editForm, allergies: nextList });
                            }}
                          >
                            {opt}
                          </Pill>
                        );
                      })}
                    </div>
                  </div>

                  {/* Health Concerns */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>건강 고민 (복수 선택)</label>
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                      {healthConcernOptions.map((opt) => {
                        const on = editForm.healthConcerns?.includes(opt);
                        return (
                          <Pill
                            key={opt}
                            on={on}
                            onClick={() => {
                              const list = editForm.healthConcerns || [];
                              const nextList = list.includes(opt) ? list.filter(i => i !== opt) : [...list, opt];
                              setEditForm({ ...editForm, healthConcerns: nextList });
                            }}
                          >
                            {opt}
                          </Pill>
                        );
                      })}
                    </div>
                  </div>

                  {/* Existing Diseases */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>기존 질병 (복수 선택)</label>
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                      {diseaseOptions.map((opt) => {
                        const on = editForm.healthConcerns?.includes(opt);
                        return (
                          <Pill
                            key={opt}
                            on={on}
                            onClick={() => {
                              const list = editForm.healthConcerns || [];
                              const nextList = list.includes(opt) ? list.filter(i => i !== opt) : [...list, opt];
                              setEditForm({ ...editForm, healthConcerns: nextList });
                            }}
                          >
                            {opt}
                          </Pill>
                        );
                      })}
                    </div>
                  </div>

                  {/* Edit Buttons */}
                  <div style={{ display: 'flex', gap: 10, marginTop: '10px' }}>
                    <button
                      onClick={() => {
                        setEditForm(profile);
                        setIsEditing(false);
                      }}
                      style={{
                        cursor: 'pointer', flex: 1, padding: '14px', borderRadius: 12,
                        background: 'var(--surface)', border: '1px solid var(--hairline)', fontSize: 15, fontWeight: 600, color: 'var(--ink-soft)'
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={async () => {
                        await updateProfile(editForm);
                        setJustSaved(true);
                        setIsEditing(false);
                      }}
                      style={{
                        cursor: 'pointer', flex: 1, padding: '14px', borderRadius: 12,
                        background: 'var(--brand)', color: 'var(--ink-on-brand)', fontSize: 15, fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{
                    padding: '24px 20px',
                    borderRadius: '24px',
                    background: 'var(--surface)',
                    border: '1px solid var(--brand-line)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: '16px',
                  }}>
                    {/* Breed Avatar Circle */}
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: getBreedAvatar(profile.breed, profile.species).bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '36px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}>
                      {getBreedAvatar(profile.breed, profile.species).emoji}
                    </div>

                    <div>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>
                        {profile.name}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--ink-soft)', fontWeight: 500 }}>
                        {profile.species === 'Cat' ? '고양이' : `${getBreedAvatar(profile.breed, profile.species).label} · 강아지`}
                      </p>
                    </div>

                    {/* Specs Pills */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)', background: 'var(--surface-trans)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--hairline)' }}>
                        나이: {profile.age}세
                      </span>
                      {profile.weightKg && (
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)', background: 'var(--surface-trans)', padding: '5px 12px', borderRadius: '10px', border: '1px solid var(--hairline)' }}>
                          체중: {profile.weightKg}kg
                        </span>
                      )}
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'var(--hairline)', margin: '4px 0' }} />

                    {/* Allergies / Health concerns lists */}
                    <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '6px' }}>알레르기 성분</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {profile.allergies && profile.allergies.length > 0 ? (
                            profile.allergies.map(allergy => (
                              <span key={allergy} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-tint)', padding: '4px 10px', borderRadius: '8px' }}>
                                {allergy}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>설정된 알레르기가 없습니다.</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '6px' }}>건강 고민</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {profile.healthConcerns && profile.healthConcerns.length > 0 ? (
                            profile.healthConcerns.map(concern => (
                              <span key={concern} style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '4px 10px', borderRadius: '8px' }}>
                                {concern}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>설정된 건강 고민이 없습니다.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      onClick={() => {
                        setEditForm(profile);
                        setIsEditing(true);
                      }}
                      style={{
                        cursor: 'pointer', width: '100%', padding: '14px', borderRadius: 14,
                        background: 'var(--brand)', color: 'var(--ink-on-brand)', fontSize: 15, fontWeight: 700, border: 'none', boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      ✏️ 정보 수정하기
                    </button>
                    
                    {/* 멤버십 진입점 */}
                    <button
                      onClick={() => navigate('/membership')}
                      style={{
                        cursor: 'pointer', width: '100%', padding: '14px', borderRadius: 14,
                        background: membershipTier === 'free' ? 'var(--fill)' : 'var(--brand-tint)',
                        border: '1px solid var(--hairline)', fontSize: 14, fontWeight: 700, color: 'var(--ink)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Crown size={16} color={membershipTier === 'free' ? 'var(--ink-faint)' : 'var(--brand-deep)'} />
                        <span>
                          멤버십
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 99,
                            background: membershipTier === 'pro' ? '#7C3AED' : membershipTier === 'plus' ? '#3B82F6' : '#E5E7EB',
                            color: membershipTier === 'free' ? '#6B7280' : '#fff',
                          }}>
                            {membershipTier === 'pro' ? 'Pro' : membershipTier === 'plus' ? 'Plus' : 'Free'}
                          </span>
                        </span>
                      </div>
                      <ChevronRight size={16} color="var(--ink-faint)" />
                    </button>

                    <button
                      onClick={handleLogout}
                      style={{
                        cursor: 'pointer', width: '100%', padding: '14px', borderRadius: 14,
                        background: 'none', border: '1px solid var(--hairline)', fontSize: 14, fontWeight: 600, color: 'var(--ink-soft)'
                      }}
                    >
                      로그아웃
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div>
                {/* progress */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--brand-deep)' }}>STEP {stepIndexLabel} / {stepCount}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{step.title}</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: 'var(--hairline)', overflow: 'hidden', marginBottom: 22 }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--brand)', transition: 'width .25s ease' }} />
                </div>

                <div style={{ minHeight: 168 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{step.prompt}</h3>
                    </div>

                    {profileStep === 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="예: 체다"
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                            border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                          }}
                        />
                        <div>
                          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '8px' }}>성별</label>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <Pill on={formData.gender === '남아'} onClick={() => setFormData({ ...formData, gender: '남아' })}>남아 ♂</Pill>
                            <Pill on={formData.gender === '여아'} onClick={() => setFormData({ ...formData, gender: '여아' })}>여아 ♀</Pill>
                          </div>
                        </div>
                      </div>
                    )}

                    {profileStep === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <Pill on={formData.species === 'Dog'} onClick={() => setFormData({ ...formData, species: 'Dog', breed: '' })}>강아지</Pill>
                          <Pill on={formData.species === 'Cat'} onClick={() => setFormData({ ...formData, species: 'Cat', breed: '' })}>고양이</Pill>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '8px' }}>성향</label>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {['활발함 ⚡', '온순함 🧸', '애교많음 🥰', '소심함 🥺', '도도함 👑'].map(p => (
                              <Pill key={p} on={formData.personality === p} onClick={() => setFormData({ ...formData, personality: p })}>{p}</Pill>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {profileStep === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <select
                          value={formData.breed || ''}
                          onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                            border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                          }}
                        >
                          <option value="">크기 구분을 선택해 주세요</option>
                          {BREED_LIST_DOG.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {profileStep === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <select
                          value={formData.age != null ? formData.age : ''}
                          onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                            border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                          }}
                        >
                          <option value="">나이를 선택해 주세요</option>
                          {AGE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {profileStep === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <select
                          value={formData.weightKg != null ? formData.weightKg : ''}
                          onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) })}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '14px 16px', borderRadius: 13, fontSize: 16,
                            border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit',
                          }}
                        >
                          <option value="">체중을 선택해 주세요</option>
                          {WEIGHT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {profileStep === 5 && (
                      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                        {allergyOptions.map((opt) => (
                          <Pill key={opt} on={formData.allergies?.includes(opt)} onClick={() => toggleArrayItem('allergies', opt)}>
                            {opt}
                          </Pill>
                        ))}
                      </div>
                    )}

                    {profileStep === 6 && (
                      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                        {healthConcernOptions.map((opt) => (
                          <Pill key={opt} on={formData.healthConcerns?.includes(opt)} onClick={() => toggleArrayItem('healthConcerns', opt)}>
                            {opt}
                          </Pill>
                        ))}
                      </div>
                    )}

                    {profileStep === 7 && (
                      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                        {diseaseOptions.map((opt) => (
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
                    {profileStep === PROFILE_STEP_META.length - 1 ? '변경 사항 저장' : '다음'}
                  </button>
                </div>

                {/* 선택 항목 건너뛰기 (이름·종 이후 단계) */}
                {profileStep >= 2 && profileStep < PROFILE_STEP_META.length - 1 && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button
                      onClick={handleNext}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--ink-faint)', textDecoration: 'underline', textUnderlineOffset: 3 }}
                    >
                      이 단계 건너뛰기
                    </button>
                  </div>
                )}

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
          </div>
        )}

        {activeTab === 'favorites' && (
          <div style={{ padding: '4px 20px 20px' }}>
            {favoriteProducts.length > 0 ? (
              (() => {
                const GRADE_COLOR = { A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452' };
                const GRADE_BG    = { A: '#ECFDF5', B: '#F0FDE8', C: '#FFFBEB', D: '#FFF1F2' };

                const scored = favoriteProducts.map(p => ({
                  p,
                  bd: hasPetProfile ? getRecommendationBreakdown(p, profile) : null,
                })).sort((a, b) => (b.bd?.total ?? 0) - (a.bd?.total ?? 0));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {scored.map(({ p, bd }) => {
                      const grade = bd ? gradeFromScore(bd.total) : null;
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
                            {grade && (
                              <span style={{
                                position: 'absolute', bottom: 4, left: 4,
                                padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 800,
                                background: GRADE_BG[grade], color: GRADE_COLOR[grade],
                              }}>{grade}</span>
                            )}
                          </div>

                          {/* info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 2 }}>{p.brand}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                              {p.name}
                            </div>
                            {bd?.allergyHits?.length > 0 && (
                              <span style={{ display: 'inline-block', marginTop: 5, fontSize: 11, fontWeight: 700, color: '#BE123C', background: '#FFF1F2', padding: '2px 7px', borderRadius: 5 }}>
                                ⚠ {bd.allergyHits.join(', ')} 포함
                              </span>
                            )}
                          </div>

                          {/* score */}
                          {bd && (
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 20, fontWeight: 900, color: grade ? GRADE_COLOR[grade] : 'var(--ink)', letterSpacing: '-0.02em' }}>
                                {bd.total}<span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)' }}>점</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>
                                {p.price?.toLocaleString()}원
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()
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

