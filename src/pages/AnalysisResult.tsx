// @ts-nocheck
/**
 * AnalysisResult page
 * 사료 분석 결과 전체 페이지
 * - SummaryHeader
 * - NutritionDonutChart
 * - ToxicAlertList
 * - IngredientList
 * - FeedingGuideCalculator
 */
import { Helmet } from 'react-helmet-async';
import AnalysisSummaryHeader from '../components/AnalysisSummaryHeader';
import NutritionDonutChart   from '../components/NutritionDonutChart';
import ToxicAlertList        from '../components/ToxicAlertList';
import IngredientList        from '../components/IngredientList';
import FeedingGuideCalculator from '../components/FeedingGuideCalculator';

// ── Demo data (실제 앱에서는 API/store 데이터로 교체) ─────────────
const DEMO = {
  productImage: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300&q=80',
  productName: '오리진 오리지널 어덜트',
  brand: 'Orijen',
  grade: 'A' as const,
  score: 88,
  compliant: true,
  lifeStage: '성견용 (All Life Stages)',
  nutrition: {
    protein: 38,
    fat: 18,
    carbs: 19,
    ash: 7,
    moisture: 12,
  },
  toxicItems: [
    {
      name: '에톡시퀸 (Ethoxyquin)',
      severity: 'critical' as const,
      reason: '발암 가능 산화방지제',
      detail: '에톡시퀸은 어류박 보존에 사용되는 산화방지제로, 동물 실험에서 간 독성 및 발암 가능성이 보고되었습니다. EU에서는 사료 첨가물 사용이 금지되었습니다.',
      source: 'https://efsa.europa.eu',
    },
    {
      name: '카라기난 (Carrageenan)',
      severity: 'caution' as const,
      reason: '장내 염증 유발 가능성',
      detail: '일부 연구에서 장내 염증 촉진 가능성이 보고되었으며, 소화기 예민 반려동물에게 주의가 필요합니다.',
    },
  ],
  ingredients: [
    { name: '생닭고기', safety: 'safe' as const,    role: '주단백질 원료' },
    { name: '생칠면조', safety: 'safe' as const,    role: '부단백질 원료' },
    { name: '닭 부산물', safety: 'caution' as const, role: '부산물' },
    { name: '완두콩',   safety: 'safe' as const,    role: '탄수화물·식이섬유' },
    { name: '렌틸콩',  safety: 'safe' as const,    role: '탄수화물' },
    { name: '생청어',  safety: 'safe' as const,    role: 'DHA 공급원' },
    { name: '어분',    safety: 'caution' as const,  role: '어류박', description: '품질 편차가 큰 원료입니다.' },
    { name: '카라기난',safety: 'caution' as const,  role: '증점·안정제' },
    { name: '에톡시퀸',safety: 'danger' as const,   role: '산화방지제', description: '발암 가능성이 있는 보존제입니다.' },
  ],
  kcalPer100g: 388,
};
// ────────────────────────────────────────────────────────────────────

export default function AnalysisResult() {
  return (
    <div className="analysis-page">
      <Helmet>
        <title>{DEMO.productName} 분석 결과 | 베로로</title>
        <meta name="description" content={`${DEMO.productName} AI 사료 성분 분석 결과 — ${DEMO.grade}등급`} />
      </Helmet>

      {/* 1. Summary header */}
      <AnalysisSummaryHeader
        productImage={DEMO.productImage}
        productName={DEMO.productName}
        brand={DEMO.brand}
        grade={DEMO.grade}
        score={DEMO.score}
        compliant={DEMO.compliant}
        lifeStage={DEMO.lifeStage}
      />

      {/* Section divider */}
      <div className="analysis-section-gap" />

      {/* 2. Nutrition donut */}
      <NutritionDonutChart nutrition={DEMO.nutrition} />

      <div className="analysis-section-gap" />

      {/* 3. Toxic alerts */}
      <ToxicAlertList items={DEMO.toxicItems} />

      <div className="analysis-section-gap" />

      {/* 4. Ingredient list */}
      <IngredientList ingredients={DEMO.ingredients} />

      <div className="analysis-section-gap" />

      {/* 5. Feeding guide */}
      <FeedingGuideCalculator
        kcalPer100g={DEMO.kcalPer100g}
        productName={DEMO.productName}
      />

      <div style={{ height: '40px' }} />
    </div>
  );
}
