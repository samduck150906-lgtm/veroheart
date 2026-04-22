import { useId, useMemo } from 'react';

export interface FishboneCause {
  label: string;
  tone?: 'positive' | 'caution' | 'danger' | 'neutral';
}

export interface FishboneCategory {
  label: string;
  causes: FishboneCause[];
}

export interface FishboneDiagramProps {
  effect: string;
  categories: FishboneCategory[];
  caption?: string;
  compact?: boolean;
}

const TONE_COLORS: Record<NonNullable<FishboneCause['tone']>, string> = {
  positive: '#059669',
  caution: '#B45309',
  danger: '#B91C1C',
  neutral: '#475569',
};

const SPINE_COLOR = '#0F172A';
const BONE_COLOR = '#CBD5E1';

/**
 * SVG-based Ishikawa (fishbone) diagram.
 *
 * - The spine runs horizontally to the effect "head" on the right.
 * - Categories alternate above/below the spine (top, bottom, top, bottom …).
 * - Each category bone carries its causes as short parallel twigs.
 *
 * The diagram scales to its container via viewBox, so it stays crisp on
 * mobile widths while remaining readable.
 */
export default function FishboneDiagram({
  effect,
  categories,
  caption,
  compact = false,
}: FishboneDiagramProps) {
  const titleId = useId();

  const width = 920;
  const height = compact ? 360 : 440;
  const midY = height / 2;
  const spineStartX = 60;
  const spineEndX = width - 180;
  const headPadding = 18;

  const layout = useMemo(() => {
    if (categories.length === 0) return [];
    const slotCount = categories.length;
    const span = spineEndX - spineStartX - 40;
    const step = span / (slotCount + 1);
    return categories.map((category, idx) => {
      const side: 'top' | 'bottom' = idx % 2 === 0 ? 'top' : 'bottom';
      const anchorX = spineStartX + step * (idx + 1) + 20;
      const boneLength = compact ? 110 : 140;
      const boneDx = 70;
      const endX = anchorX - boneDx;
      const endY = side === 'top' ? midY - boneLength : midY + boneLength;
      return { category, side, anchorX, endX, endY };
    });
  }, [categories, compact, midY, spineEndX]);

  return (
    <figure
      role="group"
      aria-labelledby={titleId}
      style={{
        margin: 0,
        padding: compact ? '16px 12px' : '20px 16px',
        borderRadius: '20px',
        background: '#fff',
        border: '1px solid #E2E8F0',
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.05)',
      }}
    >
      <figcaption
        id={titleId}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '10px',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#64748B',
              textTransform: 'uppercase',
            }}
          >
            Fishbone · 원인 분석
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {effect}
          </div>
        </div>
        {caption ? (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#94A3B8',
              maxWidth: '55%',
              textAlign: 'right',
              lineHeight: 1.45,
            }}
          >
            {caption}
          </div>
        ) : null}
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${effect} 원인 분석 도식`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <line
          x1={spineStartX}
          y1={midY}
          x2={spineEndX}
          y2={midY}
          stroke={SPINE_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <polygon
          points={`${spineStartX - 18},${midY} ${spineStartX - 4},${midY - 10} ${spineStartX - 4},${midY + 10}`}
          fill={SPINE_COLOR}
        />

        <g transform={`translate(${spineEndX + headPadding}, ${midY})`}>
          <rect
            x={0}
            y={-36}
            rx={16}
            ry={16}
            width={160}
            height={72}
            fill="#0F172A"
          />
          <text
            x={80}
            y={-4}
            textAnchor="middle"
            fill="#FDE68A"
            fontSize={11}
            fontWeight={700}
            letterSpacing={1.5}
          >
            EFFECT
          </text>
          <text
            x={80}
            y={18}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize={13}
            fontWeight={800}
          >
            {effect.length > 18 ? `${effect.slice(0, 17)}…` : effect}
          </text>
        </g>

        {layout.map(({ category, side, anchorX, endX, endY }, idx) => {
          const labelY = side === 'top' ? endY - 12 : endY + 22;
          const causeDirection = side === 'top' ? -1 : 1;
          const causeStep = compact ? 22 : 26;
          const boneStartY = midY + (side === 'top' ? -4 : 4);
          return (
            <g key={`${category.label}-${idx}`}>
              <line
                x1={anchorX}
                y1={boneStartY}
                x2={endX}
                y2={endY}
                stroke={BONE_COLOR}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <rect
                x={endX - 78}
                y={labelY - 14}
                rx={10}
                ry={10}
                width={156}
                height={22}
                fill="#F8FAFC"
                stroke="#E2E8F0"
              />
              <text
                x={endX}
                y={labelY + 1}
                textAnchor="middle"
                fill="#0F172A"
                fontSize={12}
                fontWeight={800}
              >
                {category.label}
              </text>

              {category.causes.slice(0, 4).map((cause, ci) => {
                const twigAnchorT = 0.35 + ci * 0.18;
                const twigX = anchorX + (endX - anchorX) * twigAnchorT;
                const twigY = boneStartY + (endY - boneStartY) * twigAnchorT;
                const twigEndY = twigY + causeDirection * causeStep;
                const twigEndX = twigX - 34;
                const textY = twigEndY + (side === 'top' ? -4 : 10);
                const color = TONE_COLORS[cause.tone ?? 'neutral'];
                return (
                  <g key={`${category.label}-cause-${ci}`}>
                    <line
                      x1={twigX}
                      y1={twigY}
                      x2={twigEndX}
                      y2={twigEndY}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeLinecap="round"
                      opacity={0.85}
                    />
                    <text
                      x={twigEndX - 4}
                      y={textY}
                      textAnchor="end"
                      fill={color}
                      fontSize={11}
                      fontWeight={600}
                    >
                      {cause.label}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginTop: '12px',
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748B',
        }}
      >
        <LegendDot color={TONE_COLORS.positive} label="강점" />
        <LegendDot color={TONE_COLORS.caution} label="주의" />
        <LegendDot color={TONE_COLORS.danger} label="위험" />
        <LegendDot color={TONE_COLORS.neutral} label="참고" />
      </div>
    </figure>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}
