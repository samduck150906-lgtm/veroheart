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

      {/* Pet Profile & Details Card (Toss-style Dashboard for Configured Users) */}
      {hasPetProfile ? (
        <div style={{ padding: '0 20px' }}>
          <div style={{
            padding: '24px 20px',
            borderRadius: '24px',
            background: 'var(--surface)',
            border: '1px solid var(--hairline)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: getBreedAvatar(profile.breed, profile.species).bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                flexShrink: 0
              }}>
                {getBreedAvatar(profile.breed, profile.species).emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '2px 8px', borderRadius: '8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {getBreedAvatar(profile.breed, profile.species).label}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink-soft)', marginTop: '4px', fontWeight: 500 }}>
                  {profile.species === 'Cat' ? '고양이' : '강아지'} · {profile.age}세 {profile.weightKg ? `· ${profile.weightKg}kg` : ''}
                </div>
              </div>
              <button 
                onClick={() => navigate('/profile')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  background: 'var(--brand-tint)',
                  color: 'var(--brand-deep)',
                  border: '1.5px solid var(--brand-line)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                수정
              </button>
            </div>

            <div style={{ width: '100%', height: '1px', background: 'var(--hairline)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '6px' }}>알레르기 정보</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.allergies && profile.allergies.length > 0 ? (
                    profile.allergies.map(allergy => (
                      <span key={allergy} style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-tint)', padding: '4px 10px', borderRadius: '8px' }}>
                        🚫 {allergy}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>피해야 할 알레르기 성분이 없습니다.</span>
                  )}
                </div>
              </div>

              <div>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '6px' }}>건강 고민 및 관리</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.healthConcerns && profile.healthConcerns.length > 0 ? (
                    profile.healthConcerns.map(concern => (
                      <span key={concern} style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '4px 10px', borderRadius: '8px' }}>
                        ✨ {concern}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '12.5px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>설정된 건강 고민이 없습니다.</span>
                  )}
                </div>
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
