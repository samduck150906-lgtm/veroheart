// @ts-nocheck
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import ProductImage from '../components/ProductImage';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { PRE_PURCHASE } from '../copy/ui';

export default function Comparison() {
  const navigate = useNavigate();
  const { products, comparisonList, removeFromComparison } = useStore();

  const compareProducts = useMemo(() => {
    return comparisonList
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [comparisonList, products]);

  if (compareProducts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
        <p style={{ fontWeight: 700, fontSize: 16, color: '#4E5968', marginBottom: 6 }}>비교할 상품을 추가해보세요</p>
        <p style={{ fontSize: 13, marginBottom: 24, color: '#8B95A1' }}>검색이나 상품 상세 페이지에서 추가할 수 있어요</p>
        <button
          onClick={() => navigate('/search')}
          style={{ background: 'var(--brand)', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 700, color: 'var(--ink-on-brand)', cursor: 'pointer' }}
        >
          상품 검색하기
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>비교함</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 20 }}>최대 4개 상품을 비교할 수 있어요</p>

        {/* ─── 상품 헤더 카드들 (가로 스크롤) ─── */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '24px', scrollbarWidth: 'none' }}>
          {compareProducts.map((p) => {
            return (
              <div key={p.id} style={{ flexShrink: 0, width: '160px', background: 'var(--fill)', borderRadius: '18px', padding: '14px', position: 'relative' }}>
                <button
                  onClick={() => removeFromComparison(p.id)}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                  <X size={12} />
                </button>
                <div style={{ width: '100%', height: '100px', borderRadius: '12px', overflow: 'hidden', marginBottom: '10px' }}>
                  <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '2px' }}>{p.brand}</div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── 항목별 비교 테이블 ─── */}
        <section style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', letterSpacing: '-0.02em' }}>
            항목별 비교
          </div>
          {(() => {
            const safeRatio = (p) => {
              const t = p.ingredients?.length || 1;
              const s = p.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;
              return Math.round((s / t) * 100);
            };
            const dangerCount = (p) => (p.ingredients || []).filter(i => i.riskLevel === 'danger').length;
            const rows = [
              {
                label: '성분 안전',
                vals: compareProducts.map(p => safeRatio(p)),
                winner: compareProducts.reduce((bi, p, i) => safeRatio(p) > safeRatio(compareProducts[bi]) ? i : bi, 0),
                fmt: (v) => `${v}%`,
              },
              {
                label: '주의 성분',
                vals: compareProducts.map(p => dangerCount(p)),
                winner: compareProducts.reduce((bi, p, i) => dangerCount(p) < dangerCount(compareProducts[bi]) ? i : bi, 0),
                fmt: (v) => `${v}개`,
              },
              {
                label: '가격',
                vals: compareProducts.map(p => p.price || 0),
                winner: compareProducts.reduce((bi, p, i) => (p.price || 999999) < (compareProducts[bi].price || 999999) ? i : bi, 0),
                fmt: (v) => v ? `${v.toLocaleString()}원~` : '-',
              },
              {
                label: '평점',
                vals: compareProducts.map(p => p.averageRating ?? 0),
                winner: compareProducts.reduce((bi, p, i) => (p.averageRating ?? 0) > (compareProducts[bi].averageRating ?? 0) ? i : bi, 0),
                fmt: (v) => `★ ${v.toFixed(1)}`,
              },
              {
                label: '리뷰',
                vals: compareProducts.map(p => p.reviewsCount ?? 0),
                winner: compareProducts.reduce((bi, p, i) => (p.reviewsCount ?? 0) > (compareProducts[bi].reviewsCount ?? 0) ? i : bi, 0),
                fmt: (v) => `${v.toLocaleString()}개`,
              },
            ];

            return rows.map(({ label, vals, winner, fmt }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--hairline)', padding: '12px 0' }}>
                <div style={{ width: '72px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>{label}</div>
                {vals.map((v, i) => {
                  const isWinner = compareProducts.length > 1 && i === winner;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <span style={{
                        fontSize: '13.5px', fontWeight: isWinner ? 900 : 600,
                        color: isWinner ? 'var(--brand-deep)' : 'var(--ink)',
                        background: isWinner ? 'var(--brand-tint)' : 'transparent',
                        padding: isWinner ? '3px 8px' : '0',
                        borderRadius: isWinner ? '8px' : '0',
                        display: 'inline-block',
                      }}>
                        {fmt(v)}{isWinner ? ' 🏆' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </section>

        {/* ─── CTA 버튼 ─── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {compareProducts.map(p => (
            <button
              key={p.id}
              onClick={() => openCoupangForProduct(p)}
              style={{ flex: 1, padding: '13px 0', borderRadius: '14px', background: 'var(--brand)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 800, color: 'var(--ink-on-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
            >
              {PRE_PURCHASE.ctaBuy} <ExternalLink size={13} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
