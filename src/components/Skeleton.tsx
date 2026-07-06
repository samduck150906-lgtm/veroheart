import type { CSSProperties } from 'react';

/**
 * Skeleton — 로딩 중 레이아웃을 유지하는 shimmer 플레이스홀더.
 * 실제 콘텐츠와 동일한 높이를 잡아 레이아웃 시프트를 막는다.
 * shimmer 애니메이션은 index.css의 `.vero-skeleton` / `@keyframes veroShimmer`.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden
      className="vero-skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  );
}

/** 제품 카드 스켈레톤 — ProductCard 그리드형과 동일 비율(이미지 1:1 + 2줄 텍스트 + 가격줄) */
export function ProductCardSkeleton() {
  return (
    <div className="card" style={{ display: 'grid', gap: 8, padding: 12 }}>
      <Skeleton height={0} style={{ paddingBottom: '100%', height: 0 }} radius={14} />
      <Skeleton width="40%" height={11} />
      <Skeleton width="90%" height={14} />
      <Skeleton width="55%" height={14} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <Skeleton width="35%" height={14} />
        <Skeleton width="20%" height={14} radius={10} />
      </div>
    </div>
  );
}

/** 2열 제품 그리드 스켈레톤 (검색·리스트 로딩용) */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="ui-grid-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
