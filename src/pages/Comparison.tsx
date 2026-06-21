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

<<<<<<< HEAD
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
=======
      {/* ─── AI 추천 ─── */}
      {hasPetProfile && products.length >= 2 && (() => {
        const scored = products.map((p, i) => ({ p, bd: breakdowns[i], total: breakdowns[i]?.total ?? 0 }));
        const best = scored.reduce((a, b) => a.total >= b.total ? a : b);
        const reasons = [];
        if (best.bd) {
          if (best.bd.safety >= 28) reasons.push('성분 안전도 우수');
          if (best.bd.concern >= 18) reasons.push('건강 고민 적합');
          if (best.bd.value >= 7) reasons.push('가성비 좋음');
          if (reasons.length === 0) reasons.push('종합 점수 최고');
        }
        return (
          <div style={{ marginBottom: '20px', padding: '18px 16px', borderRadius: '18px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#A16207' }}>AI 추천</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#1C1917', lineHeight: 1.35, marginBottom: '12px' }}>
              <span style={{ color: 'var(--brand-deep)' }}>{best.p.brand} {best.p.name.length > 18 ? best.p.name.slice(0, 18) + '…' : best.p.name}</span>을(를) 추천합니다
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {reasons.map(r => (
                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#78716C' }}>
                  <span style={{ color: 'var(--safe)', fontWeight: 900 }}>✔</span> {r}
                </div>
              ))}
            </div>
            {best.bd && (
              <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.7)', display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-deep)' }}>{best.bd.total}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>점 / 100</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── 상품 헤더 카드들 (가로 스크롤) ─── */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '24px', scrollbarWidth: 'none' }}>
        {products.map((p, i) => {
          const bd = breakdowns[i];
          const grade = bd ? gradeFromScore(bd.total) : null;
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
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '10px' }}>
                {p.name}
              </div>
              {grade && bd ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '7px', background: GRADE_BG[grade], color: GRADE_COLOR[grade], fontSize: '13px', fontWeight: 800 }}>
                    {grade}등급
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: GRADE_COLOR[grade] }}>{bd.total}</span>
>>>>>>> cb8669b (feat: add ranking stats header, score differentiation, AI recommendation card and trophy highlights in comparison)
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
          항목별 비교
        </div>
        {(() => {
          const safeRatio = (p) => {
            const t = p.ingredients?.length || 1;
            const s = p.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;
            return Math.round((s / t) * 100);
          };
          const dangerCount = (p) => p.ingredients?.filter(i => i.riskLevel === 'danger').length || 0;
          const rows = [
            {
              label: '궁합 점수',
              vals: products.map(p => breakdowns[products.indexOf(p)]?.total ?? '-'),
              winner: hasPetProfile ? products.reduce((bi, p, i) => (breakdowns[i]?.total ?? 0) > (breakdowns[bi]?.total ?? 0) ? i : bi, 0) : -1,
              fmt: (v) => v !== '-' ? `${v}점` : '-',
            },
            {
              label: '성분 안전',
              vals: products.map(p => safeRatio(p)),
              winner: products.reduce((bi, p, i) => safeRatio(p) > safeRatio(products[bi]) ? i : bi, 0),
              fmt: (v) => `${v}%`,
            },
            {
              label: '주의 성분',
              vals: products.map(p => dangerCount(p)),
              winner: products.reduce((bi, p, i) => dangerCount(p) < dangerCount(products[bi]) ? i : bi, 0),
              fmt: (v) => `${v}개`,
            },
            {
              label: '등급',
              vals: products.map(p => breakdowns[products.indexOf(p)] ? gradeFromScore(breakdowns[products.indexOf(p)].total) : '-'),
              winner: hasPetProfile ? products.reduce((bi, p, i) => (breakdowns[i]?.total ?? 0) > (breakdowns[bi]?.total ?? 0) ? i : bi, 0) : -1,
              fmt: (v) => v !== '-' ? `${v}등급` : '-',
            },
            {
              label: '가격',
              vals: products.map(p => p.price || 0),
              winner: products.reduce((bi, p, i) => (p.price || 999999) < (products[bi].price || 999999) ? i : bi, 0),
              fmt: (v) => v ? `${v.toLocaleString()}원~` : '-',
            },
            {
              label: '평점',
              vals: products.map(p => p.averageRating ?? 0),
              winner: products.reduce((bi, p, i) => (p.averageRating ?? 0) > (products[bi].averageRating ?? 0) ? i : bi, 0),
              fmt: (v) => `★ ${v.toFixed(1)}`,
            },
            {
              label: '리뷰',
              vals: products.map(p => p.reviewsCount ?? 0),
              winner: products.reduce((bi, p, i) => (p.reviewsCount ?? 0) > (products[bi].reviewsCount ?? 0) ? i : bi, 0),
              fmt: (v) => `${v.toLocaleString()}개`,
            },
          ];

          return rows.map(({ label, vals, winner, fmt }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--hairline)', padding: '12px 0' }}>
              <div style={{ width: '72px', flexShrink: 0, fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>{label}</div>
              {vals.map((v, i) => {
                const isWinner = products.length > 1 && i === winner;
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
