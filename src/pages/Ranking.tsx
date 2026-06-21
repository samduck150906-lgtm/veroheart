// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, Dog, Cat, Star, ChevronRight, Megaphone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore, rankProductsForProfile } from '../utils/score';
import ProductImage from '../components/ProductImage';

const CATEGORY_FILTERS = ['전체', '사료', '간식', '영양제'];
const SPECIES_FILTERS = ['강아지', '고양이'];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

function GradeTag({ grade }) {
  const c = GRADE_COLORS[grade] || GRADE_COLORS.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>{grade}등급</span>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const navigate = useNavigate();
  const { products, profile, isLoggedIn } = useStore();
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [speciesFilter, setSpeciesFilter] = useState('강아지');

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  // 스폰서 상품은 추천 알고리즘에서 완전 분리
  const sponsored = useMemo(() =>
    products
      .filter(p => p.isSponsored && (petFilter === 'all' || p.targetPetType === petFilter || p.targetPetType === 'all'))
      .sort((a, b) => (a.sponsorOrder ?? 0) - (b.sponsorOrder ?? 0))
  , [products, petFilter]);

  const ranked = useMemo(() => {
    const base = products.filter(p =>
      !p.isSponsored &&
      (petFilter === 'all' || p.targetPetType === petFilter || p.targetPetType === 'all')
    );

    if (hasPetProfile) {
      return rankProductsForProfile(list, profile, { limit: 30 });
    }
    return [...list].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 30);
  }, [products, speciesFilter, categoryFilter, profile, hasPetProfile]);

  const avgRating = ranked.length > 0
    ? (ranked.reduce((s, p) => s + (p.averageRating || 0), 0) / ranked.length).toFixed(1)
    : '0.0';
  const aGradeCount = ranked.filter((p, i) => {
    const score = hasPetProfile ? calculateCompatibilityScore(p, profile) : null;
    const grade = score != null ? gradeFromScore(score) : null;
    return grade === 'A';
  }).length;

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>이번 주 랭킹</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', fontWeight: 500, marginBottom: 16 }}>
          {hasPetProfile ? `${profile.name} 맞춤 추천 순위` : '평점 기준 상위 상품'}
        </p>

        {/* Species Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {SPECIES_FILTERS.map(f => (
            <button key={f} onClick={() => setSpeciesFilter(f)}
              style={{
                padding: '7px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: speciesFilter === f ? '#191F28' : '#fff',
                color: speciesFilter === f ? '#fff' : '#4E5968',
                boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
          {CATEGORY_FILTERS.map(f => (
            <button key={f} onClick={() => setCategoryFilter(f)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 20,
                border: `1.5px solid ${categoryFilter === f ? '#F5C518' : '#E5E8EB'}`,
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: categoryFilter === f ? '#FEF6E0' : '#fff',
                color: categoryFilter === f ? '#CA8A04' : '#6B7684',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: '총 상품', value: `${ranked.length}개` },
            { label: '평균 평점', value: `⭐ ${avgRating}` },
            { label: 'A등급', value: `${aGradeCount}개` },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: '#fff', borderRadius: 14, padding: '12px 10px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

<<<<<<< HEAD
      {/* Ranking List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600 }}>해당 카테고리 상품이 없어요</p>
          </div>
        ) : ranked.map((product, idx) => {
          const score = hasPetProfile ? calculateCompatibilityScore(product, profile) : null;
=======
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
>>>>>>> cb8669b (feat: add ranking stats header, score differentiation, AI recommendation card and trophy highlights in comparison)
          const grade = score != null ? gradeFromScore(score) : null;
          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              style={{
                background: '#fff', borderRadius: 16, padding: '14px 16px',
                boxShadow: idx < 3 ? '0 2px 16px rgba(245,197,24,0.15)' : '0 1px 4px rgba(30,41,59,0.06)',
                cursor: 'pointer',
                border: idx < 3 ? '1.5px solid rgba(245,197,24,0.25)' : '1.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
                {idx < 3
                  ? <span style={{ fontSize: 22 }}>{MEDALS[idx]}</span>
                  : <span style={{ fontSize: 16, fontWeight: 800, color: '#B0B8C1' }}>{idx + 1}</span>
                }
              </div>
              <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                  {grade && <GradeTag grade={grade} />}
                  {score != null && (
                    <span style={{ background: '#F0EDE8', color: '#4E5968', fontWeight: 700, fontSize: 10, borderRadius: 5, padding: '2px 5px' }}>
                      궁합 {score}%
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 1 }}>{product.brand}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
                  {product.name.length > 28 ? product.name.slice(0, 28) + '…' : product.name}
                </div>
                {product.averageRating > 0 && (
                  <div style={{ fontSize: 11, color: '#6B7684', marginTop: 3 }}>
                    ⭐ {Number(product.averageRating).toFixed(1)}
                    {product.reviewsCount > 0 && ` · ${product.reviewsCount.toLocaleString()}개 리뷰`}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
<<<<<<< HEAD
                <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 4 }}>
                  {product.price ? `${product.price.toLocaleString()}원` : ''}
                </div>
                <ChevronRight size={16} color="#B0B8C1" />
=======
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
>>>>>>> cb8669b (feat: add ranking stats header, score differentiation, AI recommendation card and trophy highlights in comparison)
              </div>
            </div>
          );
        })}
      </div>

<<<<<<< HEAD
      {/* ─── 스폰서 섹션 (추천 알고리즘과 완전 분리) ─── */}
      {sponsored.length > 0 && (
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px dashed var(--hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Megaphone size={15} color="var(--ink-faint)" strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: 0.4 }}>스폰서</span>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 500 }}>— 이 영역은 브랜드 광고로 운영되며 랭킹 순위에 영향을 주지 않습니다.</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sponsored.map((p) => {
              const score = hasPetProfile ? calculateCompatibilityScore(p, profile) : null;
              const grade = score != null ? gradeFromScore(score) : null;

              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/product/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 12px',
                    borderRadius: 12,
                    background: '#F9FAFB',
                    border: '1px solid var(--hairline)',
                    marginBottom: 10,
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, background: 'var(--fill)', position: 'relative' }}>
                    <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {grade && (
                      <span style={{
                        position: 'absolute', bottom: '3px', left: '3px',
                        padding: '1px 5px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                        background: GRADE_BG[grade], color: GRADE_COLOR[grade],
                      }}>{grade}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)' }}>{p.brand}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB',
                      }}>{p.sponsorLabel || '광고'}</span>
                    </div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Star size={11} fill="#E8A800" color="#E8A800" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink-soft)' }}>{p.averageRating?.toFixed(1)}</span>
                      {score != null && (
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--brand-deep)' }}>· 궁합 {score}점</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                      {p.price?.toLocaleString()}원
                    </div>
                    <ChevronRight size={14} color="var(--ink-300)" style={{ marginTop: 4 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
=======
      {/* ─── 랭킹 기준 설명 ─── */}
      <div style={{ marginTop: '24px', padding: '14px 16px', borderRadius: '14px', background: 'var(--fill)' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ink-soft)', marginBottom: '6px' }}>📊 랭킹 산출 기준</div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink-faint)', lineHeight: 1.6, fontWeight: 500 }}>
          {hasPetProfile ? `${profile.name} 프로필(종·나이·알러지·건강고민)을 기반으로 산출된 궁합 점수입니다.` : '평점·리뷰·성분 안전도·가성비를 종합한 점수입니다.'} 랭킹은 주간 단위로 갱신됩니다.
        </div>
      </div>
>>>>>>> cb8669b (feat: add ranking stats header, score differentiation, AI recommendation card and trophy highlights in comparison)
    </div>
  );
}
