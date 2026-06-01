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
import { ArrowLeft, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
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

  // 4. Map score to grade
  const score = report.score;
  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'B';
  if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 55) grade = 'C';
  else if (score >= 45) grade = 'D';
  else grade = 'F';

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
