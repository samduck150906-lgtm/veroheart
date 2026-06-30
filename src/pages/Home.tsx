// @ts-nocheck
import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rankProductsForProfile, gradeFromScore, getRecommendationBreakdown, getProductBadges } from '../utils/score';
import { HOME } from '../copy/ui';
import ProductImage from '../components/ProductImage';
import AnalysisBadges from '../components/AnalysisBadges';

const CATEGORY_GRID = [
  { name: '사료', label: '사료', Icon: Utensils },
  { name: '간식', label: '간식', Icon: Cookie },
  { name: '영양제', label: '영양제', Icon: Pill },
  { name: '구강관리', label: '구강', Icon: Sparkles },
  { name: '피부·목욕·위생', label: '피부·목욕', Icon: Droplets },
  { name: '눈·귀·민감부위 케어', label: '눈·귀', Icon: Eye },
  { name: '배변/모래/패드', label: '배변', Icon: Trash2 },
  { name: '생활용품·환경안전', label: '생활용품', Icon: HomeIcon },
];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

export default function Home() {
  const navigate = useNavigate();
  const { products, profile, recentViews, isLoggedIn } = useStore();

  const hasPetProfile =
    isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';

  // Diet health score — deterministic from profile signals
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

  const topRanked = useMemo(() => {
    if (!hasPetProfile || !products.length) return [];
    return rankProductsForProfile(products, profile, { limit: 8 });
  }, [hasPetProfile, products, profile]);

  const petName = hasPetProfile ? profile.name : '베로';
  const speciesLabel = profile?.species === 'Cat' ? '고양이' : (profile?.breed || '말티즈');
  const ageLabel = profile?.age ? `${profile.age}살` : '4살';
  const weightLabel = profile?.weightKg ? `${profile.weightKg}kg` : '5.2kg';
  const allergyLabel = profile?.allergies?.[0];
  const concernLabel = profile?.healthConcerns?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px', padding: '18px 0 40px' }}>
      <Helmet>
        <title>{hasPetProfile ? `${profile.name} 맞춤 홈 — 베로로` : '베로로 — 우리 아이 맞춤 사료'}</title>
        <meta name="description" content="베로로 — 우리 아이에게 딱 맞는 사료를 찾아요. 성분 분석과 맞춤 케어 추천." />
      </Helmet>

      {/* ===== Pet Profile Card ===== */}
      <div>
        <div style={{ background: 'var(--fill)', borderRadius: '20px', padding: '18px 18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px', background: '#FEF3C7', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '30px', lineHeight: 1 }}>{profile?.species === 'Cat' ? '🐱' : '🐾'}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>{petName}</div>
                <button
                  onClick={() => navigate(hasPetProfile ? '/profile' : '/login')}
                  aria-label="프로필 수정"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-400)', padding: '2px' }}
                >
                  <Pencil size={17} strokeWidth={2} />
                </button>
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--ink-soft)', fontWeight: 600, marginTop: '2px' }}>
                {speciesLabel} · {ageLabel} · {weightLabel}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--danger)', background: 'var(--danger-tint)', padding: '3px 9px', borderRadius: '7px' }}>
                  {allergyLabel || '닭고기 알러지'}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--safe)', background: 'var(--safe-tint)', padding: '3px 9px', borderRadius: '7px' }}>
                  {concernLabel ? `${concernLabel} 관리중` : '관절 건강 양호'}
                </span>
              </div>
            </div>
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
      </div>

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
      </section>

      {/* ===== 베로 맞춤 추천 ===== */}
      {topRanked.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '22px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
              {petName} 맞춤 추천
            </h3>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '13px', fontWeight: 600, color: 'var(--ink-faint)' }}>
              전체보기 <ChevronRight size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {topRanked.slice(0, 6).map(product => {
              const breakdown = getRecommendationBreakdown(product, profile);
              const score = hasPetProfile ? breakdown.total : null;
              const grade = score != null ? gradeFromScore(score) : (product.verificationStatus === 'verified' ? 'A' : 'B');
              const badges = getProductBadges(breakdown, { max: 1 });
              return (
                <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '132px', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', width: '132px', height: '132px', borderRadius: '16px', overflow: 'hidden', background: 'var(--fill)' }}>
                    <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {gradeLetter && (
                      <span style={{ position: 'absolute', top: '8px', left: '8px', width: '22px', height: '22px', borderRadius: '7px', background: gradeColor, color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {gradeLetter}
                      </span>
                    )}
                    <span style={{ position: 'absolute', top: '8px', right: '8px', width: '26px', height: '26px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      <Heart size={15} strokeWidth={2} fill={liked ? '#FF4D6D' : 'none'} color={liked ? '#FF4D6D' : 'var(--ink-300)'} />
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.4, marginBottom: 6 }}>
                    {product.name.length > 22 ? product.name.slice(0, 22) + '…' : product.name}
                  </div>
                  <AnalysisBadges badges={badges} style={{ marginBottom: 8 }} />
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
    </div>
  );
}
