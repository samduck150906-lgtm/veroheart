import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';
import ProductImage from './ProductImage';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  showHealthTags?: boolean;
  variant?: 'horizontal' | 'vertical';
};

export default function ProductCard({
  product,
  compact = false,
  showHealthTags = true,
  variant = 'horizontal',
}: ProductCardProps) {
  const { profile, favorites, toggleFavorite } = useStore();
  const score = calculateCompatibilityScore(product, profile);
  const isFav = favorites.includes(product.id);
  const imageSize = compact ? 86 : 100;

  const formatPrice = (price: number) =>
    price >= 1000000 ? `${(price / 10000).toLocaleString()}만원` : `${price.toLocaleString()}원`;

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
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                fontSize: '13px',
                fontWeight: 600,
                lineHeight: 1.4,
                color: 'var(--text-dark)',
                minHeight: '36px',
                letterSpacing: '-0.01em',
              }}
              title={product.name}
            >
              {product.name}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '2px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                {formatPrice(product.price)}
              </span>
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

            {product.reviewsCount > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '11px',
                  color: 'var(--text-light)',
                  fontWeight: 500,
                }}
              >
                <Star size={10} fill="#94A3B8" color="#94A3B8" strokeWidth={0} />
                <span>
                  {product.averageRating.toFixed(1)} ({product.reviewsCount})
                </span>
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>
                첫 리뷰 주인공 되기
              </span>
            )}
          </div>
        </Link>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={isFav ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
          aria-pressed={isFav}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.92)',
            border: 'none',
            cursor: 'pointer',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFav ? 'var(--danger)' : 'var(--text-light)',
            padding: 0,
          }}
        >
          <Heart size={15} fill={isFav ? 'var(--danger)' : 'none'} strokeWidth={isFav ? 0 : 1.8} />
        </button>
      </div>
    );
  }

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
      <Link
        to={`/product/${product.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          gap: compact ? '12px' : '14px',
        }}
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
