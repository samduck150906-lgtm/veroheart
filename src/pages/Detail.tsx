import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronUp,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Check,
  Flame,
  Globe,
  Dog,
  Cat,
  Calendar,
  Layers,
  Star,
  Trash2,
  MessageSquare,
  Share2,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import BottomSheet from '../components/BottomSheet';
import { TossCard } from '../components/TossUI';
import { getReviews, createReview, deleteReview } from '../lib/supabase';
import { notify } from '../store/useNotification';
import { buildProductConclusion } from '../utils/productConclusion';
import { getCompatibilityBreakdown } from '../utils/score';
import { resolveProductPurchase } from '../utils/productLinks';
import { analyzeFeed } from '../analysis/feedAnalysis';
import FeedAnalysisCard from '../components/FeedAnalysisCard';
import {
  ScoreGauge,
  GlanceGrid,
  FitForPetCard,
  IngredientCard,
  StickyCtaBar,
  StickyScoreBar,
  VerdictCard,
  PdpSkeleton,
  AltProductCarousel,
  NutritionCard,
  ReviewSummaryCard,
  EmptyState,
  OfflineBanner,
  type GlanceTileData,
  type AltCardData,
  type RadarAxis,
} from '../components/pdp/PdpParts';
import { REVIEW_QUICK_TAGS } from '../constants/reviewTags';

interface Ingredient { nameKo: string; nameEn?: string; purpose?: string; riskLevel?: string; isAllergy?: boolean; }
const COUPANG_PARTNERS_DISCLOSURE = '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.';

function getVerificationMeta(status?: 'pending' | 'verified' | 'needs_review') {
  if (status === 'verified') return { label: '검수 완료', bg: '#E7F8F0', color: '#15B36B' };
  if (status === 'needs_review') return { label: '검토 필요', bg: '#FDECEE', color: '#D92D20' };
  return { label: '검수 대기', bg: '#FEF6E0', color: '#B45309' };
}

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    profile,
    selectedProduct: product,
    isLoadingProducts,
    fetchProductDetail,
    comparisonList,
    addToComparison,
    removeFromComparison,
    addToCart,
    products,
    userId,
    trackRecentView,
    favorites,
    toggleFavorite,
  } = useStore();

  type ReviewRow = {
    id: string;
    user_id: string;
    rating: number;
    content: string;
    created_at: string;
    users?: { nickname?: string | null };
  };
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<(Ingredient & { description?: string }) | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
      trackRecentView(id);
      getReviews(id).then(setReviews);
    }
  }, [id, fetchProductDetail, trackRecentView]);

  // Sticky Score 노출 + 스크롤 진행률 (spec §21 P0)
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY || 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleReviewTag = (tag: string) => {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmitReview = async () => {
    if (!userId) { navigate('/login'); return; }
    const tagLine = reviewTags.length > 0 ? `# ${reviewTags.join(' · ')}` : '';
    const body = [tagLine, reviewContent.trim()].filter(Boolean).join('\n\n');
    if (!body) return;
    setIsSubmitting(true);
    const review = await createReview(userId, id!, reviewRating, body);
    if (review) {
      setReviewTags([]);
      setReviews(prev => [{ ...review, users: { nickname: profile?.name || '나' } }, ...prev]);
      setReviewContent('');
      setReviewRating(5);
    }
    setIsSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!userId) return;
    await deleteReview(reviewId, userId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async () => {
    if (!product) return;
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = [product.brand, product.name].filter(Boolean).join(' ');
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'VeRoRo', text: `${title} · 베로로 성분 분석`, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        notify.success('제품 링크를 복사했어요');
      }
    } catch {
      /* 사용자가 공유 시트를 닫은 경우 등은 조용히 무시 */
    }
  };

  if (isLoadingProducts) {
    return <div className="detail-page-root"><PdpSkeleton /></div>;
  }

  if (!product) return (
    <div className="detail-page-root" style={{ padding: '40px 0' }}>
      <OfflineBanner online={online} />
      <EmptyState
        emoji={online ? '🔍' : '📡'}
        title={online ? '제품을 찾을 수 없어요' : '오프라인 상태예요'}
        desc={online ? '주소가 변경되었거나 삭제된 제품일 수 있어요.' : '연결이 복구되면 다시 불러올게요.'}
        actionLabel="홈으로 이동"
        onAction={() => navigate('/')}
      />
    </div>
  );

  const report = product ? generateAnalysisReport(product, profile) : null;
  const conclusion = product && report ? buildProductConclusion(product, profile, report) : null;
  const isComparing = comparisonList.includes(product?.id || '');
  const isFav = favorites.includes(product?.id || '');
  const verificationMeta = getVerificationMeta(product.verificationStatus);

  // ── PDP 판단 스택 데이터 (점수 게이지 · 요약 · 우리 아이 적합도) ──
  const breakdown = getCompatibilityBreakdown(product, profile);
  const safetyScore = report ? report.score : breakdown.total;
  const petTypeLabel = product.targetPetType === 'cat' ? '고양이용' : product.targetPetType === 'all' ? '공용' : '강아지용';
  const glanceTiles: GlanceTileData[] = [
    breakdown.dangerCount > 0
      ? { icon: <AlertTriangle size={18} />, label: '안전도', value: `위험 ${breakdown.dangerCount}개`, tone: 'danger' }
      : breakdown.cautionCount > 0
        ? { icon: <AlertTriangle size={18} />, label: '안전도', value: `주의 ${breakdown.cautionCount}개`, tone: 'caution' }
        : { icon: <ShieldCheck size={18} />, label: '안전도', value: '위험 성분 없음', tone: 'excellent' },
    breakdown.allergyHits.length > 0
      ? { icon: <Ban size={18} />, label: '알레르기', value: `${breakdown.allergyHits.length}개 주의`, tone: 'danger' }
      : { icon: <Ban size={18} />, label: '알레르기', value: '해당 없음', tone: 'excellent' },
    { icon: <Dog size={18} />, label: '추천 대상', value: petTypeLabel, tone: 'neutral' },
    { icon: <Calendar size={18} />, label: '생애주기', value: (product.targetLifeStage && product.targetLifeStage[0]) || '전연령', tone: 'neutral' },
    { icon: <Flame size={18} />, label: '제형', value: product.formulation || '건식', tone: 'neutral' },
    { icon: <Globe size={18} />, label: '제조', value: product.manufacturerName || product.brand, tone: 'neutral' },
  ];
  const fitChips = [
    profile.name,
    profile.species === 'Cat' ? '고양이' : '강아지',
    `${profile.age}살`,
    ...(profile.healthConcerns || []).slice(0, 2),
  ].filter(Boolean) as string[];

  // Sticky Score 노출/진행률
  const showStickyScore = scrollY > 420;
  const scrollMax = typeof document !== 'undefined' ? Math.max(1, document.documentElement.scrollHeight - window.innerHeight) : 1;
  const scrollProgress = Math.min(100, (scrollY / scrollMax) * 100);

  // 종합 의견 3줄 (breakdown 기반, 신규 데이터 불필요)
  const safeCount = product.ingredients?.filter(i => i.riskLevel === 'safe').length ?? 0;
  const gradeLabel = safetyScore >= 85 ? '매우 안전' : safetyScore >= 75 ? '대체로 안전' : safetyScore >= 60 ? '확인 필요' : '주의';
  const verdictLines = [
    {
      icon: <ShieldCheck size={16} />,
      text: `안전성: ${breakdown.dangerCount === 0 ? '위험 성분 없음' : `위험 성분 ${breakdown.dangerCount}개`}${breakdown.cautionCount ? `, 주의 ${breakdown.cautionCount}개` : ''} — ${gradeLabel} 등급입니다.`,
    },
    {
      icon: <Flame size={16} />,
      text: `성분 구성: 안전 성분 ${safeCount}개${breakdown.allergyHits.length ? `, ${profile.name}의 회피 성분 ${breakdown.allergyHits.join('·')} 포함` : ', 등록된 알레르기 성분 없음'}.`,
    },
    {
      icon: <Check size={16} />,
      text: `결론: ${profile.name} 적합도 ${breakdown.total}% — ${breakdown.total >= 75 ? '추천합니다.' : breakdown.total >= 60 ? '급여 시 소량부터 확인하세요.' : '대체 상품을 함께 검토하세요.'}`,
    },
  ];

  // ── 대체 상품 4유형 (더 건강 / 더 저렴 / 같은 가격 최고 / 전문가 검수) ──
  const currentScore = report ? report.score : breakdown.total;
  const expectedPet = profile.species === 'Cat' ? 'cat' : 'dog';
  const altPool = products
    .filter(p => p.id !== product.id && p.category === product.category && (!p.targetPetType || p.targetPetType === expectedPet || p.targetPetType === 'all'))
    .map(p => ({ p, score: generateAnalysisReport(p, profile).score }));
  const altUsed = new Set<string>();
  const altCards: AltCardData[] = [];
  const pickAlt = (cands: { p: typeof product; score: number }[], tag: string, tagTone: AltCardData['tagTone']) => {
    const c = cands.find(x => !altUsed.has(x.p.id));
    if (!c) return;
    altUsed.add(c.p.id);
    altCards.push({
      id: c.p.id, brand: c.p.brand, name: c.p.name, imageUrl: c.p.imageUrl,
      score: c.score, deltaScore: Math.max(0, Math.round(c.score - currentScore)),
      price: c.p.price, deltaPrice: c.p.price - product.price, tag, tagTone,
    });
  };
  pickAlt(altPool.filter(x => x.score > currentScore).sort((a, b) => b.score - a.score), '더 건강해요', 'excellent');
  pickAlt(altPool.filter(x => x.p.price < product.price && x.score >= 60).sort((a, b) => a.p.price - b.p.price), '더 저렴해요', 'good');
  pickAlt(altPool.filter(x => Math.abs(x.p.price - product.price) <= product.price * 0.2).sort((a, b) => b.score - a.score), '같은 가격 최고', 'neutral');
  pickAlt(altPool.filter(x => x.p.verificationStatus === 'verified' && x.score >= 75).sort((a, b) => b.score - a.score), '전문가 검수 ✓', 'neutral');

  // 영양 레이더 축 (product.nutrition 있을 때만) — 매크로%를 0~100 스케일로 정규화
  const nz = (v: number | undefined, max: number) => Math.min(100, Math.round(((v ?? 0) / max) * 100));
  const nutritionRadar: RadarAxis[] = product.nutrition
    ? [
        { label: '단백질', value: nz(product.nutrition.protein, 40) },
        { label: '지방', value: nz(product.nutrition.fat, 25) },
        { label: '탄수화물', value: nz(product.nutrition.carb, 60) },
        { label: '식이섬유', value: nz(product.nutrition.fiber, 15) },
        { label: '수분', value: nz(product.nutrition.moisture, 12) },
        { label: '비타민', value: product.nutrition.vitaminScore ?? 0 },
        { label: '미네랄', value: product.nutrition.mineralScore ?? 0 },
      ]
    : [];

  // 사료성분 분석(규칙 기반) — 급여량은 제품 실제 열량 기반으로 계산
  const feed = analyzeFeed(product, profile);
  const feedingGrams = feed.feeding?.gramsPerDay ?? null;

  // Create Toss-style Headline Data
  const dangerIngs = product.ingredients?.filter(i => i.riskLevel === 'danger') || [];
  const cautionIngs = product.ingredients?.filter(i => i.riskLevel === 'caution') || [];
  const allergyIngs = product.ingredients?.filter(ing => profile.allergies.some(a => ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase())))) || [];
  const { headline, headlineColor } = (() => {
    if (allergyIngs.length > 0 || dangerIngs.length > 0) {
      const count = new Set([...allergyIngs, ...dangerIngs]).size;
      return { headline: `주의 성분이 ${count}개 발견됐어요`, headlineColor: '#F04452' };
    }
    if (cautionIngs.length > 0) {
      return { headline: `확인해야 할 성분이 ${cautionIngs.length}개 있어요`, headlineColor: '#F59E0B' };
    }
    return { headline: `${profile.name}가 안심하고 먹을 수 있어요!`, headlineColor: 'var(--text-dark)' };
  })();

  // ── 리뷰 요약(별점 분포·태그) — 실제 reviews 데이터에서 파생 ──
  const reviewRatings = reviews.map(r => r.rating);
  const reviewTagCounts = new Map<string, number>();
  for (const r of reviews) {
    const first = r.content.split('\n')[0];
    if (first.startsWith('#')) {
      for (const t of first.replace(/^#\s*/, '').split('·').map(s => s.trim()).filter(Boolean)) {
        reviewTagCounts.set(t, (reviewTagCounts.get(t) ?? 0) + 1);
      }
    }
  }
  const topReviewTags = [...reviewTagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, c]) => `${t} ${c}`);
  const avgRating = reviewRatings.length ? reviewRatings.reduce((s, r) => s + r, 0) / reviewRatings.length : 0;
  const reviewSummary = reviews.length
    ? `후기 ${reviews.length}개 요약 · 평균 ${avgRating.toFixed(1)}점${topReviewTags.length ? ` · 자주 언급: ${topReviewTags.slice(0, 3).map(t => t.replace(/\s\d+$/, '')).join(', ')}` : ''}`
    : undefined;

  // 구매 링크 결정(검증·안전) — 검증된 상품별 직행 링크만 "구매", 나머지는 검색/장바구니
  const purchase = resolveProductPurchase(product);

  return (
    <div className="animate-fade-in detail-page-root" style={{ paddingBottom: '96px' }}>
      <Helmet>
        <title>{product.name} - 베로로</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      <OfflineBanner online={online} />
      <StickyScoreBar score={safetyScore} name={product.name} visible={showStickyScore} progress={scrollProgress} />

      {conclusion && (
        <section
          aria-label="맞춤 결론"
          style={{
            marginBottom: '20px',
            padding: '22px 20px',
            borderRadius: '22px',
            background:
              conclusion.tone === 'alert'
                ? 'var(--pdp-danger-bg)'
                : conclusion.tone === 'match'
                  ? 'var(--pdp-safe-bg)'
                  : 'var(--pdp-caution-bg)',
            border:
              conclusion.tone === 'alert'
                ? '1px solid var(--pdp-danger-line)'
                : conclusion.tone === 'match'
                  ? '1px solid rgba(21, 179, 107, 0.3)'
                  : '1px solid var(--pdp-caution-line)',
            boxShadow: 'var(--pdp-e2)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 900,
              color: 'var(--pdp-ink)',
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
            }}
          >
            {conclusion.headline}
          </p>
          {conclusion.subline ? (
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--pdp-ink-muted)', lineHeight: 1.55 }}>
              {conclusion.subline}
            </p>
          ) : null}
        </section>
      )}

      <div className="detail-fab-stack" aria-label="빠른 이동 버튼">
        <button
          type="button"
          className="detail-back-fab"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={24} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="detail-scroll-top-fab"
          onClick={handleShare}
          aria-label="공유하기"
        >
          <Share2 size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="detail-scroll-top-fab"
          onClick={handleScrollTop}
          aria-label="맨 위로 이동"
        >
          <ChevronUp size={22} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.12)' }}>
        <img src={product.imageUrl} alt={product.name} fetchPriority="high" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* ── 3초 판단 스택: 점수 게이지 · 핵심 요약 · 우리 아이 적합도 ── */}
      <ScoreGauge score={safetyScore} oneLiner={report?.summary} />
      <GlanceGrid tiles={glanceTiles} />
      <FitForPetCard petName={profile.name} percent={breakdown.total} chips={fitChips} reasons={breakdown.reasons} />

      <TossCard style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-light)', fontWeight: 700 }}>{product.brand}</div>
        <h1 style={{ fontSize: '26px', lineHeight: 1.3, marginBottom: '14px', fontWeight: 900 }}>{product.name}</h1>
      
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
              padding: '7px 10px',
              borderRadius: '999px',
              background: verificationMeta.bg,
              color: verificationMeta.color,
            }}
          >
            <Shield size={14} />
            {verificationMeta.label}
          </div>
          {product.targetPetType && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              {product.targetPetType === 'dog' ? <Dog size={14} /> : (product.targetPetType === 'cat' ? <Cat size={14} /> : <Layers size={14} />)}
              {product.targetPetType === 'dog' ? '강아지용' : (product.targetPetType === 'cat' ? '고양이용' : '공용')}
            </div>
          )}
          {product.targetLifeStage && product.targetLifeStage.length > 0 && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              <Calendar size={14} />
              {product.targetLifeStage.join(', ')}
            </div>
          )}
          {product.formulation && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              <Layers size={14} />
              {product.formulation}
            </div>
          )}
        </div>
      </TossCard>

      {/* 일일 급여량 계산기 */}
      <section className="card" style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
          <Dog size={22} color="var(--safe)" /> {profile.name} 맞춤 일일 급여량
        </h2>
        {feedingGrams ? (
          <div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--safe)', marginBottom: '8px' }}>
              하루 약 {feedingGrams}g
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {profile.weightKg}kg · {profile.age <= 1 ? '성장기' : profile.age >= 8 ? '노령' : '성체 유지'} 기준 (RER×{profile.age <= 1 ? '2.5' : profile.age >= 8 ? '1.4' : '1.6'})<br/>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>
                *{feed.feeding?.measured ? `라벨 열량 ${feed.feeding.kcalPer100g}kcal/100g` : `추정 열량 ${feed.feeding?.kcalPer100g ?? 380}kcal/100g`} 기준 · 하루 필요 열량 약 {feed.feeding?.derKcal ?? 0}kcal
              </span>
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              몸무게를 입력하시면 정확한 권장 급여량을 알려드려요!
            </p>
            <button 
              className="btn btn-outline" 
              style={{ borderRadius: 'var(--border-radius-sm)', width: '100%' }}
              onClick={() => navigate('/profile')}
            >
              몸무게 입력하러 가기
            </button>
          </div>
        )}
      </section>

      {/* Toss-style Ingredient Analysis */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900, color: headlineColor, lineHeight: 1.4, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          {headline}
        </h2>
        
        {/* 사료성분 분석 (규칙 기반 · 보장성분 + 원재료 실제 데이터) */}
        <FeedAnalysisCard product={product} profile={profile} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>전성분 상세</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>총 {product.ingredients?.length}개</div>
        </div>

        <div>
          {(product.ingredients ?? [])
            .map(ing => {
              const isAllergy = profile.allergies.some(a =>
                ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
              );
              // 위험/알레르기 → 주의 → 안전 순으로 정렬(판단이 먼저 보이도록)
              const rank = isAllergy || ing.riskLevel === 'danger' ? 0 : ing.riskLevel === 'caution' ? 1 : 2;
              return { ing, isAllergy, rank };
            })
            .sort((a, b) => a.rank - b.rank)
            .map(({ ing, isAllergy }) => (
              <IngredientCard
                key={ing.id}
                ing={{ ...ing, isAllergy }}
                onOpen={() => setSelectedIngredient({ ...ing, isAllergy })}
              />
            ))}
        </div>
      </section>

      {product.nutrition && <NutritionCard data={product.nutrition} radar={nutritionRadar} />}

      <VerdictCard lines={verdictLines} />

      <AltProductCarousel items={altCards} onOpen={(pid) => navigate(`/product/${pid}`)} />

      {/* Bottom Sheet for Ingredient Details */}
      <BottomSheet
        isOpen={!!selectedIngredient} 
        onClose={() => setSelectedIngredient(null)}
        title={selectedIngredient?.nameKo || ''}
      >
        {selectedIngredient && (
          <div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 500 }}>
              {selectedIngredient.nameEn} · {selectedIngredient.purpose}
            </div>
            
            {selectedIngredient.isAllergy ? (
              <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '16px', color: '#F04452', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                {profile.name}의 알레르기 유발 성분입니다. 절대 급여하지 마세요!
              </div>
            ) : selectedIngredient.riskLevel === 'danger' ? (
              <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '16px', color: '#F04452', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                지속적인 급여 시 간이나 신장에 무리를 줄 수 있는 성분입니다.
              </div>
            ) : selectedIngredient.riskLevel === 'caution' ? (
              <div style={{ backgroundColor: '#FEF3C7', padding: '20px', borderRadius: '16px', color: '#D97706', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                특정 질환이 있는 아이에게는 조심해서 급여해야 하는 성분입니다.
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--secondary)', padding: '20px', borderRadius: '16px', color: 'var(--text-dark)', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                안심하고 먹일 수 있는 좋은 원료입니다.
              </div>
            )}
            
            {selectedIngredient.description && (
              <p style={{ marginTop: '24px', fontSize: '15px', color: 'var(--text-dark)', lineHeight: 1.6, fontWeight: 500 }}>
                {selectedIngredient.description}
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* 브랜드 바로가기 */}
      <div style={{ marginBottom: '32px' }}>
        <Link to={`/brand/${encodeURIComponent(product.brand)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface-alt)', borderRadius: '16px', textDecoration: 'none', color: 'var(--text-dark)', border: '1px solid var(--surface-alt)' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>브랜드</div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>{product.brand}의 다른 제품 보기</div>
          </div>
          <ArrowLeft size={18} style={{ transform: 'rotate(180deg)', color: 'var(--text-muted)' }} />
        </Link>
      </div>

      {/* 리뷰 섹션 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
          <MessageSquare size={20} /> 후기 <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{reviews.length}</span>
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
          키워드만 골라도 돼요. {profile.name}와 비슷한 아이 집사의 글을 모아보려면 태그를 활용해 보세요.
        </p>

        <ReviewSummaryCard ratings={reviewRatings} topTags={topReviewTags} summary={reviewSummary} />

        {/* 리뷰 작성 */}
        <div style={{ background: 'var(--surface-alt)', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px solid var(--surface-alt)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {REVIEW_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleReviewTag(tag)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: reviewTags.includes(tag) ? 'none' : '1px solid var(--line)',
                  background: reviewTags.includes(tag) ? 'var(--text-dark)' : 'var(--surface-elevated)',
                  color: reviewTags.includes(tag) ? 'var(--bg-color)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                <Star size={24} fill={star <= reviewRating ? '#FCD34D' : 'none'} color={star <= reviewRating ? '#FCD34D' : 'var(--line)'} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewContent}
            onChange={e => setReviewContent(e.target.value)}
            placeholder={userId ? '한 줄 덧붙이기 (선택)' : '로그인 후 작성'}
            disabled={!userId}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)', fontSize: '14px', outline: 'none', resize: 'none', height: '80px', boxSizing: 'border-box', color: 'var(--text-dark)', background: userId ? 'var(--surface-elevated)' : 'var(--surface-alt)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            {userId ? (
              <button onClick={handleSubmitReview} disabled={isSubmitting || !reviewContent.trim()} style={{ padding: '12px 24px', background: 'var(--text-dark)', color: 'var(--bg-color)', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: isSubmitting || !reviewContent.trim() ? 0.5 : 1 }}>
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
            ) : (
              <Link to="/login" style={{ padding: '12px 24px', background: 'var(--text-dark)', color: 'var(--bg-color)', borderRadius: '12px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                로그인하고 리뷰 쓰기
              </Link>
            )}
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', background: 'var(--surface-alt)', borderRadius: '16px' }}>
              아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
            </div>
          ) : reviews.map(review => (
            <div key={review.id} style={{ padding: '16px 20px', background: 'var(--surface-elevated)', border: '1px solid var(--line)', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : 'var(--line)'} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {review.users?.nickname || '익명'} · {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
                {review.user_id === userId && (
                  <button onClick={() => handleDeleteReview(review.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--line)' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{review.content}</p>
            </div>
          ))}
        </div>
      </section>

      <p
        style={{
          margin: '32px 0 0',
          padding: '14px 16px',
          fontSize: '11px',
          lineHeight: 1.55,
          fontWeight: 600,
          color: 'var(--text-muted)',
          textAlign: 'center',
          background: 'var(--surface-alt)',
          borderRadius: '14px',
        }}
      >
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>

      <StickyCtaBar
        price={product.price}
        isFav={isFav}
        isComparing={isComparing}
        onFav={() => toggleFavorite(product.id)}
        onCompare={() => { if (isComparing) { removeFromComparison(product.id); } else { addToComparison(product.id); } }}
        buyHref={purchase.isDirect ? purchase.url : null}
        buyLabel={purchase.ctaLabel}
        onBuy={() => { addToCart(product.id, 1); navigate('/cart'); }}
      />
    </div>
  );
}
