// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import { getRecommendationBreakdown, gradeFromScore, calculateCompatibilityScore } from '../utils/score';
import { calculateCalories } from '../analysis/nutrition';
import AnalysisSummaryHeader from '../components/AnalysisSummaryHeader';
import IngredientList        from '../components/IngredientList';
import FeedingGuideCalculator from '../components/FeedingGuideCalculator';
import { CAUTION_INGREDIENT, MEDICAL_DISCLAIMER, FEEDING_GUIDE } from '../copy/ui';

const TABS = ['종합', '영양소', '전성분'] as const;

const RISK_COLORS: Record<string, string> = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG: Record<string, string> = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FDECEE' };
const RISK_LABEL: Record<string, string> = { safe: '안전', caution: '주의', danger: '위험' };

const LIFE_STAGE_LABEL: Record<string, string> = {
  '퍼피·키튼': '자견·자묘',
  '성견·성묘': '성견·성묘',
  '시니어': '노령',
};

const GRADE_GAUGE_COLOR: Record<string, string> = {
  A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452', F: '#8B95A1',
};

const GRADE_LABEL: Record<string, string> = {
  A: '아주 잘 맞아요', B: '잘 맞는 편이에요', C: '보통이에요', D: '주의가 필요해요', F: '맞지 않아요',
};

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const color = GRADE_GAUGE_COLOR[grade] ?? '#F5C518';
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFill(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (fill / 100) * circumference;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '24px 20px' }}>
      <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
        <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--fill)" strokeWidth="11" />
          <circle
            cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="11"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.03em' }}>{Math.round(fill)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)' }}>/ 100</span>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: 'inline-block', background: color, color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 15, fontWeight: 900, marginBottom: 8 }}>
          {grade}등급
        </span>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          {GRADE_LABEL[grade] ?? '분석 완료'}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>
          우리 아이와의 종합 궁합 점수예요
        </div>
      </div>
    </div>
  );
}

export default function AnalysisResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, products } = useStore();

  const [activeTab, setActiveTab] = useState('종합');

  const productId = location.state?.productId || selectedProduct?.id;
  const product = useMemo(() => {
    if (productId) return products.find(p => p.id === productId) || selectedProduct;
    return selectedProduct || products[0];
  }, [productId, products, selectedProduct]);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const compatScore = useMemo(() => {
    if (!product) return 75;
    if (hasPetProfile) return calculateCompatibilityScore(product, profile);
    return 75;
  }, [product, profile, hasPetProfile]);

  const grade = gradeFromScore(compatScore);

  const safeIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'safe');
  const cautionIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'caution');
  const dangerIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'danger');

  const allergyConflicts = useMemo(() => {
    if (!hasPetProfile || !profile?.allergies?.length || !product?.ingredients) return [];
    const allergies = profile.allergies.map(a => a.toLowerCase());
    return product.ingredients.filter(ing =>
      allergies.some(a => (ing.nameKo || '').toLowerCase().includes(a) || (ing.nameEn || '').toLowerCase().includes(a))
    );
  }, [product, profile, hasPetProfile]);

  const ga = product?.guaranteedAnalysis;
  const radarData = ga ? [
    { subject: '단백질', value: Math.min(100, (ga.crudeProtein || 0) * 2.5) },
    { subject: '지방', value: Math.min(100, (ga.crudeFat || 0) * 5) },
    { subject: '섬유', value: Math.min(100, (ga.crudeFiber || 0) * 10) },
    { subject: '수분', value: Math.min(100, (ga.moisture || 0) * 10) },
    { subject: '칼슘', value: Math.min(100, (ga.calcium || 0) * 50) },
  ] : [];

  const basePositives = [
    safeIngredients.length > 5 ? `안전 성분 ${safeIngredients.length}가지 확인` : null,
    cautionIngredients.length === 0 && dangerIngredients.length === 0 ? '주의/위험 성분 없음 ✓' : null,
    allergyConflicts.length === 0 && hasPetProfile ? '알러지 성분 미포함 ✓' : null,
    ga?.crudeProtein && ga.crudeProtein > 25 ? `고단백 사료 (단백질 ${ga.crudeProtein}%)` : null,
  ].filter(Boolean) as string[];

  // ── 규칙 엔진(심화 성분 분석) 리포트 — AAFCO·Ca:P·DCM·단백보강 등 ──
  const report = useMemo(
    () => (product ? generateAnalysisReport(product, profile) : null),
    [product, profile],
  );

  const breakdown = useMemo(
    () => (product ? getRecommendationBreakdown(product, profile) : null),
    [product, profile],
  );

  // 엔진 하이라이트를 화면 종합 탭의 좋은 점/주의 사항에 합친다(중복 제거).
  const reportPositives = (report?.highlights ?? []).filter(h => h.type === 'positive').map(h => h.text);
  const reportCautions = (report?.highlights ?? []).filter(h => h.type !== 'positive').map(h => h.text);

  const positives = Array.from(new Set([
    ...basePositives,
    ...reportPositives,
  ]));

  const cautions = Array.from(new Set([
    cautionIngredients.length > 0 ? `주의 성분 ${cautionIngredients.length}가지: ${cautionIngredients.map(i => i.nameKo).slice(0, 3).join(', ')}` : null,
    dangerIngredients.length > 0 ? `위험 성분 ${dangerIngredients.length}가지: ${dangerIngredients.map(i => i.nameKo).slice(0, 2).join(', ')}` : null,
    allergyConflicts.length > 0 ? `알러지 의심 성분: ${allergyConflicts.map(i => i.nameKo).join(', ')}` : null,
    ...reportCautions,
  ].filter(Boolean) as string[]));

  // 화면에 직접 쓰이는 파생값들
  const score = compatScore;
  const displayIngredients = product?.ingredients ?? [];
  const lifeStageString = product?.targetLifeStage
    ? (LIFE_STAGE_LABEL[product.targetLifeStage] ?? product.targetLifeStage)
    : '전 연령';
  const kcalPer100g = ga ? calculateCalories(ga).kcalPer100g : (product?.caloriesPer100g ?? 0);

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
