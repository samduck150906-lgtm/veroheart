import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Product } from '../data/mock';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  showHealthTags?: boolean;
};

export default function ProductCard({ product, compact = false, showHealthTags = true }: ProductCardProps) {
  const { profile, favorites, toggleFavorite } = useStore();
  const score = calculateCompatibilityScore(product, profile);
  const isFav = favorites.includes(product.id);
  const healthTags = (product.healthConcerns ?? []).slice(0, compact ? 2 : 3);
  const imageSize = compact ? 86 : 100;

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--safe)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className="card" style={{ position: 'relative', marginBottom: compact ? 0 : '16px' }}>
      <Link to={`/product/${product.id}`} style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', gap: compact ? '12px' : '16px'
      }}>
        <div style={{
          width: `${imageSize}px`, height: `${imageSize}px`, borderRadius: '16px',
          overflow: 'hidden', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
        }}>
          <img src={product.imageUrl} alt={product.name} style={{
            width: '100%', height: '100%', objectFit: 'cover'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: '30px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
            <div style={{ fontSize: compact ? '14px' : '16px', fontWeight: 700, marginTop: '4px', lineHeight: 1.3 }}>{product.name}</div>
            {showHealthTags && healthTags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {healthTags.map(tag => (
                  <span
                    key={`${product.id}-${tag}`}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#B45309',
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      borderRadius: '999px',
                      padding: '3px 7px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800 }}>★ {product.averageRating}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: compact ? '12px' : '13px', color: '#6B7280', fontWeight: 700 }}>
                {product.price.toLocaleString()}원
              </span>
              <div style={{
                padding: '4px 10px', borderRadius: '16px',
                backgroundColor: getScoreColor(score) + '22',
                color: getScoreColor(score), fontWeight: 800, fontSize: compact ? '12px' : '14px'
              }}>
                {score}점
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* 즐겨찾기 버튼 */}
      <button
        onClick={e => { e.preventDefault(); toggleFavorite(product.id); }}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          color: isFav ? '#EF4444' : '#D1D5DB', transition: 'color 0.2s'
        }}
      >
        <Heart size={20} fill={isFav ? '#EF4444' : 'none'} />
      </button>
    </div>
  );
}
