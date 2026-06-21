// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, Dog, Cat, Star, ChevronRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { rankProductsForProfile, calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';

const SORT_TABS = [
  { key: 'compatibility', label: '맞춤 순' },
  { key: 'rating',        label: '평점 순' },
  { key: 'reviews',       label: '리뷰 순' },
  { key: 'safe',          label: '안전 순' },
  { key: 'budget',        label: '가성비' },
];

const PET_TABS = [
  { key: 'all', label: '전체' },
  { key: 'dog', label: '강아지', Icon: Dog },
  { key: 'cat', label: '고양이', Icon: Cat },
];

const GRADE_COLOR: Record<string, string> = {
  A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452',
};
const GRADE_BG: Record<string, string> = {
  A: '#ECFDF5', B: '#F0FDE8', C: '#FFFBEB', D: '#FFF1F2',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const { products, profile, isLoggedIn } = useStore();
  const navigate = useNavigate();

  const hasPetProfile =
    isLoggedIn && profile?.id && profile.id !== 'local-profile' &&
    profile.name && profile.name !== '우리 아이';

  const [sortBy, setSortBy] = useState<string>(hasPetProfile ? 'compatibility' : 'rating');
  const [petFilter, setPetFilter] = useState<'all' | 'dog' | 'cat'>('all');

  const activeSortTabs = SORT_TABS.filter(t => t.key !== 'compatibility' || hasPetProfile);

  const safeRatioOf = (p) => {
    const total = p.ingredients?.length || 1;
    const safe = p.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;
    return safe / total;
  };

  const ranked = useMemo(() => {
    const base = products.filter(p =>
      petFilter === 'all' || p.targetPetType === petFilter || p.targetPetType === 'all'
    );

    if (sortBy === 'compatibility' && hasPetProfile) {
      return rankProductsForProfile(base, profile, { limit: 50 }).map(r => r.product);
    }
    return [...base].sort((a, b) => {
      if (sortBy === 'rating')  return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      if (sortBy === 'safe')    return safeRatioOf(b) - safeRatioOf(a);
      if (sortBy === 'budget')  return (a.price || 0) - (b.price || 0);
      return 0;
    }).slice(0, 50);
  }, [products, profile, petFilter, sortBy, hasPetProfile]);

  const metricOf = (p) => {
    if (sortBy === 'compatibility') return { value: calculateCompatibilityScore(p, profile), unit: '점', color: GRADE_COLOR[gradeFromScore(calculateCompatibilityScore(p, profile))] };
    if (sortBy === 'rating')        return { value: p.averageRating?.toFixed(1), unit: '', color: '#E8A800' };
    if (sortBy === 'reviews')       return { value: p.reviewsCount?.toLocaleString(), unit: '개', color: '#3182F6' };
    if (sortBy === 'safe')          return { value: Math.round(safeRatioOf(p) * 100), unit: '%', color: '#15B36B' };
    if (sortBy === 'budget')        return { value: p.price?.toLocaleString(), unit: '원', color: 'var(--ink)' };
    return { value: '', unit: '', color: 'var(--ink)' };
  };

  const subtitleMap = {
    compatibility: hasPetProfile ? `${profile.name} 맞춤 궁합 높은 순` : '궁합 점수 순',
    rating: '평점 높은 순',
    reviews: '리뷰 많은 순',
    safe: '안전 성분 비율 순',
    budget: '가격 낮은 순',
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Helmet><title>랭킹 — 베로로</title></Helmet>

      {/* ─── 헤더 ─── */}
      <div style={{ padding: '20px 0 4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trophy size={18} color="var(--brand-deep)" strokeWidth={2.2} />
        </span>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>사료 랭킹</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '1px' }}>{subtitleMap[sortBy]}</div>
        </div>
      </div>

      {/* ─── 종류 탭 ─── */}
      <div style={{ display: 'flex', gap: '6px', margin: '16px 0 10px' }}>
        {PET_TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setPetFilter(key as any)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '7px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700,
              background: petFilter === key ? 'var(--ink)' : 'var(--fill)',
              color: petFilter === key ? '#fff' : 'var(--ink-soft)',
            }}
          >
            {Icon && <Icon size={13} />}{label}
          </button>
        ))}
      </div>

      {/* ─── 통계 배너 ─── */}
      <div style={{ display: 'flex', gap: '10px', margin: '0 0 16px' }}>
        {[
          {
            label: '평균 궁합 점수',
            value: hasPetProfile && ranked.length > 0
              ? Math.round(ranked.reduce((s, p) => s + calculateCompatibilityScore(p, profile), 0) / Math.min(ranked.length, 20))
              : '-',
            unit: '점',
            color: 'var(--brand-deep)',
            bg: 'var(--brand-tint)',
          },
          {
            label: '알러지 적합',
            value: hasPetProfile && ranked.length > 0
              ? ranked.filter(p => {
                  const allergies = profile?.allergies || [];
                  return !p.ingredients?.some(i => allergies.some(a => i.nameKo?.includes(a)));
                }).length
              : '-',
            unit: '개',
            color: 'var(--safe)',
            bg: 'var(--safe-tint)',
          },
          {
            label: '안전 성분',
            value: ranked.length > 0
              ? Math.round(ranked.slice(0, 10).reduce((s, p) => {
                  const t = p.ingredients?.length || 1;
                  const safe = p.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;
                  return s + (safe / t) * 100;
                }, 0) / Math.min(ranked.slice(0, 10).length, 1))
              : '-',
            unit: '%',
            color: '#3182F6',
            bg: '#EFF6FF',
          },
        ].map(({ label, value, unit, color, bg }) => (
          <div key={label} style={{ flex: 1, padding: '12px 10px', borderRadius: '14px', background: bg, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 900, color, letterSpacing: '-0.02em' }}>
              {value}<span style={{ fontSize: '12px', fontWeight: 700 }}>{unit}</span>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '3px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ─── 정렬 탭 ─── */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '18px', scrollbarWidth: 'none' }}>
        {activeSortTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            style={{
              flexShrink: 0, padding: '7px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap',
              background: sortBy === key ? 'var(--brand)' : 'var(--fill)',
              color: sortBy === key ? 'var(--ink-on-brand)' : 'var(--ink-soft)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── 상품 목록 ─── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {ranked.map((p, idx) => {
          const score = hasPetProfile ? calculateCompatibilityScore(p, profile) : null;
          const grade = score != null ? gradeFromScore(score) : null;
          const m = metricOf(p);

          return (
            <button
              key={p.id}
              onClick={() => navigate(`/product/${p.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 0',
                borderBottom: '1px solid var(--hairline)',
                background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                borderBottomColor: 'var(--hairline)',
              }}
            >
              {/* rank */}
              <div style={{ width: '32px', textAlign: 'center', flexShrink: 0 }}>
                {idx < 3
                  ? <span style={{ fontSize: '22px' }}>{MEDAL[idx]}</span>
                  : <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--ink-300)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>}
              </div>

              {/* thumbnail */}
              <div style={{ width: '66px', height: '66px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0, background: 'var(--fill)', position: 'relative' }}>
                <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {grade && (
                  <span style={{
                    position: 'absolute', bottom: '4px', left: '4px',
                    padding: '1px 6px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 800,
                    background: GRADE_BG[grade], color: GRADE_COLOR[grade],
                  }}>{grade}</span>
                )}
              </div>

              {/* info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)', marginBottom: '2px' }}>{p.brand}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '5px' }}>
                  <Star size={11} fill="#E8A800" color="#E8A800" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>{p.averageRating?.toFixed(1)}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-faint)' }}>· {p.reviewsCount?.toLocaleString()}개</span>
                </div>
              </div>

              {/* metric */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)', marginBottom: '2px' }}>제품 평가</div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: m.color, letterSpacing: '-0.02em' }}>
                  {m.value}<span style={{ fontSize: '11px', fontWeight: 700 }}>{m.unit}</span>
                </div>
                {hasPetProfile && sortBy !== 'compatibility' && (
                  <div style={{ marginTop: '4px', padding: '2px 7px', borderRadius: '6px', background: 'var(--brand-tint)', display: 'inline-block' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-deep)' }}>
                      궁합 {calculateCompatibilityScore(p, profile)}점
                    </span>
                  </div>
                )}
              </div>

              <ChevronRight size={16} color="var(--ink-300)" style={{ flexShrink: 0 }} />
            </button>
          );
        })}

        {ranked.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--ink-faint)' }}>
            <Trophy size={36} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700 }}>조건에 맞는 제품이 없어요</p>
          </div>
        )}
      </div>

      {/* ─── 랭킹 기준 설명 ─── */}
      <div style={{ marginTop: '24px', padding: '14px 16px', borderRadius: '14px', background: 'var(--fill)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-soft)', marginBottom: '6px' }}>📊 랭킹 산출 기준</div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', lineHeight: 1.6, fontWeight: 500 }}>
          {hasPetProfile ? `${profile.name} 프로필(종·나이·알러지·건강고민)을 기반으로 산출된 궁합 점수입니다.` : '평점·리뷰·성분 안전도·가성비를 종합한 점수입니다.'} 랭킹은 주간 단위로 갱신됩니다.
        </div>
      </div>
    </div>
  );
}
