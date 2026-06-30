// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, Dog, Cat, Star, ChevronRight, Megaphone } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';
import { getDisplayGrade, hasRealPetProfile } from '../utils/productGrade';
import { matchesSpecies, matchesCategory } from '../utils/rankingFilters';
import { displayBrand } from '../utils/brandLabel';
import GradeBadge from '../components/GradeBadge';
import ProductImage from '../components/ProductImage';

const CATEGORY_FILTERS = ['전체', '사료', '간식', '영양제'];
const SPECIES_FILTERS = ['전체', '강아지', '고양이'];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  D: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const navigate = useNavigate();
  const { products, profile, isLoggedIn } = useStore();
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [speciesFilter, setSpeciesFilter] = useState('전체');

  const hasPetProfile = hasRealPetProfile(profile, isLoggedIn);

  const sponsored = useMemo(() =>
    products
      .filter(p => p.isSponsored && matchesSpecies(p, speciesFilter))
      .sort((a, b) => (a.sponsorOrder ?? 0) - (b.sponsorOrder ?? 0))
  , [products, speciesFilter]);

  const ranked = useMemo(() => {
    const base = products.filter(p =>
      !p.isSponsored && matchesSpecies(p, speciesFilter) && matchesCategory(p, categoryFilter)
    );

    if (hasPetProfile) {
      // 선택된 종 필터를 그대로 존중하기 위해 직접 궁합 점수로 정렬(이중 종필터 회피)
      return [...base]
        .map(p => ({ p, s: calculateCompatibilityScore(p, profile) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, 30)
        .map(x => x.p);
    }
    return [...base].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 30);
  }, [products, speciesFilter, categoryFilter, profile, hasPetProfile]);

  // CHANGED(P0-2): 평점이 있는 상품만으로 평균을 계산 — 미집계(0) 상품이 평균을
  // "0.0"으로 떨어뜨려 고장난 것처럼 보이던 문제 해소.
  const ratedProducts = ranked.filter((p) => (p.averageRating || 0) > 0);
  const avgRating = ratedProducts.length > 0
    ? (ratedProducts.reduce((s, p) => s + p.averageRating, 0) / ratedProducts.length).toFixed(1)
    : null; // null이면 "집계 중"으로 표시
  const aGradeCount = ranked.filter((p) => getDisplayGrade(p, profile, hasPetProfile).grade === 'A').length;

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
                minHeight: 44, padding: '0 18px', borderRadius: 22, border: 'none', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
                flexShrink: 0, minHeight: 38, padding: '0 14px', borderRadius: 19,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
            { label: '총 상품', value: `${ranked.length}개`, pending: ranked.length === 0 },
            { label: '평균 평점', value: avgRating ? `⭐ ${avgRating}` : '집계 중', pending: !avgRating },
            { label: 'A등급', value: `${aGradeCount}개`, pending: ranked.length === 0 },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: '#fff', borderRadius: 14, padding: '12px 10px', textAlign: 'center',
              boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
            }}>
              <div style={{ fontSize: stat.pending ? 12.5 : 15, fontWeight: 800, color: stat.pending ? '#B0B8C1' : '#191F28', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── 통계 배너 ─── */}
      {/* CHANGED(P0-2): 빈/제로 값을 그대로 노출하지 않도록 정리.
          · 궁합·알러지는 프로필이 있을 때만 의미 있으므로 미로그인/미등록 시에는
            오해를 주는 "-" 대신 등록 유도 배너로 대체.
          · 값이 집계 불가일 때는 "집계 중"으로 표시(스켈레톤 대체 텍스트). */}
      {(() => {
        // 안전 성분 — 성분이 분석된 상품만 평균 (미분석 0% 평균 하락 방지)
        const analyzed = ranked.slice(0, 10).filter(p => (p.ingredients?.length || 0) > 0);
        const safeValue = analyzed.length === 0
          ? null
          : Math.round(analyzed.reduce((s, p) => {
              const t = p.ingredients.length;
              const safe = p.ingredients.filter(i => i.riskLevel === 'safe').length;
              return s + (safe / t) * 100;
            }, 0) / analyzed.length);

        // 렌더 헬퍼(컴포넌트 아님) — 값이 null이면 "집계 중"으로 표시
        const renderStat = ({ key, value, unit, label, color, bg }) => {
          const pending = value == null;
          return (
            <div key={key} style={{ flex: 1, padding: '12px 10px', borderRadius: '14px', background: pending ? 'var(--fill)' : bg, textAlign: 'center' }}>
              <div style={{ fontSize: pending ? '13px' : '20px', fontWeight: pending ? 700 : 900, color: pending ? 'var(--ink-300)' : color, letterSpacing: '-0.02em' }}>
                {pending ? '집계 중' : <>{value}<span style={{ fontSize: '12px', fontWeight: 700 }}>{unit}</span></>}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '3px' }}>{label}</div>
            </div>
          );
        };

        if (!hasPetProfile) {
          // 맞춤 통계(궁합·알러지)는 프로필 필요 → 등록 유도 배너 + 일반 통계(안전 성분)
          return (
            <div style={{ display: 'flex', gap: '10px', margin: '0 0 16px', padding: '0 16px' }}>
              <button
                onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
                style={{
                  flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 8, padding: '12px 14px', borderRadius: '14px', textAlign: 'left',
                  background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--brand-deep)', lineHeight: 1.4 }}>
                  반려동물을 등록하면<br />맞춤 궁합·알러지 통계를 볼 수 있어요
                </span>
                <ChevronRight size={18} color="var(--brand-deep)" style={{ flexShrink: 0 }} />
              </button>
              {renderStat({ key: 'safe', value: safeValue, unit: '%', label: '안전 성분', color: '#3182F6', bg: '#EFF6FF' })}
            </div>
          );
        }

        const avgScore = ranked.length > 0
          ? Math.round(ranked.reduce((s, p) => s + calculateCompatibilityScore(p, profile), 0) / Math.min(ranked.length, 20))
          : null;
        const allergyFit = ranked.length > 0
          ? ranked.filter(p => {
              const allergies = profile?.allergies || [];
              return !p.ingredients?.some(i => allergies.some(a => i.nameKo?.includes(a)));
            }).length
          : null;

        return (
          <div style={{ display: 'flex', gap: '10px', margin: '0 0 16px', padding: '0 16px' }}>
            {renderStat({ key: 'score', value: avgScore, unit: '점', label: '평균 궁합 점수', color: 'var(--brand-deep)', bg: 'var(--brand-tint)' })}
            {renderStat({ key: 'allergy', value: allergyFit, unit: '개', label: '알러지 적합', color: 'var(--safe)', bg: 'var(--safe-tint)' })}
            {renderStat({ key: 'safe', value: safeValue, unit: '%', label: '안전 성분', color: '#3182F6', bg: '#EFF6FF' })}
          </div>
        );
      })()}

      {/* Ranking List */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ranked.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#4E5968', marginBottom: 6 }}>
              {categoryFilter === '전체' && speciesFilter === '전체'
                ? '아직 표시할 상품이 없어요'
                : '이 조건에 맞는 상품이 없어요'}
            </p>
            <p style={{ fontSize: 13, marginBottom: 18 }}>필터를 바꾸거나 전체에서 둘러보세요</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {(categoryFilter !== '전체' || speciesFilter !== '전체') && (
                <button
                  onClick={() => { setCategoryFilter('전체'); setSpeciesFilter('전체'); }}
                  style={{ background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}
                >필터 초기화</button>
              )}
              <button
                onClick={() => navigate('/search')}
                style={{ background: '#fff', border: '1.5px solid #E5E8EB', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer' }}
              >검색으로 둘러보기</button>
            </div>
          </div>
        ) : ranked.map((product, idx) => {
          const score = hasPetProfile ? calculateCompatibilityScore(product, profile) : null;
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
                <div style={{ display: 'flex', gap: 5, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <GradeBadge product={product} profile={profile} withProfile={hasPetProfile} />
                  {score != null && (
                    <span style={{ background: '#F0EDE8', color: '#4E5968', fontWeight: 700, fontSize: 10, borderRadius: 5, padding: '2px 5px' }}>
                      궁합 {score}%
                    </span>
                  )}
                </div>
                {displayBrand(product.brand, product.name) && (
                  <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 1 }}>{displayBrand(product.brand, product.name)}</div>
                )}
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
                {score != null && (
                  <div style={{ marginBottom: '3px', padding: '2px 7px', borderRadius: '6px', background: 'var(--brand-tint)', display: 'inline-block' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-deep)' }}>궁합 {score}점</span>
                  </div>
                )}
                <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 4 }}>
                  {product.price ? `${product.price.toLocaleString()}원` : ''}
                </div>
                <ChevronRight size={16} color="#B0B8C1" />
              </div>
            </div>
          );
        })}
      </div>

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
              const sgrade = getDisplayGrade(p, profile, hasPetProfile).grade;
              const grade = sgrade === 'pending' ? null : sgrade;

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
                        background: GRADE_COLORS[grade]?.bg, color: GRADE_COLORS[grade]?.color,
                      }}>{grade}</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-faint)' }}>{displayBrand(p.brand, p.name)}</span>
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
