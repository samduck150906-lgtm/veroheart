import { Link } from 'react-router-dom';
import { Heart, ShieldCheck, Star } from 'lucide-react';
import type { Product } from '../types';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';
import { normalizeProductDisplayName } from '../utils/productDisplay';
import ProductPrice from './product/ProductPrice';

/** 추천 사유 문구의 톤(신호등)을 판정해 pill 색상을 정한다. */
function noteToneStyle(note: string): { color: string; background: string; borderColor: string } {
  if (note.includes('회피 성분') || note.includes('위험 성분'))
    return { color: '#B91C1C', background: '#FEF2F2', borderColor: '#FECACA' }; // 위험(빨강)
  if (note.includes('주의 성분') || note.includes('재검토') || note.includes('검수 대기'))
    return { color: '#B45309', background: '#FFFBEB', borderColor: '#FDE68A' }; // 주의(주황)
  if (note.includes('거의 없음') || note.includes('고민과 연관') || note.includes('검수 완료'))
    return { color: '#15803D', background: '#F0FDF4', borderColor: '#BBF7D0' }; // 긍정(초록)
  return { color: '#475569', background: '#F1F5F9', borderColor: '#E2E8F0' }; // 중립(슬레이트)
}

type ProductCardProps = {
  product: Product;
  compact?: boolean;
  showHealthTags?: boolean;
  /** 세로형(이미지 상단) 카드. 2열 그리드(검색·브랜드)에서 카드 크기를 통일하기 위해 사용 */
  grid?: boolean;
  /** 그리드 카드 안에 표시할 한 줄 추천 사유(검색 추천순). 있으면 태그 대신 노출 */
  note?: string;
};

export default function ProductCard({
  product,
  compact = false,
  showHealthTags = true,
  grid = false,
  note,
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
  const isVerified = product.verificationStatus === 'verified';

  if (grid) {
    const healthTags = (product.healthConcerns ?? []).slice(0, 2);
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
              width: '100%', aspectRatio: '1 / 1', borderRadius: '14px',
              overflow: 'hidden', marginBottom: '10px',
              boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
            }}
          >
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {isVerified && (
              <span
                style={{
                  position: 'absolute', top: '8px', left: '8px',
                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                  padding: '3px 8px', borderRadius: '999px',
                  background: 'rgba(21, 179, 107, 0.95)', color: '#fff',
                  fontSize: '9.5px', fontWeight: 800, letterSpacing: '-0.01em',
                  boxShadow: '0 2px 6px rgba(21, 179, 107, 0.35)',
                }}
              >
                <ShieldCheck size={10} strokeWidth={2.5} /> 검수완료
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
            <div
              style={{
                fontSize: '13px', fontWeight: 700, marginTop: '3px', lineHeight: 1.35,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden', minHeight: '35px', wordBreak: 'break-word',
              }}
            >
              {normalizeProductDisplayName(product)}
            </div>

            {/* 메타 행: 추천 사유(note) > 건강 태그 순으로 1줄 고정 높이 */}
            <div style={{ marginTop: '6px', minHeight: '22px', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden' }}>
              {note ? (
                <span
                  style={{
                    fontSize: '10.5px', fontWeight: 700,
                    color: noteToneStyle(note).color,
                    background: noteToneStyle(note).background,
                    border: `1px solid ${noteToneStyle(note).borderColor}`,
                    borderRadius: '8px', padding: '3px 8px', maxWidth: '100%',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {note}
                </span>
              ) : (
                showHealthTags && healthTags.map(tag => (
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
                ))
              )}
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                <Star size={12} fill="#F59E0B" color="#F59E0B" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-dark)' }}>{product.averageRating}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>리뷰 {product.reviewsCount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <ProductPrice value={product.price} size={15} weight={900} />
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
    <div className="card ui-press" style={{ position: 'relative', marginBottom: compact ? 0 : '16px' }}>
      <Link to={`/product/${product.id}`} style={{
        textDecoration: 'none', color: 'inherit',
        display: 'flex', gap: compact ? '12px' : '16px'
      }}>
        <div style={{
          position: 'relative',
          width: `${imageSize}px`, height: `${imageSize}px`, borderRadius: '16px',
          overflow: 'hidden', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(43, 38, 36, 0.08)',
        }}>
          <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" style={{
            width: '100%', height: '100%', objectFit: 'cover'
          }} />
          {isVerified && (
            <span
              style={{
                position: 'absolute', top: '6px', left: '6px',
                display: 'inline-flex', alignItems: 'center',
                padding: '3px', borderRadius: '999px',
                background: 'rgba(21, 179, 107, 0.95)', color: '#fff',
                boxShadow: '0 2px 6px rgba(21, 179, 107, 0.35)',
              }}
              aria-label="검수 완료 제품"
            >
              <ShieldCheck size={11} strokeWidth={2.5} />
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: '30px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
            <div style={{ fontSize: compact ? '14px' : '16px', fontWeight: 700, marginTop: '4px', lineHeight: 1.3, wordBreak: 'break-word' }}>{normalizeProductDisplayName(product)}</div>
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
              <Star size={13} fill="#F59E0B" color="#F59E0B" />
              <span style={{ fontSize: '14px', fontWeight: 800 }}>{product.averageRating}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>({product.reviewsCount.toLocaleString()})</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ProductPrice value={product.price} size={compact ? 12 : 13} weight={700} color="#6B7280" />
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
