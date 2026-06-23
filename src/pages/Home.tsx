// @ts-nocheck
import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Helmet } from 'react-helmet-async';
import {
  ChevronRight,
  Pencil,
  Bone,
  Droplet,
  ShieldCheck,
  Heart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rankProductsForProfile, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import { HOME } from '../copy/ui';
import ProductImage from '../components/ProductImage';

const CATEGORY_GRID = [
  { name: '사료', label: '사료', emoji: '🐾' },
  { name: '간식', label: '간식', emoji: '🦴' },
  { name: '영양제', label: '영양제', emoji: '💊' },
  { name: '구강관리', label: '구강', emoji: '🦷' },
  { name: '피부·목욕·위생', label: '피부·목욕', emoji: '🛁' },
  { name: '눈·귀·민감부위 케어', label: '눈·귀', emoji: '👁' },
  { name: '배변/모래/패드', label: '배변', emoji: '🪣' },
  { name: '생활용품·환경안전', label: '생활용품', emoji: '🏠' },
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

  // 게이지 채워지는 애니메이션 (온보딩 완료 직후의 보상 모션)
  const [scoreFill, setScoreFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setScoreFill(healthScore), 150);
    return () => clearTimeout(t);
  }, [healthScore]);

  const [scoreExpanded, setScoreExpanded] = useState(false);

  const recent = (recentViews?.length ? recentViews : products).slice(0, 8);
  const favoriteSet = new Set(favorites || []);

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

          <div style={{ height: '1px', background: 'rgba(255,255,255,0.25)', margin: '16px 0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>현재 식단 적합도</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>
              {healthScore}<span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>/100</span>
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: '99px', overflow: 'hidden', marginTop: '8px', marginBottom: 12 }}>
            <div style={{ width: `${scoreFill}%`, height: '100%', background: '#fff', borderRadius: '99px', transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>

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

          <button
            onClick={() => setScoreExpanded(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
          >
            점수 산정 근거 보기 {scoreExpanded ? '▲' : '▼'}
          </button>

          {scoreExpanded && (
            <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(profile?.allergies?.length > 0
                ? [{ label: `${profile.allergies[0]} 알러지 회피`, pts: '+30', color: 'var(--safe)' }]
                : [{ label: '알러지 성분 없음', pts: '+30', color: 'var(--safe)' }]
              ).concat(
                profile?.healthConcerns?.length > 0
                  ? [{ label: `${profile.healthConcerns[0]} 적합 성분 포함`, pts: '+25', color: 'var(--safe)' }]
                  : [],
                [{ label: '체중·활동량 적합', pts: '+20', color: 'var(--safe)' }],
                profile?.allergies?.length > 1
                  ? [{ label: '복합 알러지 감점', pts: `-${(profile.allergies.length - 1) * 4}`, color: 'var(--danger)' }]
                  : []
              ).map(({ label, pts, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '10px', background: 'var(--surface)' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color }}>{pts}</span>
                </div>
              ))}
              <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, lineHeight: 1.5, marginTop: '2px' }}>
                * 현재 급여 중인 사료를 등록하면 더 정확한 점수를 제공해요.
              </p>
            </div>
          )}
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

      {/* ===== Category Grid ===== */}
      <div style={{ padding: '22px 16px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>카테고리</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: '16px', columnGap: '8px' }}>
          {CATEGORY_GRID.map(({ name, label, emoji }) => (
            <button
              key={name}
              onClick={() => navigate(`/search?category=${encodeURIComponent(name)}`)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <span style={{ width: '54px', height: '54px', borderRadius: '18px', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                {emoji}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== 베로 맞춤 추천 ===== */}
      {topRanked.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '22px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {HOME.sectionRecommended(petName)}
            </h3>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-faint)' }}>
              전체보기 <ChevronRight size={15} />
            </button>
          </div>
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
        </section>
      )}

      {/* ===== 최근 본 상품 ===== */}
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
