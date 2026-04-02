import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, TrendingUp, Star, Dog, Cat } from 'lucide-react';
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

  const filtered = products.filter(p =>
    petFilter === 'all' || p.targetPetType === petFilter || p.targetPetType === 'all'
  );

  const ranked = [...filtered].sort((a, b) => {
    if (sortBy === 'compatibility') {
      return calculateCompatibilityScore(b, profile) - calculateCompatibilityScore(a, profile);
    }
    if (sortBy === 'rating') return (b.averageRating || 0) - (a.averageRating || 0);
    if (sortBy === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
    if (sortBy === 'safe') {
      const safeScore = (p: any) => {
        const total = p.ingredients?.length || 1;
        const safe = p.ingredients?.filter((i: any) => i.riskLevel === 'safe').length || 0;
        return safe / total;
      };
      return safeScore(b) - safeScore(a);
    }
    return 0;
  }).slice(0, 30);

  const medalColors = ['#F59E0B', '#94A3B8', '#CD7C2E'];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <Helmet><title>랭킹 - 베로로</title></Helmet>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <Trophy size={28} color="#F59E0B" />
          <h1 style={{ fontSize: '24px', fontWeight: 900 }}>제품 랭킹</h1>
        </div>
        <p style={{ fontSize: '13px', color: '#6B7280', fontWeight: 600, lineHeight: 1.5, paddingLeft: '2px' }}>{UGC_COPY.settleDown}</p>
      </div>

      {/* 반려동물 필터 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
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

      {/* 정렬 탭 */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '28px', paddingBottom: '4px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
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

      {/* 랭킹 목록 */}
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
              className="card"
              style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', cursor: 'pointer', border: idx < 3 ? `1.5px solid ${medalColors[idx]}22` : '1px solid #F3F4F6' }}
            >
              {/* 순위 */}
              <div style={{ width: '36px', textAlign: 'center', flexShrink: 0 }}>
                {idx < 3 ? (
                  <div style={{ fontSize: '24px' }}>{['🥇', '🥈', '🥉'][idx]}</div>
                ) : (
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#D1D5DB', fontStyle: 'italic' }}>{idx + 1}</span>
                )}
              </div>

              {/* 이미지 */}
              <img src={product.imageUrl} alt={product.name} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }} />

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: 600 }}>{product.brand}</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Star size={11} fill="#FCD34D" color="#FCD34D" /> {product.averageRating}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>리뷰 {product.reviewsCount}</span>
                </div>
              </div>

              {/* 점수 */}
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
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9CA3AF' }}>
            <TrendingUp size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p>제품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
