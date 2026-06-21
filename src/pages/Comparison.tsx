// @ts-nocheck
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { COMPARE_EMPTY, PRE_PURCHASE } from '../copy/ui';

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

function GradeCell({ grade }) {
  const c = GRADE_COLORS[grade] || { bg: '#F2F4F6', color: '#8B95A1' };
  return <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 13, borderRadius: 8, padding: '4px 10px' }}>{grade}등급</span>;
}

export default function Comparison() {
  const navigate = useNavigate();
  const { products, comparisonList, removeFromComparison, profile, isLoggedIn } = useStore();

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const compareProducts = useMemo(() => {
    return comparisonList
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 4);
  }, [comparisonList, products]);

  if (products.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '100px 20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <GitCompare size={32} color="var(--ink-300)" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>{COMPARE_EMPTY.title}</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink-faint)', lineHeight: 1.6, marginBottom: '8px' }}>
          {COMPARE_EMPTY.description}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--ink-faint)', lineHeight: 1.5, marginBottom: '28px' }}>
          {COMPARE_EMPTY.hint}
        </p>
        <button
          onClick={() => navigate('/search')}
          style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--brand)', color: 'var(--ink-on-brand)', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
        >
          {COMPARE_EMPTY.cta}
        </button>
      </div>
    );
  }, [compareProducts, profile, hasPetProfile]);

  const grades = useMemo(() => {
    return Object.fromEntries(
      compareProducts.map(p => {
        const s = scores[p.id];
        return [p.id, s != null ? gradeFromScore(s) : null];
      })
    );
  }, [compareProducts, scores]);

  const cautionCounts = useMemo(() => {
    return Object.fromEntries(
      compareProducts.map(p => [
        p.id,
        (p.ingredients || []).filter(i => i.riskLevel === 'caution' || i.riskLevel === 'danger').length
      ])
    );
  }, [compareProducts]);

  const rows = [
    {
      label: '궁합 점수',
      render: (p) => hasPetProfile ? `${scores[p.id] ?? '-'}%` : '-',
      winFn: (a, b) => (scores[a.id] || 0) > (scores[b.id] || 0),
    },
    {
      label: '가격',
      render: (p) => p.price ? `${p.price.toLocaleString()}원` : '-',
      winFn: (a, b) => (a.price || 999999) < (b.price || 999999),
    },
    {
      label: '평점',
      render: (p) => p.averageRating > 0 ? `⭐ ${Number(p.averageRating).toFixed(1)}` : '-',
      winFn: (a, b) => (a.averageRating || 0) > (b.averageRating || 0),
    },
    {
      label: '등급',
      render: (p) => grades[p.id] ? <GradeCell grade={grades[p.id]} /> : '-',
      winFn: (a, b) => {
        const order = ['A', 'B', 'C', 'D', 'F'];
        return order.indexOf(grades[a.id] || 'F') < order.indexOf(grades[b.id] || 'F');
      },
    },
    {
      label: '주의 성분',
      render: (p) => {
        const cnt = cautionCounts[p.id];
        return cnt === 0 ? '없음 ✓' : `${cnt}개`;
      },
      winFn: (a, b) => (cautionCounts[a.id] || 0) < (cautionCounts[b.id] || 0),
    },
    {
      label: '리뷰 수',
      render: (p) => p.reviewsCount > 0 ? `${p.reviewsCount.toLocaleString()}개` : '-',
      winFn: (a, b) => (a.reviewsCount || 0) > (b.reviewsCount || 0),
    },
  ];

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>비교함</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 20 }}>최대 4개 상품을 비교할 수 있어요</p>

        {compareProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#B0B8C1' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#4E5968', marginBottom: 6 }}>비교할 상품을 추가해보세요</p>
            <p style={{ fontSize: 13, marginBottom: 24 }}>검색이나 상품 상세 페이지에서 추가할 수 있어요</p>
            <button onClick={() => navigate('/search')}
              style={{ background: '#F5C518', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 15, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
              상품 검색하기
            </button>
          </div>
        ) : (
          <>
            {/* Product Headers */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ width: 82, flexShrink: 0 }} />
              {compareProducts.map(p => (
                <div key={p.id} style={{ flex: 1, position: 'relative' }}>
                  <div
                    onClick={() => navigate(`/product/${p.id}`)}
                    style={{
                      background: '#fff', borderRadius: 16, padding: '12px 8px',
                      textAlign: 'center', boxShadow: '0 2px 10px rgba(30,41,59,0.08)', cursor: 'pointer',
                    }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', margin: '0 auto 8px', background: '#F7F4EE' }}>
                      <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: 10, color: '#8B95A1', marginBottom: 2 }}>{p.brand}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
                      {p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name}
                    </div>
                    {grades[p.id] && (
                      <div style={{ marginTop: 6 }}>
                        <GradeCell grade={grades[p.id]} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromComparison(p.id)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#F04452', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={11} color="#fff" strokeWidth={3} />
                  </button>
                </div>
              ))}
              {compareProducts.length < 4 && (
                <div
                  onClick={() => navigate('/search')}
                  style={{
                    flex: 1, borderRadius: 16, border: '2px dashed #E5E8EB',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '20px 8px', cursor: 'pointer', minHeight: 120,
                  }}
                >
                  <Plus size={20} color="#B0B8C1" />
                  <span style={{ fontSize: 10, color: '#B0B8C1', fontWeight: 600, marginTop: 6, textAlign: 'center' }}>상품 추가</span>
                </div>
              )}
            </div>

            {/* Comparison Table */}
            <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,41,59,0.06)' }}>
              {rows.map((row, rowIdx) => {
                const wins = compareProducts.map((_, i) =>
                  compareProducts.every((other, j) => i === j || row.winFn(compareProducts[i], other))
                );
                return (
                  <div key={row.label} style={{
                    display: 'flex', alignItems: 'center',
                    borderBottom: rowIdx < rows.length - 1 ? '1px solid #F2F4F6' : 'none',
                  }}>
                    <div style={{
                      width: 82, flexShrink: 0, padding: '14px 12px',
                      fontSize: 12, fontWeight: 700, color: '#6B7684',
                    }}>
                      {row.label}
                    </div>
                    {compareProducts.map((p, i) => (
                      <div key={p.id} style={{
                        flex: 1, padding: '14px 8px', textAlign: 'center',
                        background: wins[i] ? 'rgba(245,197,24,0.08)' : 'transparent',
                        fontSize: 13, fontWeight: wins[i] ? 800 : 600,
                        color: wins[i] ? '#CA8A04' : '#191F28',
                        position: 'relative',
                      }}>
                        {wins[i] && compareProducts.length > 1 && (
                          <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 10 }}>🏆</span>
                        )}
                        {typeof row.render(p) === 'string'
                          ? row.render(p)
                          : row.render(p)
                        }
                      </div>
                    ))}
                    {compareProducts.length < 4 && <div style={{ flex: 1 }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {products.map((p, i) => {
                      const val = breakdowns[i]?.[key] ?? 0;
                      const isWinner = i === winner && products.length > 1;
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '8px', overflow: 'hidden' }}>
                            <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div style={{ flex: 1, height: '10px', background: 'var(--fill)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct(val, max)}%`,
                              background: isWinner ? BAR_COLORS[i % BAR_COLORS.length] : `${BAR_COLORS[i % BAR_COLORS.length]}88`,
                              borderRadius: '99px',
                              transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                            }} />
                          </div>
                          <div style={{ flexShrink: 0, width: '32px', textAlign: 'right' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: isWinner ? BAR_COLORS[i % BAR_COLORS.length] : 'var(--ink-faint)' }}>
                              {val}
                            </span>
                          </div>
                          {isWinner && (
                            <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 800, color: '#fff', background: BAR_COLORS[i % BAR_COLORS.length], padding: '2px 6px', borderRadius: '5px' }}>
                              최고
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 기본 정보 비교 테이블 ─── */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', letterSpacing: '-0.02em' }}>
          기본 정보
        </div>
        {[
          { label: '가격', vals: products.map(p => `${p.price?.toLocaleString()}원`), highlight: (vs) => vs.indexOf(Math.min(...products.map(p => p.price || 999999)).toString() + '원') },
          { label: '평점', vals: products.map(p => `★ ${p.averageRating?.toFixed(1)}`), best: true },
          { label: '리뷰', vals: products.map(p => `${p.reviewsCount?.toLocaleString()}개`) },
          { label: '주의 성분', vals: products.map(p => `${p.ingredients?.filter(i => i.riskLevel === 'danger').length || 0}개`) },
          { label: '안전 성분 %', vals: products.map(p => {
            const t = p.ingredients?.length || 1;
            const s = p.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;
            return `${Math.round((s / t) * 100)}%`;
          }) },
        ].map(({ label, vals }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--hairline)', padding: '11px 0' }}>
            <div style={{ width: '80px', flexShrink: 0, fontSize: '12.5px', fontWeight: 700, color: 'var(--ink-faint)' }}>{label}</div>
            {vals.map((v, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)' }}>{v}</div>
            ))}
          </div>
        ))}
      </section>

      {/* ─── CTA 버튼 ─── */}
      <div style={{ display: 'flex', gap: '10px' }}>
        {products.map(p => (
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
  );
}
