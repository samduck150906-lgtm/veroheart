import { Link } from 'react-router-dom';
import { Cat, Dog, Heart, Layers, Star } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { getProductDisplayParts } from '../utils/productDisplay';
import ProductVerificationBadge from './ProductVerificationBadge';

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  /** 세로형(이미지 상단) 카드. 2열 그리드(검색·브랜드)에서 카드 크기를 통일하기 위해 사용 */
  grid?: boolean;
};

function petTypeMeta(targetPetType: Product['targetPetType']) {
  if (targetPetType === 'cat') {
    return { label: '고양이용', icon: <Cat size={11} strokeWidth={2.5} /> };
  }
  if (targetPetType === 'all') {
    return { label: '강아지·고양이 공용', icon: <Layers size={11} strokeWidth={2.5} /> };
  }
  if (targetPetType === 'dog') {
    return { label: '강아지용', icon: <Dog size={11} strokeWidth={2.5} /> };
  }
  return null;
}

export default function ProductCard({
  product,
  compact = false,
  grid = false,
}: ProductCardProps) {
  const { profile, favorites, toggleFavorite } = useStore();
  const score = resolveProductDisplayVerdict(product, profile).score;
  const isFav = favorites.includes(product.id);
  const petMeta = petTypeMeta(product.targetPetType);
  const display = getProductDisplayParts(product);

  const getScoreColor = (s: number) => {
    if (s >= 80) return 'var(--safe)';
    if (s >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const favButton = (offset: number) => (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        toggleFavorite(product.id);
      }}
      style={{
        position: 'absolute',
        top: `${offset}px`,
        right: `${offset}px`,
        background: grid ? 'rgba(255,255,255,0.85)' : 'none',
        border: 'none',
        cursor: 'pointer',
        padding: grid ? '5px' : '4px',
        borderRadius: grid ? '999px' : 0,
        display: 'flex',
        boxShadow: grid ? '0 2px 6px rgba(43, 38, 36, 0.12)' : 'none',
        color: isFav ? '#F59E0B' : '#D1D5DB',
        transition: 'color 0.2s',
      }}
    >
      <Heart size={grid ? 16 : 20} fill={isFav ? '#F59E0B' : 'none'} />
    </button>
  );

  const petBadge = (compactBadge = false) =>
    petMeta ? (
      <span
        style={{
          position: 'absolute',
          top: compactBadge ? '6px' : '8px',
          left: compactBadge ? '6px' : '8px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          maxWidth: compactBadge ? '74px' : 'calc(100% - 48px)',
          padding: compactBadge ? '3px 6px' : '4px 8px',
          borderRadius: '999px',
          background: 'rgba(43, 38, 36, 0.84)',
          color: '#fff',
          fontSize: compactBadge ? '9px' : '9.5px',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 6px rgba(43, 38, 36, 0.22)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
        aria-label={`${petMeta.label} 제품`}
      >
        {petMeta.icon}
        {compactBadge && product.targetPetType === 'all' ? '공용' : petMeta.label}
      </span>
    ) : null;

  // ── 세로형(그리드) 카드: 이미지 상단 + 텍스트 하단, 높이 통일 ──
  if (grid) {
    return (
      <div
        className="card ui-press"
        style={{ position: 'relative', padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Link
          to={`/product/${product.id}`}
          style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', flex: 1 }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: '14px',
              overflow: 'hidden',
              marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
            }}
          >
            <img
              src={product.imageUrl}
              alt={display.name}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {petBadge()}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {display.brand && (
              <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>{display.brand}</div>
            )}
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                marginTop: '3px',
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: '35px',
                wordBreak: 'break-word',
              }}
            >
              {display.name}
            </div>
            {display.meta && (
              <div style={{ marginTop: '5px', fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {display.meta}
              </div>
            )}
            <div style={{ marginTop: '7px' }}>
              <ProductVerificationBadge
                catalogSource={product.catalogSource}
                verificationStatus={product.verificationStatus}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Star size={12} fill="#F59E0B" color="#F59E0B" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>{product.averageRating}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  리뷰 {product.reviewsCount.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                <div
                  style={{
                    padding: '3px 8px',
                    borderRadius: '14px',
                    backgroundColor: getScoreColor(score) + '22',
                    color: getScoreColor(score),
                    fontWeight: 800,
                    fontSize: '12px',
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
  const imageSize = compact ? 86 : 100;

  return (
    <div className="card ui-press" style={{ position: 'relative', marginBottom: compact ? 0 : '16px' }}>
      <Link
        to={`/product/${product.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'flex',
          gap: compact ? '12px' : '16px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: `${imageSize}px`,
            height: `${imageSize}px`,
            borderRadius: '16px',
            overflow: 'hidden',
            flexShrink: 0,
            boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
          }}
        >
          <img
            src={product.imageUrl}
            alt={display.name}
            loading="lazy"
            decoding="async"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {petBadge(true)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: '30px' }}>
          <div>
            {display.brand && (
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{display.brand}</div>
            )}
            <div
              style={{
                fontSize: compact ? '14px' : '16px',
                fontWeight: 700,
                marginTop: '4px',
                lineHeight: 1.3,
                wordBreak: 'break-word',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {display.name}
            </div>
            {display.meta && (
              <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {display.meta}
              </div>
            )}
            <div style={{ marginTop: '7px' }}>
              <ProductVerificationBadge
                catalogSource={product.catalogSource}
                verificationStatus={product.verificationStatus}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={13} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: '14px', fontWeight: 800 }}>{product.averageRating}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                ({product.reviewsCount.toLocaleString()})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: getScoreColor(score) + '22',
                  color: getScoreColor(score),
                  fontWeight: 800,
                  fontSize: compact ? '12px' : '14px',
                }}
              >
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
