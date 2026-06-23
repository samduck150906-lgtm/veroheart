// @ts-nocheck
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { gradeFromScore, getRecommendationBreakdown, getProductBadges } from '../utils/score';
import ProductImage from '../components/ProductImage';
import AnalysisBadges from '../components/AnalysisBadges';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { PRE_PURCHASE } from '../copy/ui';

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

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

  // 항상 계산: DCM·단백보강·AAFCO 등은 펫 프로필과 무관한 제품 고유 신호다.
  // 개인화 표시(궁합 점수·등급)는 hasPetProfile로 게이팅한다.
  const breakdowns = useMemo(
    () => compareProducts.map(p => getRecommendationBreakdown(p, profile)),
    [compareProducts, profile],
  );

  const grades = useMemo(() => {
    return Object.fromEntries(
      compareProducts.map((p, i) => {
        const bd = breakdowns[i];
        return [p.id, hasPetProfile && bd ? gradeFromScore(bd.total) : null];
      })
    );
  }, [compareProducts, breakdowns, hasPetProfile]);

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

        {/* ─── AI 추천 ─── */}
        {hasPetProfile && compareProducts.length >= 2 && (() => {
          const bestIdx = breakdowns.reduce((bi, bd, i) =>
            (bd?.total ?? 0) > (breakdowns[bi]?.total ?? 0) ? i : bi, 0);
          const best = compareProducts[bestIdx];
          const bd = breakdowns[bestIdx];
          const reasons = [];
          if (bd) {
            if (bd.safety >= 28) reasons.push('성분 안전도 우수');
            if (bd.concern >= 18) reasons.push('건강 고민 적합');
            if (bd.value >= 7) reasons.push('가성비 좋음');
            if (reasons.length === 0) reasons.push('종합 점수 최고');
          }
          return (
            <div style={{ marginBottom: '20px', padding: '18px 16px', borderRadius: '18px', background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)', border: '1px solid #FDE68A' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#A16207' }}>AI 추천</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#1C1917', lineHeight: 1.35, marginBottom: '12px' }}>
                <span style={{ color: 'var(--brand-deep)' }}>
                  {best.brand} {best.name.length > 18 ? best.name.slice(0, 18) + '…' : best.name}
                </span>을(를) 추천합니다
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {reasons.map(r => (
                  <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#78716C' }}>
                    <span style={{ color: 'var(--safe)', fontWeight: 900 }}>✔</span> {r}
                  </div>
                ))}
              </div>
              {bd && (
                <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.7)', display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-deep)' }}>{bd.total}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-faint)' }}>점 / 100</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── 상품 헤더 카드들 (가로 스크롤) ─── */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '24px', scrollbarWidth: 'none' }}>
          {compareProducts.map((p, i) => {
            const bd = breakdowns[i];
            const grade = grades[p.id];
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
                    <span style={{ padding: '3px 8px', borderRadius: '7px', background: GRADE_COLORS[grade]?.bg, color: GRADE_COLORS[grade]?.color, fontSize: '13px', fontWeight: 800 }}>
                      {grade}등급
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 900, color: GRADE_COLORS[grade]?.color }}>{bd.total}</span>
                  </div>
                ) : null}
                {bd && <AnalysisBadges badges={getProductBadges(bd, { max: 3 })} style={{ marginTop: 8 }} />}
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
            // 동점이면 -1(승자 표시 없음), 아니면 최댓/최솟값 인덱스
            const bestHigh = (nums) => nums.every(n => n === nums[0]) ? -1 : nums.indexOf(Math.max(...nums));
            const bestLow = (nums) => nums.every(n => n === nums[0]) ? -1 : nums.indexOf(Math.min(...nums));
            const LEGUME_RANK = { none: 0, watch: 1, danger: 2 };
            const LEGUME_LABEL = { none: '없음', watch: '주의', danger: '위험' };
            const rows = [
              {
                label: '궁합 점수',
                vals: compareProducts.map((p, i) => hasPetProfile ? breakdowns[i].total : '-'),
                winner: hasPetProfile
                  ? breakdowns.reduce((bi, bd, i) => (bd?.total ?? 0) > (breakdowns[bi]?.total ?? 0) ? i : bi, 0)
                  : -1,
                fmt: (v) => v !== '-' ? `${v}점` : '-',
              },
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
                label: 'AAFCO 영양',
                vals: compareProducts.map((p, i) => breakdowns[i].nutrition),
                winner: bestHigh(compareProducts.map((p, i) => breakdowns[i].nutrition)),
                fmt: (v) => v > 0 ? `${v}/10` : '-',
              },
              {
                label: 'DCM 위험',
                vals: compareProducts.map((p, i) => breakdowns[i].legumeRisk),
                winner: bestLow(compareProducts.map((p, i) => LEGUME_RANK[breakdowns[i].legumeRisk] ?? 0)),
                fmt: (v) => LEGUME_LABEL[v] ?? v,
              },
              {
                label: '단백 보강',
                vals: compareProducts.map((p, i) => breakdowns[i].proteinInflated ? 1 : 0),
                winner: bestLow(compareProducts.map((p, i) => breakdowns[i].proteinInflated ? 1 : 0)),
                fmt: (v) => v ? '의심' : '없음',
              },
              {
                label: '등급',
                vals: compareProducts.map((p, i) => hasPetProfile && breakdowns[i] ? gradeFromScore(breakdowns[i].total) : '-'),
                winner: hasPetProfile
                  ? breakdowns.reduce((bi, bd, i) => (bd?.total ?? 0) > (breakdowns[bi]?.total ?? 0) ? i : bi, 0)
                  : -1,
                fmt: (v) => v !== '-' ? `${v}등급` : '-',
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
