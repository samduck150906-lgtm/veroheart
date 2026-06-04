// @ts-nocheck
import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Shield,
  User,
  Heart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import ProductImage from '../components/ProductImage';

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

export default function Home() {
  const { products, profile, recentViews, isLoggedIn, banners, favorites } = useStore();
  const navigate = useNavigate();
  const [bannerIndex, setBannerIndex] = useState(0);

  const hasPetProfile = isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';
  const favoriteProducts = products.filter(p => favorites.includes(p.id));

  // Retro game calculations
  const totalExp = (favorites?.length || 0) * 15 + (recentViews?.length || 0) * 10 + (hasPetProfile ? 120 : 0);
  const level = Math.floor(totalExp / 100) + 1;
  const currentExp = totalExp % 100;
  const hp = Math.max(20, 100 - (profile?.healthConcerns?.length || 0) * 20);

  const getAllergyDebuff = (allergy: string) => {
    const norm = allergy.trim();
    if (norm.includes('소고기') || norm.includes('소')) {
      return {
        emoji: '🐮 😣',
        title: '소고기 알레르기 디버프',
        desc: '소고기 급여 시 알레르기 반응 (소 보며 찡그림)',
        color: '#E53E3E',
        bgColor: '#FFF5F5',
        borderColor: '#FEB2B2',
      };
    }
    if (norm.includes('닭고기') || norm.includes('닭')) {
      return {
        emoji: '🐔 😣',
        title: '닭고기 알레르기 디버프',
        desc: '닭고기 급여 시 피부 발진 및 눈물흔 유발',
        color: '#DD6B20',
        bgColor: '#FFFAF0',
        borderColor: '#FEEBC8',
      };
    }
    if (norm.includes('연어') || norm.includes('생선')) {
      return {
        emoji: '🐟 😣',
        title: '연어 알레르기 디버프',
        desc: '연어 및 어류 단백질원 차단 상태',
        color: '#3182CE',
        bgColor: '#EBF8FF',
        borderColor: '#BEE3F8',
      };
    }
    if (norm.includes('곡물')) {
      return {
        emoji: '🌾 😣',
        title: '글루텐 곡물 디버프',
        desc: '밀, 보리 등 밀가루/곡류 차단 상태',
        color: '#805AD5',
        bgColor: '#F5F3FF',
        borderColor: '#E9D8FD',
      };
    }
    if (norm.includes('색소') || norm.includes('인공')) {
      return {
        emoji: '🎨 😣',
        title: '합성 색소 디버프',
        desc: '인공향료 및 방부제 성분 차단 상태',
        color: '#718096',
        bgColor: '#F7FAFC',
        borderColor: '#E2E8F0',
      };
    }
    return {
      emoji: '🚫 😣',
      title: `${norm} 알레르기 디버프`,
      desc: `${norm} 성분 배제 식단 필요`,
      color: '#E53E3E',
      bgColor: '#FFF5F5',
      borderColor: '#FEB2B2',
    };
  };

  const getConcernBuff = (concern: string) => {
    const norm = concern.trim();
    if (norm.includes('관절') || norm.includes('슬개골')) {
      return { emoji: '🛡️', title: '슬개골 수호 버프', desc: '칼슘 및 글루코사민 집중 케어' };
    }
    if (norm.includes('비만') || norm.includes('체중')) {
      return { emoji: '⚡', title: '체중 관리 민첩 버프', desc: '저지방 포뮬러 L-카르니틴 집중 공급' };
    }
    if (norm.includes('피부') || norm.includes('모질')) {
      return { emoji: '💦', title: '피부 면역 배리어 버프', desc: '오메가3 및 히알루론산 집중 공급' };
    }
    if (norm.includes('소화') || norm.includes('예민')) {
      return { emoji: '🌱', title: '장 건강 힐링 버프', desc: '프로바이오틱스 및 가수분해 락토' };
    }
    if (norm.includes('신장') || norm.includes('요로')) {
      return { emoji: '💧', title: '신장 순환 정화 버프', desc: '저나트륨 수분 밸런스 설계' };
    }
    return { emoji: '✨', title: `${norm} 집중 케어 버프`, desc: `${norm} 맞춤형 영양소 배합 가이드` };
  };

  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners]);

  const handlePrevBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNextBanner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBannerIndex((prev) => (prev + 1) % banners.length);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingBottom: '40px' }}>
      <Helmet>
        <title>
          {hasPetProfile
            ? `${profile.name} 맞춤 홈 — 베로로`
            : '베로로 — 성분 분석 & 집사들의 찐 리뷰'}
        </title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
      </Helmet>

      {/* Hero Banner Carousel (Hwahae Style) */}
      {banners && banners.length > 0 && (
        <div style={{ padding: '0 20px', marginTop: '-32px' }}>
          <div 
            onClick={() => {
              const activeBanner = banners[bannerIndex];
              if (activeBanner?.linkUrl) navigate(activeBanner.linkUrl);
            }}
            style={{ 
              position: 'relative', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              height: '160px', 
              boxShadow: 'var(--shadow-sm)',
              background: banners[bannerIndex]?.bgColor || 'linear-gradient(135deg, #FFF3C4 0%, #FFE066 100%)',
              cursor: 'pointer',
              transition: 'background 0.3s ease'
            }}
          >
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              padding: '20px 24px',
              boxSizing: 'border-box'
            }}>
              <div style={{ flex: 1, zIndex: 2, paddingRight: '36px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-deep)', background: 'rgba(255,255,255,0.7)', padding: '2px 7px', borderRadius: '6px' }}>
                  RECOMMENDED
                </span>
                <h2 style={{ margin: '6px 0 2px', fontSize: '18px', fontWeight: 900, color: 'var(--ink)', lineHeight: 1.3, letterSpacing: '-0.02em', whiteSpace: 'pre-wrap' }}>
                  {banners[bannerIndex]?.title}
                </h2>
                {banners[bannerIndex]?.subtitle && (
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600 }}>
                    {banners[bannerIndex]?.subtitle}
                  </p>
                )}
              </div>
              <div style={{
                fontSize: '72px',
                lineHeight: 1,
                zIndex: 1,
                transform: 'rotate(12deg)',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.06))',
                flexShrink: 0
              }}>
                {banners[bannerIndex]?.imageUrl?.startsWith('http') || banners[bannerIndex]?.imageUrl?.startsWith('/') ? (
                  <img 
                    src={banners[bannerIndex]?.imageUrl} 
                    alt="" 
                    style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
                  />
                ) : (
                  banners[bannerIndex]?.imageUrl || '🥫'
                )}
              </div>
            </div>
            
            {/* Left/Right Navigation Chevrons */}
            {banners.length > 1 && (
              <>
                <button
                  onClick={handlePrevBanner}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    zIndex: 10,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronLeft size={18} strokeWidth={2.5} />
                </button>
                <button
                  onClick={handleNextBanner}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    cursor: 'pointer',
                    zIndex: 10,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              </>
            )}

            <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '99px' }}>
              {bannerIndex + 1}/{banners.length}
            </div>
          </div>
        </div>
      )}

      {/* Pet Profile & Details Card (Tamagotchi / Pixel Game Status Screen Style) */}
      {hasPetProfile ? (
        <div style={{ padding: '0 20px' }}>
          <div style={{
            padding: '24px 20px',
            borderRadius: '24px',
            background: '#FAF8F5',
            border: '3px solid #1E293B',
            boxShadow: '6px 6px 0px #1E293B',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            boxSizing: 'border-box'
          }}>
            {/* Header arcade tag */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2.5px solid #1E293B',
              paddingBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px' }}>👾</span>
                <span style={{
                  fontFamily: 'monospace, Courier New, Courier',
                  fontSize: '13px',
                  fontWeight: 900,
                  color: '#1E293B',
                  letterSpacing: '0.05em'
                }}>
                  MY PET STATUS WINDOW
                </span>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '10px',
                  background: '#FCD34D',
                  color: '#1E293B',
                  border: '2px solid #1E293B',
                  boxShadow: '2px 2px 0px #1E293B',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.1s ease'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'translate(1px, 1px)';
                  e.currentTarget.style.boxShadow = '1px 1px 0px #1E293B';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '2px 2px 0px #1E293B';
                }}
              >
                EDIT ✏️
              </button>
            </div>

            {/* Main Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '18px', alignItems: 'start' }}>
              {/* Left Column: Avatar + LV. */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                {/* Retro Avatar Frame */}
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '16px',
                  background: getBreedAvatar(profile.breed, profile.species).bg,
                  border: '3px solid #1E293B',
                  boxShadow: '3px 3px 0px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  flexShrink: 0
                }}>
                  {getBreedAvatar(profile.breed, profile.species).emoji}
                </div>
                
                {/* LV Label */}
                <div style={{
                  fontFamily: 'monospace, Courier New, Courier',
                  fontSize: '13px',
                  fontWeight: 900,
                  color: '#1E293B',
                  background: '#FEF3C7',
                  border: '1.5px solid #1E293B',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  LV. {level}
                </div>
              </div>

              {/* Right Column: Key Details */}
              <div style={{
                fontFamily: 'monospace, Courier New, Courier',
                fontSize: '13px',
                fontWeight: 700,
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B' }}>{profile.name}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: profile.gender === '여아' ? '#E11D48' : '#2563EB',
                    background: profile.gender === '여아' ? '#FFE4E6' : '#DBEAFE',
                    border: `1.5px solid ${profile.gender === '여아' ? '#FDA4AF' : '#93C5FD'}`,
                    padding: '2px 7px',
                    borderRadius: '6px'
                  }}>
                    {profile.gender === '여아' ? ' 여아 ♀' : ' 남아 ♂'}
                  </span>
                </div>
                <div style={{ height: '1.5px', background: 'rgba(30, 41, 59, 0.1)', margin: '2px 0 4px' }} />
                <div>• <b>종족:</b> {profile.species === 'Cat' ? '🐱 고양이' : '🐶 강아지'} ({getBreedAvatar(profile.breed, profile.species).label})</div>
                <div>• <b>나이:</b> {profile.age}세 (성견)</div>
                <div>• <b>성향:</b> {profile.personality || '활발함 ⚡'}</div>
                <div>• <b>체중:</b> {profile.weightKg ? `${profile.weightKg}kg` : '미등록 ⚖️'}</div>
              </div>
            </div>

            {/* Progress Bars (EXP & HP) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {/* EXP Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontFamily: 'monospace' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1E293B' }}>⭐ EXP (경험치)</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#475569' }}>{currentExp}/100</span>
                </div>
                <div style={{
                  height: '14px',
                  background: '#E2E8F0',
                  border: '2px solid #1E293B',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${currentExp}%`,
                    height: '100%',
                    background: '#10B981',
                    transition: 'width 0.4s ease-out',
                    boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)'
                  }} />
                </div>
              </div>

              {/* HP Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontFamily: 'monospace' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#E11D48' }}>❤️ HP (건강도)</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 900, color: '#E11D48' }}>{hp}/100</span>
                </div>
                <div style={{
                  height: '14px',
                  background: '#E2E8F0',
                  border: '2px solid #1E293B',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${hp}%`,
                    height: '100%',
                    background: '#E11D48',
                    transition: 'width 0.4s ease-out',
                    boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.15)'
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginTop: '4px', textAlign: 'right' }}>
                  {hp >= 80 ? '상태: 매우 건강함! (최고 컨디션) ✨' : hp >= 50 ? '상태: 주의 (케어가 필요해요) 💤' : '상태: 위험 (디버프 해제가 필요해요) ⚠️'}
                </div>
              </div>
            </div>

            {/* Debuffs Section (Allergies with Emojis & Frowning) */}
            <div style={{ borderTop: '2px dotted #1E293B', paddingTop: '12px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#E11D48', marginBottom: '8px', fontFamily: 'monospace' }}>
                ⚠️ 보유 디버프 (알레르기 성분)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.allergies && profile.allergies.length > 0 ? (
                  profile.allergies.map(allergy => {
                    const dbf = getAllergyDebuff(allergy);
                    return (
                      <div 
                        key={allergy} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: dbf.bgColor,
                          border: `1.5px solid ${dbf.borderColor}`,
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ fontSize: '22px', display: 'flex', alignItems: 'center' }}>
                          {dbf.emoji}
                        </span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: dbf.color }}>{dbf.title}</div>
                          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>{dbf.desc}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    color: '#15803D',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'center'
                  }}>
                    ✨ 활성화된 알레르기 디버프가 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* Synergy Buffs Section (Health Concerns as Buffs) */}
            <div style={{ borderTop: '2px dotted #1E293B', paddingTop: '12px' }}>
              <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#0F766E', marginBottom: '8px', fontFamily: 'monospace' }}>
                🛡️ 활성 케어 시너지 버프 (건강 고민)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {profile.healthConcerns && profile.healthConcerns.length > 0 ? (
                  profile.healthConcerns.map(concern => {
                    const buf = getConcernBuff(concern);
                    return (
                      <div 
                        key={concern} 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: '#ECFDF5',
                          border: '1.5px solid #A7F3D0',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ fontSize: '16px', color: '#0F766E' }}>{buf.emoji}</span>
                        <div>
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F766E' }}>{buf.title}</div>
                          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 500, marginTop: '1px' }}>{buf.desc}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    활성 버프가 없습니다. 건강 관리를 등록해보세요!
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Pet Registration CTA Banner (if unconfigured or guest) */
        <div style={{ padding: '0 20px' }}>
          <div style={{
            padding: '24px 20px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #FFFDEB 0%, #FFF5D1 100%)',
            border: '1px solid var(--brand-line)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-10px',
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--brand-tint)',
              opacity: 0.5,
              zIndex: 0
            }} />
            <div style={{ zIndex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--brand-deep)', letterSpacing: '-0.02em' }}>
                우리 아이 맞춤 영양 진단 🐶🐱
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.45, fontWeight: 500 }}>
                {isLoggedIn 
                  ? '아이의 나이, 알레르기, 건강 고민을 입력하시면 수의 영양 학회 기준 맞춤 사료를 추천해 드려요.' 
                  : '로그인 후 아이의 나이, 알레르기, 건강 고민을 입력하시면 수의 영양 학회 기준 맞춤 사료를 추천해 드려요.'}
              </p>
              <button
                onClick={() => navigate(isLoggedIn ? '/profile' : '/login')}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '14px',
                  background: 'var(--ink)',
                  color: 'var(--surface)',
                  fontWeight: 700,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoggedIn ? '3초만에 내 반려동물 등록하기' : '로그인하고 시작하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3 Curated Care Cards (주제별 건강 맞춤 큐레이션) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px' }}>
        <div>
          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '2px 8px', borderRadius: '6px' }}>
            SPECIAL DIAGNOSTIC CURATION
          </span>
          <h3 style={{ margin: '6px 0 2px', fontSize: '19px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            우리아이 맞춤 건강 케어
          </h3>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ink-soft)', fontWeight: 500 }}>
            사료 판매가 아닌, 성분과 펫 특성에 맞춘 전문 정보 제공
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Card 1: Joint Care */}
          <article 
            onClick={() => navigate('/search?category=사료&concern=관절 질환')}
            style={{
              padding: '20px 22px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #FFF0F6 0%, #FFD8E6 100%)',
              border: '1px solid rgba(219, 39, 119, 0.08)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(219, 39, 119, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#DB2777', background: 'rgba(255, 255, 255, 0.6)', padding: '2px 8px', borderRadius: '6px' }}>
                관절 & 슬개골 케어
              </span>
              <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>
                슬개골 · 관절이 약한 아이들을 위한 특별 영양 식단 🦴
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#4D0E2B', fontWeight: 500, opacity: 0.85 }}>
                연골 성분(콘드로이친, 글루코사민)과 천연 칼슘 안심 배합 사료 분석
              </p>
            </div>
            <span style={{ fontSize: '18px', color: '#DB2777', fontWeight: 800 }}>➔</span>
          </article>

          {/* Card 2: Tears & Weight Care */}
          <article 
            onClick={() => navigate('/search?category=사료&concern=비만')}
            style={{
              padding: '20px 22px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
              border: '1px solid rgba(37, 99, 235, 0.08)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 99, 235, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563EB', background: 'rgba(255, 255, 255, 0.6)', padding: '2px 8px', borderRadius: '6px' }}>
                체중 관리 & 눈물痕
              </span>
              <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>
                눈물 흔적과 체중 관리를 동시에 해결하는 건강 식단 💧
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#0E2E5B', fontWeight: 500, opacity: 0.85 }}>
                L-카르니틴 배합 저칼로리 포뮬러 및 고정 단백질 가수분해 사료
              </p>
            </div>
            <span style={{ fontSize: '18px', color: '#2563EB', fontWeight: 800 }}>➔</span>
          </article>

          {/* Card 3: Skin & Allergies */}
          <article 
            onClick={() => navigate('/search?query=가수분해')}
            style={{
              padding: '20px 22px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              border: '1px solid rgba(5, 150, 105, 0.08)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(5, 150, 105, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#059669', background: 'rgba(255, 255, 255, 0.6)', padding: '2px 8px', borderRadius: '6px' }}>
                민감성 피부 & 알레르기
              </span>
              <h4 style={{ margin: '8px 0 4px', fontSize: '16px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.35 }}>
                피부 가려움과 알레르기 걱정 없는 저자극 안심 큐레이션 🌱
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#04422E', fontWeight: 500, opacity: 0.85 }}>
                알레르기 식이 차단용 가수분해 단백질과 유기농 유산균 포뮬러 분석
              </p>
            </div>
            <span style={{ fontSize: '18px', color: '#059669', fontWeight: 800 }}>➔</span>
          </article>
        </div>
      </section>

      {/* Dual Quick Actions Card Grid */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button
          onClick={() => navigate('/event/personality-quiz')}
          style={{
            cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="var(--brand-deep)" />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>성향 테스트</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>우리 아이 사료 찾기</span>
          </span>
        </button>

        <button
          onClick={() => navigate('/profile')}
          style={{
            cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10, padding: '16px', borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 13, background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="var(--brand-deep)" />
          </span>
          <span>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>마이 펫</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.35 }}>프로필 및 건강 관리</span>
          </span>
        </button>
      </div>

      {/* Favorites (내 찜 목록 - Toss-style Horizontal Scroll) */}
      {isLoggedIn && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                내가 찜한 상품
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                우리 아이를 위해 눈여겨본 관심 사료
              </span>
            </div>
            <button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>
              전체보기 <ChevronRight size={15} />
            </button>
          </div>
          {favoriteProducts.length > 0 ? (
            <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {favoriteProducts.slice(0, 8).map((p) => (
                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: 124, cursor: 'pointer' }}>
                  <div style={{ width: 124, height: 124, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--hairline)', marginBottom: 8, position: 'relative' }}>
                    <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 2 }}>
                      ❤️
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 700 }}>{p.brand}</div>
                  <div className="line-clamp-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, height: '34px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {p.name}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '0 20px' }}>
              <div style={{
                padding: '24px 20px',
                borderRadius: '20px',
                background: 'var(--surface)',
                border: '1px dashed var(--hairline)',
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontSize: '13.5px',
                fontWeight: 500,
                lineHeight: 1.5
              }}>
                아직 찜한 제품이 없습니다.<br/>마음에 드는 사료에 찜(하트)을 눌러보세요!
              </div>
            </div>
          )}
        </section>
      )}

      {/* Recently Viewed Products (내가 주로 봤던 상품 - Toss-style Horizontal Scroll) */}
      {recentViews.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                내가 최근 본 상품
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                가장 최근에 확인했던 사료 상세 리포트
              </span>
            </div>
            <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
              검색하기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '2px 20px 4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 8).map((p) => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: 124, cursor: 'pointer' }}>
                <div style={{ width: 124, height: 124, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--hairline)', marginBottom: 8 }}>
                  <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 700 }}>{p.brand}</div>
                <div className="line-clamp-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, height: '34px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Categories Search grid */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, padding: '0 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <h3 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              카테고리별 탐색
            </h3>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
              원하는 사료/간식 종류를 선택해보세요
            </span>
          </div>
          <button onClick={() => navigate('/search')} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)' }}>
            전체 탐색 <ChevronRight size={15} />
          </button>
        </div>
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {HOME_CATEGORY_ITEMS.map((item) => (
            <button
              key={item.name}
              onClick={() => navigate(`/search?category=${encodeURIComponent(item.name)}`)}
              style={{
                cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, background: 'none', border: 'none', padding: 0
              }}
            >
              <span style={{
                width: '100%', aspectRatio: '1', borderRadius: 16, background: 'var(--brand-tint)',
                border: '1px solid var(--brand-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
              }}>
                {item.emoji}
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{item.name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Trust Curation Footer */}
      <div style={{ margin: '2px 20px 0', padding: '16px 18px', borderRadius: 18, background: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Shield size={26} color="var(--brand)" />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--surface)' }}>사람이 검수한 데이터</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.6)', marginTop: 2, lineHeight: 1.4 }}>
            모든 추천은 수의 영양 기준과 성분 검수를 거칩니다
          </div>
        </div>
      </div>
    </div>
  );
}
