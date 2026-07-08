import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, AlertCircle, Check, ShoppingBag, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import {
  getRecommendationBreakdown,
  gradeFromScore,
  calculateCompatibilityScore,
  type CompatibilityGrade,
} from '../utils/score';
import { calculateCalories, checkCalciumPhosphorusRatio } from '../analysis/nutrition';
import { runScoringPipeline, type ScoringPipelineResult } from '../analysis/scoringPipeline';
import { evaluateDiseases, type ActiveDiseaseResult } from '../analysis/breedDiseaseEngine';
import { concernsToDiseaseIds } from '../analysis/adapter';
import { findIngredientByName } from '../analysis/ingredientDictionary';
import { classifyIngredientQuality } from '../analysis/ingredientQuality';
import { PURPOSE_STYLE } from '../analysis/nutrientClassification';
import type { IngredientCategory } from '../analysis/types';
import BottomSheet from '../components/BottomSheet';
import StateView from '../components/StateView';
import type { Ingredient, Product } from '../types';

/* ── 등급·위험도 시각 토큰 (신호등) ───────────────────────── */
const GRADE_COLOR: Record<CompatibilityGrade, string> = {
  A: 'var(--grade-a)', B: 'var(--grade-b)', C: 'var(--grade-c)', D: 'var(--grade-d)', F: 'var(--grade-f)',
};
const GRADE_LABEL: Record<CompatibilityGrade, string> = {
  A: '아주 잘 맞아요', B: '잘 맞는 편이에요', C: '보통이에요', D: '주의가 필요해요', F: '맞지 않아요',
};
const RISK = {
  safe:    { color: 'var(--safe-strong)', bg: 'var(--safe-bg)', label: '안전' },
  caution: { color: 'var(--caution-strong)', bg: 'var(--caution-bg)', label: '주의' },
  danger:  { color: 'var(--danger-strong)', bg: 'var(--danger-bg)', label: '위험' },
} as const;

/* ── 원료 품질 등급 색상 (성분 사전 기반, 궁합 점수와 별개) ─────────── */
const RAW_GRADE_COLOR: Record<string, string> = {
  'A+': 'var(--grade-a)', A: 'var(--grade-a)', 'B+': 'var(--safe)', B: 'var(--safe)', C: 'var(--grade-c)', 주의: 'var(--danger-strong)',
};

/* ── 성분 사전 카테고리 → 한국어 라벨 ─────────────────────────────── */
const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  animal_protein: '동물성 단백질',
  processed_protein: '가공 단백질',
  animal_fat: '동물성 지방',
  carbohydrate: '탄수화물',
  legume: '콩류',
  vegetable: '채소',
  fruit: '과일',
  oil: '오일·지방',
  additive: '첨가물',
  preservative: '보존료',
  vitamin_mineral: '비타민·미네랄',
  probiotic: '유산균',
  sweetener: '감미료',
  unknown: '기타',
};

/* ── 점수 링 (3초 판정 히어로) ───────────────────────────── */
function ScoreRing({ score, grade }: { score: number; grade: CompatibilityGrade }) {
  const color = GRADE_COLOR[grade];
  const [fill, setFill] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFill(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (fill / 100) * circumference;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 4px' }}>
      <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
        <svg width="128" height="128" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--line)" strokeWidth="11" />
          <circle
            cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="11"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-dark)', lineHeight: 1, letterSpacing: '-0.03em' }}>{Math.round(fill)}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)' }}>/ 100</span>
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <span style={{ display: 'inline-block', background: color, color: '#fff', borderRadius: 8, padding: '4px 12px', fontSize: 15, fontWeight: 900, marginBottom: 8 }}>
          {grade}등급
        </span>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em' }}>
          {GRADE_LABEL[grade]}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>
          우리 아이와의 종합 궁합 점수예요
        </div>
      </div>
    </div>
  );
}

/* ── 신호등 3줄 요약 ─────────────────────────────────────── */
function TrafficLightSummary({ safe, caution, danger }: { safe: number; caution: number; danger: number }) {
  const items = [
    { key: 'safe', n: safe, ...RISK.safe },
    { key: 'caution', n: caution, ...RISK.caution },
    { key: 'danger', n: danger, ...RISK.danger },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {items.map((it, i) => (
        <div
          key={it.key}
          style={{
            flex: 1, background: it.bg, borderRadius: 16, padding: '14px 10px', textAlign: 'center',
            animation: `veroFadeUp 0.4s ${0.06 * i}s both`,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 900, color: it.color, letterSpacing: '-0.02em' }}>{it.n}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: it.color, marginTop: 2 }}>{it.label} 성분</div>
        </div>
      ))}
    </div>
  );
}

/* ── 영양 도넛 (라벨 데이터 부재 시 형태 기반 추정) ─────────── */
function NutritionDonut({ n }: { n: { protein: number; fat: number; carbs: number; others: number } }) {
  const segs = [
    { label: '단백질', value: n.protein, color: '#15B36B' },
    { label: '지방', value: n.fat, color: '#F59E0B' },
    { label: '탄수화물', value: n.carbs, color: '#3182F6' },
    { label: '기타', value: n.others, color: '#CBD2DA' },
  ];
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  const R = 54, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width="132" height="132" viewBox="0 0 132 132" style={{ flexShrink: 0 }}>
        <g transform="rotate(-90 66 66)">
          {segs.map((s) => {
            const frac = s.value / total;
            const dash = frac * C;
            const el = (
              <circle
                key={s.label} cx="66" cy="66" r={R} fill="none" stroke={s.color} strokeWidth="18"
                strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-acc}
              />
            );
            acc += dash;
            return el;
          })}
        </g>
      </svg>
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        {segs.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', flex: 1 }}>{s.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-dark)' }}>{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS = ['종합', '영양소', '전성분'] as const;
type Tab = (typeof TABS)[number];

export default function AnalysisResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, products, selectedProduct, isLoggedIn } = useStore();

  const [activeTab, setActiveTab] = useState<Tab>('종합');
  const [selectedIng, setSelectedIng] = useState<Ingredient | null>(null);

  const productId: string | undefined = location.state?.productId || selectedProduct?.id;
  const product = useMemo<Product | undefined>(() => {
    if (productId) {
      // 상세 조회로 채워진 selectedProduct가 보장성분(GA)까지 갖고 있으므로 우선한다
      if (selectedProduct?.id === productId) return selectedProduct;
      return products.find((p) => p.id === productId) || selectedProduct || undefined;
    }
    return selectedProduct || products[0];
  }, [productId, products, selectedProduct]);

  const hasPetProfile = Boolean(
    isLoggedIn && profile?.id && profile.id !== 'local-profile' && profile.name && profile.name !== '우리 아이',
  );

  const ingredients = product?.ingredients ?? [];
  const safeIngredients = ingredients.filter((i) => i.riskLevel === 'safe');
  const cautionIngredients = ingredients.filter((i) => i.riskLevel === 'caution');
  const dangerIngredients = ingredients.filter((i) => i.riskLevel === 'danger');

  const score = useMemo(() => {
    if (!product) return 75;
    if (hasPetProfile) return calculateCompatibilityScore(product, profile);
    return generateAnalysisReport(product, profile).score;
  }, [product, profile, hasPetProfile]);
  const grade = gradeFromScore(score);

  const breakdown = useMemo(
    () => (product && hasPetProfile ? getRecommendationBreakdown(product, profile) : null),
    [product, profile, hasPetProfile],
  );
  const report = useMemo(
    () => (product ? generateAnalysisReport(product, profile) : null),
    [product, profile],
  );

  // ── 잠들어 있던 성분 품질·기능성·안전 엔진을 결과 화면에 연결 ──
  const pipeline = useMemo<ScoringPipelineResult | null>(
    () => (product && (product.ingredients?.length ?? 0) > 0 ? runScoringPipeline(product) : null),
    [product],
  );

  // ── 우리 아이 건강 고민 → 질환별 NRC 정량 규칙 평가 ──
  const diseaseResults = useMemo<ActiveDiseaseResult[]>(() => {
    if (!product) return [];
    const ids = concernsToDiseaseIds(profile.healthConcerns);
    return ids.length ? evaluateDiseases(ids, product) : [];
  }, [product, profile.healthConcerns]);

  const capped = Boolean(breakdown && (breakdown.allergyHits.length > 0 || breakdown.dangerCount > 0));

  // ── 좋은 점 / 주의 사항 (엔진 하이라이트 + 파생값, 중복 제거) ──
  const positives = useMemo(() => {
    const base = [
      safeIngredients.length > 5 ? `안전 성분 ${safeIngredients.length}가지 확인` : null,
      cautionIngredients.length === 0 && dangerIngredients.length === 0 ? '주의·위험 성분 없음' : null,
      hasPetProfile && breakdown?.allergyHits.length === 0 ? '알레르기 성분 미포함' : null,
      breakdown && breakdown.matchedConcerns.length > 0 ? `${breakdown.matchedConcerns.join(', ')} 건강 고민과 연관` : null,
    ].filter(Boolean) as string[];
    const fromReport = (report?.highlights ?? []).filter((h) => h.type === 'positive').map((h) => h.text);
    return Array.from(new Set([...base, ...fromReport]));
  }, [safeIngredients.length, cautionIngredients.length, dangerIngredients.length, hasPetProfile, breakdown, report]);

  const cautions = useMemo(() => {
    const base = [
      cautionIngredients.length > 0 ? `주의 성분 ${cautionIngredients.length}가지: ${cautionIngredients.map((i) => i.nameKo).slice(0, 3).join(', ')}` : null,
      dangerIngredients.length > 0 ? `위험 성분 ${dangerIngredients.length}가지: ${dangerIngredients.map((i) => i.nameKo).slice(0, 2).join(', ')}` : null,
      breakdown && breakdown.allergyHits.length > 0 ? `알레르기 의심: ${breakdown.allergyHits.join(', ')}` : null,
      pipeline?.hasDCMRisk ? `상위 원료의 콩류(${pipeline.dcmLegumes.join(', ')})와 확장성 심근병증(DCM)의 연관성이 논의되고 있어요` : null,
      pipeline?.hasProteinInflation ? `식물성 단백(${pipeline.inflationDetails.join(', ')})이 단백질 수치를 실제보다 높여 보이게 할 수 있어요` : null,
    ].filter(Boolean) as string[];
    const fromReport = (report?.highlights ?? []).filter((h) => h.type !== 'positive').map((h) => h.text);
    return Array.from(new Set([...base, ...fromReport]));
  }, [cautionIngredients, dangerIngredients, breakdown, report, pipeline]);

  // ── 영양 구성: 보장성분(실측)이 있으면 사용, 없으면 형태 기반 추정 ──
  const nutrition = useMemo(() => {
    const ga = product?.guaranteedAnalysis;
    if (ga && ((ga.crudeProtein ?? 0) > 0 || (ga.crudeFat ?? 0) > 0)) {
      const protein = ga.crudeProtein ?? 0;
      const fat = ga.crudeFat ?? 0;
      const fiber = ga.crudeFiber ?? 0;
      const ash = ga.crudeAsh ?? 0;
      const moisture = ga.moisture ?? 0;
      const carbs = Math.max(0, 100 - protein - fat - fiber - ash - moisture);
      const others = Math.max(0, 100 - protein - fat - carbs);
      const kcal = product?.caloriesPer100g || calculateCalories(ga).kcalPer100g;
      return {
        protein: Math.round(protein),
        fat: Math.round(fat),
        carbs: Math.round(carbs),
        others: Math.round(others),
        kcal: Math.round(kcal),
        measured: true,
        capNote: checkCalciumPhosphorusRatio(ga),
      };
    }
    const name = product?.name ?? '';
    const cat = product?.category ?? '';
    const form = product?.formulation ?? '';
    const isWet = form.includes('습식') || cat.includes('습식') || /캔|수프/.test(name);
    const isSnack = cat.includes('간식') || /져키|껌|츄/.test(name);
    const base = isWet
      ? { protein: 10, fat: 5, carbs: 5, others: 80, kcal: 95 }
      : isSnack
        ? { protein: 15, fat: 5, carbs: 54, others: 26, kcal: 320 }
        : { protein: 30, fat: 16, carbs: 31, others: 23, kcal: 390 };
    return { ...base, measured: false, capNote: null as string | null };
  }, [product]);

  const lifeStage = product?.targetLifeStage?.length ? product.targetLifeStage.join(', ') : '전 연령';

  const recommendTargets = useMemo(() => {
    const t: string[] = [];
    if (product?.targetPetType === 'cat') t.push('고양이 보호자');
    else if (product?.targetPetType === 'dog') t.push('강아지 보호자');
    if (product?.targetLifeStage?.length) t.push(`${lifeStage} 반려동물`);
    if (product?.healthConcerns?.length) t.push(`${product.healthConcerns.slice(0, 2).join('·')} 관리가 필요한 경우`);
    return t.length ? t : ['일반적인 건강 상태의 반려동물'];
  }, [product, lifeStage]);

  const notRecommendTargets = useMemo(() => {
    const t: string[] = [];
    if (breakdown && breakdown.allergyHits.length > 0) t.push(`${breakdown.allergyHits.join(', ')} 알레르기가 있는 경우`);
    if (dangerIngredients.length > 0) t.push('민감성·기저질환이 있어 위험 성분을 피해야 하는 경우');
    return t.length ? t : ['특별히 피해야 할 대상은 확인되지 않았어요'];
  }, [breakdown, dangerIngredients.length]);

  const handleBuy = () => {
    if (product?.coupangLink) window.open(product.coupangLink, '_blank', 'noopener');
    else if (product) navigate(`/product/${product.id}`);
  };

  if (!product) {
    return (
      <StateView
        variant="empty"
        title="분석할 제품이 없어요"
        description="상품을 선택하면 성분 분석 결과를 볼 수 있어요."
        action={{ label: '상품 탐색하기', onClick: () => navigate('/search') }}
      />
    );
  }

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <Helmet>
        <title>{product.name} 성분 분석 결과 | 베로로</title>
        <meta name="description" content={`${product.name} 성분 분석 결과 — ${grade}등급`} />
      </Helmet>

      <style>{`@keyframes veroFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 8px' }}>
        <button
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text-dark)' }}
        >
          <ArrowLeft size={22} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-dark)' }}>영양 리포트</span>
      </header>

      {/* Product card */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          decoding="async"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
          style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', background: 'var(--secondary)', flexShrink: 0 }}
        />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>{product.brand}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{product.name}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-light)', marginTop: 2 }}>{lifeStage}</div>
        </div>
      </div>

      {/* Score hero */}
      <ScoreRing score={score} grade={grade} />

      {!hasPetProfile && (
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{ width: '100%', textAlign: 'left', background: 'rgba(254,229,0,0.14)', border: '1px solid rgba(229,206,0,0.35)', borderRadius: 16, padding: 14, marginBottom: 4, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
        >
          <Sparkles size={18} color="var(--primary-dark)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.5 }}>
            우리 아이 프로필을 등록하면 알레르기·건강 고민까지 반영한 <b>맞춤 점수</b>를 볼 수 있어요.
          </span>
        </button>
      )}

      {/* Hard-cap / allergy banner */}
      {capped && breakdown && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 16, marginBottom: 4,
          background: breakdown.allergyHits.length > 0 ? RISK.danger.bg : RISK.caution.bg,
          border: `1px solid ${breakdown.allergyHits.length > 0 ? 'var(--danger-line)' : 'var(--caution-line)'}`,
        }}>
          <AlertCircle size={20} color={breakdown.allergyHits.length > 0 ? RISK.danger.color : RISK.caution.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: breakdown.allergyHits.length > 0 ? 'var(--danger-strong)' : 'var(--caution-strong)', marginBottom: 4 }}>
              {breakdown.allergyHits.length > 0
                ? `${breakdown.allergyHits.join(', ')}이(가) 들어 있어요`
                : `주의가 필요한 성분 ${breakdown.dangerCount}개 포함`}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: breakdown.allergyHits.length > 0 ? 'var(--danger-strong)' : 'var(--caution-strong)', opacity: 0.85, lineHeight: 1.5 }}>
              {breakdown.allergyHits.length > 0
                ? `${profile.name}는 이 성분을 피하는 게 좋아요. 급여 전 수의사와 상담해 주세요.`
                : '장기 급여 시 주의가 필요해요. 수의사와 상담을 권장해요.'}
            </div>
          </div>
        </div>
      )}

      {/* Traffic-light summary */}
      <div style={{ margin: '12px 0 4px' }}>
        <TrafficLightSummary safe={safeIngredients.length} caution={cautionIngredients.length} danger={dangerIngredients.length} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--secondary)', borderRadius: 14, padding: 4, margin: '16px 0' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 800,
              background: activeTab === t ? 'var(--surface-elevated)' : 'transparent',
              color: activeTab === t ? 'var(--text-dark)' : 'var(--text-muted)',
              boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab: 종합 */}
      {activeTab === '종합' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {report?.summary && (
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.6 }}>
              {report.summary}
            </div>
          )}
          {pipeline && <IngredientEvidenceCard pipeline={pipeline} />}
          {diseaseResults.length > 0 && <DiseaseFitCard results={diseaseResults} petName={profile.name} />}
          <InfoBlock title="좋은 점" color={RISK.safe.color} items={positives} empty="특별히 강조할 좋은 점을 찾지 못했어요." />
          <InfoBlock title="주의 사항" color={RISK.caution.color} items={cautions} empty="주의할 점은 발견되지 않았어요." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <TargetCard title="추천 대상" tone="good" items={recommendTargets} />
            <TargetCard title="비추천 대상" tone="bad" items={notRecommendTargets} />
          </div>
        </div>
      )}

      {/* Tab: 영양소 */}
      {activeTab === '영양소' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>영양 구성</span>
              <span style={{
                fontSize: 11, fontWeight: 800, borderRadius: 999, padding: '4px 10px',
                background: nutrition.measured ? RISK.safe.bg : 'var(--secondary)',
                color: nutrition.measured ? RISK.safe.color : 'var(--text-muted)',
              }}>
                {nutrition.measured ? '보장성분 실측' : '형태 기반 추정'}
              </span>
            </div>
            <NutritionDonut n={nutrition} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--secondary)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-dark)', letterSpacing: '-0.03em' }}>{nutrition.kcal}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>kcal / 100g</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
                {nutrition.measured ? '라벨 보장성분 기준 열량이에요' : '제품 형태 기준 추정 열량이에요'}
              </div>
            </div>
          </div>
          {nutrition.capNote && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: RISK.caution.bg, borderRadius: 16, padding: 14 }}>
              <AlertCircle size={18} color={RISK.caution.color} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--caution-strong)', lineHeight: 1.5 }}>{nutrition.capNote}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab: 전성분 */}
      {activeTab === '전성분' && (
        <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>성분을 탭하면 상세 정보를 볼 수 있어요</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {ingredients.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>등록된 성분 정보가 없어요.</div>
            )}
            {ingredients.map((ing, idx) => {
              const r = RISK[ing.riskLevel] ?? RISK.safe;
              return (
                <button
                  key={ing.id || idx}
                  onClick={() => setSelectedIng(ing)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'var(--secondary)', border: 'none', borderRadius: 12, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-light)', width: 18, flexShrink: 0 }}>{idx + 1}</span>
                  <span style={{ width: 10, height: 10, borderRadius: 999, background: r.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing.nameKo}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: r.color, background: r.bg, borderRadius: 999, padding: '3px 9px', flexShrink: 0 }}>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Medical disclaimer */}
      <p style={{ fontSize: 11, color: 'var(--text-light)', lineHeight: 1.5, margin: '20px 4px 0', fontWeight: 600 }}>
        본 분석은 참고용 정보이며 수의학적 진단을 대체하지 않아요. 건강 이상이 의심되면 반드시 수의사와 상담하세요.
      </p>

      {/* Sticky bottom bar */}
      <div style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        width: 'calc(100% - 32px)', maxWidth: 448, display: 'flex', gap: 10, zIndex: 40,
      }}>
        <button
          type="button"
          onClick={() => navigate('/search')}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '15px 0', borderRadius: 16, border: '1px solid rgba(28,25,23,0.1)', background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(10px)', color: 'var(--text-dark)', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
        >
          <Check size={17} /> 더 잘 맞는 상품
        </button>
        <button
          type="button"
          onClick={handleBuy}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '15px 0', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'var(--text-dark)', fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: 'var(--shadow-md)' }}
        >
          <ShoppingBag size={17} /> 구매하기
        </button>
      </div>

      {/* Ingredient detail sheet — 성분 사전 근거·설명·분류 */}
      <BottomSheet isOpen={Boolean(selectedIng)} onClose={() => setSelectedIng(null)} title={selectedIng?.nameKo ?? '성분 정보'}>
        {selectedIng && <IngredientDetail ing={selectedIng} />}
      </BottomSheet>
    </div>
  );
}

/* ── 재사용 소블록 ───────────────────────────────────────── */
function InfoBlock({ title, color, items, empty }: { title: string; color: string; items: string[]; empty: string }) {
  return (
    <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>{title}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-light)', fontWeight: 600 }}>{empty}</div>
      ) : (
        <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
          {items.map((t, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.5 }}>
              <span style={{ color, flexShrink: 0, fontWeight: 900 }}>·</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TargetCard({ title, tone, items }: { title: string; tone: 'good' | 'bad'; items: string[] }) {
  const color = tone === 'good' ? RISK.safe.color : RISK.danger.color;
  const bg = tone === 'good' ? RISK.safe.bg : RISK.danger.bg;
  return (
    <div style={{ background: bg, borderRadius: 16, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color, marginBottom: 8 }}>{title}</div>
      <ul style={{ listStyle: 'none', display: 'grid', gap: 6 }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.45 }}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/* ── 원료 품질 근거 카드 (성분 사전 기반 · 궁합 점수와 별개) ────────── */
export function IngredientEvidenceCard({ pipeline }: { pipeline: ScoringPipelineResult }) {
  const gradeColor = RAW_GRADE_COLOR[pipeline.rawMaterialGrade] ?? '#8B95A1';
  const hasStrengths = pipeline.strengths.length > 0;
  const hasFunctional = pipeline.functionalIngredients.length > 0;
  return (
    <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Sparkles size={16} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>원료 품질 근거</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-light)', fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
        위 궁합 점수와 별개로, 원료 자체의 품질을 성분 사전 기준으로 평가했어요.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: hasStrengths || hasFunctional ? 14 : 0 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, height: 44, padding: '0 12px', borderRadius: 12, background: gradeColor, color: '#fff', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
          {pipeline.rawMaterialGrade}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>원료 품질 {pipeline.rawMaterialGrade}등급</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>
            품질 지표 {pipeline.ingredientScoreDisplay} · 기준 {pipeline.rawMaterialCriteriaScore}/6 충족
          </div>
        </div>
      </div>

      {hasStrengths && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: hasFunctional ? 14 : 0 }}>
          {pipeline.strengths.map((s) => (
            <span key={s} style={{ fontSize: 12, fontWeight: 700, color: RISK.safe.color, background: RISK.safe.bg, borderRadius: 999, padding: '5px 11px' }}>✓ {s}</span>
          ))}
        </div>
      )}

      {hasFunctional && (
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 8 }}>기능성 성분</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {pipeline.functionalIngredients.map((fi) => {
              const st = PURPOSE_STYLE[fi.purposes[0]];
              return (
                <span
                  key={fi.name}
                  title={fi.purposes.join(', ')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: st.text, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 999, padding: '5px 10px' }}
                >
                  <span aria-hidden>{st.emoji}</span>{fi.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 질환별 맞춤 분석 (프로필 건강 고민 × NRC 정량 규칙) ─────────────── */
const RULE_STATUS = {
  pass: { color: 'var(--safe-strong)', bg: 'var(--safe-bg)', label: '충족' },
  fail: { color: 'var(--danger-strong)', bg: 'var(--danger-bg)', label: '기준 밖' },
  unknown: { color: 'var(--text-sub)', bg: 'var(--surface-alt)', label: '정보 없음' },
} as const;

function diseaseTone(r: ActiveDiseaseResult) {
  if (r.failCount > 0) return { color: 'var(--caution-strong)', bg: 'var(--caution-bg)', label: '주의 필요' };
  if (r.passCount > 0) return { color: 'var(--safe-strong)', bg: 'var(--safe-bg)', label: '잘 맞아요' };
  return { color: 'var(--text-sub)', bg: 'var(--surface-alt)', label: '정보 부족' };
}

export function DiseaseFitCard({ results, petName }: { results: ActiveDiseaseResult[]; petName: string }) {
  const name = petName && petName !== '우리 아이' ? petName : '우리 아이';
  return (
    <div style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span aria-hidden style={{ fontSize: 16 }}>🩺</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>{name} 건강 고민 맞춤 분석</span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-light)', fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>
        등록한 건강 고민에 대해 영양 가이드라인(NRC 기준) 규칙을 점검했어요. 참고용이며 수의 진단을 대체하지 않아요.
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {results.map((r) => <DiseaseRow key={r.disease.id} r={r} />)}
      </div>
    </div>
  );
}

function DiseaseRow({ r }: { r: ActiveDiseaseResult }) {
  const tone = diseaseTone(r);
  const { disease, ruleChecks, supplementGaps } = r;
  const hasBody = ruleChecks.length > 0 || supplementGaps.length > 0 || Boolean(disease.clinicalNote);
  return (
    <div style={{ background: 'var(--secondary)', borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hasBody ? 10 : 0 }}>
        <span aria-hidden style={{ fontSize: 16 }}>{disease.emoji}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-dark)', flex: 1 }}>{disease.name}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: tone.color, background: tone.bg, borderRadius: 999, padding: '4px 10px' }}>{tone.label}</span>
      </div>

      {ruleChecks.length > 0 ? (
        <div style={{ display: 'grid', gap: 7 }}>
          {ruleChecks.map((rc, i) => {
            const st = RULE_STATUS[rc.status];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: st.color, flexShrink: 0, marginTop: 5 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-dark)' }}>{rc.rule.displayName}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: st.color, background: st.bg, borderRadius: 999, padding: '2px 8px' }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.45, marginTop: 2 }}>{rc.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          정량 기준 대신 아래 권장 성분으로 관리를 안내해요.
        </div>
      )}

      {supplementGaps.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>이런 성분이 더 있으면 도움돼요</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {supplementGaps.map((s) => (
              <span key={s} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-dark)', background: 'var(--surface-elevated)', border: '1px solid var(--line)', borderRadius: 999, padding: '4px 10px' }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {disease.clinicalNote && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10 }}>
          <AlertCircle size={14} color={RISK.caution.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.45 }}>{disease.clinicalNote}</span>
        </div>
      )}
    </div>
  );
}

/* ── 성분 상세 — 사전 설명·분류·품질등급·출처 근거 ─────────────────── */
export function IngredientDetail({ ing }: { ing: Ingredient }) {
  const dict = findIngredientByName(ing.nameKo);
  const quality = classifyIngredientQuality(ing.nameKo, dict);
  const r = RISK[ing.riskLevel] ?? RISK.safe;
  const desc = dict?.explanation || quality.description;
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: r.color, background: r.bg, borderRadius: 999, padding: '5px 12px' }}>{r.label} 성분</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: quality.color, background: 'var(--secondary)', borderRadius: 999, padding: '5px 12px' }}>{quality.label}</span>
        {ing.nameEn && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{ing.nameEn}</span>}
      </div>
      <SheetBlock title="설명">{desc}</SheetBlock>
      {ing.purpose && <SheetBlock title="역할">{ing.purpose}</SheetBlock>}
      {dict && <SheetBlock title="분류">{CATEGORY_LABEL[dict.category]}</SheetBlock>}
      <div style={{ fontSize: 11, color: 'var(--text-light)', fontWeight: 600, lineHeight: 1.5 }}>
        분류·설명은 베로로 성분 사전(수의·영양 가이드라인 기반) 기준이며 참고용이에요.
      </div>
    </div>
  );
}

function SheetBlock({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}
