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
    background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB',
    flexShrink: 0,
  }}>{label}</span>
);

export default function ProductCard({
  product,
  showHealthTags = true,
  variant = 'horizontal',
  rank,
  isSponsorSlot = false,
}: ProductCardProps) {
  const { profile, favorites, toggleFavorite, isLoggedIn } = useStore();
  const navigate = useNavigate();
  const breakdown = getRecommendationBreakdown(product, profile);
  const score = breakdown.total;
  const badges = getProductBadges(breakdown);
  const isFav = favorites.includes(product.id);

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
        onClick={() => navigate(`/product/${product.id}`)}
        style={{
          flexShrink: 0,
          width: 168,
          textAlign: 'left',
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 9,
        }}
      >
        <div style={{ position: 'relative', width: 168, height: 168 }}>
          <div style={{
            width: '100%',
            height: '100%',
            borderRadius: 18,
            overflow: 'hidden',
            backgroundColor: 'var(--brand-tint-2)',
            backgroundImage: `repeating-linear-gradient(135deg, var(--brand-tint) 0 1px, transparent 1px 11px)`,
            border: '1px solid var(--hairline)'
          }}>
            <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {rank != null && (
            <span style={{
              position: 'absolute', top: 10, left: 10, width: 24, height: 24, borderRadius: 999,
              background: 'var(--ink)', color: 'var(--ink-on-brand)', fontFamily: 'var(--serif)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{rank}</span>
          )}
          {score != null && (
            <span style={{
              position: 'absolute', bottom: 10, left: 10,
              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px',
              borderRadius: 999, background: 'var(--brand)', color: 'var(--ink-on-brand)',
              fontSize: 11.5, fontWeight: 800, boxShadow: 'var(--shadow-sm)',
            }}>궁합 {score}</span>
          )}
          <span
            onClick={handleToggleFav}
            style={{
              position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: 999,
              background: 'var(--surface-trans)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <Heart
              size={17}
              strokeWidth={2}
              fill={isFav ? 'var(--brand-deep)' : 'none'}
              stroke={isFav ? 'var(--brand-deep)' : 'var(--ink-soft)'}
            />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'var(--ink-faint)' }}>{product.brand}</span>
            {isSponsorSlot && <SponsorBadge label={product.sponsorLabel || '광고'} />}
          </div>
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
      onClick={() => navigate(`/product/${product.id}`)}
      style={{
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        padding: '14px 0',
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        borderBottom: '1px solid var(--hairline)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--ink-faint)' }}>{product.brand}</span>
          {isSponsorSlot && <SponsorBadge label={product.sponsorLabel || '광고'} />}
        </div>
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
        <Heart
          size={20}
          strokeWidth={2}
          fill={isFav ? 'var(--brand-deep)' : 'none'}
          stroke={isFav ? 'var(--brand-deep)' : 'var(--ink-faint)'}
        />
      </span>
    </div>
  );
}
