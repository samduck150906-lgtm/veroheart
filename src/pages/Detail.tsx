// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
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
  ChevronRight,
  Heart
} from 'lucide-react';
import { 
  getReviews, 
  createReview, 
  deleteReview,
} from '../lib/supabase';
import { buildProductConclusion } from '../utils/productConclusion';
import { getRecommendationBreakdown, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
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
import FeedingGuideCalculator from '../components/FeedingGuideCalculator';
import { TossCard } from '../components/TossUI';
import ProductImage from '../components/ProductImage';
import BreedNutritionPanel from '../components/BreedNutritionPanel';
import { CAUTION_INGREDIENT, ALLERGY_CONFLICT, MEDICAL_DISCLAIMER, PRE_PURCHASE } from '../copy/ui';

const GRADE_COLORS = {
  A: '#15B36B', B: '#E8A800', C: '#F04452', D: '#F04452', F: '#8B95A1',
};

const RISK_COLORS = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const RISK_LABEL = { safe: '안전', caution: '주의', danger: '위험' };

function GradeCircle({ grade }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: GRADE_COLORS[grade] || '#8B95A1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 18, fontWeight: 900,
    }}>{grade}</div>
  );
}

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, selectedProduct, profile, isLoggedIn, favorites, toggleFavorite, addToComparison, trackRecentView } = useStore();

  const product = useMemo(() => {
    const found = id ? products.find(p => p.id === id) : null;
    return found || selectedProduct || products[0];
  }, [id, products, selectedProduct]);

  const [inCompare, setInCompare] = useState(false);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  const isFav = favorites?.includes(product?.id);

  const compatScore = useMemo(() => {
    if (!product || !hasPetProfile) return null;
    return calculateCompatibilityScore(product, profile);
  }, [product, profile, hasPetProfile]);

  const grade = compatScore != null ? gradeFromScore(compatScore) : null;

  const ga = product?.guaranteedAnalysis;

  const cautionList = (product?.ingredients || []).filter(i => i.riskLevel === 'caution' || i.riskLevel === 'danger');

  if (!product) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#B0B8C1' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
        <p style={{ fontWeight: 600 }}>상품을 찾을 수 없어요</p>
        <button onClick={() => navigate('/search')} style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
          검색으로 돌아가기
        </button>
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

  // 제품 칼로리 밀도 계산 (FeedingGuideCalculator 전달용)
  const productKcalPer100g = useMemo(() => {
    if (!product?.guaranteedAnalysis) return 0;
    return calculateCalories(product.guaranteedAnalysis).kcalPer100g;
  }, [product?.guaranteedAnalysis]);

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
    <div style={{ paddingBottom: 120 }}>
      {/* Product image */}
      <div style={{
        height: 220, background: 'linear-gradient(135deg, #FEF9C3, #FDE68A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        overflow: 'hidden',
      }}>
        {product.imageUrl ? (
          <ProductImage src={product.imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 72 }}>🥫</span>
        )}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => toggleFavorite(product.id)}
            style={{
              background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
              width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <Heart size={20} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#8B95A1'} />
          </button>
        </div>
      </div>

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

      {/* ── 핵심 태그 ── */}
      {(() => {
        const tags = [];
        const ga = product.guaranteedAnalysis;
        if (ga?.crudeProtein && ga.crudeProtein >= 28) tags.push({ label: '고단백', color: '#A855F7', bg: '#FAF5FF' });
        if (!product.ingredients?.some(i => i.riskLevel === 'danger')) tags.push({ label: '주의성분 없음', color: '#15B36B', bg: '#ECFDF5' });
        if (product.name?.includes('무곡물') || product.name?.includes('grain free') || product.name?.toLowerCase().includes('grain-free')) tags.push({ label: '무곡물', color: '#0369A1', bg: '#F0F9FF' });
        if (product.healthConcerns?.includes('피부')) tags.push({ label: '피부건강', color: '#EA580C', bg: '#FFF7ED' });
        if (product.healthConcerns?.includes('관절')) tags.push({ label: '관절건강', color: '#7C3AED', bg: '#F5F3FF' });
        if (product.healthConcerns?.includes('소화')) tags.push({ label: '소화건강', color: '#0891B2', bg: '#ECFEFF' });
        if (product.healthConcerns?.includes('비만') || product.healthConcerns?.includes('다이어트')) tags.push({ label: '체중관리', color: '#B45309', bg: '#FFFBEB' });
        if (product.targetLifeStage?.includes('시니어')) tags.push({ label: '시니어', color: '#64748B', bg: '#F8FAFC' });
        if (product.targetPetType === 'cat') tags.push({ label: '고양이 전용', color: '#DB2777', bg: '#FDF2F8' });
        if (product.targetPetType === 'dog') tags.push({ label: '강아지 전용', color: '#2563EB', bg: '#EFF6FF' });
        if (tags.length === 0) return null;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '16px' }}>
            {tags.map(({ label, color, bg }) => (
              <span key={label} style={{ padding: '5px 11px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, color, background: bg }}>
                {label}
              </span>
            ))}
          </div>
        );
      })()}

      {/* ── VERORO SCORE ── */}
      {report && (
        <div style={{
          marginBottom: '20px',
          padding: '18px 20px',
          borderRadius: '20px',
          background: report.score >= 80
            ? 'linear-gradient(135deg, #ECFDF5 0%, #F0FFF4 100%)'
            : report.score >= 60
              ? 'linear-gradient(135deg, #FFFBEB 0%, #FFF 100%)'
              : 'linear-gradient(135deg, #FFF1F2 0%, #FFF 100%)',
          border: `1px solid ${report.score >= 80 ? '#BBF7D0' : report.score >= 60 ? '#FDE68A' : '#FECACA'}`,
        }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--ink-faint)', letterSpacing: '0.08em', marginBottom: '8px' }}>VERORO SCORE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '42px', fontWeight: 900, color: report.score >= 80 ? '#15B36B' : report.score >= 60 ? '#E8A800' : '#F04452', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {report.score}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink-faint)' }}>/ 100</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-soft)', marginTop: '4px' }}>
                {report.score >= 90 ? '최고 등급 · 강력 추천' : report.score >= 80 ? '우수 · 추천' : report.score >= 60 ? '보통 · 참고 필요' : '주의 필요'}
              </div>
            </div>
            <div style={{
              width: '60px', height: '60px', borderRadius: '18px',
              background: report.score >= 80 ? '#15B36B' : report.score >= 60 ? '#E8A800' : '#F04452',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {gradeFromScore(report.score)}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>등급</span>
            </div>
          </div>
          {hasPetProfile && breakdown && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)' }}>{profile.name}와의 궁합</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--brand-deep)' }}>{breakdown.total}점</span>
              {breakdown.allergyHits?.length > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#BE123C', background: '#FFF1F2', padding: '2px 7px', borderRadius: '6px' }}>
                  ⚠ 알러지 주의
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 핵심 성분 요약 ── */}
      {product.ingredients && product.ingredients.length > 0 && (() => {
        const INGREDIENT_EMOJI: Record<string, string> = {
          '닭': '🍗', '오리': '🦆', '연어': '🐟', '소': '🥩', '양': '🐑', '참치': '🐠',
          '고구마': '🍠', '현미': '🌾', '귀리': '🌾', '감자': '🥔', '완두': '🫛',
          '블루베리': '🫐', '당근': '🥕', '시금치': '🥬', '호박': '🎃',
          '글루코사민': '🦴', '오메가': '💊', '비타민': '💊',
        };
        const safeIngs = product.ingredients.filter(i => i.riskLevel === 'safe').slice(0, 5);
        return (
          <div style={{ marginBottom: '20px', padding: '16px 18px', borderRadius: '18px', background: 'var(--fill)', border: '1px solid var(--hairline)' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)', marginBottom: '12px' }}>핵심 성분</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {safeIngs.map(ing => {
                const emoji = Object.entries(INGREDIENT_EMOJI).find(([k]) => ing.nameKo?.includes(k))?.[1] || '🌿';
                return (
                  <div key={ing.id || ing.nameKo} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', border: '1px solid var(--hairline)' }}>
                      {emoji}
                    </span>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>{ing.nameKo}</div>
                      {ing.purpose && <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', fontWeight: 500 }}>{ing.purpose}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}


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
          {PRE_PURCHASE.ctaBuy} <ExternalLink size={18} />
        </button>
      </div>

      {/* 구매 전 체크리스트 */}
      <div style={{ margin: '0 0 12px', padding: '14px 16px', background: 'var(--fill)', borderRadius: '14px', border: '1px solid var(--hairline)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-soft)', marginBottom: '8px' }}>{PRE_PURCHASE.sectionTitle}</div>
        {PRE_PURCHASE.checklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '7px', fontSize: '12px', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: i < PRE_PURCHASE.checklist.length - 1 ? '4px' : 0 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 800, flexShrink: 0 }}>·</span>
            {item}
          </div>
        ))}
        <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--ink-faint)', lineHeight: 1.5 }}>{MEDICAL_DISCLAIMER.short}</p>
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

      {/* 일일 급여량 계산기 (활동량·중성화·체형 보정 + 지방 위험 평가) */}
      <section className="card" style={{ marginBottom: '40px' }}>
        <FeedingGuideCalculator
          kcalPer100g={productKcalPer100g || 350}
          productName={product.name}
          fatPercent={product.guaranteedAnalysis?.crudeFat}
        />
      </section>

      {/* Toss-style Ingredient Analysis */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900, color: headlineColor, lineHeight: 1.4, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          {headline}
        </h2>
        
        {/* Nutrition Summary — 활동량 인식 지방 위험 메시지 */}
        {(() => {
          const isWeightConcern = profile.healthConcerns.some(
            (c) => ['비만', '체중관리', '다이어트', '과체중'].includes(c),
          );
          const fatPct = product.guaranteedAnalysis?.crudeFat;
          const activityLevel = profile.activityLevel ?? 'normal';
          const activityLabel = { low: '낮음', normal: '보통', high: '높음', very_high: '매우 높음' }[activityLevel] ?? '보통';

          if (isWeightConcern && fatPct != null && fatPct > 12) {
            const riskLevel =
              activityLevel === 'low'   ? 'high' :
              activityLevel === 'normal' ? 'medium' :
              activityLevel === 'high'  ? 'medium' : 'low';

            const msg =
              riskLevel === 'high'
                ? `활동량이 ${activityLabel}이라 칼로리 한도가 좁습니다. 지방 ${fatPct}%는 체중관리 기준(12%)을 초과하므로 급여량을 10–15% 줄이고 저지방 사료 병행을 권장합니다.`
                : riskLevel === 'medium'
                ? `활동량이 ${activityLabel}이라 지방 에너지를 부분적으로 소모합니다. 지방 ${fatPct}%는 기준(12%) 초과이므로 급여량을 약 10% 줄이는 것을 권장합니다.`
                : `활동량이 ${activityLabel}이라 지방 ${fatPct}%를 운동 연료로 충분히 소모합니다. 동일 제품이라도 체중 부담이 크지 않을 수 있습니다.`;

            return (
              <div
                style={{
                  backgroundColor:
                    riskLevel === 'high' ? '#FFF1F2' : riskLevel === 'medium' ? '#FFFBEB' : '#ECFDF5',
                  border: `1px solid ${riskLevel === 'high' ? '#FECDD3' : riskLevel === 'medium' ? '#FDE68A' : '#BBF7D0'}`,
                  padding: '16px 20px',
                  borderRadius: 'var(--border-radius-lg)',
                  marginBottom: '32px',
                }}
              >
                <p style={{
                  fontSize: '14px',
                  color: riskLevel === 'high' ? '#BE123C' : riskLevel === 'medium' ? '#92400E' : '#166534',
                  fontWeight: 700,
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {msg}
                </p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600, margin: '8px 0 0' }}>
                  ※ 지방 {fatPct}% 라벨 감점은 활동량과 무관하게 기준 초과로 고정되지만, 실제 체중 증가 위험은 활동량이 높을수록 낮아집니다.
                </p>
              </div>
            );
          }

          return (
            <div style={{ backgroundColor: 'var(--secondary)', padding: '20px', borderRadius: 'var(--border-radius-lg)', marginBottom: '32px' }}>
              <p style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: 1.6 }}>
                조단백질이 풍부하여 근육 형성과 에너지 보충에 아주 좋습니다.
              </p>
            </div>
          );
        })()}

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
                  : CAUTION_INGREDIENT.warning.hint}
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
          {product.ingredients.length > 12 && (
            <button onClick={() => navigate('/analysis', { state: { productId: product.id } })}
              style={{ background: '#E5E8EB', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#6B7684', cursor: 'pointer' }}>
              +{product.ingredients.length - 12}개 더보기
            </button>
          )}
        </div>

        {/* Caution ingredients */}
        {cautionList.length > 0 && (
          <div style={{ background: '#FEF6E0', borderRadius: 14, padding: '14px', marginBottom: 14, border: '1px solid rgba(232,168,0,0.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E8A800', marginBottom: 6 }}>⚠️ 주의 성분</div>
            <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>
              {cautionList.map(i => i.nameKo).join(', ')} 성분이 포함되어 있습니다.
            </p>
          </div>
        )}

        {/* Guaranteed Analysis */}
        {ga && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 14, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>등록 성분량</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: '단백질', value: ga.crudeProtein },
                { label: '지방', value: ga.crudeFat },
                { label: '섬유', value: ga.crudeFiber },
                { label: '수분', value: ga.moisture },
                { label: '칼슘', value: ga.calcium },
                { label: '인', value: ga.phosphorus },
              ].filter(n => n.value != null && n.value > 0).map(n => (
                <div key={n.label} style={{ textAlign: 'center', background: '#F7F4EE', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#191F28' }}>{n.value}%</div>
                  <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginTop: 2 }}>{n.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        {product.price > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
            <span style={{ fontSize: 13, color: '#8B95A1' }}>최저가 기준</span>
          </div>
        )}
      </section>

      {/* Fixed bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: 'rgba(247,244,238,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 32px', borderTop: '1px solid #E5E8EB',
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/analysis', { state: { productId: product.id } })}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: '#fff', border: '1.5px solid #E5E8EB',
              fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer',
            }}>
            분석 리포트
          </button>
          <button
            onClick={() => {
              addToComparison(product.id);
              setInCompare(true);
              navigate('/comparison');
            }}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: inCompare ? '#FEF6E0' : '#fff',
              border: `1.5px solid ${inCompare ? '#F5C518' : '#E5E8EB'}`,
              fontSize: 14, fontWeight: 700,
              color: inCompare ? '#CA8A04' : '#4E5968', cursor: 'pointer',
            }}>
            {inCompare ? '비교함 ✓' : '비교함 추가'}
          </button>
        </div>
        <button
          onClick={() => {
            if (product.coupangLink) {
              window.open(product.coupangLink, '_blank', 'noopener');
            } else {
              navigate('/search');
            }
          }}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: '#F5C518', border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 800, color: '#191F28',
          }}>
          최저가로 구매하기
        </button>

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
      </div>

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

      {/* ── Sticky CTA ── */}
      <div style={{
        position: 'fixed', bottom: '72px', left: '50%', transform: 'translateX(-50%)',
        width: 'min(calc(100% - 32px), 488px)',
        zIndex: 50,
        pointerEvents: 'none',
      }}>
        <button
          style={{
            width: '100%', padding: '16px 24px', borderRadius: '16px',
            background: 'var(--ink)', color: '#fff',
            fontWeight: 900, fontSize: '16px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            pointerEvents: 'auto',
          }}
          onClick={() => openCoupangForProduct(product)}
        >
          🛒 구매하기
          {product.price ? <span style={{ fontSize: '14px', fontWeight: 700, opacity: 0.8 }}>{product.price.toLocaleString()}원~</span> : null}
        </button>
      </div>
    </div>
  );
}

function VetBadge({ riskLevel }: { riskLevel: string }) {
  if (riskLevel === 'safe') return null;
  const isDanger = riskLevel === 'danger';
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: isDanger ? '#FEF2F2' : '#FFFBEB', color: isDanger ? '#991B1B' : '#92400E', border: `1px solid ${isDanger ? '#FECACA' : '#FDE68A'}` }}>
      {isDanger ? CAUTION_INGREDIENT.danger.badge : CAUTION_INGREDIENT.warning.badge}
    </div>
  );
}

function getVetComment(ingredients: Ingredient[]): string {
  const dangerCount = ingredients.filter(i => i.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter(i => i.riskLevel === 'caution').length;
  if (dangerCount > 0) {
    return `${dangerCount}가지 주의 성분이 들어 있어요. ${CAUTION_INGREDIENT.danger.hint}`;
  }
  if (cautionCount > 0) {
    return `${cautionCount}가지 성분을 한 번 더 확인해보면 좋겠어요. ${CAUTION_INGREDIENT.warning.hint}`;
  }
  return `${CAUTION_INGREDIENT.safe.description} ${CAUTION_INGREDIENT.safe.hint}`;
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
