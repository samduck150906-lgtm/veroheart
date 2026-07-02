import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  showHealthTags?: boolean;
  /** 세로형(이미지 상단) 카드. 2열 그리드(검색·브랜드)에서 카드 크기를 통일하기 위해 사용 */
  grid?: boolean;
};

export default function ProductCard({
  product,
  compact = false,
  showHealthTags = true,
  grid = false,
}: ProductCardProps) {
  const { profile, favorites, toggleFavorite } = useStore();
  const score = calculateCompatibilityScore(product, profile);
  const isFav = favorites.includes(product.id);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--safe)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const favButton = (offset: number) => (
    <button
      type="button"
      onClick={e => { e.preventDefault(); toggleFavorite(product.id); }}
      style={{
        position: 'absolute', top: `${offset}px`, right: `${offset}px`,
        background: grid ? 'rgba(255,255,255,0.85)' : 'none',
        border: 'none', cursor: 'pointer',
        padding: grid ? '5px' : '4px',
        borderRadius: grid ? '999px' : 0,
        display: 'flex',
        boxShadow: grid ? '0 2px 6px rgba(43, 38, 36, 0.12)' : 'none',
        color: isFav ? '#F59E0B' : '#D1D5DB', transition: 'color 0.2s',
      }}
    >
      <Heart size={grid ? 16 : 20} fill={isFav ? '#F59E0B' : 'none'} />
    </button>
  );

  // ── 세로형(그리드) 카드: 이미지 상단 + 텍스트 하단, 높이 통일 ──
  if (grid) {
    const healthTags = (product.healthConcerns ?? []).slice(0, 2);
    return (
      <div
        className="card"
        style={{ position: 'relative', padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Link
          to={`/product/${product.id}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <div
            style={{
              width: '100%', aspectRatio: '16 / 9', borderRadius: '14px',
              overflow: 'hidden', marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
            }}
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
            <div
              style={{
                fontSize: '13px', fontWeight: 700, marginTop: '3px', lineHeight: 1.35,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', minHeight: '35px',
              }}
            >
              {product.name}
            </div>

            {showHealthTags && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden', marginTop: '6px', minHeight: '20px' }}>
                {healthTags.map(tag => (
                  <span
                    key={`${product.id}-${tag}`}
                    style={{
                      fontSize: '10px', fontWeight: 700, color: '#B45309',
                      background: '#FFFBEB', border: '1px solid #FDE68A',
                      borderRadius: '999px', padding: '2px 6px', whiteSpace: 'nowrap',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800 }}>★ {product.averageRating}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 700 }}>
                  {product.price.toLocaleString()}원
                </span>
                <div
                  style={{
                    padding: '3px 8px', borderRadius: '14px',
                    backgroundColor: getScoreColor(score) + '22',
                    color: getScoreColor(score), fontWeight: 800, fontSize: '12px',
                  }}
                >
                  {score}점
                </div>
              </div>
            </div>
          </div>
        </Link>

        {favButton(18)}
      </div>
    );
  }

  // ── 가로형(리스트/컴팩트) 카드: 이미지 좌측 + 텍스트 우측 ──
  const healthTags = (product.healthConcerns ?? []).slice(0, compact ? 2 : 3);
  const imageSize = compact ? 86 : 100;

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

      {favButton(12)}
    </div>
  );
}
