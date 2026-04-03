import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { Product } from '../data/mock';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

export default function ProductCard({ product }: { product: Product }) {
  const { profile, favorites, toggleFavorite } = useStore();
  const score = calculateCompatibilityScore(product, profile);
  const isFav = favorites.includes(product.id);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--safe)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return 'rgba(34, 197, 94, 0.1)';
    if (s >= 50) return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return '적합';
    if (s >= 50) return '보통';
    return '주의';
  };

  return (
    <div className="card" style={{ position: 'relative', marginBottom: '12px', padding: '14px' }}>
      <Link to={`/product/${product.id}`} style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', gap: '14px', alignItems: 'flex-start',
      }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '14px',
          overflow: 'hidden', flexShrink: 0,
          boxShadow: '0 4px 12px rgba(43, 38, 36, 0.1)',
          position: 'relative',
        }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '28px', minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '3px' }}>
            {product.brand}
          </div>
          <div style={{
            fontSize: '15px', fontWeight: 700, lineHeight: 1.35,
            marginBottom: '8px', color: 'var(--text-dark)',
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {product.name}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Star size={12} fill="#FCD34D" color="#FCD34D" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' }}>
                {product.averageRating}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
              ({product.reviewsCount?.toLocaleString()})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {product.price ? (
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)' }}>
                {product.price.toLocaleString()}
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>원</span>
              </span>
            ) : <span />}

            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 9px', borderRadius: '999px',
              backgroundColor: getScoreBg(score),
              border: `1px solid ${getScoreColor(score)}30`,
            }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: getScoreColor(score) }}>
                {score}
              </span>
              <span style={{ fontSize: '10px', fontWeight: 600, color: getScoreColor(score), opacity: 0.8 }}>
                {getScoreLabel(score)}
              </span>
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={e => { e.preventDefault(); toggleFavorite(product.id); }}
        style={{
          position: 'absolute', top: '10px', right: '10px',
          background: isFav ? 'rgba(239, 68, 68, 0.08)' : 'rgba(43, 38, 36, 0.04)',
          border: 'none', cursor: 'pointer', padding: '6px',
          borderRadius: '10px',
          color: isFav ? '#EF4444' : '#D1D5DB',
          transition: 'all var(--transition-fast)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label={isFav ? '찜 해제' : '찜하기'}
      >
        <Heart
          size={18}
          fill={isFav ? '#EF4444' : 'none'}
          strokeWidth={isFav ? 0 : 1.5}
          style={{ transition: 'transform var(--transition-bounce)' }}
        />
      </button>
    </div>
  );
}
