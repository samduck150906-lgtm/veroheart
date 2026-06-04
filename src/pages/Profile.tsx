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
  { title: '품종', prompt: '반려동물의 품종을 알려주세요.' },
  { title: '나이', prompt: '반려동물의 나이를 알려주세요.' },
  { title: '체중', prompt: '반려동물의 체중을 알려주세요.' },
  { title: '알레르기', prompt: '피해야 할 알레르기 성분이 있나요?' },
  { title: '건강 고민', prompt: '어떤 건강 고민이 있나요?' }
];

const BREED_LIST_DOG = ['믹스견', '말티즈', '포메라니안', '비숑', '푸들', '시츄', '골든리트리버', '래브라도', '리트리버', '진도', '기타'];
const BREED_LIST_CAT = ['믹스묘', '페르시안', '스코티시폴드', '러시안블루', '아비시니안', '메인쿤', '기타'];

const concernOptions = [
  '비만', '관절 질환', '신장 질환', '당뇨', '심장 질환',
  '피부 민감', '소화 예민', '구강 질환', '암/종양', '눈/귀 질환'
];

function getBreedAvatar(breed?: string, species?: 'Dog' | 'Cat') {
  const normalized = breed?.trim() || '';
  if (species === 'Cat') {
    if (normalized.includes('페르시안')) return { emoji: '🐱', label: '페르시안', bg: 'linear-gradient(135deg, #F3F4F6 0%, #E5E7EB 100%)' };
    if (normalized.includes('스코티시')) return { emoji: '😸', label: '스코티시폴드', bg: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)' };
    if (normalized.includes('러시안')) return { emoji: '🐈', label: '러시안블루', bg: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)' };
    if (normalized.includes('아비시니안')) return { emoji: '🐅', label: '아비시니안', bg: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' };
    if (normalized.includes('메인쿤')) return { emoji: '🦁', label: '메인쿤', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' };
    return { emoji: '🐱', label: breed || '믹스묘', bg: 'linear-gradient(135deg, #F1F3F5 0%, #CFD8DC 100%)' };
  } else {
    if (normalized.includes('말티즈')) return { emoji: '🐩', label: '말티즈', bg: 'linear-gradient(135deg, #FFF5F5 0%, #FFE3E3 100%)' };
    if (normalized.includes('포메라니안')) return { emoji: '🦊', label: '포메라니안', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' };
    if (normalized.includes('비숑')) return { emoji: '🐩', label: '비숑', bg: 'linear-gradient(135deg, #FFF0F6 0%, #FFD8E6 100%)' };
    if (normalized.includes('푸들')) return { emoji: '🐩', label: '푸들', bg: 'linear-gradient(135deg, #FAF0E6 0%, #EEDC82 100%)' };
    if (normalized.includes('시츄')) return { emoji: '🐶', label: '시츄', bg: 'linear-gradient(135deg, #FFF9DB 0%, #FFF3B0 100%)' };
    if (normalized.includes('골든')) return { emoji: '🐕', label: '골든리트리버', bg: 'linear-gradient(135deg, #FEF9C3 0%, #FEF08A 100%)' };
    if (normalized.includes('래브라도')) return { emoji: '🐕', label: '래브라도', bg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)' };
    if (normalized.includes('진도')) return { emoji: '🐕', label: '진도견', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FDE68A 100%)' };
    return { emoji: '🐶', label: breed || '믹스견', bg: 'linear-gradient(135deg, #FFF5F5 0%, #FFE3E3 100%)' };
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
    products
  } = useStore();

  const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'reports' | 'favorites'>('info');
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

  const handleSave = async () => {
    await updateProfile(formData);
    setJustSaved(true);
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

  const hasPetProfile = isLoggedIn && profile && profile.id !== 'local-profile' && profile.name !== '우리 아이';

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
                  <div>• <b>이름:</b> {profile.name}</div>
                  <div>• <b>종류:</b> {profile.species === 'Cat' ? '고양이' : '강아지'} ({profile.breed || '품종 없음'})</div>
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

                  {/* Species */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>종류</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <Pill on={editForm.species === 'Dog'} onClick={() => setEditForm({ ...editForm, species: 'Dog', breed: '' })}>강아지</Pill>
                      <Pill on={editForm.species === 'Cat'} onClick={() => setEditForm({ ...editForm, species: 'Cat', breed: '' })}>고양이</Pill>
                    </div>
                  </div>

                  {/* Breed */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>품종</label>
                    <select
                      value={editForm.breed || ''}
                      onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                      style={{
                        width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                        border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                      }}
                    >
                      <option value="">품종 선택</option>
                      {(editForm.species === 'Cat' ? BREED_LIST_CAT : BREED_LIST_DOG).map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Age */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>나이</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { label: '아기', age: 1 },
                        { label: '성견', age: 4 },
                        { label: '시니어', age: 10 },
                      ].map(({ label, age }) => (
                        <Pill key={label} on={editForm.age === age} onClick={() => setEditForm({ ...editForm, age })}>
                          {label}
                        </Pill>
                      ))}
                    </div>
                  </div>

                  {/* Weight */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>체중</label>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <input
                        type="number"
                        value={editForm.weightKg != null ? editForm.weightKg : ''}
                        onChange={(e) => {
                          const n = parseFloat(e.target.value);
                          setEditForm({
                            ...editForm,
                            weightKg: Number.isFinite(n) && n > 0 ? n : undefined,
                          });
                        }}
                        style={{
                          width: 120, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 12, fontSize: 15,
                          border: '1px solid var(--hairline)', outline: 'none', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'inherit'
                        }}
                        placeholder="6.2"
                      />
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-soft)' }}>kg</span>
                    </div>
                  </div>

                  {/* Allergies */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>알레르기 성분</label>
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
                    <label style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink-soft)', marginBottom: '6px' }}>건강 고민</label>
                    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                      {concernOptions.map((opt) => {
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
                        {getBreedAvatar(profile.breed, profile.species).label} · {profile.species === 'Cat' ? '고양이' : '강아지'}
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
                        <Pill on={formData.species === 'Dog'} onClick={() => setFormData({ ...formData, species: 'Dog', breed: '' })}>강아지</Pill>
                        <Pill on={formData.species === 'Cat'} onClick={() => setFormData({ ...formData, species: 'Cat', breed: '' })}>고양이</Pill>
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
                          <option value="">품종을 선택해주세요</option>
                          {(formData.species === 'Cat' ? BREED_LIST_CAT : BREED_LIST_DOG).map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {profileStep === 3 && (
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

                    {profileStep === 4 && (
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

