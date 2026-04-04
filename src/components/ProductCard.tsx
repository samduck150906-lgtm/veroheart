import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Star } from 'lucide-react';
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
    <div className="ui-product-card">
      <Link
        to={`/product/${product.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <div
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '22px',
              overflow: 'hidden',
              background: '#F8F8FA',
            }}
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              left: '12px',
              bottom: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 10px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.92)',
              fontSize: '12px',
              fontWeight: 800,
              color: getScoreColor(score),
              boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
            }}
          >
            <ShieldCheck size={14} />
            {score}점 적합
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {product.mainCategory && <span className="ui-badge ui-badge-muted">{product.mainCategory}</span>}
            {product.targetPetType && (
              <span className="ui-badge ui-badge-soft">
                {product.targetPetType === 'dog' ? '강아지' : product.targetPetType === 'cat' ? '고양이' : '공용'}
              </span>
            )}
          </div>

          <div>
            <div style={{ fontSize: '12px', color: '#8A8F98', fontWeight: 700, marginBottom: '6px' }}>{product.brand}</div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                lineHeight: 1.4,
                color: 'var(--text-dark)',
                minHeight: '44px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {product.name}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#667085', fontSize: '13px', fontWeight: 700 }}>
            <Star size={14} fill="#FFB020" color="#FFB020" />
            {product.averageRating.toFixed(1)}
            <span style={{ color: '#A0A7B1', fontWeight: 600 }}>리뷰 {product.reviewsCount.toLocaleString()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9AA1AA', fontWeight: 600 }}>예상 구매가</div>
              <div style={{ fontSize: '19px', fontWeight: 900, color: 'var(--text-dark)' }}>{product.price.toLocaleString()}원</div>
            </div>
            <div
              style={{
                padding: '7px 10px',
                borderRadius: '12px',
                background: `${getScoreColor(score)}14`,
                color: getScoreColor(score),
                fontSize: '12px',
                fontWeight: 800,
              }}
            >
              {score >= 80 ? '추천' : score >= 50 ? '체크 필요' : '주의'}
            </div>
          </div>
        </div>
      </Link>

      <button
        onClick={e => {
          e.preventDefault();
          toggleFavorite(product.id);
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '38px',
          height: '38px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.95)',
          border: '1px solid rgba(0,0,0,0.06)',
          cursor: 'pointer',
          padding: '4px',
          color: isFav ? '#EF4444' : '#D1D5DB',
          transition: 'color 0.2s',
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 10px 24px rgba(0,0,0,0.08)',
        }}
        aria-label={isFav ? '찜 해제' : '찜하기'}
      >
        <Heart size={20} fill={isFav ? '#EF4444' : 'none'} />
      </button>
    </div>
  );
}
