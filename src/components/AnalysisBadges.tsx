import type { ProductBadge } from '../utils/score';

const BADGE_TONE: Record<ProductBadge['tone'], { bg: string; color: string }> = {
  good: { bg: '#E7F8F0', color: '#15B36B' },
  warn: { bg: '#FEF6E0', color: '#B45309' },
  danger: { bg: '#FDECEE', color: '#D92D20' },
};

/** 목록 카드에서 분석 신호(알러지/DCM/AAFCO 등)를 작은 배지로 노출한다. */
export default function AnalysisBadges({
  badges,
  style,
}: {
  badges: ProductBadge[];
  style?: React.CSSProperties;
}) {
  if (!badges.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, ...style }}>
      {badges.map((b) => {
        const tone = BADGE_TONE[b.tone];
        return (
          <span
            key={b.label}
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              padding: '2px 7px',
              borderRadius: 6,
              background: tone.bg,
              color: tone.color,
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </span>
        );
      })}
    </div>
  );
}
