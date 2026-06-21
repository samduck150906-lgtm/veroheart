// @ts-nocheck
/**
 * FeedingGuideCalculator
 *
 * RER = 70 × 체중^0.75 (Kleiber 법칙)
 * MER = RER × 활동계수 × 중성화보정 × 체형보정
 * 급여량(g) = 일일 kcal ÷ kcalPer100g × 100
 *
 * 활동량 4단계 기준 계수 (성견·중성화·정상체형 기준값):
 *   낮음 1.44 / 보통 1.60 / 높음 1.92 / 매우 높음 2.24
 * 중성화 보정: 중성화=×1.0, 미중성화=×1.1
 * 체형 보정: 정상=×1.0, 통통=×0.8, 마른=×1.2
 *
 * 체중관리 지방 위험 평가:
 *   라벨 농도 심사(지방% > 12% → 기준 초과)는 활동량과 무관하게 고정
 *   개인화 결과 위험(잉여 칼로리 → 실제 비만)은 활동량으로 크게 달라짐
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Utensils, Dog, Cat, Info, Flame, AlertTriangle } from 'lucide-react';
import type { ActivityLevel, BodyCondition } from '../types';

interface FeedingGuideProps {
  /** 사료 100g 당 칼로리 (kcal) */
  kcalPer100g: number;
  productName: string;
  /** 라벨 기준 조지방(as-fed %) — 미제공 시 위험 평가 생략 */
  fatPercent?: number;
}

/** 활동량 4단계: 성견·중성화·정상체형 기준 MER 계수 */
const ACTIVITY_FACTORS: Record<ActivityLevel, { label: string; factor: number; desc: string }> = {
  low:       { label: '낮음',     factor: 1.44, desc: '실내 위주, 산책 30분 미만' },
  normal:    { label: '보통',     factor: 1.60, desc: '하루 1–2회 산책, 일반 활동' },
  high:      { label: '높음',     factor: 1.92, desc: '활발한 운동, 하루 2시간 이상' },
  very_high: { label: '매우 높음', factor: 2.24, desc: '훈련견·스포츠견·작업견' },
};

/** 중성화 보정계수 */
const NEUTER_FACTOR = { neutered: 1.0, intact: 1.1 };

/** 체형 보정계수 */
const BODY_FACTOR: Record<BodyCondition, number> = {
  normal:     1.0,
  overweight: 0.8,
  thin:       1.2,
};

/** 체형 라벨 */
const BODY_LABELS: Record<BodyCondition, string> = {
  thin:       '마른편',
  normal:     '정상',
  overweight: '통통',
};

/** RER: Resting Energy Requirement (kcal/day) */
function calcRER(weightKg: number): number {
  return 70 * Math.pow(weightKg, 0.75);
}

/**
 * 지방 위험도 평가 — "농도 기준"과 "결과 위험"을 분리해서 반환
 *
 * 체중관리 라벨 기준 지방 최대값: 12 %
 * - 기준 초과 여부: 활동량과 무관하게 고정
 * - 실제 체중 증가 위험: 활동량이 높을수록 지방을 연료로 소모 → 위험 감소
 */
function evaluateFatRisk(
  fatPercent: number,
  activityLevel: ActivityLevel,
  dailyGrams: number,
): {
  labelFlag: 'ok' | 'over';        // 라벨 농도 기준 초과 여부
  resultRisk: 'low' | 'medium' | 'high'; // 실제 체중 증가 위험
  dailyFatG: number;               // 일일 지방 섭취량(g)
  fatCalPercent: number;           // 지방 칼로리 비율(%)
  insight: string;                 // 사용자 안내 메시지
} {
  const FAT_THRESHOLD = 12; // 체중관리 기준 상한 (%)
  const dailyFatG = Math.round(dailyGrams * (fatPercent / 100) * 10) / 10;
  const fatKcal = dailyFatG * 9;
  const totalKcal = dailyGrams * (fatPercent / 100) * 9
    + dailyGrams * ((100 - fatPercent) / 100) * 3.5; // rough estimate
  const fatCalPercent = Math.round((fatKcal / (dailyGrams * 3.5 + dailyFatG * (9 - 3.5))) * 100);

  const labelFlag = fatPercent > FAT_THRESHOLD ? 'over' : 'ok';

  const excessRatio = Math.max(0, (fatPercent - FAT_THRESHOLD) / FAT_THRESHOLD);

  const ACTIVITY_RISK_SCALE: Record<ActivityLevel, number> = {
    low:       1.0,
    normal:    0.70,
    high:      0.40,
    very_high: 0.10,
  };

  const riskScore = excessRatio * ACTIVITY_RISK_SCALE[activityLevel];
  const resultRisk: 'low' | 'medium' | 'high' =
    riskScore < 0.15 ? 'low' :
    riskScore < 0.50 ? 'medium' : 'high';

  const actLabel = ACTIVITY_FACTORS[activityLevel].label;
  const insightMap: Record<ActivityLevel, string> = {
    low: `활동량이 ${actLabel}이라 칼로리 한도가 좁습니다. 지방 ${fatPercent}%는 라벨 기준(12%)을 초과하므로 잉여 칼로리로 전환될 위험이 높습니다. 급여량을 10–15% 줄이거나 체중관리 전용 사료를 고려하세요.`,
    normal: `활동량이 ${actLabel}이라 지방 에너지를 부분적으로 소모합니다. 지방 ${fatPercent}%는 기준(12%)을 초과하므로 급여량을 약 10% 줄이는 것을 권장합니다.`,
    high: `활동량이 ${actLabel}이라 지방 대부분을 에너지원으로 소모합니다. 지방 ${fatPercent}%의 라벨 기준 초과는 실제 체중 증가로 이어질 가능성이 낮습니다.`,
    very_high: `활동량이 ${actLabel}이므로 하루 ${dailyFatG}g의 지방을 운동 연료로 소모합니다. 지방 ${fatPercent}%의 체중 부담은 사실상 상쇄됩니다.`,
  };

  return { labelFlag, resultRisk, dailyFatG, fatCalPercent, insight: insightMap[activityLevel] };
}

export default function FeedingGuideCalculator({ kcalPer100g, productName, fatPercent }: FeedingGuideProps) {
  const profile = useStore((s) => s.profile);
  const Icon = profile.species === 'Cat' ? Cat : Dog;

  const initWeight = profile.weightKg ?? profile.weight ?? (profile.age < 1 ? 3 : 10);
  const [weight, setWeight] = useState<number>(initWeight);
  const [activity, setActivity] = useState<ActivityLevel>(
    (profile.activityLevel as ActivityLevel) ?? 'normal'
  );
  const [isNeutered, setIsNeutered] = useState<boolean>(profile.isNeutered ?? true);
  const [bodyCondition, setBodyCondition] = useState<BodyCondition>(
    (profile.bodyCondition as BodyCondition) ?? 'normal'
  );

  const { rer, merFactor, dailyKcal } = useMemo(() => {
    const rer = calcRER(weight);
    const actFactor = ACTIVITY_FACTORS[activity].factor;
    const neuterCorr = isNeutered ? NEUTER_FACTOR.neutered : NEUTER_FACTOR.intact;
    const bodyCorr = BODY_FACTOR[bodyCondition];
    const merFactor = actFactor * neuterCorr * bodyCorr;
    return { rer: Math.round(rer), merFactor, dailyKcal: Math.round(rer * merFactor) };
  }, [weight, activity, isNeutered, bodyCondition]);

  const dailyGrams = useMemo(() => {
    if (!kcalPer100g) return 0;
    return Math.round((dailyKcal / kcalPer100g) * 100);
  }, [dailyKcal, kcalPer100g]);

  const mealGrams = Math.round(dailyGrams / 2);

  const fatRisk = useMemo(() => {
    if (!fatPercent || !dailyGrams) return null;
    return evaluateFatRisk(fatPercent, activity, dailyGrams);
  }, [fatPercent, activity, dailyGrams]);

  const riskColor = fatRisk
    ? fatRisk.resultRisk === 'low' ? '#15B36B'
      : fatRisk.resultRisk === 'medium' ? '#F59E0B'
      : '#F04452'
    : undefined;

  const riskBg = fatRisk
    ? fatRisk.resultRisk === 'low' ? '#ECFDF5'
      : fatRisk.resultRisk === 'medium' ? '#FFFBEB'
      : '#FFF1F2'
    : undefined;

  return (
    <div className="feeding-wrap">
      {/* Header */}
      <div className="feeding-header">
        <Icon size={20} />
        <h3 className="feeding-title">하루 급여 가이드</h3>
      </div>
      <p className="feeding-sub">
        {profile.name ? `${profile.name}에게 맞는` : '반려동물에게 맞는'} 급여량을 계산해 드려요
      </p>

      {/* Weight slider */}
      <div className="feeding-section">
        <div className="feeding-label-row">
          <span className="feeding-label">체중</span>
          <strong className="feeding-value">{weight} kg</strong>
        </div>
        <input
          type="range" min={0.5} max={60} step={0.5}
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="feeding-slider"
        />
        <div className="feeding-slider-marks">
          <span>0.5kg</span>
          <span>30kg</span>
          <span>60kg</span>
        </div>
      </div>

      {/* Activity level */}
      <div className="feeding-section">
        <div className="feeding-label">활동량</div>
        <div className="feeding-activity-grid">
          {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((key) => (
            <button
              key={key}
              title={ACTIVITY_FACTORS[key].desc}
              className={`feeding-activity-btn ${activity === key ? 'feeding-activity-btn--active' : ''}`}
              onClick={() => setActivity(key)}
            >
              {ACTIVITY_FACTORS[key].label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
          {ACTIVITY_FACTORS[activity].desc}
        </p>
      </div>

      {/* Neutered + Body Condition */}
      <div className="feeding-section" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {/* 중성화 */}
        <div style={{ flex: '1', minWidth: '120px' }}>
          <div className="feeding-label" style={{ marginBottom: '8px' }}>중성화 여부</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[true, false].map((val) => (
              <button
                key={String(val)}
                onClick={() => setIsNeutered(val)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: isNeutered === val ? '2px solid var(--brand, #3182F6)' : '1.5px solid var(--hairline)',
                  background: isNeutered === val ? 'var(--brand-tint, #EFF6FF)' : '#fff',
                  color: isNeutered === val ? 'var(--brand-deep, #1D4ED8)' : 'var(--ink-soft)',
                  cursor: 'pointer',
                }}
              >
                {val ? '중성화 ✓' : '미중성화'}
              </button>
            ))}
          </div>
        </div>

        {/* 체형 */}
        <div style={{ flex: '1', minWidth: '160px' }}>
          <div className="feeding-label" style={{ marginBottom: '8px' }}>체형</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(Object.keys(BODY_LABELS) as BodyCondition[]).map((cond) => (
              <button
                key={cond}
                onClick={() => setBodyCondition(cond)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: bodyCondition === cond ? '2px solid var(--brand, #3182F6)' : '1.5px solid var(--hairline)',
                  background: bodyCondition === cond ? 'var(--brand-tint, #EFF6FF)' : '#fff',
                  color: bodyCondition === cond ? 'var(--brand-deep, #1D4ED8)' : 'var(--ink-soft)',
                  cursor: 'pointer',
                }}
              >
                {BODY_LABELS[cond]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result card */}
      <div className="feeding-result">
        <div className="feeding-result-row">
          <div className="feeding-result-item feeding-result-item--primary">
            <span className="feeding-result-label">하루 권장량</span>
            <span className="feeding-result-num">{dailyGrams}g</span>
            <span className="feeding-result-sub">{dailyKcal} kcal</span>
          </div>
          <div className="feeding-result-divider" />
          <div className="feeding-result-item">
            <span className="feeding-result-label">1회 급여량</span>
            <span className="feeding-result-num">{mealGrams}g</span>
            <span className="feeding-result-sub">하루 2회 기준</span>
          </div>
          {fatPercent != null && fatRisk && (
            <>
              <div className="feeding-result-divider" />
              <div className="feeding-result-item">
                <span className="feeding-result-label">일일 지방 섭취</span>
                <span className="feeding-result-num" style={{ color: riskColor }}>{fatRisk.dailyFatG}g</span>
                <span className="feeding-result-sub">지방 {fatPercent}%</span>
              </div>
            </>
          )}
        </div>
        <div className="feeding-result-caption">
          <Utensils size={12} style={{ marginRight: 4 }} />
          {productName} 기준 · {kcalPer100g} kcal/100g · MER 계수 {merFactor.toFixed(2)} (RER {rer} kcal)
        </div>
      </div>

      {/* 지방 위험 평가 패널 */}
      {fatPercent != null && fatRisk && (
        <div
          style={{
            marginTop: '12px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: riskBg,
            border: `1px solid ${riskColor}33`,
          }}
        >
          {/* 2계층 안내 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            {fatRisk.resultRisk === 'high' ? (
              <AlertTriangle size={16} color={riskColor} />
            ) : fatRisk.resultRisk === 'low' ? (
              <Flame size={16} color={riskColor} />
            ) : (
              <Info size={16} color={riskColor} />
            )}
            <span style={{ fontSize: '13px', fontWeight: 800, color: riskColor }}>
              {fatRisk.resultRisk === 'high'
                ? '체중 부담 주의'
                : fatRisk.resultRisk === 'medium'
                ? '체중 부담 보통'
                : '활동량으로 상쇄'}
            </span>
          </div>

          {/* 라벨 농도 vs 결과 위험 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.7)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                라벨 농도 심사
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: fatRisk.labelFlag === 'over' ? '#F04452' : '#15B36B' }}>
                {fatRisk.labelFlag === 'over'
                  ? `기준 초과 (${fatPercent}% > 12%)`
                  : `기준 충족 (${fatPercent}%)`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                활동량과 무관하게 고정
              </div>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.7)',
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                실제 체중 증가 위험
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: riskColor }}>
                {fatRisk.resultRisk === 'low' ? '낮음 (연료로 소모)' : fatRisk.resultRisk === 'medium' ? '보통 (부분 연료)' : '높음 (잉여 위험)'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                활동량 {ACTIVITY_FACTORS[activity].label} 기준
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: 1.6, margin: 0 }}>
            {fatRisk.insight}
          </p>
        </div>
      )}

      <p className="feeding-disclaimer">
        ※ 본 수치는 참고용이며, 수의사의 처방과 다를 수 있습니다. 반드시 전문가와 상담하세요.
      </p>
    </div>
  );
}
