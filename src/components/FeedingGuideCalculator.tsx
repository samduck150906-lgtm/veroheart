// @ts-nocheck
/**
 * FeedingGuideCalculator
 * - 반려동물 프로필(체중, 활동량)에 따라 하루 급여량 자동 계산
 * - RER(안정대사율) × 생활계수 → 칼로리 → 그램 변환
 * - 슬라이더로 체중/칼로리 밀도 직접 조절 가능
 */
import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Utensils, Dog, Cat } from 'lucide-react';

interface FeedingGuideProps {
  /** 사료 100g 당 칼로리 (kcal) */
  kcalPer100g: number;
  productName: string;
}

type ActivityLevel = 'low' | 'normal' | 'high' | 'working';

const ACTIVITY_FACTORS: Record<ActivityLevel, { label: string; factor: number }> = {
  low:     { label: '저활동 (실내)', factor: 1.2 },
  normal:  { label: '보통',          factor: 1.6 },
  high:    { label: '고활동',        factor: 2.0 },
  working: { label: '활동견/운동',   factor: 5.0 },
};

/** RER: Resting Energy Requirement (kcal/day) */
function calcRER(weightKg: number) {
  return 70 * Math.pow(weightKg, 0.75);
}

export default function FeedingGuideCalculator({ kcalPer100g, productName }: FeedingGuideProps) {
  const profile  = useStore((s) => s.profile);
  const speciesIcon = profile.species === 'Cat' ? Cat : Dog;
  const Icon = speciesIcon;

  const [weight,   setWeight  ] = useState<number>(profile.age < 1 ? 3 : 10);
  const [activity, setActivity] = useState<ActivityLevel>('normal');
  const [custom,   setCustom  ] = useState(false);

  const dailyKcal = useMemo(() => {
    const rer    = calcRER(weight);
    const factor = ACTIVITY_FACTORS[activity].factor;
    return Math.round(rer * factor);
  }, [weight, activity]);

  const dailyGrams = useMemo(() => {
    if (!kcalPer100g) return 0;
    return Math.round((dailyKcal / kcalPer100g) * 100);
  }, [dailyKcal, kcalPer100g]);

  const mealGrams = Math.round(dailyGrams / 2);

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
              className={`feeding-activity-btn ${activity === key ? 'feeding-activity-btn--active' : ''}`}
              onClick={() => setActivity(key)}
            >
              {ACTIVITY_FACTORS[key].label}
            </button>
          ))}
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
        </div>
        <div className="feeding-result-caption">
          <Utensils size={12} style={{ marginRight: 4 }} />
          {productName} 기준 · {kcalPer100g} kcal / 100g
        </div>
      </div>

      <p className="feeding-disclaimer">
        ※ 본 수치는 참고용이며, 수의사의 처방과 다를 수 있습니다. 반드시 전문가와 상담하세요.
      </p>
    </div>
  );
}
