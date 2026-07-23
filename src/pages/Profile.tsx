import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import {
  User,
  ChevronRight,
  Calendar,
  ShoppingBag,
  LogOut,
  LogIn,
  Heart,
  PawPrint,
  Plus,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TossCard, TossButton, TossChip, TossInput, TossSectionTitle } from '../components/TossUI';
import ProductCard from '../components/ProductCard';
import FeedingDiary from '../components/diary/FeedingDiary';
import type { SupabaseOrderItem, UserPetProfile } from '../types';
import { formatKRW } from '../utils/price';

const PROFILE_STEP_META = [
  { title: '이름', prompt: '우리 아이의 이름은 무엇인가요?' },
  { title: '종', prompt: '강아지인가요, 고양이인가요?' },
  { title: '나이', prompt: '나이대를 선택해주세요.' },
  { title: '몸무게·품종', prompt: '몸무게와 품종을 입력해주세요. (선택)' },
  { title: '알레르기', prompt: '알레르기가 있는 성분이 있나요? (복수 선택)' },
  { title: '건강 고민', prompt: '신경 쓰이는 건강 고민이 있나요? (복수 선택)' },
];

const allergyOptions = ['닭고기', '소고기', '연어', '곡물', '인공색소'];
const concernOptions = ['피부·모질', '관절', '소화기', '비만·다이어트', '신장·비뇨기', '심장', '면역', '눈', '구강'];

type MyPageTab = 'pets' | 'diary' | 'favorites' | 'account';

const TAB_META: { key: MyPageTab; label: string }[] = [
  { key: 'pets', label: '내 반려동물' },
  { key: 'diary', label: '식이 다이어리' },
  { key: 'favorites', label: '저장한 제품' },
  { key: 'account', label: '계정 설정' },
];

function petAgeLabel(age: number): string {
  if (age < 2) return '아기';
  if (age > 7) return '시니어';
  return '성인';
}

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

export default function Profile() {
  const {
    userId,
    isLoggedIn,
    pets,
    activePetId,
    savePet,
    removePet,
    selectPet,
    orders,
    fetchOrders,
    logout,
    favorites,
    products,
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

  const favoriteProducts = useMemo(() => products.filter((p) => favorites.includes(p.id)), [products, favorites]);

  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'account') fetchOrders();
  }, [activeTab, fetchOrders, userId]);

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
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

  if (!userId) {
    return (
      <div
        className="animate-fade-in"
        style={{ padding: '40px 20px', minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
      >
        <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <User size={40} color="var(--line)" />
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px' }}>로그인이 필요해요</h2>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
          프로필을 설정하고 아이의 건강 맞춤
          <br />
          사료 분석과 섭취 기록을 시작해보세요!
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
          <TossButton variant="outline" onClick={handleLogout} style={{ width: 'auto', height: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={15} /> 로그아웃
          </TossButton>
        ) : (
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-dark)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
            <LogIn size={15} /> 로그인 / 회원가입
          </Link>
        )}
      </div>

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
                subtitle="기록·분석 기준이 되는 아이를 선택하세요"
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
                          {pet.breed ? ` · ${pet.breed}` : ''} · {petAgeLabel(pet.age)}
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

      {/* ── 식이 다이어리 ── */}
      {activeTab === 'diary' && <FeedingDiary onRegisterPet={() => setTab('pets')} />}

      {/* ── 저장한 제품 ── */}
      {activeTab === 'favorites' && (
        <div>
          {favoriteProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {favoriteProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '100px 20px', backgroundColor: 'var(--surface-alt)', borderRadius: '24px' }}>
              <Heart color="var(--line)" size={40} style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>저장한 제품이 없습니다.</p>
              <Link to="/search" style={{ color: 'var(--primary)', fontWeight: 700, marginTop: '12px', display: 'inline-block', textDecoration: 'none' }}>
                제품 탐색하기
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── 계정 설정 (주문 내역 + 로그아웃) ── */}
      {activeTab === 'account' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <TossSectionTitle title="주문 내역" style={{ marginBottom: '14px' }} />
            {orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {orders.map((order) => (
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
                            <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatKRW(item.price_at_purchase)} · {item.quantity}개</div>
                          </div>
                          <ChevronRight size={20} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
                        </Link>
                      ))}
                    </div>
                    <DeliveryTimeline status={order.status} />
                    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--surface-alt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>총 결제 금액</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', whiteSpace: 'nowrap' }}>{formatKRW(order.total_amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: 'var(--surface-alt)', borderRadius: '24px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'var(--shadow-card)' }}>
                  <ShoppingBag color="var(--text-muted)" size={32} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>아직 주문 내역이 없습니다.</p>
              </div>
            )}
          </div>

          <TossCard style={{ padding: '20px' }}>
            <TossSectionTitle title="계정" style={{ marginBottom: '14px' }} />
            <button
              onClick={handleLogout}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', padding: '8px 0' }}
            >
              <LogOut size={16} /> 로그아웃
            </button>
          </TossCard>
        </div>
      )}

      {/* 반려동물 삭제 확인 */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setDeleteTarget(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '340px', background: 'var(--surface-elevated)', borderRadius: '20px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 900, color: 'var(--text-dark)' }}>{deleteTarget.name} 정보를 삭제할까요?</h3>
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
  const currentIdx = DELIVERY_STEPS.findIndex((s) => s.key === status);
  const activeIdx = currentIdx === -1 ? 0 : currentIdx;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginTop: '20px', padding: '16px', background: 'var(--surface-alt)', borderRadius: '14px' }}>
      {DELIVERY_STEPS.map((step, idx) => (
        <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: idx <= activeIdx ? 'var(--primary-dark)' : 'var(--line)',
                color: idx <= activeIdx ? '#fff' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
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
