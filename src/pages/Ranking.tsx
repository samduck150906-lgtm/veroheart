import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trophy, TrendingUp, Star, Dog, Cat, Shield, Heart } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

const TABS = [
  { key: 'compatibility', label: '궁합 점수', icon: '💯' },
  { key: 'rating', label: '평점순', icon: '⭐' },
  { key: 'reviews', label: '리뷰순', icon: '💬' },
  { key: 'safe', label: '성분 안전', icon: '🛡️' },
];

const PET_TABS = [
  { key: 'all', label: '전체', icon: '🐾' },
  { key: 'dog', label: '강아지', Icon: Dog },
  { key: 'cat', label: '고양이', Icon: Cat },
];

const MEDAL_COLORS = [
  { border: 'rgba(245,158,11,0.35)', bg: 'linear-gradient(145deg, rgba(255,235,180,0.3), rgba(245,158,11,0.08))', text: '#B45309' },
  { border: 'rgba(148,163,184,0.35)', bg: 'linear-gradient(145deg, rgba(220,230,240,0.3), rgba(148,163,184,0.08))', text: '#475569' },
  { border: 'rgba(180,120,46,0.35)', bg: 'linear-gradient(145deg, rgba(220,190,150,0.3), rgba(205,124,46,0.08))', text: '#92400E' },
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

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <Helmet><title>랭킹 - 베로로</title></Helmet>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.06))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Trophy size={24} color="#F59E0B" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-dark)' }}>제품 랭킹</h1>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: '2px', lineHeight: 1.5 }}>
          집사들이 선택한 믿음직한 제품들
        </p>
      </div>

      {/* 반려동물 필터 */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '14px',
        background: 'var(--surface-elevated)', borderRadius: '14px',
        padding: '4px', border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {PET_TABS.map(tab => {
          const active = petFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setPetFilter(tab.key as any)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '10px 8px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px',
                background: active
                  ? 'linear-gradient(135deg, #111827, #374151)'
                  : 'transparent',
                color: active ? '#fff' : '#6B7280',
                transition: 'all var(--transition-fast)',
                boxShadow: active ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
              }}
            >
              {tab.Icon ? <tab.Icon size={15} /> : <span style={{ fontSize: '14px' }}>{tab.icon}</span>}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 정렬 탭 */}
      <div className="no-scrollbar" style={{
        display: 'flex', gap: '8px', overflowX: 'auto',
        marginBottom: '24px', paddingBottom: '4px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSortBy(tab.key as any)}
            style={{
              flexShrink: 0, padding: '10px 16px', borderRadius: '999px', border: '1.5px solid',
              borderColor: sortBy === tab.key ? 'var(--primary)' : 'rgba(0,0,0,0.08)',
              background: sortBy === tab.key ? 'var(--primary)' : 'var(--surface-elevated)',
              color: sortBy === tab.key ? '#fff' : '#4B5563',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'all var(--transition-fast)',
              boxShadow: sortBy === tab.key ? '0 2px 8px rgba(255,107,74,0.25)' : 'var(--shadow-sm)',
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* 랭킹 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ranked.map((product, idx) => {
          const score = calculateCompatibilityScore(product, profile);
          const safeRatio = product.ingredients?.length
            ? Math.round((product.ingredients.filter((i: any) => i.riskLevel === 'safe').length / product.ingredients.length) * 100)
            : 0;
          const medal = MEDAL_COLORS[idx];

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px', borderRadius: '18px', cursor: 'pointer',
                border: `1.5px solid ${idx < 3 ? medal.border : 'rgba(0,0,0,0.06)'}`,
                background: idx < 3 ? medal.bg : 'var(--surface-elevated)',
                boxShadow: idx < 3 ? '0 2px 10px rgba(0,0,0,0.04)' : 'var(--shadow-sm)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
              }}
            >
              {/* 순위 */}
              <div style={{ width: '36px', textAlign: 'center', flexShrink: 0 }}>
                {idx < 3 ? (
                  <div style={{ fontSize: '26px', lineHeight: 1 }}>{['🥇', '🥈', '🥉'][idx]}</div>
                ) : (
                  <span style={{
                    fontSize: '16px', fontWeight: 900,
                    color: '#D1D5DB', fontStyle: 'italic',
                  }}>{idx + 1}</span>
                )}
              </div>

              {/* 이미지 */}
              <div style={{
                width: '58px', height: '58px', borderRadius: '14px',
                overflow: 'hidden', flexShrink: 0,
                boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
              }}>
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>

              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 600, marginBottom: '2px' }}>
                  {product.brand}
                </div>
                <div className="line-clamp-1" style={{
                  fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '4px',
                }}>
                  {product.name}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '12px', color: '#6B7280',
                    display: 'flex', alignItems: 'center', gap: '3px',
                  }}>
                    <Star size={11} fill="#FCD34D" color="#FCD34D" /> {product.averageRating}
                  </span>
                  <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    리뷰 {product.reviewsCount?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    {product.price?.toLocaleString()}원
                  </span>
                </div>
              </div>

              {/* 점수 */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {sortBy === 'compatibility' && (
                  <div>
                    <span style={{
                      fontSize: '22px', fontWeight: 900,
                      color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
                    }}>
                      {score}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>점</span>
                  </div>
                )}
                {sortBy === 'rating' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                    <Star size={14} fill="#F59E0B" color="#F59E0B" />
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#92400E' }}>
                      {product.averageRating}
                    </span>
                  </div>
                )}
                {sortBy === 'reviews' && (
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#3B82F6' }}>
                      {product.reviewsCount?.toLocaleString()}
                    </span>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>리뷰</div>
                  </div>
                )}
                {sortBy === 'safe' && (
                  <div>
                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#10B981' }}>
                      {safeRatio}%
                    </span>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>안전</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {ranked.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">
              <TrendingUp color="#D1D5DB" size={28} />
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-light)' }}>제품이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
