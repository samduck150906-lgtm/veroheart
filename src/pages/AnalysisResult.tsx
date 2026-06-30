// @ts-nocheck
/**
 * AnalysisResult page
 * 사료 분석 결과 전체 페이지 (AI 프리미엄 영양 리포트)
 * - SummaryHeader
 * - NutritionDonutChart
 * - ToxicAlertList
 * - IngredientList
 * - FeedingGuideCalculator
 */
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import { getRecommendationBreakdown, gradeFromScore } from '../utils/score';
import AnalysisSummaryHeader from '../components/AnalysisSummaryHeader';
import NutritionDonutChart   from '../components/NutritionDonutChart';
import ToxicAlertList        from '../components/ToxicAlertList';
import IngredientList        from '../components/IngredientList';
import FeedingGuideCalculator from '../components/FeedingGuideCalculator';

export default function AnalysisResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, products } = useStore();

  let product = location.state?.product || useStore.getState().selectedProduct;
  if (!product && products.length > 0) {
    product = products[0];
  }

  if (!product) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>분석할 제품이 없습니다</p>
        <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '24px' }}>상품 상세 페이지에서 'AI 정밀 분석'을 눌러 주세요.</p>
        <button type="button" onClick={() => navigate('/search')} style={{ padding: '12px 24px', borderRadius: '14px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          상품 탐색하기
        </button>
      </div>
    );
  }

  // 2. Generate Report dynamically using score algorithm
  const report = generateAnalysisReport(product, profile);

  // 3. Dynamic Nutrition values (Guaranteed Analysis) based on product type
  let nutrition = {
    protein: 28,
    fat: 14,
    carbs: 35,
    ash: 8,
    moisture: 15,
  };
  let kcalPer100g = 380;

  const isWet = 
    product.formulation?.includes('습식') || 
    product.name?.includes('캔') || 
    product.name?.includes('수프') || 
    product.category?.includes('습식');

  const isSnack = 
    product.category?.includes('간식') || 
    product.name?.includes('져키') || 
    product.name?.includes('껌') || 
    product.name?.includes('츄');

  if (isWet) {
    nutrition = {
      protein: 10,
      fat: 5,
      carbs: 2,
      ash: 3,
      moisture: 80,
    };
    kcalPer100g = 95;
  } else if (isSnack) {
    nutrition = {
      protein: 15,
      fat: 5,
      carbs: 54,
      ash: 8,
      moisture: 18,
    };
    kcalPer100g = 320;
  } else {
    // Dry food default
    nutrition = {
      protein: 30,
      fat: 16,
      carbs: 31,
      ash: 8,
      moisture: 15,
    };
    kcalPer100g = 390;
  }

  // 4. Map score to grade (single source of truth: gradeFromScore)
  const score = report.score;
  const grade = gradeFromScore(score);

  const hasPetProfile = profile && profile.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이';
  const breakdown = hasPetProfile ? getRecommendationBreakdown(product, profile) : null;

  // 5. Build dynamic ingredients array for list
  const displayIngredients = (product.ingredients || []).map((ing) => ({
    name: ing.nameKo || ing.name,
    safety: ing.riskLevel || 'safe',
    role: ing.purpose || '원료',
    description: ing.description || ing.purpose || '',
  }));

  // 6. Build dynamic toxic items
  const dynamicToxicItems = (product.ingredients || [])
    .filter((ing) => ing.riskLevel === 'danger' || ing.riskLevel === 'caution')
    .map((ing) => ({
      name: ing.nameKo || ing.name,
      severity: ing.riskLevel === 'danger' ? ('critical' as const) : ('caution' as const),
      reason: ing.purpose || '원료',
      detail: ing.description || ing.purpose || `${ing.nameKo} 성분은 아이의 건강 고민에 따라 주의가 필요할 수 있습니다.`,
      source: ing.riskLevel === 'danger' ? 'https://efsa.europa.eu' : undefined,
    }));

  const lifeStageString = product.targetLifeStage?.join(', ') || '전연령용';

  return (
    <div className="analysis-page" style={{ padding: '0 16px 40px' }}>
      <Helmet>
        <title>{product.name} AI 분석 결과 | 베로로</title>
        <meta name="description" content={`${product.name} AI 사료 성분 분석 결과 — ${grade}등급`} />
      </Helmet>

      {/* Navigation header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 0',
          marginBottom: '8px',
          borderBottom: '1px solid rgba(28,25,23,0.06)'
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-dark)'
          }}
        >
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>AI 프리미엄 영양 리포트</span>
      </header>

      {/* 1. Summary header */}
      <AnalysisSummaryHeader
        productImage={product.imageUrl}
        productName={product.name}
        brand={product.brand}
        grade={grade}
        score={score}
        compliant={score >= 50}
        lifeStage={lifeStageString}
      />

      {/* Hard-cap warning banner — shown when allergen or danger ingredient triggers score cap */}
      {breakdown?.capped && (
        <div style={{
          display: 'flex', gap: '12px', alignItems: 'flex-start',
          padding: '16px', borderRadius: '16px', margin: '16px 0 0',
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
                ? `${profile.name}는 ${breakdown.allergyHits.join(', ')}을(를) 피하는 게 좋아요. 안전을 위해 점수 상한이 적용됐어요.`
                : `이 성분은 장기 급여 시 주의가 필요해요. 수의사와 상담해 보세요.`}
            </div>
          </div>
        </div>
      )}

      {/* ── 점수 산출 근거 ── */}
      {breakdown && (
        <div style={{ margin: '20px 0 0', padding: '18px 16px', borderRadius: '18px', background: 'var(--fill)', border: '1px solid var(--hairline)' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px' }}>점수 산출 근거</div>
          {[
            { label: '성분 안전', value: breakdown.safety ?? 0, max: 35, color: '#15B36B' },
            { label: '건강 고민 적합', value: breakdown.concern ?? 0, max: 25, color: 'var(--brand-deep)' },
            { label: '신뢰도 (평점·리뷰)', value: breakdown.socialProof ?? 0, max: 20, color: '#3182F6' },
            { label: '종·연령 적합', value: breakdown.petFit ?? 0, max: 10, color: '#A855F7' },
            { label: '가성비', value: breakdown.value ?? 0, max: 10, color: '#F59E0B' },
            { label: 'AAFCO 영양', value: breakdown.nutrition ?? 0, max: 10, color: '#06B6D4' },
          ].map(({ label, value, max, color }) => (
            <div key={label} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color }}>
                  {value}<span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--ink-faint)' }}>/{max}</span>
                </span>
              </div>
              <div style={{ height: '7px', background: 'var(--hairline)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((value / max) * 100)}%`,
                  background: color,
                  borderRadius: '99px',
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-soft)' }}>종합 점수</span>
            <span style={{ fontSize: '20px', fontWeight: 900, color: score >= 80 ? '#15B36B' : score >= 60 ? '#E8A800' : '#F04452' }}>
              {breakdown.total}<span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>/100</span>
            </span>
          </div>
          <p style={{ fontSize: '10.5px', color: 'var(--ink-faint)', fontWeight: 500, lineHeight: 1.5, marginTop: '8px' }}>
            * 이 분석은 의료적 진단을 대체하지 않습니다. 반려동물의 건강 이상 시 수의사와 상담하세요.
          </p>
        </div>
      )}

      {/* Section divider */}
      <div className="analysis-section-gap" />

      {/* 2. Nutrition donut */}
      <NutritionDonutChart nutrition={nutrition} />

      <div className="analysis-section-gap" />

      {/* 3. Toxic alerts */}
      <ToxicAlertList items={dynamicToxicItems} />

      <div className="analysis-section-gap" />

      {/* 4. Ingredient list */}
      <IngredientList ingredients={displayIngredients} />

      <div className="analysis-section-gap" />

      {/* 5. Feeding guide */}
      <FeedingGuideCalculator
        kcalPer100g={kcalPer100g}
        productName={product.name}
      />

      <div style={{ height: '40px' }} />
    </div>
  );
}
