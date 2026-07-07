/**
 * AnalysisSummaryHeader
 * 분석 결과 페이지 최상단 컴포넌트
 * - 좌측: 제품 이미지
 * - 우측: 등급 배지 (A/B/C/D/F), 브랜드명, 제품명, 적합성 배지
 */
import { ShieldCheck, ShieldAlert, ShieldX, Award } from 'lucide-react';
import type { CompatibilityGrade } from '../utils/score';

export type AnalysisGrade = CompatibilityGrade;

export interface SummaryHeaderProps {
  productImage: string;
  productName: string;
  brand: string;
  grade: AnalysisGrade;
  score: number;
  compliant: boolean;
  lifeStage: string;
}

const GRADE_META: Record<AnalysisGrade, { color: string; bg: string; label: string }> = {
  A: { color: '#15B36B', bg: 'rgba(21,179,107,0.12)', label: 'A등급' },
  B: { color: '#6BB04E', bg: 'rgba(107,176,78,0.12)', label: 'B등급' },
  C: { color: '#E8A800', bg: 'rgba(232,168,0,0.12)',  label: 'C등급' },
  D: { color: '#F04452', bg: 'rgba(240,68,82,0.12)',  label: 'D등급' },
  F: { color: '#8B95A1', bg: 'rgba(139,149,161,0.12)', label: 'F등급' },
};

export default function AnalysisSummaryHeader({
  productImage,
  productName,
  brand,
  grade,
  score,
  compliant,
  lifeStage,
}: SummaryHeaderProps) {
  const meta = GRADE_META[grade];

  return (
    <div className="summary-header">
      {/* Product image */}
      <div className="summary-img-wrap">
        <img
          src={productImage}
          alt={productName}
          className="summary-img"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
        />
      </div>

      {/* Info */}
      <div className="summary-info">
        {/* Grade badge */}
        <div
          className="summary-grade"
          style={{ color: meta.color, background: meta.bg, borderColor: meta.color }}
        >
          <Award size={28} style={{ marginBottom: 2 }} />
          <span className="summary-grade-label">{meta.label}</span>
          <span className="summary-grade-score">{score}점</span>
        </div>

        <div className="summary-meta">
          <span className="summary-brand">{brand}</span>
          <h1 className="summary-product-name">{productName}</h1>
          <span className="summary-life-stage">{lifeStage}</span>

          {/* Compliance badges */}
          <div className="summary-badges">
            {compliant ? (
              <span className="badge badge--green">
                <ShieldCheck size={13} style={{ marginRight: 4 }} />
                AAFCO 기준 충족
              </span>
            ) : (
              <span className="badge badge--red">
                <ShieldX size={13} style={{ marginRight: 4 }} />
                AAFCO 기준 미충족
              </span>
            )}
            <span className={`badge ${score >= 70 ? 'badge--green' : 'badge--yellow'}`}>
              <ShieldAlert size={13} style={{ marginRight: 4 }} />
              {score >= 70 ? '안심 사료' : '주의 필요'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
