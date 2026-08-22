import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { buildAllergyDisplayState, type AllergyDisplayLevel } from '../utils/allergyDisplay';
import { normalizeProductDisplayName } from '../utils/productDisplay';
import { VR } from '../lib/veroroDesign';
import type { Product } from '../types';
import type { UserPetProfile } from '../types';

/** 비교표에 한 번에 세울 수 있는 최대 제품 수 — 프로토타입 문구('최대 3개')와 동일 */
const MAX_COLUMNS = 3;

interface Column {
  product: Product;
  grade: string;
  score: number;
  kcal: string;
  protein: string;
  signalText: string;
  allergyText: string;
  allergyLevel: AllergyDisplayLevel;
}

function buildColumn(product: Product, profile: UserPetProfile): Column {
  const { score, grade, breakdown } = resolveProductDisplayVerdict(product, profile);
  const kcalValue = product.caloriesPer100g ?? product.guaranteedAnalysis?.kcalPer100g;
  const proteinValue = product.guaranteedAnalysis?.crudeProtein;
  const goodCount = product.ingredients?.filter((i) => i.riskLevel === 'safe').length ?? 0;
  const warnCount = breakdown.dangerCount + breakdown.cautionCount;
  const allergyDisplay = buildAllergyDisplayState(breakdown, profile.name || '우리 아이');

  return {
    product,
    grade,
    score,
    kcal: kcalValue ? `${Math.round(kcalValue)}kcal` : '—',
    protein: proteinValue ? `${proteinValue}%` : '—',
    signalText: `주의 ${warnCount} · 좋음 ${goodCount}`,
    allergyText: allergyDisplay.shortText,
    allergyLevel: allergyDisplay.level,
  };
}

export default function Comparison() {
  const navigate = useNavigate();
  const { profile, products: storeProducts, comparisonList, removeFromComparison } = useStore();

  const columns = useMemo(() => {
    return comparisonList
      .map((id) => storeProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p))
      .slice(0, MAX_COLUMNS)
      .map((p) => buildColumn(p, profile));
  }, [comparisonList, storeProducts, profile]);

  const petName = profile.name || '우리 아이';

  if (columns.length === 0) {
    return (
      <div style={{ padding: '14px 0 40px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em' }}>비교함</h1>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: VR.muted }}>최대 {MAX_COLUMNS}개까지 나란히 볼 수 있어.</p>
        <div className="vr-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 18px', fontSize: '14px', color: VR.muted, lineHeight: 1.6 }}>
            아직 담은 제품이 없어.<br />탐색에서 &lsquo;비교&rsquo;를 눌러 담아봐.
          </p>
          <button type="button" className="vr-btn vr-btn--primary" style={{ width: 'auto', padding: '13px 22px' }} onClick={() => navigate('/search')}>
            비교할 제품 탐색하기
          </button>
        </div>
      </div>
    );
  }

  const rows: { label: string; values: string[]; tone?: (col: Column) => string }[] = [
    { label: '등급', values: columns.map((c) => `${c.grade} ${c.score}`) },
    { label: '열량', values: columns.map((c) => c.kcal) },
    { label: '조단백', values: columns.map((c) => c.protein) },
    { label: '평점', values: columns.map((c) => (c.product.reviewsCount > 0 ? `★ ${c.product.averageRating.toFixed(1)}` : '—')) },
    { label: '성분 신호', values: columns.map((c) => c.signalText) },
    {
      label: `${petName} 알레르기`,
      values: columns.map((c) => c.allergyText),
      tone: (c) =>
        c.allergyLevel === 'hard'
          ? 'var(--danger-strong)'
          : c.allergyLevel === 'caution'
            ? 'var(--caution-strong)'
            : 'var(--vr-body-2)',
    },
  ];

  const best = columns.reduce((a, b) => (b.score > a.score ? b : a));
  const gridTemplate = `74px repeat(${columns.length}, 1fr)`;
  const bestAllergyCopy =
    best.allergyLevel === 'hard'
      ? '다만 알레르기 성분이 포함돼 있어 급여 전 확인이 필요해.'
      : best.allergyLevel === 'caution'
        ? `${petName}의 알레르기와 관련된 원료가 있어 급여 전 확인이 필요해.`
        : `${petName} 알레르기 성분은 들어 있지 않아.`;

  return (
    <div className="vr-anim-fade" style={{ padding: '14px 0 24px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.04em' }}>비교함</h1>
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: VR.muted }}>최대 {MAX_COLUMNS}개까지 나란히 볼 수 있어.</p>

      <div
        className="vr-card"
        style={{ display: 'grid', gridTemplateColumns: gridTemplate, borderRadius: '16px', overflow: 'hidden', fontSize: '12.5px' }}
      >
        <div style={{ background: 'var(--vr-soft)', padding: '11px 10px', fontWeight: 800, color: VR.sub, fontSize: '11px' }}>제품</div>
        {columns.map((c) => (
          <div key={c.product.id} style={{ background: 'var(--vr-soft)', padding: '11px 10px', borderLeft: '1px solid var(--vr-card-line)', position: 'relative' }}>
            <div style={{ fontSize: '11px', color: VR.sub, fontWeight: 700 }}>{c.product.brand}</div>
            <div style={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, marginTop: '2px', paddingRight: '16px' }}>
              {normalizeProductDisplayName(c.product)}
            </div>
            <button
              type="button"
              onClick={() => removeFromComparison(c.product.id)}
              aria-label={`${c.product.name} 비교함에서 빼기`}
              style={{
                position: 'absolute', top: '6px', right: '6px', border: 'none', background: 'none',
                cursor: 'pointer', color: VR.sub, padding: '2px', lineHeight: 0,
              }}
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {rows.map((row) => (
          <div key={row.label} style={{ display: 'contents' }}>
            <div style={{ padding: '12px 10px', borderTop: '1px solid var(--vr-row-line)', fontWeight: 800, color: VR.sub, fontSize: '11px' }}>
              {row.label}
            </div>
            {row.values.map((value, i) => (
              <div
                key={`${row.label}-${columns[i].product.id}`}
                style={{
                  padding: '12px 10px', borderTop: '1px solid var(--vr-row-line)', borderLeft: '1px solid var(--vr-card-line)',
                  fontWeight: 700, color: row.tone ? row.tone(columns[i]) : (i === 0 ? 'var(--vr-ink)' : 'var(--vr-body-2)'),
                }}
              >
                {value}
              </div>
            ))}
          </div>
        ))}
      </div>

      {columns.length > 1 && (
        <div
          style={{
            marginTop: '14px', background: 'var(--vr-yellow-tint)', border: '1.5px solid var(--vr-yellow)',
            borderRadius: '16px', padding: '15px',
          }}
        >
          <div style={{ fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {petName}라면 &lsquo;{normalizeProductDisplayName(best.product)}&rsquo;가 나아
          </div>
          <p style={{ margin: '7px 0 0', fontSize: '12.5px', lineHeight: 1.55, color: 'var(--vr-body)' }}>
            프로필 기준 종합 {best.score}점으로 가장 높아. {bestAllergyCopy}
          </p>
        </div>
      )}

      <button
        type="button"
        className="vr-btn vr-btn--outline"
        style={{ marginTop: '12px' }}
        onClick={() => navigate('/search')}
      >
        제품 더 담으러 가기
      </button>
    </div>
  );
}
