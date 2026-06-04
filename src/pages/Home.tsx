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

  const getHearts = (hpValue: number) => {
    const fullHearts = Math.round(hpValue / 20);
    let heartsStr = '';
    for (let i = 0; i < 5; i++) {
      if (i < fullHearts) {
        heartsStr += '❤️';
      } else {
        heartsStr += '🖤';
      }
    }
    return heartsStr;
  };

  const getAllergyDebuff = (allergy: string) => {
    const norm = allergy.trim();
    let targetEmoji = '🚫';
    let title = `${norm} 디버프`;
    let desc = `${norm} 성분 배제 식단 필요`;
    let color = '#E53E3E';
    let bgColor = '#FFF5F5';
    let borderColor = '#FEB2B2';

    if (norm.includes('소고기') || norm.includes('소')) {
      targetEmoji = '🐮';
      title = '소고기 알레르기 디버프';
      desc = '소고기 냄새만 맡아도 찡그려요!';
    } else if (norm.includes('닭고기') || norm.includes('닭')) {
      targetEmoji = '🐔';
      title = '닭고기 알레르기 디버프';
      desc = '닭고기를 보면 바로 찡그려요!';
    } else if (norm.includes('연어') || norm.includes('생선') || norm.includes('물고기')) {
      targetEmoji = '🐟';
      title = '연어 알레르기 디버프';
      desc = '연어 급여 시 눈가 붉어짐 및 찡그림!';
    } else if (norm.includes('곡물') || norm.includes('밀') || norm.includes('글루텐')) {
      targetEmoji = '🌾';
      title = '곡물/글루텐 디버프';
      desc = '곡물 성분 섭취 시 소화기 찡그림!';
    } else if (norm.includes('색소') || norm.includes('인공') || norm.includes('첨가물')) {
      targetEmoji = '🎨';
      title = '인공합성원료 디버프';
      desc = '인공향료/색소를 멀리하며 찡그려요!';
    } else if (norm.includes('돼지') || norm.includes('돼지고기')) {
      targetEmoji = '🐷';
      title = '돼지고기 알레르기 디버프';
      desc = '돼지고기를 보면 찡그려요!';
    } else if (norm.includes('오리') || norm.includes('오리고기')) {
      targetEmoji = '🦆';
      title = '오리고기 알레르기 디버프';
      desc = '오리고기를 만나면 찡그려요!';
    } else if (norm.includes('양고기') || norm.includes('양')) {
      targetEmoji = '🐑';
      title = '양고기 알레르기 디버프';
      desc = '양고기 단백질에 예민하게 반응!';
    } else if (norm.includes('계란') || norm.includes('달걀')) {
      targetEmoji = '🥚';
      title = '계란 알레르기 디버프';
      desc = '달걀 성분 급여 시 가려움증 반응!';
    } else if (norm.includes('우유') || norm.includes('치즈')) {
      targetEmoji = '🥛';
      title = '유제품 알레르기 디버프';
      desc = '락토스 성분에 민감한 디버프!';
    }

    return {
      targetEmoji,
      title,
      desc,
      color,
      bgColor,
      borderColor,
    };
  };

  const getConcernBuff = (concern: string) => {
    const norm = concern.trim();
    if (norm.includes('관절') || norm.includes('슬개골')) {
      return { emoji: '🛡️', title: '슬개골 수호 버프', desc: '연골 보호막 가동 (콘드로이친 & 글루코사민 필요)' };
    }
    if (norm.includes('비만') || norm.includes('체중')) {
      return { emoji: '⚡', title: '체중 관리 민첩 버프', desc: '체중 조절 가속화 (저지방 L-카르니틴 처방)' };
    }
    if (norm.includes('피부') || norm.includes('모질')) {
      return { emoji: '💦', title: '피부 장벽 배리어 버프', desc: '모질 광택 상승 (오메가3 & 아연 공급)' };
    }
    if (norm.includes('소화') || norm.includes('예민') || norm.includes('장')) {
      return { emoji: '🌱', title: '장 건강 힐링 버프', desc: '장내 미생물 활성화 (가수분해 유산균)' };
    }
    if (norm.includes('신장') || norm.includes('요로')) {
      return { emoji: '💧', title: '신장 순환 정화 버프', desc: '체액 순환 보조 (저나트륨 수분 공급)' };
    }
    return { emoji: '✨', title: `${norm} 집중 케어 버프`, desc: `${norm} 전용 포뮬러 및 기능성 원료 케어` };
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
      <style>{`
        @keyframes game-bounce {
          0% { transform: translateY(0); }
          100% { transform: translateY(-6px); }
        }
        @keyframes game-shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-6deg); }
          40% { transform: rotate(5deg); }
          60% { transform: rotate(-4deg); }
          80% { transform: rotate(3deg); }
        }
        @keyframes game-pulse {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
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
        <div style={{ padding: '0 20px', marginTop: '-44px' }}>
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

      {/* Pet Profile & Details Card (Clean Premium Card Style) */}
      {hasPetProfile ? (
        <div style={{ padding: '0 20px' }}>
          <div style={{
            padding: '20px',
            borderRadius: '24px',
            background: '#FFFFFF',
            border: '1px solid var(--hairline)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxSizing: 'border-box'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--hairline)',
              paddingBottom: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>📊</span>
                <span style={{
                  fontSize: '13.5px',
                  fontWeight: 800,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em'
                }}>
                  PET STATUS WINDOW
                </span>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: 'var(--brand-tint)',
                  color: 'var(--brand-deep)',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                편집 ✏️
              </button>
            </div>

            {/* Main Stats Row */}
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              {/* Avatar + LV. */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: getBreedAvatar(profile.breed, profile.species).bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '30px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <span style={{ display: 'inline-block' }}>
                    {getBreedAvatar(profile.breed, profile.species).emoji}
                  </span>
                </div>
                
                {/* LV Label */}
                <div style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--brand-deep)',
                  background: 'var(--brand-tint)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}>
                  LV. {level}
                </div>
              </div>

              {/* RPG Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                {/* Pet Name & Gender Tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{profile.name}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: profile.gender === '여아' ? '#E11D48' : '#2563EB',
                    background: profile.gender === '여아' ? '#FFE4E6' : '#DBEAFE',
                    padding: '1.5px 6px',
                    borderRadius: '6px'
                  }}>
                    {profile.gender === '여아' ? '♀ 여아' : '♂ 남아'}
                  </span>
                </div>
                
                {/* Info Text */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--ink-soft)',
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {profile.species === 'Cat' ? '🐱 고양이' : `🐩 강아지 (${getBreedAvatar(profile.breed, profile.species).label})`} · {profile.age}세 · {profile.weightKg ? `${profile.weightKg}kg` : '체중 미입력'}
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--ink-faint)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  성향: {profile.personality || '기본 성향 🧸'}
                </div>
              </div>
            </div>

            {/* Thin Progress Bars (EXP & HP) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--hairline)', paddingTop: '10px' }}>
              {/* EXP Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>
                  <span>⭐ EXP</span>
                  <span>{currentExp}/100 XP</span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#F1F5F9',
                  borderRadius: '99px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${currentExp}%`,
                    height: '100%',
                    background: '#10B981',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease-out'
                  }} />
                </div>
              </div>

              {/* HP Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ❤️ HP <span style={{ fontSize: '10px' }}>{getHearts(hp)}</span>
                  </span>
                  <span>{hp}/100 HP</span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#F1F5F9',
                  borderRadius: '99px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${hp}%`,
                    height: '100%',
                    background: '#EF4444',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease-out'
                  }} />
                </div>
              </div>
            </div>

            {/* Allergies (Debuffs) & Concerns (Buffs) Section */}
            {((profile.allergies && profile.allergies.length > 0) || (profile.healthConcerns && profile.healthConcerns.length > 0)) && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                borderTop: '1px solid var(--hairline)',
                paddingTop: '10px'
              }}>
                {/* Allergies (Debuffs) */}
                {profile.allergies && profile.allergies.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', marginRight: '4px' }}>디버프 🚫</span>
                    {profile.allergies.map(allergy => {
                      const dbf = getAllergyDebuff(allergy);
                      return (
                        <span 
                          key={allergy}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#E11D48',
                            background: '#FFF5F5',
                            border: '1px solid #FEE2E2',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {dbf.targetEmoji} {allergy} (찡그림 😣)
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Concerns (Buffs) */}
                {profile.healthConcerns && profile.healthConcerns.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', marginRight: '4px' }}>버프 🛡️</span>
                    {profile.healthConcerns.map(concern => {
                      const buf = getConcernBuff(concern);
                      return (
                        <span 
                          key={concern}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#0F766E',
                            background: '#ECFDF5',
                            border: '1px solid #D1FAE5',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {buf.emoji} {concern}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
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
          <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            우리아이 맞춤 건강 케어
          </h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Card 1: Joint Care */}
          <article 
            onClick={() => navigate('/search?category=사료&concern=관절 질환')}
            style={{
              padding: '18px 20px',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #F1F5F9',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                color: '#DB2777', 
                background: '#FCE7F3', 
                padding: '3px 8px', 
                borderRadius: '6px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                관절 & 슬개골 케어
              </span>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1.4 }}>
                슬개골 · 관절이 약한 아이들을 위한 특별 영양 식단
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                연골 성분(콘드로이친, 글루코사민)과 천연 칼슘 안심 배합 사료 분석
              </p>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #FFF0F6 0%, #FFD8E6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0
            }}>
              Bone 🦴
            </div>
          </article>

          {/* Card 2: Tears & Weight Care */}
          <article 
            onClick={() => navigate('/search?category=사료&concern=비만')}
            style={{
              padding: '18px 20px',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #F1F5F9',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                color: '#2563EB', 
                background: '#E0F2FE', 
                padding: '3px 8px', 
                borderRadius: '6px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                체중 관리 & 눈물痕
              </span>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1.4 }}>
                눈물 흔적과 체중 관리를 동시에 해결하는 건강 식단
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                L-카르니틴 배합 저칼로리 포뮬러 및 고정 단백질 가수분해 사료
              </p>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0
            }}>
              Scale ⚖️
            </div>
          </article>

          {/* Card 3: Skin & Allergies */}
          <article 
            onClick={() => navigate('/search?query=가수분해')}
            style={{
              padding: '18px 20px',
              borderRadius: '20px',
              background: '#FFFFFF',
              border: '1px solid #F1F5F9',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
            }}
          >
            <div style={{ flex: 1 }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 800, 
                color: '#059669', 
                background: '#ECFDF5', 
                padding: '3px 8px', 
                borderRadius: '6px',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                민감성 피부 & 알레르기
              </span>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#1E293B', lineHeight: 1.4 }}>
                피부 가려움과 알레르기 걱정 없는 저자극 안심 큐레이션
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                알레르기 식이 차단용 가수분해 단백질과 유기농 유산균 포뮬러 분석
              </p>
            </div>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              flexShrink: 0
            }}>
              Sprout 🌱
            </div>
          </article>
        </div>
      </section>

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
