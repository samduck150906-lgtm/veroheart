// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronUp,
  GitCompare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Dog,
  Cat,
  Calendar,
  Layers,
  ExternalLink,
  Shield,
  MessageSquare,
  Star,
  Trash2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  getReviews, 
  createReview, 
  deleteReview,
} from '../lib/supabase';
import { buildProductConclusion } from '../utils/productConclusion';
import { getRecommendationBreakdown } from '../utils/score';
import { COUPANG_PARTNERS_DISCLOSURE } from '../constants/coupangPartners';
import { REVIEW_QUICK_TAGS } from '../constants/reviewTags';
import { runScoringPipeline } from '../analysis/scoringPipeline';
import { PURPOSE_STYLE } from '../analysis/nutrientClassification';

const getVerificationMeta = (s: string) => {
  if (s === 'verified') return { bg: 'var(--brand-tint)', color: 'var(--brand-deep)', border: 'var(--brand-line)', label: '공식 인증' };
  if (s === 'needs_review') return { bg: 'var(--chip-bg)', color: 'var(--ink-soft)', border: 'var(--hairline)', label: '재검토 중' };
  return { bg: 'var(--chip-bg)', color: 'var(--ink-soft)', border: 'var(--hairline)', label: '검수 대기' };
};

interface Ingredient { id: string; riskLevel: string; nameKo: string; nameEn?: string; purpose?: string; description?: string; }
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import { toDryMatter, calculateCalories } from '../analysis/nutrition';
import { openCoupangForProduct } from '../utils/externalPurchase';
import Analyzer from '../components/Analyzer';
import BottomSheet from '../components/BottomSheet';
import { TossCard } from '../components/TossUI';
import ProductImage from '../components/ProductImage';
import BreedNutritionPanel from '../components/BreedNutritionPanel';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    userId,
    isLoggedIn,
    profile, 
    selectedProduct: product, 
    isLoadingProducts, 
    fetchProductDetail, 
    comparisonList, 
    addToComparison, 
    removeFromComparison, 
    addToCart,
    products,
    favorites,
    trackRecentView,
  } = useStore();

  const hasPetProfile = isLoggedIn && profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';

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
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const isFav = favorites.includes(id || '');

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
      trackRecentView(id);
      getReviews(id).then(setReviews);
    }
  }, [id, fetchProductDetail, trackRecentView]);

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
      setReviews(prev => [{ ...review, users: { nickname: '나' } }, ...prev]);
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

  if (isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Helmet><title>제품 정보를 불러오는 중 | 베로로</title></Helmet>
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">제품 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!product) return (
    <div className="text-center p-12">
      <Helmet><title>제품을 찾을 수 없어요 | 베로로</title></Helmet>
      <p className="text-gray-500">제품을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">홈으로 이동</button>
    </div>
  );

  const report = product ? generateAnalysisReport(product, profile) : null;
  const conclusion = product && report ? buildProductConclusion(product, profile, report) : null;
  const breakdown = hasPetProfile && product ? getRecommendationBreakdown(product, profile) : null;
  const pipeline = product ? runScoringPipeline(product, profile?.breed || '') : null;
  const isComparing = comparisonList.includes(product?.id || '');
  const verificationMeta = getVerificationMeta(product.verificationStatus);

  // find alternative
  let alternativeProduct = null;
  if (report && report.score < 80) {
    const scoredProducts = products
      .filter(p => p.id !== product?.id && p.category === product?.category)
      .map(p => ({ p, score: generateAnalysisReport(p, profile).score }))
      .sort((a, b) => b.score - a.score);
    
    if (scoredProducts.length > 0 && scoredProducts[0].score >= 80) {
      alternativeProduct = scoredProducts[0];
    }
  }

  // DER Calculation
  const getFeedingAmount = () => {
    if (!profile.weight) return null;
    const rer = 70 * Math.pow(profile.weight, 0.75);
    const der = rer * 1.6; // 일반 성견·성묘 평균 활동계수
    const kcalPerKg = 3500; // 건식 사료 평균 대사에너지(ME) 밀도 추정치 (kcal/kg)
    const grams = (der / kcalPerKg) * 1000;
    return Math.round(grams);
  };
  const feedingGrams = getFeedingAmount();

  const getRiskColor = (level: string) => {
    if (level === 'danger') return '#F04452'; // Toss Red
    if (level === 'caution') return '#F59E0B'; // Yellow
    return '#3182F6'; // Toss Blue for safe
  };

  // selectedIngredient state moved to top with other hooks
  
  // Create Toss-style Headline Data
  let headline = `${profile.name}가 안심하고 먹을 수 있어요!`;
  let headlineColor = '#191F28';
  let dangerIngs = product.ingredients?.filter(i => i.riskLevel === 'danger') || [];
  let cautionIngs = product.ingredients?.filter(i => i.riskLevel === 'caution') || [];
  let allergyIngs = product.ingredients?.filter(ing => profile.allergies.some(a => ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase())))) || [];
  
  if (allergyIngs.length > 0 || dangerIngs.length > 0) {
    const count = new Set([...allergyIngs, ...dangerIngs]).size;
    headline = `주의 성분이 ${count}개 발견됐어요`;
    headlineColor = '#F04452'; // Toss Red
  } else if (cautionIngs.length > 0) {
    headline = `확인해야 할 성분이 ${cautionIngs.length}개 있어요`;
    headlineColor = '#F59E0B';
  }

  return (
    <div className="animate-stack-push detail-page-root" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로로</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      {hasPetProfile && conclusion && (
        <section
          aria-label="맞춤 결론"
          style={{
            marginTop: '16px',
            marginBottom: '20px',
            padding: '22px 20px',
            borderRadius: '22px',
            background:
              conclusion.tone === 'alert'
                ? 'linear-gradient(145deg, #FEF2F2 0%, #FFF 100%)'
                : conclusion.tone === 'match'
                  ? 'linear-gradient(145deg, #ECFDF5 0%, #FFF 100%)'
                  : 'linear-gradient(145deg, #FFFBEB 0%, #FFF 100%)',
            border:
              conclusion.tone === 'alert'
                ? '1px solid #FECACA'
                : conclusion.tone === 'match'
                  ? '1px solid #BBF7D0'
                  : '1px solid #FDE68A',
            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 900,
              color: '#0F172A',
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
            }}
          >
            {conclusion.headline}
          </p>
          {conclusion.subline ? (
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#475569', lineHeight: 1.55 }}>
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
          onClick={handleScrollTop}
          aria-label="맨 위로 이동"
        >
          <ChevronUp size={22} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.12)' }}>
        <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

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
              border: `1px solid ${verificationMeta.border}`,
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

      {hasPetProfile && product && (
        <BreedNutritionPanel product={product} profile={profile} />
      )}

      <button
        onClick={() => navigate('/analysis', { state: { product } })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '20px',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.22)',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.32)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.22)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.18)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={20} color="#FFD700" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>AI 프리미엄 영양 리포트 보기</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>DMB 건물기준 변환 · 급여량 계산기 · 유해성분 탐지</div>
          </div>
        </div>
        <ChevronRight size={20} color="#ffffff" />
      </button>

      {/* ── 두 축 분리 분석 시작 ─────────────────────────────────── */}

      {pipeline && pipeline.top3.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          {/* 원료 출처 카드 (원료 축) */}
          <div style={{ padding: '20px', borderRadius: '20px', background: '#fff', border: '1px solid #EEF0F3', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>단백질 출처</h3>
              <Link
                to="/knowledge/ingredients"
                style={{ fontSize: '12px', fontWeight: 700, color: '#3182F6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                기준 문서 <ChevronRight size={12} />
              </Link>
            </div>

            {pipeline.top3.map((item, idx) => (
              <div key={item.name} style={{ marginBottom: idx < pipeline.top3.length - 1 ? '14px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#94A3B8', minWidth: '16px' }}>{idx + 1}</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: item.qualityResult.color, flexShrink: 0, marginLeft: '8px' }}>
                    {item.qualityResult.label}
                  </span>
                </div>
                <div style={{ height: '7px', borderRadius: '99px', background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${item.barWidth}%`, height: '100%', background: item.qualityResult.color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            ))}

            {(pipeline.hasProteinInflation || pipeline.hasDCMRisk) && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pipeline.hasProteinInflation && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <AlertCircle size={14} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '12.5px', color: '#92400E', fontWeight: 700, lineHeight: 1.5 }}>
                      단백질 인플레이션 감지 — {pipeline.inflationDetails.join(', ')}
                    </span>
                  </div>
                )}
                {pipeline.hasDCMRisk && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', borderRadius: '12px', background: '#FFF1F2', border: '1px solid #FECDD3' }}>
                    <AlertCircle size={14} color="#F04452" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '12.5px', color: '#BE123C', fontWeight: 700, lineHeight: 1.5 }}>
                      DCM 위험 패턴 — 상위 5위 내 두류 {pipeline.dcmLegumes.length}종: {pipeline.dcmLegumes.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 강점 배지 */}
          {pipeline.strengths.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {pipeline.strengths.map(badge => (
                <span
                  key={badge}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '99px',
                    background: '#ECFDF5',
                    border: '1px solid #86EFAC',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#166534',
                  }}
                >
                  ✓ {badge}
                </span>
              ))}
            </div>
          )}

          {/* 종합 성분 평가 카드 4개 */}
          <div style={{ padding: '20px', borderRadius: '20px', background: '#fff', border: '1px solid #EEF0F3', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>종합 성분 평가</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {/* 성분표 분석점수 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>성분표 분석점수</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{pipeline.ingredientScoreDisplay}</div>
              </div>
              {/* 원료 등급 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>원료 등급</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{pipeline.rawMaterialGrade}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#94A3B8' }}>{pipeline.rawMaterialCriteriaScore}/6</span>
                </div>
              </div>
              {/* 영양 공개 수준 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>영양 공개 수준</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: pipeline.nutritionDisclosureLevel === '완전 공개' ? '#15B36B' : pipeline.nutritionDisclosureLevel === '부분 공개' ? '#F59E0B' : '#F04452' }}>
                  {pipeline.nutritionDisclosureLevel}
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>({pipeline.nutritionDisclosureCount}/7 항목)</div>
              </div>
              {/* 안전성 검증 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>안전성 검증</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {pipeline.safetyFailures === 0
                    ? <CheckCircle2 size={16} color="#15B36B" />
                    : <AlertCircle size={16} color="#F04452" />}
                  <span style={{ fontSize: '14px', fontWeight: 800, color: pipeline.safetyFailures === 0 ? '#15B36B' : '#F04452' }}>
                    {pipeline.safetyDisplay}
                  </span>
                </div>
              </div>
            </div>
            {/* ETF 신뢰도 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '12px',
              background: pipeline.etfGrade === 'C1' ? '#ECFDF5' : pipeline.etfGrade === 'C2' ? '#EFF6FF' : pipeline.etfGrade === 'C3' ? '#FFFBEB' : '#FFF1F2',
              border: `1px solid ${pipeline.etfGrade === 'C1' ? '#86EFAC' : pipeline.etfGrade === 'C2' ? '#BFDBFE' : pipeline.etfGrade === 'C3' ? '#FDE68A' : '#FECDD3'}`,
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', marginBottom: '2px' }}>공개 정보 신뢰도 ETF</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{pipeline.etfDescription}</div>
              </div>
              <span style={{
                fontSize: '18px',
                fontWeight: 900,
                color: pipeline.etfGrade === 'C1' ? '#15B36B' : pipeline.etfGrade === 'C2' ? '#3182F6' : pipeline.etfGrade === 'C3' ? '#F59E0B' : '#F04452',
              }}>
                {pipeline.etfDisplay}
              </span>
            </div>
          </div>

          {/* 포함된 기능성 성분 카드 (영양소 축) */}
          <div style={{ padding: '20px', borderRadius: '20px', background: '#fff', border: '1px solid #EEF0F3', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>포함된 기능성 성분</h3>
              <Link
                to="/knowledge/nutrients"
                style={{ fontSize: '12px', fontWeight: 700, color: '#3182F6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}
              >
                기준 문서 <ChevronRight size={12} />
              </Link>
            </div>

            {pipeline.functionalIngredients.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pipeline.functionalIngredients.map(fi => (
                  <div key={fi.name} style={{ padding: '12px 14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{fi.name}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                      {fi.purposes.map(purpose => {
                        const ps = PURPOSE_STYLE[purpose] ?? { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB', emoji: '•' };
                        return (
                          <span
                            key={purpose}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '99px',
                              background: ps.bg,
                              border: `1px solid ${ps.border}`,
                              fontSize: '12px',
                              fontWeight: 700,
                              color: ps.text,
                            }}
                          >
                            {ps.emoji} {purpose}
                          </span>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>{fi.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '14px', color: '#94A3B8', fontWeight: 600, textAlign: 'center', padding: '20px 0', margin: 0 }}>
                기능성 성분이 확인되지 않았어요.
              </p>
            )}
          </div>
        </section>
      )}

          {/* ── 견종별 건강 관리 ─────────────────────────────── */}
          {pipeline?.breedDisease && pipeline.breedDisease.activeDiseases.length > 0 && (
            <div style={{ padding: '20px', borderRadius: '20px', background: '#fff', border: '1px solid #EEF0F3', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>견종별 건강 관리</h3>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#3182F6', background: '#EFF6FF', padding: '3px 8px', borderRadius: '99px' }}>
                  {pipeline.breedDisease.breedMatched ?? profile?.breed}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginBottom: '14px', lineHeight: 1.5 }}>
                이 견종의 취약 질환 기준으로 현재 사료를 평가했어요.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pipeline.breedDisease.activeDiseases.map(ad => {
                  const hasQuantitative = ad.disease.hasQuantitativeRules && ad.ruleChecks.length > 0;
                  const allPass = ad.failCount === 0 && ad.passCount > 0;
                  const anyFail = ad.failCount > 0;
                  const isClinicalFirst = ad.disease.id === 'cancer';

                  const headerBg = isClinicalFirst ? '#FFF1F2'
                    : anyFail ? '#FFFBEB'
                    : allPass ? '#ECFDF5'
                    : '#F8FAFC';
                  const headerBorder = isClinicalFirst ? '#FECDD3'
                    : anyFail ? '#FDE68A'
                    : allPass ? '#86EFAC'
                    : '#E2E8F0';
                  const headerAccent = isClinicalFirst ? '#BE123C'
                    : anyFail ? '#92400E'
                    : allPass ? '#166534'
                    : '#475569';

                  return (
                    <div key={ad.disease.id} style={{ borderRadius: '14px', background: headerBg, border: `1.5px solid ${headerBorder}`, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{ad.disease.emoji}</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: headerAccent }}>{ad.disease.name}</span>
                        </div>
                        {hasQuantitative && (
                          <span style={{ fontSize: '12px', fontWeight: 800, color: headerAccent }}>
                            {ad.passCount}/{ad.ruleChecks.length} 충족
                          </span>
                        )}
                        {!hasQuantitative && !isClinicalFirst && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8' }}>보조 성분 점검</span>
                        )}
                      </div>

                      {isClinicalFirst && ad.disease.clinicalNote && (
                        <div style={{ padding: '8px 14px 12px', fontSize: '12px', color: '#9F1239', fontWeight: 600, lineHeight: 1.55 }}>
                          ⚠️ {ad.disease.clinicalNote}
                        </div>
                      )}

                      {!isClinicalFirst && hasQuantitative && (
                        <div style={{ borderTop: `1px solid ${headerBorder}`, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {ad.ruleChecks.map((rc, idx) => {
                            const statusColor = rc.status === 'pass' ? '#15B36B' : rc.status === 'fail' ? '#F04452' : '#94A3B8';
                            const statusBg = rc.status === 'pass' ? '#ECFDF5' : rc.status === 'fail' ? '#FFF1F2' : '#F8FAFC';
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: statusColor, background: statusBg, padding: '2px 7px', borderRadius: '6px', flexShrink: 0, marginTop: '1px' }}>
                                  {rc.status === 'pass' ? '충족' : rc.status === 'fail' ? '미달' : '미확인'}
                                </span>
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{rc.rule.displayName}</span>
                                  <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>
                                    {rc.rule.evidenceLevel === 'high' ? '근거 높음' : '근거 중간'}
                                  </span>
                                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>{rc.message}</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isClinicalFirst && ad.supplementGaps.length > 0 && (
                        <div style={{ borderTop: `1px solid ${headerBorder}`, padding: '8px 14px 12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>보조 성분 미확인</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                            {ad.supplementGaps.map(s => (
                              <span key={s} style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 8px', borderRadius: '6px' }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isClinicalFirst && ad.disease.clinicalNote && (
                        <div style={{ borderTop: `1px solid ${headerBorder}`, padding: '8px 14px', fontSize: '11px', color: '#64748B', fontWeight: 600, lineHeight: 1.5 }}>
                          ℹ️ {ad.disease.clinicalNote}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

      {/* ── 두 축 분리 분석 끝 ─────────────────────────────────── */}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
        <button className="btn btn-outline" style={{ flex: 1, height: '56px', borderRadius: 'var(--border-radius-md)' }} onClick={() => {
          isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
        }}>
          <GitCompare size={20} />
          <span style={{ marginLeft: '4px' }}>비교</span>
        </button>

        <button
          className="btn btn-primary"
          style={{ flex: 2, borderRadius: 'var(--border-radius-md)', fontWeight: 800, fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => {
            openCoupangForProduct(product);
          }}
        >
          🚀 쿠팡 최저가 구매 <ExternalLink size={18} />
        </button>
      </div>

      <p style={{ margin: '0 0 24px', padding: '10px 14px', fontSize: '11px', lineHeight: 1.55, fontWeight: 600, color: '#64748B', background: '#F1F5F9', borderRadius: '12px' }}>
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>

      {hasPetProfile && alternativeProduct && (
        <div className="card" style={{ backgroundColor: 'var(--bg-color)', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 800, marginBottom: '8px' }}>
            <AlertCircle size={20} /> 앗! 이 사료는 아이와 맞지 않을 수 있어요.
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-dark)', marginBottom: '16px', lineHeight: 1.5 }}>
            대신 <b>{profile.name}</b>와(과) 궁합이 <b style={{ color: 'var(--safe)' }}>{alternativeProduct.score}점</b>인 이 사료는 어떠세요?
          </p>
          <button 
            className="btn btn-outline"
            style={{ width: '100%', borderRadius: 'var(--border-radius-sm)', fontWeight: 700 }}
            onClick={() => navigate(`/product/${alternativeProduct?.p.id}`)}
          >
            {alternativeProduct.p.brand} {alternativeProduct.p.name} 보러가기
          </button>
        </div>
      )}

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
              {profile.weight}kg 기준 (평균 활동량 적용)<br/>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>*평균 칼로리(3500kcal/kg) 기준 추정치입니다.</span>
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
        
        {/* Nutrition Summary */}
        <div style={{ backgroundColor: 'var(--secondary)', padding: '20px', borderRadius: 'var(--border-radius-lg)', marginBottom: '32px' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: 1.6 }}>
            {profile.healthConcerns.includes('비만') 
              ? "다이어트가 필요한 아이에겐 지방 수치가 다소 높으니 급여량을 10% 줄여주세요." 
              : "조단백질이 풍부하여 근육 형성과 에너지 보충에 아주 좋습니다."}
          </p>
        </div>

        <GuaranteedAnalysisSection ga={product.guaranteedAnalysis} />

        {breakdown?.capped && (
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'flex-start',
            padding: '16px', borderRadius: '16px', marginBottom: '20px',
            background: breakdown.allergyHits.length > 0 ? '#FFF1F2' : '#FFFBEB',
            border: `1px solid ${breakdown.allergyHits.length > 0 ? '#FECDD3' : '#FDE68A'}`,
          }}>
            <AlertCircle size={20} color={breakdown.allergyHits.length > 0 ? '#F43F5E' : '#D97706'} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: breakdown.allergyHits.length > 0 ? '#BE123C' : '#92400E', marginBottom: '4px' }}>
                {breakdown.allergyHits.length > 0
                  ? `${breakdown.allergyHits.join(', ')}이(가) 들어 있어요`
                  : `주의 성분 ${breakdown.dangerCount}개가 포함돼 있어요`}
              </div>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: breakdown.allergyHits.length > 0 ? '#BE123C' : '#92400E', opacity: 0.85, lineHeight: 1.5 }}>
                {breakdown.allergyHits.length > 0
                  ? `${profile.name}는 ${breakdown.allergyHits.join(', ')}을(를) 피하는 게 좋아요. 궁합 점수도 이를 반영했어요.`
                  : `이 성분은 장기 급여 시 주의가 필요해요. 수의사와 상담해 보세요.`}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>수집된 전체 원료표</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>총 {product.ingredients?.length}개</div>
        </div>

        {/* 신호 범례 */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {[
            { dot: '#15B36B', label: '주요 가점' },
            { dot: '#F59E0B', label: '보조 가점' },
            { dot: '#3182F6', label: '대체 단백질' },
            { dot: '#94A3B8', label: '중립' },
            { dot: '#F97316', label: '주의' },
            { dot: '#F04452', label: '강한 주의' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
              {s.label}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
          {product.ingredients?.map((ing, idx) => {
            const isAllergy = profile.allergies.some(a =>
              ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
            );

            // Use 6-level signal from pipeline if available, fallback to 3-level
            const pipelineSignal = pipeline?.allSignals?.find(s => s.name === ing.nameKo);
            let dotColor: string;
            let badgeBg: string;
            let badgeColor: string;
            let badgeLabel: string;

            if (isAllergy) {
              dotColor = '#F04452';
              badgeBg = '#FFF1F2';
              badgeColor = '#BE123C';
              badgeLabel = '알레르기';
            } else if (pipelineSignal) {
              dotColor = pipelineSignal.signal.dotColor;
              badgeBg = pipelineSignal.signal.labelBg;
              badgeColor = pipelineSignal.signal.labelColor;
              badgeLabel = pipelineSignal.signal.label;
            } else {
              const isDanger = ing.riskLevel === 'danger';
              const isCaution = ing.riskLevel === 'caution';
              dotColor = isDanger ? '#F04452' : isCaution ? '#F59E0B' : '#94A3B8';
              badgeBg = isDanger ? '#FFF1F2' : isCaution ? '#FFFBEB' : '#F8FAFC';
              badgeColor = isDanger ? '#BE123C' : isCaution ? '#92400E' : '#475569';
              badgeLabel = isDanger ? '강한 주의' : isCaution ? '주의' : '중립';
            }

            return (
              <button
                key={ing.id}
                onClick={() => setSelectedIngredient({ ...ing, isAllergy })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '13px 16px',
                  background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.012)',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  borderBottom: idx < (product.ingredients?.length ?? 1) - 1 ? '1px solid var(--hairline)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontWeight: isAllergy || ing.riskLevel === 'danger' ? 700 : 500,
                      fontSize: '14.5px',
                      color: isAllergy || ing.riskLevel === 'danger' ? '#BE123C' : 'var(--text-dark)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ing.nameKo}
                    </div>
                    {pipelineSignal?.qualityResult?.typeLabel && !isAllergy && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                        {pipelineSignal.qualityResult.typeLabel}
                        {ing.purpose ? ` · ${ing.purpose}` : ''}
                      </div>
                    )}
                    {!pipelineSignal && ing.purpose && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 500 }}>{ing.purpose}</div>
                    )}
                  </div>
                </div>
                <span style={{ flexShrink: 0, marginLeft: '8px', padding: '3px 10px', borderRadius: '99px', background: badgeBg, color: badgeColor, fontSize: '11.5px', fontWeight: 700 }}>
                  {badgeLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

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
        <button
          type="button"
          onClick={() => navigate(`/search?query=${encodeURIComponent(product.brand)}`)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '16px 20px', background: '#F9FAFB', borderRadius: '16px', textDecoration: 'none', color: '#111827', border: '1px solid #F3F4F6', cursor: 'pointer' }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>브랜드</div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>{product.brand}의 다른 제품 보기</div>
          </div>
          <ArrowLeft size={18} style={{ transform: 'rotate(180deg)', color: '#9CA3AF' }} />
        </button>
      </div>

      {/* 리뷰 섹션 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
          <MessageSquare size={20} /> 후기 <span style={{ color: '#94A3B8', fontWeight: 700 }}>{reviews.length}</span>
        </h2>
        <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', fontWeight: 600 }}>
          키워드만 골라도 돼요. {profile.name}와 비슷한 아이 집사의 글을 모아보려면 태그를 활용해 보세요.
        </p>

        {/* 리뷰 작성 */}
        <div style={{ background: '#F9FAFB', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px solid #F3F4F6' }}>
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
                  border: reviewTags.includes(tag) ? 'none' : '1px solid #E5E7EB',
                  background: reviewTags.includes(tag) ? '#111827' : '#fff',
                  color: reviewTags.includes(tag) ? '#fff' : '#374151',
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
                <Star size={24} fill={star <= reviewRating ? '#FCD34D' : 'none'} color={star <= reviewRating ? '#FCD34D' : '#D1D5DB'} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewContent}
            onChange={e => setReviewContent(e.target.value)}
            placeholder={userId ? '한 줄 덧붙이기 (선택)' : '로그인 후 작성'}
            disabled={!userId}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', resize: 'none', height: '80px', boxSizing: 'border-box', background: userId ? '#fff' : '#F3F4F6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            {userId ? (
              <button onClick={handleSubmitReview} disabled={isSubmitting || !reviewContent.trim()} style={{ padding: '12px 24px', background: '#111827', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: isSubmitting || !reviewContent.trim() ? 0.5 : 1 }}>
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
            ) : (
              <Link to="/login" style={{ padding: '12px 24px', background: '#111827', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                로그인하고 리뷰 쓰기
              </Link>
            )}
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '16px' }}>
              아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
            </div>
          ) : reviews.map(review => {
            const tagMatch = review.content.match(/^#\s*(.+?)(\n\n|\n|$)/);
            const tags = tagMatch ? tagMatch[1].split(' · ').map(t => t.trim()).filter(Boolean) : [];
            const text = tagMatch ? review.content.slice(tagMatch[0].length).trim() : review.content;
            return (
              <div key={review.id} style={{ padding: '16px 20px', background: '#fff', border: '1px solid #F3F4F6', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : '#E5E7EB'} />
                      ))}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      {review.users?.nickname || '익명'} · {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  {review.user_id === userId && (
                    <button onClick={() => handleDeleteReview(review.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {text ? <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 10px' }}>{text}</p> : null}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {tags.map(tag => (
                      <span key={tag} style={{ padding: '4px 10px', background: '#F3F4F6', borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p
        style={{
          margin: '32px 0 0',
          padding: '14px 16px',
          fontSize: '11px',
          lineHeight: 1.55,
          fontWeight: 600,
          color: '#64748B',
          textAlign: 'center',
          background: '#F1F5F9',
          borderRadius: '14px',
        }}
      >
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>

      <Analyzer />
    </div>
  );
}

function VetBadge({ riskLevel }: { riskLevel: string }) {
  if (riskLevel === 'safe') return null;
  const isDanger = riskLevel === 'danger';
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: isDanger ? '#FEF2F2' : '#FFFBEB', color: isDanger ? '#991B1B' : '#92400E', border: `1px solid ${isDanger ? '#FECACA' : '#FDE68A'}` }}>
      {isDanger ? '⚠️ 수의사 주의' : '👁 확인 권장'}
    </div>
  );
}

function getVetComment(ingredients: Ingredient[]): string {
  const dangerCount = ingredients.filter(i => i.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter(i => i.riskLevel === 'caution').length;
  if (dangerCount > 0) {
    return `이 제품에는 ${dangerCount}개의 주의 성분이 포함되어 있습니다. 특히 BHA, BHT, 에톡시퀸 등 합성 보존료나 인공색소는 장기 섭취 시 간 부담을 줄 수 있으며, 알레르기 반응이 있는 반려동물에게는 주의가 필요합니다. 급여 전 수의사와 상담하세요.`;
  }
  if (cautionCount > 0) {
    return `전반적으로 안전한 성분 구성이나 ${cautionCount}개 성분은 개체에 따라 반응이 다를 수 있습니다. 처음 급여 시 소량부터 시작하고 이상 반응(구토, 설사, 피부 발진 등)이 있으면 즉시 중단하세요.`;
  }
  return `주요 성분 모두 안전 등급으로 분류되었습니다. 천연 단백질원 위주의 건강한 구성입니다. 다만 각 반려동물마다 체질이 다르므로 처음에는 소량씩 테스트하며 급여하는 것을 권장합니다.`;
}

/** 등록성분량(보증성분) 섹션 — 라벨 표기값 + 건물기준(DMB) 환산 + 추정 칼로리 */
function GuaranteedAnalysisSection({ ga }: { ga?: Product['guaranteedAnalysis'] }) {
  if (!ga) return null;

  const moisture = ga.moisture ?? 0;
  const rows: { label: string; value?: number; unit?: string; dmb?: boolean }[] = [
    { label: '조단백질', value: ga.crudeProtein, dmb: true },
    { label: '조지방', value: ga.crudeFat, dmb: true },
    { label: '조섬유', value: ga.crudeFiber, dmb: true },
    { label: '조회분', value: ga.crudeAsh, dmb: true },
    { label: '수분', value: ga.moisture },
    { label: '칼슘', value: ga.calcium, dmb: true },
    { label: '인', value: ga.phosphorus, dmb: true },
  ].filter((r) => r.value != null);

  if (rows.length === 0) return null;

  const cal = calculateCalories({
    crudeProtein: ga.crudeProtein,
    crudeFat: ga.crudeFat,
    crudeFiber: ga.crudeFiber,
    crudeAsh: ga.crudeAsh,
    moisture: ga.moisture,
  });

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>등록성분량 (보증성분)</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>표기 기준 · 건물기준(DMB)</span>
      </div>

      <div style={{ border: '1px solid var(--border-color, #EEF0F3)', borderRadius: 'var(--border-radius-md, 14px)', overflow: 'hidden' }}>
        {rows.map((r, idx) => {
          const dmb = r.dmb && r.value != null ? toDryMatter(r.value, moisture) : null;
          return (
            <div
              key={r.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: idx % 2 === 0 ? 'var(--bg-color, #fff)' : 'rgba(0,0,0,0.015)',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>{r.label}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--text-dark)' }}>{r.value}%</strong>
                {dmb != null && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    (건물기준 {dmb.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {cal.kcalPer100g > 0 && (
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '8px', lineHeight: 1.5 }}>
          추정 열량 약 <strong>{cal.kcalPer100g} kcal/100g</strong> · 단백 {cal.distribution.protein}% / 지방 {cal.distribution.fat}% / 탄수 {cal.distribution.carbs}%
          <br />
          습식·건식은 수분 차이가 커서 <strong>건물기준(DMB)</strong> 비교가 더 정확해요. 표기 함량만으로 원료별 실제 비율은 알 수 없어요.
        </p>
      )}
    </section>
  );
}
