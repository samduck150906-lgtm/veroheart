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
import BottomSheet from '../components/BottomSheet';
import StateView from '../components/StateView';
import type { Ingredient, Product } from '../types';

/* ── 등급·위험도 시각 토큰 (신호등) ───────────────────────── */
const GRADE_COLOR: Record<CompatibilityGrade, string> = {
  A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452', F: '#8B95A1',
};
const GRADE_LABEL: Record<CompatibilityGrade, string> = {
  A: '아주 잘 맞아요', B: '잘 맞는 편이에요', C: '보통이에요', D: '주의가 필요해요', F: '맞지 않아요',
};
const RISK = {
  safe:    { color: '#15B36B', bg: '#E7F8F0', label: '안전' },
  caution: { color: '#E8A800', bg: '#FEF6E0', label: '주의' },
  danger:  { color: '#F04452', bg: '#FDECEE', label: '위험' },
} as const;

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
          <circle cx="64" cy="64" r={r} fill="none" stroke="#EFF1F4" strokeWidth="11" />
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
    if (productId) return products.find((p) => p.id === productId) || selectedProduct || undefined;
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
    ].filter(Boolean) as string[];
    const fromReport = (report?.highlights ?? []).filter((h) => h.type !== 'positive').map((h) => h.text);
    return Array.from(new Set([...base, ...fromReport]));
  }, [cautionIngredients, dangerIngredients, breakdown, report]);

  // ── 영양 추정 (라벨 데이터가 없어 형태 기반 근사) ──
  const nutrition = useMemo(() => {
    const name = product?.name ?? '';
    const cat = product?.category ?? '';
    const form = product?.formulation ?? '';
    const isWet = form.includes('습식') || cat.includes('습식') || /캔|수프/.test(name);
    const isSnack = cat.includes('간식') || /져키|껌|츄/.test(name);
    if (isWet) return { protein: 10, fat: 5, carbs: 5, others: 80, kcal: 95 };
    if (isSnack) return { protein: 15, fat: 5, carbs: 54, others: 26, kcal: 320 };
    return { protein: 30, fat: 16, carbs: 31, others: 23, kcal: 390 };
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
        description="상품 상세에서 ‘AI 정밀 분석’을 눌러 주세요."
        action={{ label: '상품 탐색하기', onClick: () => navigate('/search') }}
      />
    );
  }

  return (
    <div style={{ padding: '0 16px 120px' }}>
      <Helmet>
        <title>{product.name} AI 분석 결과 | 베로로</title>
        <meta name="description" content={`${product.name} AI 성분 분석 결과 — ${grade}등급`} />
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
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-dark)' }}>AI 영양 리포트</span>
      </header>

      {/* Product card */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#fff', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 20, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
        <img
          src={product.imageUrl}
          alt={product.name}
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
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6B5E00', lineHeight: 1.5 }}>
            우리 아이 프로필을 등록하면 알레르기·건강 고민까지 반영한 <b>맞춤 점수</b>를 볼 수 있어요.
          </span>
        </button>
      )}

      {/* Hard-cap / allergy banner */}
      {capped && breakdown && (
        <div style={{
          display: 'flex', gap: 12, alignItems: 'flex-start', padding: 16, borderRadius: 16, marginBottom: 4,
          background: breakdown.allergyHits.length > 0 ? RISK.danger.bg : RISK.caution.bg,
          border: `1px solid ${breakdown.allergyHits.length > 0 ? '#FECDD3' : '#FDE68A'}`,
        }}>
          <AlertCircle size={20} color={breakdown.allergyHits.length > 0 ? RISK.danger.color : RISK.caution.color} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: breakdown.allergyHits.length > 0 ? '#BE123C' : '#92400E', marginBottom: 4 }}>
              {breakdown.allergyHits.length > 0
                ? `${breakdown.allergyHits.join(', ')}이(가) 들어 있어요`
                : `주의가 필요한 성분 ${breakdown.dangerCount}개 포함`}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: breakdown.allergyHits.length > 0 ? '#BE123C' : '#92400E', opacity: 0.85, lineHeight: 1.5 }}>
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
              background: activeTab === t ? '#fff' : 'transparent',
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
            <div style={{ background: '#fff', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.6 }}>
              {report.summary}
            </div>
          )}
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
          <div style={{ background: '#fff', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)', marginBottom: 14 }}>영양 구성</div>
            <NutritionDonut n={nutrition} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--secondary)', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-dark)', letterSpacing: '-0.03em' }}>{nutrition.kcal}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-dark)' }}>kcal / 100g</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginTop: 2 }}>제품 형태 기준 추정 열량이에요</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: 전성분 */}
      {activeTab === '전성분' && (
        <div style={{ background: '#fff', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
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

      {/* Ingredient detail sheet */}
      <BottomSheet isOpen={Boolean(selectedIng)} onClose={() => setSelectedIng(null)} title={selectedIng?.nameKo ?? '성분 정보'}>
        {selectedIng && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: (RISK[selectedIng.riskLevel] ?? RISK.safe).color, background: (RISK[selectedIng.riskLevel] ?? RISK.safe).bg, borderRadius: 999, padding: '5px 12px' }}>
                {(RISK[selectedIng.riskLevel] ?? RISK.safe).label} 성분
              </span>
              {selectedIng.nameEn && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{selectedIng.nameEn}</span>}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4 }}>역할</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', lineHeight: 1.6 }}>{selectedIng.purpose || '원료'}</div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/* ── 재사용 소블록 ───────────────────────────────────────── */
function InfoBlock({ title, color, items, empty }: { title: string; color: string; items: string[]; empty: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(28,25,23,0.06)', borderRadius: 16, padding: 16 }}>
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
