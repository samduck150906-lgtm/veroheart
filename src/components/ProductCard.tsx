import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
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
  const { profile, favorites, toggleFavorite, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const score = calculateCompatibilityScore(product, profile);
  const isFav = favorites.includes(product.id);
  const healthTags = (product.healthConcerns ?? []).slice(0, compact ? 2 : 3);
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

  const getScoreColor = (s: number) => {
    if (s >= 80) return '#10B981'; // Premium Emerald Green
    if (s >= 50) return '#F59E0B'; // Premium Amber Gold
    return '#EF4444'; // Premium Red
  };

  const getScoreBgColor = (s: number) => {
    if (s >= 80) return 'rgba(16, 185, 129, 0.08)';
    if (s >= 50) return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(239, 68, 68, 0.08)';
  };

  if (variant === 'vertical') {
    return (
      <div 
        className="ui-product-card" 
        style={{ 
          position: 'relative', 
          width: '100%', 
          height: '272px',
          display: 'flex', 
          flexDirection: 'column', 
          padding: '12px',
          borderRadius: '22px',
          background: '#FFFFFF',
          border: '1px solid rgba(226, 232, 240, 0.7)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          boxSizing: 'border-box',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-6px)';
          e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.06)';
          e.currentTarget.style.borderColor = 'rgba(129, 201, 149, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
          e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.7)';
        }}
      >
        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{
            width: '100%',
            height: '116px',
            borderRadius: '16px',
            overflow: 'hidden',
            flexShrink: 0,
            backgroundColor: '#F8FAFC',
            position: 'relative'
          }}>
            <ProductImage src={product.imageUrl} alt={product.name} style={{
              width: '100%', height: '100%', objectFit: 'cover'
            }} />
            
            {/* Score Badge Overlay (Sleek pill design) */}
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              padding: '4px 9px',
              borderRadius: '999px',
              backgroundColor: 'rgba(255, 255, 255, 0.94)',
              boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
              color: getScoreColor(score),
              fontWeight: 900,
              fontSize: '11px',
              letterSpacing: '-0.02em',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-light)' }}>궁합</span>
              {score}점
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: '12px', minWidth: 0, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand}</div>
              <div className="line-clamp-2" style={{ 
                fontSize: '13px', 
                fontWeight: 800, 
                marginTop: '4px', 
                lineHeight: 1.4,
                color: 'var(--text-dark)',
                height: '36px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                letterSpacing: '-0.015em'
              }} title={product.name}>
                {product.name}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Star size={11} fill="#F59E0B" color="#F59E0B" />
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1E293B' }}>{product.averageRating.toFixed(1)}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-light)', fontWeight: 500 }}>({product.reviewsCount})</span>
              </div>
              <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 900 }}>
                {product.price >= 1000000 ? `${(product.price / 10000).toLocaleString()}만원` : `${product.price.toLocaleString()}원`}
              </span>
            </div>
          </div>
        </Link>

        {/* Favorite Button (Premium glowing circle) */}
        <button
          type="button"
          onClick={handleToggleFav}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'rgba(255, 255, 255, 0.9)', border: 'none', cursor: 'pointer',
            width: '28px', height: '28px', borderRadius: '50%',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: isFav ? '#F43F5E' : '#94A3B8', transition: 'all 0.2s',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(4px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
          }}
        >
          <Heart size={14} fill={isFav ? '#F43F5E' : 'none'} strokeWidth={2.2} />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="card" 
      style={{ 
        position: 'relative', 
        marginBottom: compact ? 0 : '16px',
        padding: '16px',
        borderRadius: '24px',
        border: '1px solid rgba(226, 232, 240, 0.7)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: '#FFFFFF',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = 'rgba(129, 201, 149, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
        e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.7)';
      }}
    >
      <Link to={`/product/${product.id}`} style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', gap: compact ? '12px' : '16px'
      }}>
        <div style={{
          width: `${imageSize}px`, height: `${imageSize}px`, borderRadius: '18px',
          overflow: 'hidden', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
          backgroundColor: '#F8FAFC'
        }}>
          <ProductImage src={product.imageUrl} alt={product.name} style={{
            width: '100%', height: '100%', objectFit: 'cover'
          }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: '24px', minWidth: 0 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{product.brand}</div>
            <div className="line-clamp-1" style={{ fontSize: compact ? '14px' : '15px', fontWeight: 800, marginTop: '2px', lineHeight: 1.3, color: 'var(--text-dark)' }}>{product.name}</div>
            {showHealthTags && healthTags.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                {healthTags.map(tag => (
                  <span
                    key={`${product.id}-${tag}`}
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#B45309',
                      background: '#FFFBEB',
                      border: '1px solid rgba(253, 230, 138, 0.7)',
                      borderRadius: '999px',
                      padding: '3px 8px',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>{product.averageRating.toFixed(1)}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500 }}>({product.reviewsCount})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: compact ? '13px' : '14px', color: '#1E293B', fontWeight: 850 }}>
                {product.price.toLocaleString()}원
              </span>
              <div style={{
                padding: '4px 10px', borderRadius: '999px',
                backgroundColor: getScoreBgColor(score),
                color: getScoreColor(score), fontWeight: 900, fontSize: compact ? '11px' : '12px',
                letterSpacing: '-0.02em'
              }}>
                궁합 {score}점
              </div>
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleToggleFav}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          background: 'none', border: 'none', cursor: 'pointer', padding: '6px',
          color: isFav ? '#F43F5E' : '#D1D5DB', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Heart size={18} fill={isFav ? '#F43F5E' : 'none'} strokeWidth={isFav ? 0 : 2.2} />
      </button>
    </div>
  );
}
