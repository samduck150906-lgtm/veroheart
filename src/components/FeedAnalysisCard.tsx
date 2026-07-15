/**
 * 사료성분 분석 카드 — analyzeFeed(규칙 기반) 결과를 시각화.
 * 제품 상세(PDP)에서 노출. 생성형 AI를 쓰지 않고 보장성분·원재료로만 계산한다.
 */
import { Check, X, AlertTriangle, ShieldCheck, FlaskConical, Flame } from 'lucide-react';
import type { Product, UserPetProfile } from '../types';
import { analyzeFeed, type FeedGrade } from '../analysis/feedAnalysis';

const GRADE_TONE: Record<FeedGrade, { fg: string; bg: string; label: string }> = {
  'A+': { fg: '#15803D', bg: '#DCFCE7', label: '매우 우수' },
  A: { fg: '#16A34A', bg: '#DCFCE7', label: '우수' },
  B: { fg: '#65A30D', bg: '#ECFCCB', label: '양호' },
  C: { fg: '#CA8A04', bg: '#FEF9C3', label: '보통' },
  D: { fg: '#EA580C', bg: '#FFEDD5', label: '주의' },
  F: { fg: '#DC2626', bg: '#FEE2E2', label: '비추천' },
};

const MACRO_META: { key: 'protein' | 'fat' | 'carb' | 'fiber' | 'moisture' | 'ash'; label: string; color: string }[] = [
  { key: 'protein', label: '조단백질', color: '#16A34A' },
  { key: 'fat', label: '조지방', color: '#F59E0B' },
  { key: 'carb', label: '탄수화물(추정)', color: '#3182F6' },
  { key: 'fiber', label: '조섬유', color: '#22C55E' },
  { key: 'ash', label: '조회분', color: 'var(--pdp-ink-faint)' },
  { key: 'moisture', label: '수분', color: '#38BDF8' },
];

function ChecklistRow({ ok, label, value, neutral }: { ok: boolean; label: string; value: string; neutral?: boolean }) {
  const color = neutral ? 'var(--pdp-ink-muted)' : ok ? '#16A34A' : '#DC2626';
  const bg = neutral ? 'var(--pdp-surface-soft)' : ok ? '#DCFCE7' : '#FEE2E2';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--pdp-surface-soft)' }}>
      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 999, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {neutral ? <span style={{ fontSize: 11, fontWeight: 900 }}>·</span> : ok ? <Check size={13} strokeWidth={3} /> : <X size={13} strokeWidth={3} />}
      </span>
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--pdp-ink-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

export default function FeedAnalysisCard({ product, profile }: { product: Product; profile: UserPetProfile }) {
  const a = analyzeFeed(product, profile);
  const tone = GRADE_TONE[a.grade];
  const iq = a.ingredientQuality;

  return (
    <section
      aria-label="사료성분 분석"
      style={{ background: 'var(--pdp-surface)', borderRadius: 24, padding: 20, marginBottom: 32, boxShadow: 'var(--pdp-e2)', border: '1px solid var(--pdp-line)' }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 900, color: 'var(--pdp-ink)' }}>
          <FlaskConical size={19} color="#7C3AED" /> 사료성분 분석
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--pdp-ink-muted)', background: 'var(--pdp-surface-soft)', borderRadius: 999, padding: '4px 10px', whiteSpace: 'nowrap' }}>
          규칙 기반 · AI 미사용
        </span>
      </div>

      {/* 품질 점수 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 2px 18px' }}>
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1, color: tone.fg, fontVariantNumeric: 'tabular-nums' }}>{a.score}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pdp-ink-faint)', marginTop: 2 }}>/ 100</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 14, fontWeight: 900, marginBottom: 6 }}>
            {a.grade}등급 · {tone.label}
          </span>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--pdp-ink-muted)', lineHeight: 1.5 }}>{a.summary}</p>
        </div>
      </div>

      {/* 영양 구성 (보장성분 실측치 있을 때) */}
      {a.macros ? (
        <div style={{ background: 'var(--pdp-surface-soft)', borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--pdp-ink)' }}>영양 구성 (라벨 보장성분)</span>
            {a.calories && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: '#B45309', background: '#FEF3C7', borderRadius: 999, padding: '3px 9px' }}>
                <Flame size={12} /> {a.calories.per100g} kcal/100g
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {MACRO_META.map((m) => {
              const v = a.macros![m.key];
              if (m.key !== 'protein' && m.key !== 'fat' && v <= 0) return null;
              return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 92, flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pdp-ink-muted)' }}>{m.label}</span>
                  <span style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--pdp-line)', overflow: 'hidden' }}>
                    <span style={{ display: 'block', width: `${Math.min(100, v)}%`, height: '100%', background: m.color, borderRadius: 999 }} />
                  </span>
                  <span style={{ width: 42, textAlign: 'right', fontSize: 12.5, fontWeight: 800, color: 'var(--pdp-ink)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(v)}%</span>
                </div>
              );
            })}
          </div>
          {a.macrosDMB && (
            <p style={{ margin: '12px 0 0', fontSize: 11.5, fontWeight: 600, color: 'var(--pdp-ink-muted)', lineHeight: 1.5 }}>
              건물기준(수분 제외) 조단백질 <b style={{ color: 'var(--pdp-ink)' }}>{a.macrosDMB.protein}%</b> · 조지방 <b style={{ color: 'var(--pdp-ink)' }}>{a.macrosDMB.fat}%</b>
              {a.calories && <> · 열량 배분 단백 {a.calories.distribution.protein}% / 지방 {a.calories.distribution.fat}% / 탄수 {a.calories.distribution.carb}%</>}
            </p>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--pdp-surface-soft)', borderRadius: 16, padding: '14px 16px', marginBottom: 14, fontSize: 12.5, fontWeight: 600, color: 'var(--pdp-ink-muted)', lineHeight: 1.5 }}>
          라벨 보장성분(조단백·조지방 등)이 등록돼 있지 않아 <b>원재료 기반</b>으로만 분석했어요.
        </div>
      )}

      {/* AAFCO 배지 */}
      {a.aafco.evaluated && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, marginBottom: 14,
            background: a.aafco.passed ? '#ECFDF5' : '#FEF2F2', color: a.aafco.passed ? '#15803D' : '#B91C1C',
          }}
        >
          {a.aafco.passed ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>
            AAFCO {a.aafco.label} 최소기준 {a.aafco.passed ? '충족' : '미달'}
          </span>
        </div>
      )}

      {/* 원료 품질 체크리스트 */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--pdp-ink)', marginBottom: 2 }}>원료 품질 체크</div>
        {iq.total === 0 ? (
          // 원재료 데이터 미등록 시 빨간 X("아니오"/"없음")로 미포함을 단정하지 않는다.
          // 데이터 부족과 실제 미포함은 다르다 → 중립 안내로 표시.
          <div
            style={{
              display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 8, padding: '12px 14px',
              borderRadius: 12, background: 'var(--pdp-surface-soft)', color: 'var(--pdp-ink-muted)',
              fontSize: 12.5, fontWeight: 600, lineHeight: 1.55,
            }}
          >
            <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 900, marginTop: 1 }}>·</span>
            <span>
              원재료 정보가 아직 등록되지 않아 <b>동물성 단백질·첨가물·기능성 원료</b>는 확인하기 어려워요.
              (정보가 없다는 뜻이지, 없다는 판정이 아니에요)
            </span>
          </div>
        ) : (
          <>
            <ChecklistRow ok={iq.firstIsAnimalProtein} label="제1원료가 동물성 단백질" value={iq.firstIsAnimalProtein ? (iq.firstIngredient ?? '예') : '아니오'} />
            <ChecklistRow ok={iq.animalProteins.length > 0} label="동물성 단백질 원료" value={`${iq.animalProteins.length}종`} />
            <ChecklistRow ok={iq.artificial.length === 0} label="합성 첨가물(색소·보존료 등)" value={iq.artificial.length === 0 ? '없음' : `${iq.artificial.length}개`} />
            <ChecklistRow ok={iq.byProducts.length === 0} label="부산물 원료" value={iq.byProducts.length === 0 ? '없음' : '포함'} />
            <ChecklistRow ok={iq.fillers.length < 2} label="곡물·충전제 계열" value={iq.fillers.length === 0 ? '없음' : `${iq.fillers.length}개`} />
            <ChecklistRow neutral ok={iq.functional.length > 0} label="기능성 원료(유산균·오메가 등)" value={iq.functional.length > 0 ? `${iq.functional.length}종` : '미확인'} />
            <ChecklistRow neutral ok label="안전 / 주의 / 위험 성분" value={`${iq.safeCount} / ${iq.cautionCount} / ${iq.dangerCount}`} />
          </>
        )}
      </div>

      {/* 좋은 점 / 주의할 점 */}
      {a.positives.length > 0 && (
        <div style={{ background: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#15803D', marginBottom: 8 }}>좋은 점</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.positives.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 600, color: '#166534', lineHeight: 1.5 }}>
                <Check size={15} strokeWidth={2.6} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.cautions.length > 0 && (
        <div style={{ background: '#FFF7ED', borderRadius: 14, padding: 14, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#C2410C', marginBottom: 8 }}>주의할 점</div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {a.cautions.map((t, i) => (
              <li key={i} style={{ display: 'flex', gap: 8, fontSize: 13, fontWeight: 600, color: '#9A3412', lineHeight: 1.5 }}>
                <AlertTriangle size={15} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }} /> <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={{ margin: '6px 2px 0', fontSize: 11, fontWeight: 600, color: 'var(--pdp-ink-faint)', lineHeight: 1.5 }}>{a.disclaimer}</p>
    </section>
  );
}
