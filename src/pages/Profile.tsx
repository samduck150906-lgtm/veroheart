// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { User, ChevronRight, Calendar, ShoppingBag, FileText, Activity, LogOut, Heart, Crown } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TossCard, TossInput, TossButton, TossChip, TossSectionTitle } from '../components/TossUI';
import { Button } from '../components/Button';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { getRecommendationBreakdown, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import { getAllergyInfo } from '../utils/productGrade';
import { displayBrand } from '../utils/brandLabel';
import GradeBadge from '../components/GradeBadge';
import { notify } from '../store/useNotification';
import { FAVORITES_EMPTY } from '../copy/ui';

const TABS = ['찜', '구매내역', '분석리포트'];

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
    reports, 
    fetchReports,
    logout,
    signOut,
    favorites,
    products,
    membershipTier,
  } = useStore();

  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

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
  const [activeTab, setActiveTab] = useState('찜');

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  const favoriteProducts = useMemo(() => {
    if (!favorites?.length || !products?.length) return [];
    return favorites.map(id => products.find(p => p.id === id)).filter(Boolean);
  }, [favorites, products]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const petName = hasPetProfile ? profile.name : '내 반려동물';
  const speciesLabel = profile?.breed || (profile?.species === 'Cat' ? '고양이' : '강아지');

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Top Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
        padding: '52px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {profile?.species === 'Cat' ? '🐱' : '🐶'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {petName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              {speciesLabel}
              {profile?.age ? ` · ${profile.age}살` : ''}
              {profile?.weightKg ? ` · ${profile.weightKg}kg` : ''}
            </div>
          </div>
          <ScoreCircle score={healthScore} />
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>
          식단 건강 점수 · {healthScore}점
        </div>

        {hasPetProfile ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {profile?.allergies?.map(a => (
              <span key={a} style={{ background: '#F04452', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>⚠️ {a} 알러지</span>
            ))}
            {profile?.healthConcerns?.slice(0, 3).map(h => (
              <span key={h} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{h}</span>
            ))}
          </div>
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
                const score = hasPetProfile ? calculateCompatibilityScore(product, profile) : null;
                const allergy = getAllergyInfo(product, profile, hasPetProfile);
                const brandLabel = displayBrand(product.brand, product.name);
                return (
                  <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                    style={{ background: '#fff', borderRadius: 16, padding: '14px', boxShadow: '0 1px 6px rgba(30,41,59,0.06)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                      <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <GradeBadge product={product} profile={profile} withProfile={hasPetProfile} />
                        {score != null && (
                          <span style={{ background: '#F0EDE8', color: '#4E5968', fontWeight: 700, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>궁합 {score}%</span>
                        )}
                        {allergy && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '2px 6px',
                            background: allergy.safe ? 'var(--safe-tint)' : 'var(--danger-tint)',
                            color: allergy.safe ? 'var(--safe)' : 'var(--danger)',
                          }}>{allergy.safe ? '✓ 알러지 적합' : `⚠ ${allergy.hits.join('·')}`}</span>
                        )}
                      </div>
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

        {activeTab === '분석리포트' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>분석 리포트가 없어요</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>스캐너로 사료 성분표를 촬영해보세요</p>
            <button onClick={() => navigate('/scanner')}
              style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
              스캔하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
