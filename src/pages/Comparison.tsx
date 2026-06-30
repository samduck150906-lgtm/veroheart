// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { useStore } from '../store/useStore';
import { gradeFromScore, getRecommendationBreakdown, getProductBadges } from '../utils/score';
import ProductImage from '../components/ProductImage';
import AnalysisBadges from '../components/AnalysisBadges';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { PRE_PURCHASE } from '../copy/ui';

const GRADE_COLOR: Record<string, string> = {
  A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452',
};
const GRADE_BG: Record<string, string> = {
  A: '#ECFDF5', B: '#F0FDE8', C: '#FFFBEB', D: '#FFF1F2',
};

const BUCKETS = [
  { key: 'safety',      label: '성분 안전',  max: 35 },
  { key: 'concern',     label: '건강 고민',  max: 25 },
  { key: 'socialProof', label: '신뢰도',     max: 20 },
  { key: 'petFit',      label: '종/연령 적합', max: 10 },
  { key: 'value',       label: '가성비',     max: 10 },
  { key: 'nutrition',   label: 'AAFCO 영양', max: 10 },
];

// 각 버킷의 만점 대비 퍼센트
function pct(value: number, max: number) {
  return Math.round(Math.min(100, (value / max) * 100));
}

const BAR_COLORS = ['#FFC928', '#3182F6', '#15B36B', '#A855F7'];

export default function Comparison() {
  const navigate = useNavigate();
  const {
    profile, isLoggedIn,
    products: storeProducts,
    comparisonList, removeFromComparison,
  } = useStore();

  const hasPetProfile =
    isLoggedIn && profile?.id && profile.id !== 'local-profile' &&
    profile.name && profile.name !== '우리 아이';

  const products = comparisonList
    .map(id => storeProducts.find(p => p.id === id))
    .filter(Boolean) as typeof storeProducts;

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
        <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
          <GitCompare size={32} color="var(--ink-300)" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)', marginBottom: '8px' }}>비교함이 비어있어요</h3>
        <p style={{ fontSize: '14px', color: 'var(--ink-faint)', lineHeight: 1.6, marginBottom: '28px' }}>
          상품 상세 페이지에서 "비교" 버튼을 눌러<br />원하는 사료를 담아보세요
        </p>
        <button
          onClick={() => navigate('/search')}
          style={{ padding: '14px 28px', borderRadius: '14px', background: 'var(--brand)', color: 'var(--ink-on-brand)', fontWeight: 800, fontSize: '15px', border: 'none', cursor: 'pointer' }}
        >
          사료 탐색하기
        </button>
      </div>
    );
  }

  const breakdowns = products.map(p =>
    hasPetProfile ? getRecommendationBreakdown(p, profile) : null
  );

  // 각 버킷에서 최고 점수 인덱스 (하이라이트용)
  const winnerOf = (key: string) => {
    if (!hasPetProfile) return -1;
    let best = -1, bestVal = -1;
    breakdowns.forEach((bd, i) => {
      const v = bd?.[key] ?? 0;
      if (v > bestVal) { bestVal = v; best = i; }
    });
    return best;
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* ─── 헤더 ─── */}
      <div style={{ padding: '20px 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--fill)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GitCompare size={18} color="var(--ink-soft)" strokeWidth={2.2} />
        </span>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            제품 비교 <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink-faint)' }}>{products.length}/4</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '1px' }}>
            {hasPetProfile ? `${profile.name} 맞춤 점수 기준` : '성분 · 평점 · 가격 비교'}
          </div>
        </div>
      </div>

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
                </div>
              ) : (
                <button
                  onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '6px', borderRadius: '8px', background: 'var(--brand-tint)', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--brand-deep)' }}
                >
                  점수 보기
                </button>
              )}
            </div>
          ));
        })()}
      </section>

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

      {/* ─── 버킷별 점수 바 ─── */}
      {hasPetProfile && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', marginBottom: '14px', letterSpacing: '-0.02em' }}>
            항목별 점수 비교
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {BUCKETS.map(({ key, label, max }) => {
              const winner = winnerOf(key);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink-soft)' }}>{label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 600 }}>만점 {max}점</span>
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
            구매 <ExternalLink size={13} />
          </button>
        ))}
      </div>
    </div>
  );
}
