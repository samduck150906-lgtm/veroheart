// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom'; // CHANGED: 하단 고정 CTA를 body로 포털 — 조상 transform의 fixed 포함블록 문제 회피
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
  Heart,
  Utensils
} from 'lucide-react';
import { 
  getReviews, 
  createReview, 
  deleteReview,
} from '../lib/supabase';
import { buildProductConclusion } from '../utils/productConclusion';
import { getRecommendationBreakdown, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import type { Product } from '../types';
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
import ProductImageSlider from '../components/ProductImageSlider';
import AnimatedNumber from '../components/AnimatedNumber';
import { CAUTION_INGREDIENT, ALLERGY_CONFLICT, MEDICAL_DISCLAIMER, PRE_PURCHASE } from '../copy/ui';

// 등급·위험도 색은 단일 토큰(src/theme/tokens.ts)에서만 가져온다.
import { gradeColor, RISK_COLOR as RISK_COLORS, RISK_BG, RISK_LABEL } from '../theme/tokens';

// CHANGED: 등급별 색상 토큰 — S(초록)·A(연두)·B(노랑)·C(주황)·D(빨강) 체계 (실제 산출 등급은 A~D)
const GRADE_META: Record<string, { color: string; bg: string; line: string; tier: string }> = {
  S: { color: '#15B36B', bg: '#ECFDF5', line: '#BBF7D0', tier: '최고 등급 · 강력 추천' },
  A: { color: '#22C55E', bg: '#F0FDF4', line: '#BBF7D0', tier: '우수 · 추천' },
  B: { color: '#E8A800', bg: '#FFFBEB', line: '#FDE68A', tier: '양호 · 참고 추천' },
  C: { color: '#FF8C00', bg: '#FFF7ED', line: '#FED7AA', tier: '보통 · 확인 필요' },
  D: { color: '#F04452', bg: '#FFF1F2', line: '#FECDD3', tier: '주의 필요' },
};

// CHANGED: 스코어 한줄 설명 — 강점/단백질/주의성분 유무 기준으로 맥락 문구 생성
function scoreOneLiner(product: any, report: any, pipeline: any): string {
  if (pipeline?.strengths?.length) return `${pipeline.strengths[0]} 등 강점이 돋보이는 제품이에요`;
  const protein = product?.guaranteedAnalysis?.crudeProtein;
  if (protein != null && protein >= 28) return '단백질 함량이 우수해 근육 건강에 도움돼요';
  const hasDanger = product?.ingredients?.some((i: any) => i.riskLevel === 'danger');
  if (!hasDanger && (product?.ingredients?.length ?? 0) > 0) return '주의 성분이 없어 안심하고 급여할 수 있어요';
  if (report?.score >= 80) return '전반적으로 균형 잡힌 좋은 제품이에요';
  if (report?.score >= 60) return '참고할 점이 있으니 성분을 확인해 보세요';
  return '주의가 필요한 항목이 있어요';
}

function GradeCircle({ grade }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: gradeColor(grade).color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 18, fontWeight: 900,
    }}>{grade}</div>
  );
}

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, selectedProduct, profile, isLoggedIn, favorites, toggleFavorite, addToComparison, removeFromComparison, comparisonList, userId, trackRecentView } = useStore();

  const product = useMemo(() => {
    const found = id ? products.find(p => p.id === id) : null;
    return found || selectedProduct || products[0];
  }, [id, products, selectedProduct]);

  const [inCompare, setInCompare] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!product?.id) return;
    let active = true;
    getReviews(product.id)
      .then(data => { if (active) setReviews(data || []); })
      .catch(() => { /* noop */ });
    return () => { active = false; };
  }, [product?.id]);

  const handleScrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!userId) return;
    try {
      await deleteReview(reviewId, userId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (e) { /* noop */ }
  };

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
    <div className="pb-40">
      {/* CHANGED(Tailwind): 분리됐던 2개 이미지 카드 → 풀와이드 단일 슬라이더(360px, 도트, 좋아요) */}
      <ProductImageSlider
        images={product.imageUrl ? [product.imageUrl] : []}
        productName={product.name}
        isFav={isFav}
        onToggleFav={() => toggleFavorite(product.id)}
      />
      {/* 뒤로가기 — 이미지 위 좌상단 고정 */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="뒤로 가기"
        className="w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm shadow-md flex items-center justify-center"
        style={{ position: 'fixed', top: 'calc(12px + env(safe-area-inset-top, 0px))', left: 'max(12px, calc(50% - 260px + 12px))', zIndex: 56 }}
      >
        <ArrowLeft size={20} color="#1A1A1A" />
      </button>

      {/* CHANGED(Tailwind, #2): 상품명 카드 + 태그 분리 → 단일 정보 헤더로 통합 */}
      <div className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          {(product.coupangProductId || product.coupangLink) && (
            <span className="text-[11px] text-[#6B7684] bg-[#EFEFEF] px-2 py-0.5 rounded-full font-medium">쿠팡상품</span>
          )}
          {product.targetPetType && (
            <span className="text-[11px] text-[#6B7684] bg-[#EFEFEF] px-2 py-0.5 rounded-full">
              {product.targetPetType === 'dog' ? '🐶 강아지용' : product.targetPetType === 'cat' ? '🐱 고양이용' : '🐾 전체'}
            </span>
          )}
          {/* CHANGED(#2): 검수 상태는 눈에 덜 띄게 우측 muted 처리 */}
          <span className="text-[11px] text-[#8B95A1] ml-auto">{verificationMeta.label}</span>
        </div>
        <div className="text-[12px] text-[#6B7684] font-medium mb-1">{product.brand}</div>
        <h1 className="text-[18px] font-bold text-[#1A1A1A] leading-snug mb-3">{product.name}</h1>
        {(() => {
          const ga = product.guaranteedAnalysis;
          const tags = [];
          if (!product.ingredients?.some(i => i.riskLevel === 'danger')) tags.push({ label: '주의성분 없음', emoji: '✅', cls: 'text-[#15B36B] bg-[#EAFAF1]' });
          if (allergyIngs.length === 0 && hasPetProfile) tags.push({ label: '알러지 성분 없음', emoji: '🛡️', cls: 'text-[#15B36B] bg-[#EAFAF1]' });
          if (ga?.crudeProtein && ga.crudeProtein >= 28) tags.push({ label: '고단백', emoji: '💪', cls: 'text-[#F5A623] bg-[#FEF9E7]' });
          if (product.targetPetType === 'dog') tags.push({ label: '강아지 전용', emoji: '🐕', cls: 'text-[#F5A623] bg-[#FEF9E7]' });
          if (product.targetPetType === 'cat') tags.push({ label: '고양이 전용', emoji: '🐈', cls: 'text-[#F5A623] bg-[#FEF9E7]' });
          if (/무곡|grain.?free/i.test(product.name || '')) tags.push({ label: '무곡물', emoji: '🌾', cls: 'text-[#15B36B] bg-[#EAFAF1]' });
          if (!tags.length) return null;
          return (
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t.label} className={`flex items-center gap-1 text-[11px] font-semibold px-3 py-1.5 rounded-full ${t.cls}`}>
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* CHANGED(Tailwind, #3): 점수 + 게이지바 + 등급 범례(D C B A S) + 한줄 설명 */}
      {report && (() => {
        const g = gradeFromScore(report.score);
        const gm = GRADE_META[g] || GRADE_META.D;
        const legend = ['D', 'C', 'B', 'A', 'S'];
        return (
          <div className="mb-3 bg-white rounded-[16px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] font-semibold text-[#8B95A1] tracking-widest mb-3">VERORO SCORE</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-[52px] font-extrabold leading-none" style={{ color: gm.color }}><AnimatedNumber value={report.score} /></span>
                  <span className="text-[16px] text-[#8B95A1] mb-2">/ 100</span>
                </div>
                <p className="text-[13px] text-[#6B7684]">{gm.tier}</p>
                <p className="text-[12px] text-[#8B95A1] mt-0.5">{scoreOneLiner(product, report, pipeline)}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md" style={{ background: gm.color }}>
                  <span className="text-[28px] font-extrabold text-white">{g}</span>
                </div>
                <span className="text-[11px] text-[#8B95A1]">등급</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-[#8B95A1] mb-1"><span>0</span><span>50</span><span>100</span></div>
              <div className="w-full h-2 bg-[#EFEFEF] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(3, Math.min(100, report.score))}%`, background: 'linear-gradient(to right, #F5C842, #15B36B)' }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px]">
                {legend.map(x => (
                  <span key={x} style={{ color: GRADE_META[x].color, fontWeight: x === g ? 700 : 400 }}>
                    {x}{x === g ? ' ◀' : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* CHANGED(Tailwind, #4): 파란 배너 → 메인 노란색 그라데이션으로 통일 */}
      <button
        type="button"
        onClick={() => navigate('/analysis', { state: { product } })}
        className="mb-4 w-full bg-gradient-to-r from-[#F5C842] to-[#F0A500] rounded-[14px] px-4 py-3.5 flex items-center gap-3 shadow-[0_4px_16px_rgba(245,200,66,0.35)] active:scale-[0.99] transition-transform"
      >
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-lg">✨</div>
        <div className="flex-1 text-left">
          <p className="text-[14px] font-bold text-white">AI 프리미엄 영양 리포트 보기</p>
          <p className="text-[11px] text-white/80">DMB 건물기준 변환 · 급여량 계산기 · 유해성분 탐지</p>
        </div>
        <span className="text-white text-lg">›</span>
      </button>

      {/* CHANGED(Tailwind, #6→재배치 #5): 불릿 텍스트 → 아이콘 체크 카드 (스코어/배너 다음) */}
      <div className="mb-4 bg-white rounded-[14px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">{PRE_PURCHASE.sectionTitle}</p>
        <div className="flex flex-col gap-2.5">
          {PRE_PURCHASE.checklist.map((text, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#EAFAF1] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-[#15B36B] font-bold">✓</span>
              </div>
              <p className="text-[13px] text-[#6B7684] leading-snug">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#8B95A1] mt-3 pt-3 border-t border-[#EFEFEF]">{MEDICAL_DISCLAIMER.short}</p>
      </div>

      {/* CHANGED(#6): 급여 가이드 — 카드형, 선택 버튼 2열 통일, 결과 박스 강조 (컴포넌트 내부 Tailwind) */}
      <FeedingGuideCalculator
        kcalPer100g={productKcalPer100g || 350}
        productName={product.name}
        fatPercent={product.guaranteedAnalysis?.crudeFat}
      />

      {/* CHANGED(#7,#9): 원료/성분 분석 — 데이터 있을 때만 노출(빈 '총 0개' 숨김) */}
      {(product.ingredients?.length ?? 0) > 0 && (
        <>
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
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#8B95A1', minWidth: '16px' }}>{idx + 1}</span>
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
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>성분표 분석점수</div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{pipeline.ingredientScoreDisplay}</div>
              </div>
              {/* 원료 등급 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>원료 등급</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{pipeline.rawMaterialGrade}</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#8B95A1' }}>{pipeline.rawMaterialCriteriaScore}/6</span>
                </div>
              </div>
              {/* 영양 공개 수준 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>영양 공개 수준</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: pipeline.nutritionDisclosureLevel === '완전 공개' ? '#15B36B' : pipeline.nutritionDisclosureLevel === '부분 공개' ? '#F59E0B' : '#F04452' }}>
                  {pipeline.nutritionDisclosureLevel}
                </div>
                <div style={{ fontSize: '11px', color: '#8B95A1', fontWeight: 600 }}>({pipeline.nutritionDisclosureCount}/7 항목)</div>
              </div>
              {/* 안전성 검증 */}
              <div style={{ padding: '14px', borderRadius: '14px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1', marginBottom: '6px' }}>안전성 검증</div>
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
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1', marginBottom: '2px' }}>공개 정보 신뢰도 ETF</div>
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
                        const ps = PURPOSE_STYLE[purpose] ?? { bg: '#F9FAFB', text: '#374151', border: '#E5E8EB', emoji: '•' };
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
              <p style={{ fontSize: '14px', color: '#8B95A1', fontWeight: 600, textAlign: 'center', padding: '20px 0', margin: 0 }}>
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
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#8B95A1' }}>보조 성분 점검</span>
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
                            const statusColor = rc.status === 'pass' ? '#15B36B' : rc.status === 'fail' ? '#F04452' : '#8B95A1';
                            const statusBg = rc.status === 'pass' ? '#ECFDF5' : rc.status === 'fail' ? '#FFF1F2' : '#F8FAFC';
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: statusColor, background: statusBg, padding: '2px 7px', borderRadius: '6px', flexShrink: 0, marginTop: '1px' }}>
                                  {rc.status === 'pass' ? '충족' : rc.status === 'fail' ? '미달' : '미확인'}
                                </span>
                                <div>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>{rc.rule.displayName}</span>
                                  <span style={{ fontSize: '11px', color: '#8B95A1', marginLeft: '6px' }}>
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
      {/* Toss-style Ingredient Analysis */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: headlineColor, lineHeight: 1.4, marginBottom: '24px', letterSpacing: '-0.02em' }}>
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
            { dot: '#8B95A1', label: '중립' },
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
              dotColor = isDanger ? '#F04452' : isCaution ? '#F59E0B' : '#8B95A1';
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
        </>
      )}

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

      {/* AI 성분 정밀 분석 — 로그인 유도는 컴포넌트 내부에서 소프트 처리 */}
      <Analyzer />

      {/* CHANGED(Tailwind, #10): 리뷰 빈 상태 → 일러스트 + 리뷰 작성 CTA */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[16px] font-bold text-[#1A1A1A]">리뷰</h3>
          {reviews.length > 0 && <span className="text-[13px] text-[#8B95A1]">{reviews.length}개</span>}
        </div>
        {reviews.length === 0 ? (
          <div className="bg-white rounded-[16px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 리뷰가 없어요</p>
            <p className="text-[13px] text-[#8B95A1] mb-4">이 사료를 드셔봤다면 첫 번째 리뷰를 남겨주세요!</p>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: `/product/${product.id}` } })}
              className="w-full py-3 border-2 border-[#F5C842] rounded-[12px] text-[14px] font-bold text-[#F5C842]"
            >
              ✏️ 리뷰 작성하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map(review => {
              const tagMatch = review.content.match(/^#\s*(.+?)(\n\n|\n|$)/);
              const tags = tagMatch ? tagMatch[1].split(' · ').map(t => t.trim()).filter(Boolean) : [];
              const text = tagMatch ? review.content.slice(tagMatch[0].length).trim() : review.content;
              return (
                <div key={review.id} className="p-4 bg-white border border-[#EFEFEF] rounded-[16px]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : '#E5E8EB'} />
                        ))}
                      </div>
                      <div className="text-[12px] text-[#8B95A1]">{review.users?.nickname || '익명'} · {new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                    {review.user_id === userId && (
                      <button onClick={() => handleDeleteReview(review.id)} className="bg-transparent border-0 cursor-pointer text-[#D1D5DB]">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {text ? <p className="text-[14px] text-[#374151] leading-relaxed m-0 mb-2.5">{text}</p> : null}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-[#F2F4F6] rounded-full text-[12px] font-bold text-[#374151]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CHANGED(Tailwind, #11): 두 줄 CTA → 슬림 단일 바. createPortal로 body 렌더 —
          .animate-fade-in의 잔존 transform이 fixed 포함블록이 되는 문제 회피(뷰포트 하단 고정) */}
      {createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-[520px] z-[58] bg-white border-t border-[#EFEFEF] px-4 py-3"
          style={{ bottom: 'calc(62px + env(safe-area-inset-bottom, 0px))' }}
        >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { isComparing ? removeFromComparison(product.id) : addToComparison(product.id); }}
            aria-label={isComparing ? '비교함에서 제거' : '비교함에 추가'}
            aria-pressed={isComparing}
            className={`w-12 h-12 rounded-[12px] border-2 flex items-center justify-center flex-shrink-0 ${isComparing ? 'border-[#F5C842] bg-[#FEF9E7]' : 'border-[#EFEFEF] bg-white'}`}
          >
            <GitCompare size={20} color={isComparing ? '#F5C842' : '#6B7684'} />
          </button>
          <button
            type="button"
            onClick={() => openCoupangForProduct(product)}
            className="flex-1 h-12 bg-[#F5C842] rounded-[12px] flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(245,200,66,0.4)] active:scale-[0.98] transition-transform"
          >
            <span className="text-[15px] font-bold text-white">최저가로 구매하기</span>
            {product.price ? <span className="text-[13px] font-semibold text-white/80">{product.price.toLocaleString()}원~</span> : null}
          </button>
        </div>
        </div>,
        document.body
      )}

      {/* 성분 상세 바텀시트 */}
      {selectedIngredient && (
        <BottomSheet
          isOpen={!!selectedIngredient}
          onClose={() => setSelectedIngredient(null)}
          title={selectedIngredient.nameKo}
        >
          <div style={{ padding: '4px 4px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedIngredient.nameEn && (
                <span style={{ fontSize: 13, color: '#8B95A1' }}>{selectedIngredient.nameEn}</span>
              )}
              <span style={{
                background: RISK_BG[selectedIngredient.riskLevel] || '#F0EDE8',
                color: RISK_COLORS[selectedIngredient.riskLevel] || '#6B7684',
                borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800,
              }}>
                {selectedIngredient.isAllergy ? '알레르기 주의' : (RISK_LABEL[selectedIngredient.riskLevel] || '정보없음')}
              </span>
            </div>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
              {selectedIngredient.description || selectedIngredient.purpose || '이 성분에 대한 추가 설명이 아직 없어요.'}
            </p>
          </div>
        </BottomSheet>
      )}
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
