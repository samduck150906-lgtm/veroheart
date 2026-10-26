import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getVisibleProductsByIds } from '../lib/supabase';
import {
  User,
  ChevronRight,
  Heart,
  PawPrint,
  Plus,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import AllergyIngredientPicker from '../components/AllergyIngredientPicker';
import { petAgeDisplay } from '../utils/allergyPicker';
import { TossCard, TossButton, TossChip, TossInput, TossSectionTitle } from '../components/TossUI';
import ProductCard from '../components/ProductCard';
import AccountSettings from '../components/AccountSettings';
import type { Product, UserPetProfile } from '../types';
import { HEALTH_CONCERN_OPTIONS } from '../health/concerns';

const PROFILE_STEP_META = [
  { title: '이름', prompt: '반려동물 이름을 입력해 주세요.' },
  { title: '종', prompt: '강아지 또는 고양이를 선택해 주세요.' },
  { title: '나이', prompt: '나이대를 선택해 주세요.' },
  { title: '몸무게·품종', prompt: '몸무게와 품종을 입력해 주세요. (선택)' },
  { title: '알레르기', prompt: '알레르기가 있는 성분을 선택해 주세요. (복수 선택)' },
  { title: '건강 고민', prompt: '건강 고민을 선택해 주세요. (복수 선택)' },
];

// 회피 성분은 고정 목록 대신 성분 DB 검색으로 고른다 (components/AllergyIngredientPicker).
// 예전 목록은 5개뿐이라 오리·칠면조·달걀 같은 흔한 알레르겐도 고를 수 없었다.

// 건강 고민 선택지는 근거 등급까지 함께 정의된 health/concerns 를 단일 출처로 쓴다.
// 여기서 문자열을 따로 늘리면 분석이 다루지 못하는 항목이 조용히 섞인다.
const concernOptions = HEALTH_CONCERN_OPTIONS;

type MyPageTab = 'pets' | 'favorites' | 'account';

const TAB_META: { key: MyPageTab; label: string }[] = [
  { key: 'pets', label: '내 반려동물' },
  { key: 'favorites', label: '저장한 제품' },
  { key: 'account', label: '계정·설정' },
];


function newPetDraft(): UserPetProfile {
  return {
    id: '',
    name: '',
    species: 'Dog',
    age: 4,
    weightKg: undefined,
    breed: '',
    healthConcerns: [],
    allergies: [],
  };
}

function ProfileContent() {
  const {
    userId,
    isLoggedIn,
    pets,
    activePetId,
    savePet,
    removePet,
    selectPet,
    favorites,
    catalogRevision,
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as MyPageTab | null;
  const activeTab: MyPageTab = TAB_META.some((t) => t.key === tabParam) ? (tabParam as MyPageTab) : 'pets';
  const setTab = (key: MyPageTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: false },
    );
  };

  const navigate = useNavigate();

  const [editingPet, setEditingPet] = useState<UserPetProfile | null>(null);
  const [formData, setFormData] = useState<UserPetProfile>(newPetDraft());
  const [profileStep, setProfileStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserPetProfile | null>(null);

  // 반려동물이 하나도 없으면 편집 폼을 바로 노출(첫 등록 유도)
  useEffect(() => {
    if (activeTab === 'pets' && isLoggedIn && pets.length === 0 && !editingPet) {
      setEditingPet(newPetDraft());
      setFormData(newPetDraft());
      setProfileStep(0);
    }
  }, [activeTab, isLoggedIn, pets.length, editingPet]);

  const startAddPet = () => {
    const draft = newPetDraft();
    setEditingPet(draft);
    setFormData(draft);
    setProfileStep(0);
  };

  const startEditPet = (pet: UserPetProfile) => {
    setEditingPet(pet);
    setFormData({ ...pet });
    setProfileStep(0);
  };

  const cancelEdit = () => {
    setEditingPet(null);
    setProfileStep(0);
  };

  const handleSavePet = async () => {
    if (saving) return;
    if (!formData.name.trim()) {
      setProfileStep(0);
      return;
    }
    setSaving(true);
    try {
      await savePet(formData);
      setEditingPet(null);
      setProfileStep(0);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePet = async () => {
    if (!deleteTarget) return;
    await removePet(deleteTarget.id);
    setDeleteTarget(null);
  };

  const toggleArrayItem = (field: 'healthConcerns' | 'allergies', value: string) => {
    const list = formData[field];
    if (list.includes(value)) {
      setFormData({ ...formData, [field]: list.filter((i) => i !== value) });
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
          <TossInput value={formData.name} onChange={(value) => setFormData({ ...formData, name: value })} placeholder="예: 로니" />
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
                  color: 'var(--text-dark)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TossInput
                value={formData.weightKg != null ? String(formData.weightKg) : ''}
                onChange={(v) => {
                  const n = parseFloat(v.replace(/[^0-9.]/g, ''));
                  setFormData({ ...formData, weightKg: Number.isFinite(n) && n > 0 ? n : undefined });
                }}
                placeholder="몸무게 예: 5.2"
              />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)' }}>kg</span>
            </div>
            <TossInput
              value={formData.breed ?? ''}
              onChange={(v) => setFormData({ ...formData, breed: v })}
              placeholder="품종 예: 말티즈 (선택)"
            />
          </div>
        );
      case 4:
        return (
          <AllergyIngredientPicker
            selected={formData.allergies}
            onChange={(next) => setFormData({ ...formData, allergies: next })}
          />
        );
      case 5:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 고른 항목이 전부 맞춤 추천 근거가 되는 것은 아니다. 근거가 없는데
                있는 것처럼 보이지 않도록 미리 알린다. */}
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              선택한 건강 고민은 프로필에 기록되며, 분석 가능한 항목은 제품 원료와 대조합니다.
            </p>
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
          </div>
        );
      default:
        return null;
    }
  })();

  if (!userId) {
    return (
      <div
        className="animate-fade-in"
        style={{ padding: '40px 20px', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
      >
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <User size={40} color="var(--line)" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px' }}>로그인이 필요합니다</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
          프로필을 설정하고 아이의 건강 맞춤
          <br />
          사료 분석과 섭취 기록을 시작해 주세요.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%', maxWidth: '320px', padding: '16px', borderRadius: '20px', fontWeight: 800, fontSize: '16px' }}
          onClick={() => navigate('/login')}
        >
          로그인 / 회원가입
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {activeTab !== 'account' && <Link to="/profile?tab=account" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 18, marginBottom: 20, borderRadius: 18, background: 'var(--surface-alt)', color: 'var(--text-dark)', textDecoration: 'none' }}>
        <User size={24} aria-hidden />
        <div style={{ flex: 1 }}><strong style={{ fontSize: 16 }}>계정·설정</strong><p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>로그인한 계정을 관리합니다</p></div>
        <ChevronRight size={18} aria-hidden />
      </Link>}

      {/* 마이페이지 메뉴 탭 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '0 2px', overflowX: 'auto' }}>
        {TAB_META.map((tab) => (
          <TossChip
            key={tab.key}
            label={tab.key === 'favorites' && favorites.length > 0 ? `${tab.label} (${favorites.length})` : tab.label}
            active={activeTab === tab.key}
            onClick={() => setTab(tab.key)}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          />
        ))}
      </div>

      {/* ── 내 반려동물 ── */}
      {activeTab === 'pets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {pets.length > 0 && (
            <div>
              <TossSectionTitle
                title="내 반려동물"
                subtitle="등록한 순서로 표시합니다. 기록·분석 기준이 될 반려동물을 선택해 주세요."
                right={
                  <button type="button" onClick={startAddPet} className="ui-text-button" style={{ padding: 0 }}>
                    <Plus size={14} /> 추가
                  </button>
                }
                style={{ marginBottom: '12px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pets.map((pet) => {
                  const active = activePetId === pet.id;
                  return (
                    <div
                      key={pet.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '14px',
                        borderRadius: '16px',
                        border: active ? '2px solid var(--primary)' : '1px solid var(--line)',
                        background: active ? 'rgba(250, 204, 21, 0.1)' : 'var(--surface-elevated)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => selectPet(pet.id)}
                        aria-label={`${pet.name} 선택`}
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: 'var(--surface-alt)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '26px',
                        }}
                      >
                        {pet.imageUrl ? (
                          <img src={pet.imageUrl} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span aria-hidden>{pet.species === 'Cat' ? '🐱' : '🐶'}</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectPet(pet.id)}
                        style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-dark)' }}>{pet.name}</span>
                          {active && (
                            <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary-dark)', background: 'rgba(250,204,21,0.25)', padding: '2px 7px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <Check size={10} /> 선택됨
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '3px' }}>
                          {pet.species === 'Cat' ? '고양이' : '강아지'}
                          {pet.breed ? ` · ${pet.breed}` : ''} · {petAgeDisplay(pet.age, pet.species)}
                          {pet.weightKg ? ` · ${pet.weightKg}kg` : ''}
                        </div>
                      </button>
                      <button type="button" onClick={() => startEditPet(pet)} aria-label="수정" style={petIconBtn}>
                        <Pencil size={16} />
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(pet)} aria-label="삭제" style={{ ...petIconBtn, color: '#DC2626' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!editingPet && (
                <button
                  type="button"
                  onClick={startAddPet}
                  style={{
                    marginTop: '12px',
                    width: '100%',
                    minHeight: '48px',
                    borderRadius: '14px',
                    border: '1px dashed var(--line)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-muted)',
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <PawPrint size={16} /> 다른 아이 추가하기
                </button>
              )}
            </div>
          )}

          {/* 반려동물 편집 폼 */}
          {editingPet && (
            <TossCard style={{ padding: '28px 22px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PawPrint color="#fff" size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '4px' }}>
                    {editingPet.id ? '반려동물 수정' : '반려동물 등록'} · {profileStep + 1} / {stepCount}
                  </div>
                  <TossSectionTitle title={step.title} style={{ marginBottom: '0' }} />
                </div>
              </div>

              <div style={{ height: '4px', borderRadius: '999px', background: 'var(--surface-alt)', marginBottom: '24px', overflow: 'hidden' }}>
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

              <p style={{ margin: '0 0 22px', fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.5 }}>{step.prompt}</p>

              <div style={{ marginBottom: '28px' }}>{profileStepBody}</div>

              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <TossButton variant="outline" onClick={() => setProfileStep((s) => Math.max(0, s - 1))} disabled={profileStep === 0} style={{ flex: 1 }}>
                  이전
                </TossButton>
                <TossButton variant="soft" onClick={() => setProfileStep((s) => Math.min(stepCount - 1, s + 1))} disabled={profileStep === stepCount - 1} style={{ flex: 1 }}>
                  다음
                </TossButton>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', borderRadius: '14px', fontWeight: 800, fontSize: '16px', opacity: saving ? 0.6 : 1 }}
                onClick={handleSavePet}
                disabled={saving}
              >
                {saving ? '저장 중…' : editingPet.id ? '변경 사항 저장' : '반려동물 등록'}
              </button>

              {(pets.length > 0 || editingPet.id) && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{ marginTop: '14px', width: '100%', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                >
                  취소
                </button>
              )}
            </TossCard>
          )}
        </div>
      )}

      {/* ── 저장한 제품 ── */}
      {activeTab === 'favorites' && (
        <SavedProducts key={JSON.stringify([userId, favorites, catalogRevision])} userId={userId} favorites={favorites} />
      )}

      {activeTab === 'account' && <AccountSettings key={userId} />}

      {/* 반려동물 삭제 확인 */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', background: 'var(--surface-elevated)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)' }}>{deleteTarget.name} 정보를 삭제하시겠습니까?</h3>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              해당 반려동물의 섭취 기록도 함께 삭제되며 복구할 수 없습니다.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setDeleteTarget(null)} style={{ flex: 1, minHeight: '48px', borderRadius: '14px', border: '1px solid var(--line)', background: 'var(--surface-elevated)', color: 'var(--text-dark)', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
                취소
              </button>
              <button type="button" onClick={handleDeletePet} style={{ flex: 1, minHeight: '48px', borderRadius: '14px', border: 'none', background: '#DC2626', color: '#fff', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedProducts({ userId, favorites }: { userId: string; favorites: string[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(favorites.length > 0);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!favorites.length) return;
    let cancelled = false;
    getVisibleProductsByIds(favorites).then((rows) => {
      if (!cancelled && useStore.getState().userId === userId) setProducts(rows);
    }).catch(() => {
      if (!cancelled && useStore.getState().userId === userId) setFailed(true);
    }).finally(() => {
      if (!cancelled && useStore.getState().userId === userId) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, favorites, retry]);

  if (loading) return <p role="status" style={{ padding: '32px 0', color: 'var(--text-muted)' }}>저장한 제품을 불러오고 있습니다.</p>;
  if (failed) return <div style={{ padding: '32px 0' }}>
    <p role="alert">저장한 제품을 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.</p>
    <TossButton variant="outline" onClick={() => { setLoading(true); setFailed(false); setRetry((value) => value + 1); }}>저장한 제품 다시 불러오기</TossButton>
  </div>;
  if (products.length) return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    {products.map((product) => <ProductCard key={product.id} product={product} />)}
  </div>;
  return <div style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: 'var(--surface-alt)', borderRadius: 24 }}>
    <Heart color="var(--line)" size={40} style={{ margin: '0 auto 16px' }} />
    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{favorites.length ? '저장한 제품 중 현재 볼 수 있는 제품이 없습니다.' : '저장한 제품이 없습니다.'}</p>
    <Link to="/search" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>제품 탐색하기</Link>
  </div>;
}

const petIconBtn: React.CSSProperties = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  border: '1px solid var(--line)',
  background: 'var(--surface-elevated)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

// Remount local edit/account state when authentication identity changes.
export default function Profile() {
  const { userId } = useStore();
  const [searchParams] = useSearchParams();
  if (searchParams.get('tab') === 'diary') return <Navigate to="/diary" replace />;
  return <ProfileContent key={userId ?? 'guest'} />;
}
