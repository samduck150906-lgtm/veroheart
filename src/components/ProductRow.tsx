import { useNavigate } from 'react-router-dom';
import ProductThumb from './ProductThumb';
import { useStore, MAX_COMPARISON } from '../store/useStore';
import { notify } from '../store/useNotification';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { normalizeProductDisplayName } from '../utils/productDisplay';
import { fitShortLabel, gradePalette, VR } from '../lib/veroroDesign';
import type { Product } from '../types';

interface ProductRowProps {
  product: Product;
}

/**
 * 검색 결과 카드 — 디자인 핸드오프 Search 스크린의 가로형 카드.
 * 썸네일 / 브랜드+등급 / 제품명 / 비교·찜 액션 / 적합도 한 줄.
 */
export default function ProductRow({ product }: ProductRowProps) {
  const navigate = useNavigate();
  const { profile, favorites, toggleFavorite, comparisonList, addToComparison, removeFromComparison } = useStore();

  const { score, grade } = resolveProductDisplayVerdict(product, profile);
  const palette = gradePalette(grade);
  const isFav = favorites.includes(product.id);
  const inCompare = comparisonList.includes(product.id);
  const petName = profile.name || '우리 아이';

  const open = () => navigate(`/product/${product.id}`);

  return (
    <div className="vr-card" style={{ borderRadius: '16px', padding: '12px', display: 'flex', gap: '12px' }}>
      <button
        type="button"
        onClick={open}
        aria-label={`${product.name} 상세 보기`}
        style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flex: 'none' }}
      >
        <ProductThumb src={product.imageUrl} alt={product.name} monoSource={product.brand || product.name} size={74} radius={13} fontSize={19} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <button
          type="button"
          onClick={open}
          style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', color: VR.sub, fontWeight: 700 }}>{product.brand}</span>
            <span
              style={{
                fontSize: '11px', fontWeight: 800, padding: '1px 6px', borderRadius: '5px',
                color: palette.fg, background: palette.bg,
              }}
            >
              {grade} {score}
            </span>
          </span>
          <span style={{
            display: 'block', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em',
            lineHeight: 1.35, marginTop: '2px', color: 'var(--vr-ink)',
          }}>
            {normalizeProductDisplayName(product)}
          </span>
          {product.reviewsCount > 0 && (
            <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, marginTop: '4px', color: 'var(--vr-ink)' }}>
              ★ {product.averageRating.toFixed(1)}
              <span style={{ fontWeight: 600, color: VR.sub }}> · 리뷰 {product.reviewsCount}</span>
            </span>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => {
              if (inCompare) {
                removeFromComparison(product.id);
                return;
              }
              if (!addToComparison(product.id)) {
                notify.warning(`비교는 최대 ${MAX_COMPARISON}개까지 담을 수 있어요.`);
              }
            }}
            style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
              border: `1.5px solid ${inCompare ? 'var(--vr-inverse)' : 'var(--vr-line)'}`,
              background: inCompare ? 'var(--vr-inverse)' : 'var(--surface)',
              color: inCompare ? 'var(--vr-on-inverse)' : 'var(--vr-body-2)',
            }}
          >
            {inCompare ? '비교 담김' : '비교'}
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(product.id)}
            style={{
              padding: '5px 10px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
              border: 'none', background: 'var(--vr-soft)',
              color: isFav ? 'var(--danger-strong)' : 'var(--vr-body-2)',
            }}
          >
            {isFav ? '찜 해제' : '찜'}
          </button>
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--safe-strong)', marginLeft: 'auto' }}>
            {fitShortLabel(score, petName)}
          </span>
        </div>
      </div>
    </div>
  );
}
