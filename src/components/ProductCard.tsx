import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
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

  return (
    <div className="card" style={{ position: 'relative', marginBottom: '16px' }}>
      <Link to={`/product/${product.id}`} style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', gap: '16px'
      }}>
        <div style={{
          width: '100px', height: '100px', borderRadius: '12px',
          overflow: 'hidden', flexShrink: 0
        }}>
          <img src={product.imageUrl} alt={product.name} style={{
            width: '100%', height: '100%', objectFit: 'cover'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: '32px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '4px', lineHeight: 1.3 }}>{product.name}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800 }}>★ {product.averageRating}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
            </div>

            <div style={{
              padding: '4px 10px', borderRadius: '16px',
              backgroundColor: getScoreColor(score) + '22',
              color: getScoreColor(score), fontWeight: 800, fontSize: '14px'
            }}>
              {score}점
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
