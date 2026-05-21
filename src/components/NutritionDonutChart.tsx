// @ts-nocheck
/**
 * NutritionDonutChart
 * - Recharts PieChart/Cell 을 이용해 영양소 비율을 도넛 차트로 시각화
 * - 건물 기준(Dry Matter Basis) 변환 로직 포함
 * - 수분 함량을 제거한 실질 영양소 비율을 표시
 */
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Info } from 'lucide-react';
import { useState } from 'react';

export interface NutritionFact {
  /** 표기된 단백질 (%) as-fed */
  protein: number;
  /** 표기된 지방 (%) as-fed */
  fat: number;
  /** 표기된 탄수화물 (%) as-fed — 계산된 값 or 표기 값 */
  carbs: number;
  /** 조회분 (%) as-fed */
  ash: number;
  /** 수분 (%) as-fed */
  moisture: number;
}

interface NutritionDonutChartProps {
  nutrition: NutritionFact;
}

/** DMB(Dry Matter Basis) 변환: 건물 기준 % */
function toDMB(value: number, moisture: number): number {
  const dryMatter = 100 - moisture;
  return dryMatter > 0 ? parseFloat(((value / dryMatter) * 100).toFixed(1)) : 0;
}

const COLORS = ['#81C995', '#60a5fa', '#f59e0b', '#a78bfa'];
const LABELS = ['단백질', '지방', '탄수화물', '조회분'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { name, value } = payload[0];
    return (
      <div className="donut-tooltip">
        <strong>{name}</strong>
        <span>{value}%</span>
      </div>
    );
  }
  return null;
};

export default function NutritionDonutChart({ nutrition }: NutritionDonutChartProps) {
  const [showDMB, setShowDMB] = useState(true);
  const { protein, fat, carbs, ash, moisture } = nutrition;

  const raw  = [protein, fat, carbs, ash];
  const dmb  = raw.map((v) => toDMB(v, moisture));
  const data = (showDMB ? dmb : raw).map((value, i) => ({
    name: LABELS[i],
    value,
  }));

  return (
    <div className="donut-wrap">
      {/* Header */}
      <div className="donut-header">
        <h3 className="donut-title">영양소 구성</h3>
        <button
          className={`donut-toggle ${showDMB ? 'donut-toggle--active' : ''}`}
          onClick={() => setShowDMB((v) => !v)}
        >
          {showDMB ? '건물 기준 (DMB)' : '표기 기준 (As-Fed)'}
        </button>
      </div>

      {/* DMB hint */}
      {showDMB && (
        <div className="donut-hint">
          <Info size={12} style={{ flexShrink: 0 }} />
          <span>수분({moisture}%)을 제거한 건물 기준 영양소 비율입니다. 사료 간 정확한 비교에 사용되는 표준 방식입니다.</span>
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={68}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            animationBegin={0}
            animationDuration={800}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={10}
            formatter={(value) => <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Stat pills */}
      <div className="donut-stats">
        {data.map((d, i) => (
          <div key={i} className="donut-stat-pill" style={{ borderColor: COLORS[i] }}>
            <span className="donut-stat-label" style={{ color: COLORS[i] }}>{d.name}</span>
            <span className="donut-stat-value">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
