// @ts-nocheck
import { useMemo, useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
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
  MessageCircle,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProductImage from '../components/ProductImage';
import ProductCard from '../components/ProductCard';
import { rankProductsForProfile, gradeFromScore, calculateCompatibilityScore } from '../utils/score';

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
              aria-label={`${item.name} 카테고리로 이동`}
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
              {petName} 맞춤 추천
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
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>최근 본 상품</h3>
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

// 섹션 헤더 — 그레이 캔버스 위, 제목(18/800) + 전체보기
function SectionHeader({ title, sub, onMore }) {
  return (
    <div className="flex items-center justify-between mb-3 px-5">
      <div className="min-w-0">
        <p style={T.section}>{title}</p>
        {sub && <p className="mt-1 truncate" style={T.cap}>{sub}</p>}
      </div>
      {onMore && (
        <button onClick={onMore} className="flex items-center flex-shrink-0 -mr-1" style={{ ...T.sub, color: MUTED, fontWeight: 600 }}>
          전체보기 <ChevronRight size={16} style={{ marginLeft: -1 }} />
        </button>
      )}
    </div>
  );
}

function HorizontalProductSection({
  title,
  subtitle,
  products,
  onMore,
}: {
  title: string;
  subtitle: string;
  icon?: ReactNode;
  products: Product[];
  onMore: () => void;
}) {
  if (products.length === 0) return null;

  return (
    <section style={{ marginBottom: '24px', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px', gap: '10px' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '16px', marginBottom: '2px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em' }}>
            {title}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>{subtitle}</p>
        </div>
        <button
          onClick={onMore}
          style={{
            flexShrink: 0,
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '4px',
          }}
        >
          더보기 <ChevronRight size={14} />
        </button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '4px',
          paddingRight: '32px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
          WebkitMaskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)',
          maskImage: 'linear-gradient(to right, #000 0, #000 calc(100% - 28px), transparent 100%)',
          scrollSnapType: 'x proximity',
        }}
        aria-label={`${title} 가로 스크롤 목록`}
      >
        {products.map((product, idx) => (
          <div
            key={product.id}
            style={{ flex: '0 0 168px', position: 'relative', scrollSnapAlign: 'start' }}
          >
            <div style={{ position: 'absolute', top: '14px', left: '14px', zIndex: 2 }}>
              <span
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '3px 7px',
                  borderRadius: '6px',
                  letterSpacing: '-0.01em',
                }}
              >
                {idx + 1}
              </span>
            </div>
            <ChevronRight size={22} className="text-white/90 flex-shrink-0" />
          </div>
        </button>
      ) : (
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          className="mx-4 mt-3 mb-1 w-[calc(100%-2rem)] rounded-[20px] overflow-hidden relative block text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)', minHeight: 148 }}
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/10 rounded-full" />
          <div className="relative p-5">
            <p className="text-[12px] font-semibold text-white/75 mb-1">맞춤 사료 추천</p>
            <p className="text-[21px] font-extrabold text-white leading-snug mb-3">
              내 아이에게 딱 맞는<br />사료를 찾아드려요 🐾
            </p>
            <span className="inline-block bg-white text-[#F0A500] text-[13px] font-bold px-4 py-2 rounded-full shadow-sm">
              반려동물 등록하기 →
            </span>
          </div>
          <div className="absolute right-5 bottom-3 text-[64px] leading-none opacity-90 pointer-events-none">🐶</div>
        </button>
      )}

      {/* ===== [2] 퀵액션 4분할 ===== */}
      <div className="px-5 pt-3">
        <div className="bg-white rounded-[20px] px-1 py-4" style={{ boxShadow: CARD }}>
          <div className="grid grid-cols-4">
            {QUICK_ACTIONS.map(({ label, Icon, to, bg, fg }) => (
              <button
                key={label}
                onClick={() => navigate(to)}
                className="flex flex-col items-center gap-2 py-1 active:scale-[0.94] transition-transform"
              >
                <span className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={24} color={fg} strokeWidth={2.1} />
                </span>
                <span style={{ ...T.cap, color: SUB, fontWeight: 600 }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== [3] 스캐너 프로모 배너 ===== */}
      <div className="px-5 pt-3">
        <button
          onClick={() => navigate('/scanner')}
          className="w-full flex items-center gap-3 rounded-[16px] p-4 text-left active:scale-[0.99] transition-transform"
          style={{ background: 'linear-gradient(135deg, #FFFBEF 0%, #FDF1CE 100%)' }}
        >
          <span className="w-11 h-11 rounded-[13px] bg-white flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(217,149,0,0.20)' }}>
            <Camera size={22} color="#D99500" strokeWidth={2.1} />
          </span>
          <div className="flex-1 min-w-0">
            <p style={T.title}>사진 한 장으로 성분 분석</p>
            <p className="mt-0.5" style={{ ...T.cap, color: '#A77F2E' }}>사료 뒷면을 찍으면 위험 성분을 알려드려요</p>
          </div>
          <ChevronRight size={18} color="#C99A2E" />
        </button>
      </div>

      {/* ===== [4] 카테고리 ===== */}
      <div className="pt-7">
        <p className="mb-3 px-5" style={T.section}>카테고리</p>
        <div className="flex gap-2 px-5 overflow-x-auto no-scrollbar pb-1">
          {CATEGORY_CHIPS.map(({ icon, label, category }) => (
            <button
              key={label}
              onClick={() => navigate(`/search?category=${encodeURIComponent(category)}`)}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white rounded-full pl-3 pr-3.5 h-[42px] active:bg-[#FEF9E7] transition-colors"
              style={{ ...T.sub, color: INK, fontWeight: 600, boxShadow: CARD_SM }}
            >
              <span className="text-[15px] leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== [섹션 3] 맞춤 추천 (로딩 스켈레톤 / 빈 상태 처리) ===== */}
      <section className="mt-5 px-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[17px] font-extrabold text-[#1A1A1A]">
              {petName ? `${petName}에게 잘 맞을 것 같아요` : '추천 사료 모아봤어요'}
            </p>
            <p className="text-[12px] text-[#ABABAB] mt-0.5">
              {petName ? '반려동물 맞춤 추천이에요' : '인기 있는 사료부터 확인해보세요'}
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="text-[13px] font-medium text-[#ABABAB] flex items-center gap-0.5 flex-shrink-0"
          >
            전체보기 <ChevronRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 px-5">
            {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : topRanked.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 px-5">
            {topRanked.slice(0, 6).map((product) => {
              const isFav = favoriteSet.has(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative bg-white rounded-[16px] active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ boxShadow: CARD_SM }}
                >
                  {/* CHANGED(P1-6): overflow-hidden을 이미지에만 적용 → 등급 뱃지/하트가
                      카드 둥근 모서리에 잘리지 않도록. 뱃지·하트는 카드 직속 오버레이. */}
                  <div className="relative bg-[#F4F6F8] aspect-square rounded-t-[16px] overflow-hidden">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                      aria-label="찜하기"
                      className="absolute top-2 right-2 w-7 h-7 bg-white/85 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Heart size={14} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#9A9A9A'} />
                    </button>
                  </div>
                  <span
                    className="absolute top-2.5 left-2.5 text-white px-2 py-0.5 rounded-full"
                    style={{ ...T.micro, fontWeight: 800, background: gradeColor(grade).color }}
                  >
                    {label}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite?.(product.id); }}
                    aria-label="찜하기"
                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                  >
                    <Heart size={15} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#B0B8C1'} />
                  </button>
                  <div className="p-3">
                    <p className="truncate" style={T.cap}>{displayBrand(product.brand, product.name)}</p>
                    <p className="mt-0.5 mb-1.5 line-clamp-2 min-h-[36px]" style={T.prodName}>{product.name}</p>
                    {product.averageRating > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Star size={13} fill="#F5C842" color="#F5C842" />
                        <span style={{ ...T.cap, color: SUB, fontWeight: 700 }}>{product.averageRating.toFixed(1)}</span>
                        {product.reviewsCount > 0 && (
                          <span style={T.cap}>· 리뷰 {product.reviewsCount.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                    <p style={T.price}>{product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5">
            <div className="bg-white rounded-[16px] p-8 text-center" style={{ boxShadow: CARD_SM }}>
              <div className="text-[40px] mb-2 leading-none">🍽️</div>
              <p style={T.title}>추천할 사료를 준비 중이에요</p>
              <p className="mt-1 mb-4" style={T.cap}>원하는 사료를 직접 검색해보세요</p>
              <button
                onClick={() => navigate('/search')}
                className="text-white px-6 h-[44px] rounded-[12px] inline-flex items-center"
                style={{ ...T.body, color: '#fff', background: 'linear-gradient(135deg, #F5C842 0%, #F0A500 100%)' }}
              >
                사료 검색하기
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===== [6] 인기 TOP 3 ===== */}
      {(loading || rankingTop3.length > 0) && (
        <section className="pt-7">
          <SectionHeader title="이번 주 인기 TOP 3" sub="베로로 보호자들이 가장 많이 본 사료" onMore={() => navigate('/ranking')} />
          <div className="px-5">
            <div className="bg-white rounded-[20px] overflow-hidden" style={{ boxShadow: CARD }}>
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4" style={{ borderTop: i ? `1px solid ${LINE}` : 'none' }}>
                      <div className="w-7 h-7 bg-[#EEF1F4] rounded-[9px] animate-pulse flex-shrink-0" />
                      <div className="w-12 h-12 bg-[#EEF1F4] rounded-[12px] animate-pulse flex-shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-2/3 bg-[#EEF1F4] rounded animate-pulse" />
                        <div className="h-3 w-1/3 bg-[#EEF1F4] rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))
              : rankingTop3.map((product, index) => {
                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="flex items-center gap-3 p-3.5 active:bg-[#FAF8F4] cursor-pointer"
                    >
                      <span className="w-6 text-center text-[18px] flex-shrink-0">{MEDALS[index]}</span>
                      <div className="w-12 h-12 rounded-[10px] bg-[#F8F8F8] flex-shrink-0 overflow-hidden">
                        <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{product.name}</p>
                        <p className="text-[12px] text-[#ABABAB]">
                          {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                        </p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </section>
      )}

      {/* ===== [7] 최근 본 상품 ===== */}
      {recentList.length > 0 && (
        <section className="pt-7">
          <p className="mb-3 px-5" style={T.section}>최근 본 상품</p>
          <div className="flex gap-3 px-5 overflow-x-auto no-scrollbar pb-1">
            {recentList.slice(0, 8).map((product) => {
              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="relative flex-shrink-0 w-[128px] bg-white rounded-[16px] active:scale-[0.98] transition-transform cursor-pointer"
                  style={{ boxShadow: CARD_SM }}
                >
                  {/* CHANGED(P1-6): 이미지에만 overflow-hidden → 뱃지 클리핑 방지 */}
                  <div className="relative bg-[#F4F6F8] h-[104px] rounded-t-[16px] overflow-hidden">
                    <ProductImage src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <span
                    className="absolute top-2 left-2 text-white px-1.5 py-0.5 rounded-full"
                    style={{ ...T.micro, fontSize: 10, fontWeight: 800, background: gradeColor(grade).color }}
                  >
                    {grade === 'pending' ? '분석 중' : grade}
                  </span>
                  <div className="p-2.5">
                    <p className="line-clamp-2 min-h-[34px]" style={T.prodName}>{product.name}</p>
                    <p className="mt-1" style={{ ...T.price, fontSize: 13 }}>
                      {product.price ? `${product.price.toLocaleString()}원` : '가격 미정'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
