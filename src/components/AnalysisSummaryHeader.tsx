// @ts-nocheck
/**
 * AnalysisSummaryHeader
 * 분석 결과 페이지 최상단 컴포넌트
 * - 좌측: 제품 이미지
 * - 우측: 등급 배지 (A/B/C/D/F), 브랜드명, 제품명, 적합성 배지
 */
import { ShieldCheck, ShieldAlert, ShieldX, Award } from 'lucide-react';

export type AnalysisGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface SummaryHeaderProps {
  productImage: string;
  productName: string;
  brand: string;
  grade: AnalysisGrade;
  score: number;          // 0-100
  compliant: boolean;     // AAFCO / NRC 충족 여부
  lifeStage: string;      // e.g. "성견용 (All Life Stages)"
}

const GRADE_META: Record<AnalysisGrade, { color: string; bg: string; label: string }> = {
  A: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  label: 'A등급' },
  B: { color: '#84cc16', bg: 'rgba(132,204,22,0.15)', label: 'B등급' },
  C: { color: '#eab308', bg: 'rgba(234,179,8,0.15)',  label: 'C등급' },
  D: { color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'D등급' },
  F: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'F등급' },
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
