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
  Utensils,
  Cookie,
  Pill,
  Sparkles,
  Droplets,
  Eye,
  Trash2,
  Home as HomeIcon,
  Heart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import ProductCard from '../components/ProductCard';
import { rankProductsForProfile, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import { HOME } from '../copy/ui';

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

const CARE_CARDS = [
  { Icon: Bone, tint: '#FEF3C7', color: '#A16207', title: '슬개골·관절', desc: '소형견 맞춤', to: '/search?category=사료&concern=관절 질환' },
  { Icon: Droplet, tint: '#FEF9C3', color: '#CA8A04', title: '눈물흔·체중', desc: '눈가 케어', to: '/search?category=사료&concern=비만' },
  { Icon: ShieldCheck, tint: '#FEFCE8', color: '#A16207', title: '민감성 피부', desc: '저알러지 식단', to: '/search?query=가수분해' },
];

const GRADE_COLOR: Record<string, string> = {
  A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452',
};

export default function Home() {
  const { products, profile, recentViews, isLoggedIn, favorites } = useStore();
  const navigate = useNavigate();

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

  const recent = (recentViews?.length ? recentViews : products).slice(0, 8);
  const favoriteSet = new Set(favorites || []);

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

          <div style={{ height: '1px', background: 'var(--hairline-strong)', margin: '16px 0 12px' }} />

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>식단 건강 점수</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--ink)' }}>
              {healthScore}<span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-400)' }}>/100</span>
            </span>
          </div>
          <div style={{ height: '8px', background: '#E5E8EB', borderRadius: '99px', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ width: `${scoreFill}%`, height: '100%', background: 'var(--brand)', borderRadius: '99px', transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
        </div>
      </div>

      {/* ===== Category Grid ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: '16px', columnGap: '8px' }}>
        {CATEGORY_GRID.map(({ name, label, Icon }) => (
          <button
            key={name}
            onClick={() => navigate(`/search?category=${encodeURIComponent(name)}`)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{ width: '54px', height: '54px', borderRadius: '16px', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={24} strokeWidth={1.8} color="var(--ink-soft)" />
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* ===== 맞춤 케어 추천 ===== */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>맞춤 케어 추천</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {CARE_CARDS.map(({ Icon, tint, color, title, desc, to }) => (
            <button
              key={title}
              onClick={() => navigate(to)}
              style={{
                background: 'var(--fill)', border: 'none', borderRadius: '16px', padding: '14px 12px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', textAlign: 'left',
              }}
            >
              <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} strokeWidth={2} color={color} />
              </span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{title}</div>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--ink-faint)', marginTop: '2px' }}>{desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

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
          <div className="rail" style={{ display: 'flex', gap: '12px', overflowX: 'auto', margin: '0 -20px', padding: '0 20px 4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {recent.map((p) => {
              const score = hasPetProfile ? calculateCompatibilityScore(p, profile) : null;
              const gradeLetter = score != null ? gradeFromScore(score) : null;
              const gradeColor = gradeLetter ? GRADE_COLOR[gradeLetter] : '#6BB04E';
              const liked = favoriteSet.has(p.id);
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
                  <div style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 700, marginTop: '8px' }}>{p.brand}</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, marginTop: '1px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {p.name}
                  </div>
                  {p.price ? (
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', marginTop: '3px' }}>{Number(p.price).toLocaleString()}원</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
