// @ts-nocheck
// CHANGED: 홈 전면 재디자인 v3 — TOSS UI 언어 + 엄격한 타이포 스케일.
//  · 글자 크기를 8단계 스케일(11·12·13·14·15·18·20·28)로 통일하고 굵기 체계를 정리
//  · 라이트 그레이 캔버스(#F2F4F6) 위 화이트 카드 + 은은한 그림자(보더 노이즈 제거)
//  · 아이콘 크기/정렬 규칙화(섹션 18 / 퀵 24 / 별 13 / 하트 15)
//  · 식단 적합도를 토스 신용점수형 도넛 게이지로 시각화
//  데이터 fetch/상태 로직은 그대로 유지. 모바일 우선.
import { useMemo } from 'react';
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
  Heart,
  MessageCircle,
  Bell,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';
import type { Product } from '../types';
import { TossChip, TossSectionTitle } from '../components/TossUI';
import ProductImage from '../components/ProductImage';
import { displayBrand } from '../utils/brandLabel';

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

// 토스식 4분할 퀵액션 — 앱의 핵심 진입점
const QUICK_ACTIONS = [
  { label: '성분분석', Icon: ScanLine, to: '/scanner', bg: '#FEF3D6', fg: '#D99500' },
  { label: '인기 랭킹', Icon: Trophy, to: '/ranking', bg: '#E5F7EE', fg: '#15B36B' },
  { label: '비교하기', Icon: Scale, to: '/comparison', bg: '#E7F0FF', fg: '#3182F6' },
  { label: '성분사전', Icon: BookOpen, to: '/dictionary', bg: '#EFE9FF', fg: '#7C5CFC' },
];

export default function Home() {
  const { products, profile, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const petName = profile.name !== '우리 아이' ? profile.name : null;
  // New filter & search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ ages: [], ingredients: [], allergens: [] });
  const [filterOpen, setFilterOpen] = useState(false);
  // Compute filtered products
  const filteredProducts = products.filter(p => {
    const matchesQuery = searchQuery
      ? p.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesAge = filters.ages.length
      ? filters.ages.includes(p.ageGroup)
      : true;
    const matchesIngredient = filters.ingredients.length
      ? filters.ingredients.includes(p.mainIngredient)
      : true;
    const matchesAllergen = filters.allergens.length
      ? !p.allergens?.some(a => filters.allergens.includes(a))
      : true;
    return matchesQuery && matchesAge && matchesIngredient && matchesAllergen;
  });

  // 1. Identify expected pet type from profile
  const expectedPetType = profile.species === 'Cat' ? 'cat' : 'dog';

  // 2. Build trending first so personalRecs can exclude them
  const trendingProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .sort((a, b) => (b.reviewsCount ?? 0) - (a.reviewsCount ?? 0))
    .slice(0, 5);
  const trendingIds = new Set(trendingProducts.map(p => p.id));

  const allergenFilter = (p: (typeof products)[0]) => {
    if (!profile.allergies || profile.allergies.length === 0) return true;
    const hasAllergenInIngredients = p.ingredients?.some(ing =>
      profile.allergies.some(allergen =>
        ing.nameKo?.includes(allergen) || ing.nameEn?.toLowerCase().includes(allergen.toLowerCase())
      )
    );
    const hasAllergenInList = p.allergens?.some(a =>
      profile.allergies.some(allergen => a.includes(allergen))
    );
    return !hasAllergenInIngredients && !hasAllergenInList;
  };

  const [scoreExpanded, setScoreExpanded] = useState(false);

  const recent = (recentViews?.length ? recentViews : products).slice(0, 8);
  const favoriteSet = new Set(favorites || []);

  // 4. Backfill personalRecs (also excluding trending)
  if (personalRecs.length < 4) {
    const backfillCount = 4 - personalRecs.length;
    const existingIds = new Set(personalRecs.map(p => p.id));
    const backfill = products
      .filter(p => (p.targetPetType === expectedPetType || p.targetPetType === 'all') && !existingIds.has(p.id) && !trendingIds.has(p.id))
      .filter(allergenFilter)
      .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
      .slice(0, backfillCount);
    personalRecs.push(...backfill);
  }

  // 5. Strict Species-Matching Concern Feed
  const concernProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .filter(p => (p.healthConcerns ?? []).some(c => profile.healthConcerns.includes(c)))
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5); // condensed down to 5

  // 6. Strict Species-Matching Budget Feed
  const budgetProducts = [...products]
    .filter(p => p.targetPetType === expectedPetType || p.targetPetType === 'all')
    .filter(p => (p.price ?? 0) <= 30000)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5); // condensed down to 5

  const topCommunityPicks = []; // Removed for vertical space optimization


  const quickActions = [
    {
      title: '탐색',
      description: '',
      icon: <Search size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/search'),
    },
    {
      title: '랭킹',
      description: '',
      icon: <Flame size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/ranking'),
    },
    {
      title: '성향 테스트',
      description: '',
      icon: <MessageCircle size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/event/personality-quiz'),
    },
    {
      title: '마이 펫',
      description: '',
      icon: <Heart size={18} color="var(--text-muted)" strokeWidth={1.8} />,
      onClick: () => navigate('/profile'),
    },
  ];

  return (
    <div>
      <Helmet>
        <title>
          {isLoggedIn
            ? `${profile.name} 맞춤 홈 — 베로로`
            : '베로로 — 성분 분석 & 집사들의 찐 리뷰'}
        </title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
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
            <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink-soft)' }}>현재 식단 적합도</span>
            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--ink)' }}>
              {healthScore}<span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-400)' }}>/100</span>
            </span>
          </div>
          <div style={{ height: '8px', background: '#E5E8EB', borderRadius: '99px', overflow: 'hidden', marginTop: '8px' }}>
            <div style={{ width: `${scoreFill}%`, height: '100%', background: 'var(--brand)', borderRadius: '99px', transition: 'width 0.9s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>

          <button
            onClick={() => setScoreExpanded(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px 0 0', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)' }}
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
              <p style={{ fontSize: '10.5px', color: 'var(--ink-faint)', fontWeight: 500, lineHeight: 1.5, marginTop: '2px' }}>
                * 현재 급여 중인 사료를 등록하면 더 정확한 점수를 제공해요.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== Category Grid ===== */}
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
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500, marginTop: '2px' }}>
            맞춤 추천이 준비됐어요
          </span>
        </div>
      </section>

      {/* Slim recall notice — inline single line */}
      {isRecallBannerVisible && (
        <section
          role="button"
          tabIndex={0}
          aria-label="FDA 및 농식품부 긴급 회수 공고 자세히 보기"
          style={{
            margin: '12px 20px 0',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
          onClick={() => setIsRecallModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsRecallModalOpen(true);
            }
          }}
        >
          <AlertTriangle size={14} color="var(--accent)" strokeWidth={2} aria-hidden />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '8px', overflow: 'hidden' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--accent)',
                flexShrink: 0,
                letterSpacing: '-0.005em',
              }}
            >
              회수 공고
            </span>
            <span
              className="line-clamp-1"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                minWidth: 0,
              }}
            >
              살모넬라균 오염 의심 사료 회수 대상 안내
            </span>
          </div>
          <ChevronRight size={14} color="var(--text-light)" strokeWidth={2} aria-hidden />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRecallBannerVisible(false);
            }}
            aria-label="공고 배너 닫기"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </section>
      )}

      <section style={{ padding: '12px 20px 0', marginBottom: '4px' }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '14px 16px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
          onClick={() => navigate('/scanner')}
          aria-label="바코드 스캔으로 성분 분석 시작하기"
        >
          <ScanLine size={18} color="var(--text-muted)" strokeWidth={1.8} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>바코드를 스캔해 성분을 분석해 보세요</span>
        </button>
      </section>

      {/* Trending Products - SHOW FIRST */}
      <HorizontalProductSection
        title="급상승 랭킹"
        subtitle="리뷰가 빠르게 늘고 있는 제품"
        products={trendingProducts}
        onMore={() => navigate('/ranking')}
      />

      {personalRecs.length > 0 && (
        <HorizontalProductSection
          title={`${profile.name} 맞춤 추천`}
          subtitle={
            profile.healthConcerns.length > 0
              ? `${profile.healthConcerns.join(', ')} 고민 기준`
              : `${profile.name} 프로필 · 성분·리뷰 기반`
          }
          products={personalRecs}
          onMore={() => navigate('/search')}
        />
      )}

      {/* Quick Actions — single neutral surface */}
      <section style={{ marginBottom: '18px', padding: '0 20px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '4px',
            background: 'var(--surface-elevated)',
            borderRadius: '16px',
            padding: '8px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {quickActions.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.onClick}
              aria-label={item.title}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 4px',
                borderRadius: '12px',
                outline: 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  color: 'var(--text-muted)',
                }}
                aria-hidden
              >
                {item.icon}
              </span>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-dark)' }}>{item.title}</div>
            </button>
          ))}
        </div>
      </section>

      {featuredEvent && (
        <section style={{ marginBottom: '24px', padding: '0 20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em', marginBottom: '2px' }}>
              새로운 소식
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>
              이벤트와 쿠폰 소식을 한 번에
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {visibleEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    background: 'var(--surface-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                  aria-hidden
                >
                  <Tag size={16} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span className="ui-badge ui-badge-muted">{ev.badge}</span>
                    {ev.code && <span className="ui-badge ui-badge-muted">{ev.code}</span>}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '2px', letterSpacing: '-0.005em' }}>
                    {ev.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, lineHeight: 1.5 }}>
                    {ev.desc}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClosedEvents(prev => [...prev, ev.id])}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', padding: '2px' }}
                  aria-label="공지 닫기"
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <HorizontalProductSection
        title="질병 · 부위별 추천"
        subtitle={
          profile.healthConcerns.length > 0
            ? `${profile.name} 프로필 건강 고민 기반`
            : `${profile.name}을 위해 마이 펫에서 고민을 추가해 보세요`
        }
        products={concernProducts}
        onMore={() => navigate('/search')}
      />

      <HorizontalProductSection
        title="가성비 추천"
        subtitle="3만원 이하 평점 우수 제품"
        products={budgetProducts}
        onMore={() => navigate('/search')}
      />

      <TargetedAd />

      {recentViews.length > 0 && (
        <section style={{ marginBottom: '38px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Clock3 size={20} /> 최근 본 제품</span>
            <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
              더보기 <ChevronRight size={16} />
            </button>
          </h2>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {recentViews.slice(0, 6).map(p => (
              <div key={p.id} onClick={() => navigate(`/product/${p.id}`)} style={{ flexShrink: 0, width: '124px', cursor: 'pointer' }}>
                <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '124px', height: '124px', borderRadius: '18px', objectFit: 'cover', marginBottom: '8px', boxShadow: 'var(--shadow-sm)' }} />
                <div className="line-clamp-2" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', lineHeight: 1.45 }}>{p.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '24px', marginBottom: '24px', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.01em', marginBottom: '2px' }}>
              카테고리별 탐색
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500, margin: 0 }}>
              원하는 상품군으로 이동해 보세요
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/search')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px',
            }}
          >
            전체 <ChevronRight size={14} />
          </button>
        </div>
        <div className="ui-category-grid">
          {HOME_CATEGORY_ITEMS.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
              }}
              aria-label={`${item.name} 카테고리로 이동`}
            >
              <div className="ui-category-card">
                <div className="ui-category-icon">{item.emoji}</div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-dark)', letterSpacing: '-0.005em' }}>{item.name}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-[16px] overflow-hidden" style={{ boxShadow: CARD_SM }}>
      <div className="aspect-square bg-[#EEF1F4] animate-pulse" />
      <div className="p-3 flex flex-col gap-2">
        <div className="h-2.5 w-1/3 bg-[#EEF1F4] rounded animate-pulse" />
        <div className="h-3 w-full bg-[#EEF1F4] rounded animate-pulse" />
        <div className="h-3.5 w-1/2 bg-[#EEF1F4] rounded animate-pulse" />
      </div>
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
