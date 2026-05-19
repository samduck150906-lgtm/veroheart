import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
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
  variant = 'horizontal'
}: ProductCardProps) {
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

  if (variant === 'vertical') {
    return (
      <div 
        className="ui-product-card" 
        style={{ 
          position: 'relative', 
          width: '180px', 
          height: '270px',
          display: 'flex', 
          flexDirection: 'column', 
          padding: '12px',
          borderRadius: '20px',
          background: '#FFFFFF',
          border: '1px solid rgba(79, 70, 229, 0.08)',
          boxShadow: 'var(--shadow-sm)',
          boxSizing: 'border-box',
          cursor: 'pointer',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }}
      >
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            width: '100%',
            height: '120px',
            borderRadius: '14px',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#F8FAFC',
            position: 'relative'
          }}>
            <ProductImage src={product.imageUrl} alt={product.name} style={{
              width: '100%', height: '100%', objectFit: 'cover'
            }} />
            
            {/* Score Badge Overlay */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              padding: '4px 8px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              color: getScoreColor(score),
              fontWeight: 800,
              fontSize: '11px',
              backdropFilter: 'blur(4px)'
            }}>
              {score}점
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '10px', minWidth: 0, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
              <div className="line-clamp-2" style={{ 
                fontSize: '13px', 
                fontWeight: 700, 
                marginTop: '4px', 
                lineHeight: 1.35,
                color: 'var(--text-dark)',
                height: '35px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }} title={product.name}>
                {product.name}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#F59E0B' }}>★ {product.averageRating}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-light)' }}>({product.reviewsCount})</span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 }}>
                {product.price >= 1000000 ? `${(product.price / 10000).toLocaleString()}만원` : `${product.price.toLocaleString()}원`}
              </span>
            </div>
          </div>
        </Link>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(product.id); }}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255, 255, 255, 0.85)', border: 'none', cursor: 'pointer', 
            width: '28px', height: '28px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isFav ? '#F43F5E' : '#94A3B8', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(2px)'
          }}
        >
          <Heart size={15} fill={isFav ? '#F43F5E' : 'none'} />
        </button>
      </div>
    );
  }

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
          <ProductImage src={product.imageUrl} alt={product.name} style={{
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

      <button
        type="button"
        onClick={e => { e.preventDefault(); toggleFavorite(product.id); }}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
          color: isFav ? '#F59E0B' : '#D1D5DB', transition: 'color 0.2s'
        }}
      >
        <Heart size={20} fill={isFav ? '#F59E0B' : 'none'} />
      </button>
    </div>
  );
}
