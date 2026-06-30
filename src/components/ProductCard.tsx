import { useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { getRecommendationBreakdown, getProductBadges } from '../utils/score';
import ProductImage from './ProductImage';
import AnalysisBadges from './AnalysisBadges';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  showHealthTags?: boolean;
  variant?: 'horizontal' | 'vertical';
  rank?: number;
  /** 스폰서 슬롯에서 렌더링될 때 true — 추천 영역과 구분되는 광고 배지를 표시 */
  isSponsorSlot?: boolean;
};

const SponsorBadge = ({ label }: { label: string }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center',
    padding: '2px 7px', borderRadius: 5,
    fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
    background: '#F2F4F6', color: '#6B7684', border: '1px solid #E5E8EB',
    flexShrink: 0,
  }}>{label}</span>
);

export default function ProductCard({
  product,
  showHealthTags = true,
  variant = 'horizontal',
}: ProductCardProps) {
  const { favorites, toggleFavorite, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const breakdown = getRecommendationBreakdown(product, profile);
  const score = breakdown.total;
  const badges = getProductBadges(breakdown);
  const isFav = favorites.includes(product.id);
  const imageSize = compact ? 86 : 100;

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      notify.info('로그인하면 찜한 제품을 저장하고 다시 볼 수 있어요.');
      navigate('/login');
      return;
    }
    toggleFavorite(product.id);
  };

  const formattedPrice = product.price ? `${product.price.toLocaleString('ko-KR')}원~` : '';

  if (variant === 'vertical') {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <Link
          to={`/product/${product.id}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}
        >
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              backgroundColor: 'var(--surface-muted)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <ProductImage
              src={product.imageUrl}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'var(--ink-faint)' }}>{product.brand}</span>
          <span style={{
            fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            height: '38px'
          }} title={product.name}>
            {product.name}
          </span>
          {showHealthTags && product.healthConcerns && product.healthConcerns.length > 0 && (
            <span style={{ fontSize: 11.5, color: 'var(--brand-deep)', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {product.healthConcerns.join(' · ')}
            </span>
          )}
          <AnalysisBadges badges={badges} style={{ marginTop: 1 }} />
          {formattedPrice && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-faint)' }}>최저가</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{formattedPrice}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Horizontal variant (default row styling)
  return (
    <div
      style={{
        position: 'relative',
        marginBottom: compact ? 0 : '12px',
        padding: '12px',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer',
      }}
    >
      {rank != null && (
        <span style={{
          width: 22, textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 20,
          color: rank <= 3 ? 'var(--brand-deep)' : 'var(--ink-faint)', flexShrink: 0
        }}>{rank}</span>
      )}
      <div style={{ width: 78, height: 78, flexShrink: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--hairline)' }}>
        <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--ink-faint)' }}>{product.brand}</span>
        <span style={{
          fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{product.name}</span>
        {score != null && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-deep)', background: 'var(--brand-tint)', padding: '3px 9px', borderRadius: '8px' }}>
              궁합 {score}점
            </span>
          </div>
        )}
        <AnalysisBadges badges={badges} style={{ marginTop: 2 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <Star size={13} fill="var(--brand)" stroke="var(--brand)" strokeWidth={1.2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>{product.averageRating.toFixed(1)}</span>
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>리뷰 {product.reviewsCount}</span>
        </div>
        {formattedPrice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-faint)' }}>최저가</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-soft)' }}>{formattedPrice}</span>
          </div>
        )}
      </div>
      <span
        onClick={handleToggleFav}
        style={{ alignSelf: 'flex-start', padding: 4, cursor: 'pointer' }}
      >
        <div
          style={{
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            borderRadius: '12px',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: 'var(--surface-muted)',
          }}
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            paddingRight: '24px',
            minWidth: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-light)',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}
            >
              {product.brand}
            </div>
            <div
              className="line-clamp-2"
              style={{
                fontSize: compact ? '13px' : '14px',
                fontWeight: 600,
                marginTop: '2px',
                lineHeight: 1.4,
                color: 'var(--text-dark)',
                letterSpacing: '-0.01em',
              }}
            >
              {product.name}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {formatPrice(product.price)}
              </span>
              {product.reviewsCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    fontSize: '11px',
                    color: 'var(--text-light)',
                    fontWeight: 500,
                  }}
                >
                  <Star size={10} fill="#94A3B8" color="#94A3B8" strokeWidth={0} />
                  {product.averageRating.toFixed(1)}
                </span>
              )}
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: score >= 80 ? 'var(--safe)' : score >= 50 ? 'var(--warning)' : 'var(--danger)',
                letterSpacing: '-0.01em',
              }}
            >
              궁합 {score}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(product.id);
        }}
        aria-label={isFav ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
        aria-pressed={isFav}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '6px',
          color: isFav ? 'var(--danger)' : 'var(--text-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Heart size={16} fill={isFav ? 'var(--danger)' : 'none'} strokeWidth={isFav ? 0 : 1.8} />
      </button>
    </div>
  );
}
