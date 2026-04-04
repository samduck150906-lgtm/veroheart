import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, TrendingUp, Star, Dog, Cat, ShieldCheck, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';
import { UGC_COPY } from '../copy/marketing';

const TABS = [
  { key: 'compatibility', label: '궁합 점수', icon: '💯' },
  { key: 'rating', label: '평점 높은순', icon: '⭐' },
  { key: 'reviews', label: '리뷰 많은순', icon: '💬' },
  { key: 'safe', label: '성분 안전', icon: '🛡️' },
];

const PET_TABS = [
  { key: 'all', label: '전체', icon: <span>🐾</span> },
  { key: 'dog', label: '강아지', icon: <Dog size={14} /> },
  { key: 'cat', label: '고양이', icon: <Cat size={14} /> },
];

export default function Ranking() {
  const { products, profile } = useStore();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'compatibility' | 'rating' | 'reviews' | 'safe'>('compatibility');
  const [petFilter, setPetFilter] = useState<'all' | 'dog' | 'cat'>('all');

  const filtered = products.filter((p) =>
    petFilter === 'all' || p.targetPetType === petFilter || p.targetPetType === 'all'
  );

  const safeScore = (p: any) => {
    const total = p.ingredients?.length || 1;
    const safe = p.ingredients?.filter((i: any) => i.riskLevel === 'safe').length || 0;
    return safe / total;
  };

  const ranked = [...filtered]
    .sort((a, b) => {
      if (sortBy === 'compatibility') {
        return calculateCompatibilityScore(b, profile) - calculateCompatibilityScore(a, profile);
      }
      if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      if (sortBy === 'safe') {
        return safeScore(b) - safeScore(a);
      }
      return 0;
    })
    .slice(0, 30);

  const heroStats = useMemo(() => {
    const topRated = [...filtered].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))[0];
    const mostReviewed = [...filtered].sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0))[0];
    const safest = [...filtered].sort((a, b) => safeScore(b) - safeScore(a))[0];
    return {
      topRated,
      mostReviewed,
      safest,
    };
  }, [filtered]);

  const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2E'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <Helmet><title>랭킹 - 베로로</title></Helmet>

      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '20px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
          <Trophy size={13} />
          ranking board
        </span>
        <h1 style={{ fontSize: '25px', fontWeight: 900, marginBottom: '8px' }}>지금 많이 보는 제품 랭킹</h1>
        <p style={{ fontSize: '14px', color: '#67707C', lineHeight: 1.6, marginBottom: '14px' }}>
          {UGC_COPY.settleDown}
        </p>
        <div className="ui-grid-3">
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><Star size={16} color="#F59E0B" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '4px' }}>평점 우수</div>
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.45 }}>{heroStats.topRated?.name ?? '데이터 준비 중'}</div>
          </div>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><MessageSquare size={16} color="#3B82F6" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '4px' }}>리뷰 최다</div>
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.45 }}>{heroStats.mostReviewed?.name ?? '데이터 준비 중'}</div>
          </div>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><ShieldCheck size={16} color="#10B981" /></div>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '4px' }}>안전 성분</div>
            <div style={{ fontSize: '14px', fontWeight: 800, lineHeight: 1.45 }}>{heroStats.safest?.name ?? '데이터 준비 중'}</div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {PET_TABS.map(tab => (
          <button key={tab.key} onClick={() => setPetFilter(tab.key as any)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '24px', border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: '14px', transition: 'all 0.2s',
            background: petFilter === tab.key ? '#111827' : '#F3F4F6',
            color: petFilter === tab.key ? '#fff' : '#4B5563'
          }}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '18px', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setSortBy(tab.key as any)} style={{
            padding: '10px 18px', borderRadius: '24px', border: '1px solid',
            borderColor: sortBy === tab.key ? 'var(--primary)' : '#E5E7EB',
            background: sortBy === tab.key ? 'var(--primary)' : '#fff',
            color: sortBy === tab.key ? '#fff' : '#4B5563',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '6px'
          }}>
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="ui-info-card" style={{ marginBottom: '18px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div className="ui-section-kicker">ranking logic</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)' }}>
              {sortBy === 'compatibility' && `${profile.name} 맞춤 궁합 순`}
              {sortBy === 'rating' && '평점 높은 순'}
              {sortBy === 'reviews' && '리뷰 많은 순'}
              {sortBy === 'safe' && '안전 성분 비율 순'}
            </div>
          </div>
          <span className="ui-badge ui-badge-muted">{ranked.length}개 제품</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ranked.map((product, idx) => {
          const score = calculateCompatibilityScore(product, profile);
          const safeRatio = product.ingredients?.length
            ? Math.round((product.ingredients.filter((i: any) => i.riskLevel === 'safe').length / product.ingredients.length) * 100)
            : 0;

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="ui-list-card"
              style={{ cursor: 'pointer', border: idx < 3 ? `1.5px solid ${medalColors[idx]}22` : undefined }}
            >
              <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
                {idx < 3 ? (
                  <div style={{ fontSize: '24px' }}>{['🥇', '🥈', '🥉'][idx]}</div>
                ) : (
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#D1D5DB', fontStyle: 'italic' }}>{idx + 1}</span>
                )}
              </div>

              <img src={product.imageUrl} alt={product.name} style={{ width: '72px', height: '72px', borderRadius: '18px', objectFit: 'cover', flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 700, marginBottom: '4px' }}>{product.brand}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827', lineHeight: 1.45, marginBottom: '8px' }}>{product.name}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                    <Star size={11} fill="#FCD34D" color="#FCD34D" /> {product.averageRating}
                  </span>
                  <span className="ui-badge ui-badge-muted">리뷰 {product.reviewsCount}</span>
                  {idx < 3 && (
                    <span className="ui-badge ui-badge-soft">
                      <Sparkles size={12} />
                      상위권
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {sortBy === 'compatibility' && (
                  <div style={{ fontSize: '20px', fontWeight: 900, color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }}>{score}<span style={{ fontSize: '11px', color: '#9CA3AF' }}>점</span></div>
                )}
                {sortBy === 'rating' && (
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B' }}>{product.averageRating}</div>
                )}
                {sortBy === 'reviews' && (
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#3B82F6' }}>{product.reviewsCount?.toLocaleString()}</div>
                )}
                {sortBy === 'safe' && (
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#10B981' }}>{safeRatio}%</div>
                )}
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{product.price?.toLocaleString()}원</div>
              </div>
            </div>
          );
        })}
        {ranked.length === 0 && (
          <div className="ui-info-card" style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
            <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>제품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
