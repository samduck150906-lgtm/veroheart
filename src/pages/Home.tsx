// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { rankProductsForProfile, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import { HOME } from '../copy/ui';

const CATEGORIES = [
  { icon: '🥣', label: '사료', query: '사료' },
  { icon: '🦴', label: '간식', query: '간식' },
  { icon: '💊', label: '영양제', query: '영양제' },
  { icon: '🦷', label: '구강', query: '구강' },
  { icon: '🛁', label: '피부·목욕', query: '피부' },
  { icon: '👁️', label: '눈·귀', query: '눈' },
  { icon: '🧻', label: '배변', query: '배변' },
  { icon: '🎾', label: '생활용품', query: '생활' },
];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

function GradeTag({ grade }) {
  const c = GRADE_COLORS[grade] || GRADE_COLORS.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 12, borderRadius: 6, padding: '2px 7px' }}>
      {grade}등급
    </span>
  );
}

function AnimatedScore({ target }) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = () => {
      current += 2;
      if (current >= target) { setScore(target); return; }
      setScore(current);
      requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => requestAnimationFrame(step), 400);
    return () => clearTimeout(timeout);
  }, [target]);

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="7" />
        <circle cx="48" cy="48" r="40" fill="none" stroke="#fff" strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { products, profile, recentViews, isLoggedIn, favorites } = useStore();

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  const topRanked = useMemo(() => {
    if (!products.length) return products.slice(0, 6);
    if (hasPetProfile) {
      return rankProductsForProfile(products, profile, { limit: 6 });
    }
    return [...products].sort((a, b) => b.averageRating - a.averageRating).slice(0, 6);
  }, [products, profile, hasPetProfile]);

  const recentList = useMemo(() => {
    return (recentViews?.length ? recentViews : products.slice(0, 6));
  }, [recentViews, products]);

  const petName = hasPetProfile ? profile.name : null;
  const speciesLabel = profile?.breed || (profile?.species === 'Cat' ? '고양이' : '강아지');
  const ageLabel = profile?.age ? `${profile.age}살` : '';
  const weightLabel = profile?.weightKg ? `${profile.weightKg}kg` : '';

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Pet Profile Card */}
      {hasPetProfile ? (
        <div style={{
          margin: '16px 16px 0',
          borderRadius: 20,
          background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
          padding: '20px 20px 22px',
          boxShadow: '0 4px 20px rgba(245,197,24,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>
                {profile?.species === 'Cat' ? '🐱' : '🐶'}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                  {petName}
                  {speciesLabel ? ` · ${speciesLabel}` : ''}
                  {ageLabel ? ` · ${ageLabel}` : ''}
                </div>
                {weightLabel && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{weightLabel}</div>}
              </div>
            </div>
            <AnimatedScore target={healthScore} />
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>식단 건강 점수</div>
          {profile?.allergies?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {profile.allergies.map(a => (
                <span key={a} style={{ background: '#F04452', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                  ⚠️ 알러지: {a}
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {profile?.healthConcerns?.length > 0 && (
              <>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>관심 케어:</span>
                {profile.healthConcerns.slice(0, 3).map(h => (
                  <span key={h} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{h}</span>
                ))}
              </>
            )}
            <button
              onClick={() => navigate('/pet-profile')}
              style={{
                marginLeft: 'auto', background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)', borderRadius: 10,
                padding: '4px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >정보 수정</button>
          </div>
        </div>
      ) : (
        <div style={{
          margin: '16px 16px 0',
          borderRadius: 20,
          background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
          padding: '20px 20px 22px',
          boxShadow: '0 4px 20px rgba(245,197,24,0.3)',
          cursor: 'pointer',
        }}
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 40 }}>🐾</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                반려동물 정보를 등록해보세요
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                맞춤 사료 추천과 성분 분석을 받아볼 수 있어요
              </div>
            </div>
            <span style={{ marginLeft: 'auto', color: '#fff', fontSize: 22 }}>›</span>
          </div>
        </div>
      )}

      {/* Category Grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>카테고리</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate(`/search?query=${encodeURIComponent(cat.query)}`)}
              style={{
                background: '#fff', border: 'none', borderRadius: 16,
                padding: '14px 8px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
              }}
            >
              <span style={{ fontSize: 24 }}>{cat.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4E5968' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 베로 맞춤 추천 ===== */}
      {topRanked.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {HOME.sectionRecommended(petName)}
            </h3>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-faint)' }}>
              전체보기 <ChevronRight size={15} />
            </button>
          </div>
          <div className="rail" style={{ display: 'flex', gap: '12px', overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {topRanked.map(({ product: p, score: s }) => (
              <ProductCard key={p.id} product={p} variant="vertical" showHealthTags={false} />
            ))}
          </div>
        </section>
      )}

      {/* ===== 최근 본 상품 ===== */}
      {recent.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{HOME.sectionRecent}</h3>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-faint)' }}>
              더보기 <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {topRanked.slice(0, 6).map(product => {
              const score = hasPetProfile ? calculateCompatibilityScore(product, profile) : null;
              const grade = score != null ? gradeFromScore(score) : (product.verificationStatus === 'verified' ? 'A' : 'B');
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{
                    minWidth: 170, background: '#fff', borderRadius: 18,
                    padding: '14px 14px 16px', boxShadow: '0 2px 12px rgba(30,41,59,0.07)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', margin: '0 auto 10px', background: '#F7F4EE' }}>
                    <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    <GradeTag grade={grade} />
                    {score != null && (
                      <span style={{ background: '#F0EDE8', color: '#4E5968', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                        궁합 {score}%
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.4, marginBottom: 8 }}>
                    {product.name.length > 22 ? product.name.slice(0, 22) + '…' : product.name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>
                    {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate('/comparison'); }}
                    style={{
                      width: '100%', height: 34, borderRadius: 10,
                      background: '#F7F4EE', border: '1px solid #E5E8EB',
                      fontSize: 12, fontWeight: 700, color: '#4E5968', cursor: 'pointer',
                    }}
                  >비교하기</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recently Viewed */}
      <div style={{ padding: '22px 16px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em', marginBottom: 14 }}>최근 본 상품</h2>
        {recentList.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 16, padding: '20px', textAlign: 'center',
            color: '#B0B8C1', fontSize: 14, boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
            <p style={{ fontWeight: 600 }}>아직 본 상품이 없어요</p>
            <button
              onClick={() => navigate('/search')}
              style={{
                marginTop: 14, background: '#F5C518', border: 'none', borderRadius: 10,
                padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer',
              }}
            >검색하러 가기</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {recentList.slice(0, 8).map(product => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.id}`)}
                style={{
                  minWidth: 100, background: '#fff', borderRadius: 14, padding: 10,
                  boxShadow: '0 1px 4px rgba(30,41,59,0.06)', cursor: 'pointer', flexShrink: 0, textAlign: 'center',
                }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 10, overflow: 'hidden', margin: '0 auto 8px', background: '#F7F4EE' }}>
                  <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#4E5968', lineHeight: 1.3 }}>
                  {product.name.length > 14 ? product.name.slice(0, 14) + '…' : product.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
