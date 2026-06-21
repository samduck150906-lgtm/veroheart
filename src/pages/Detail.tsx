// @ts-nocheck
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2 } from 'lucide-react';
import { MVP_PRODUCTS } from '../data/mvpMock';

function GradeCircle({ grade }) {
  const colors = { A: '#15B36B', B: '#E8A800', C: '#F04452' };
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: colors[grade] || '#15B36B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 18, fontWeight: 900,
    }}>{grade}</div>
  );
}

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const product = MVP_PRODUCTS.find(p => p.id === id) || MVP_PRODUCTS[0];
  const [liked, setLiked] = useState(false);
  const [inCompare, setInCompare] = useState(false);

  const riskColors = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
  const riskBg = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
  const riskLabel = { safe: '안전', caution: '주의', danger: '위험' };

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Product image area */}
      <div style={{
        height: 200, background: 'linear-gradient(135deg, #FEF9C3, #FDE68A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <span style={{ fontSize: 80 }}>{product.emoji}</span>
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => setLiked(!liked)}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: '#fff',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
            <Heart size={18} fill={liked ? '#F04452' : 'none'} color={liked ? '#F04452' : '#8B95A1'} />
          </button>
          <button onClick={() => alert('공유하기')}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: '#fff',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
            <Share2 size={18} color="#8B95A1" />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        {/* Brand & name */}
        <div style={{ fontSize: 13, color: '#8B95A1', marginBottom: 4 }}>{product.brand}</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#191F28', letterSpacing: '-0.02em', marginBottom: 12, lineHeight: 1.3 }}>
          {product.fullName}
        </h1>

        {/* Rating row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <GradeCircle grade={product.grade} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>⭐ {product.averageRating}</span>
              <span style={{ fontSize: 13, color: '#8B95A1' }}>· 리뷰 {product.reviewsCount.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: '#8B95A1' }}>· 궁합 {product.compatibilityScore}%</span>
            </div>
            <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2 }}>{product.description}</div>
          </div>
        </div>

        {/* Key ingredients */}
        <div style={{ background: '#F7F4EE', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>주요 성분</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.ingredients.map(ing => (
              <span key={ing.id} style={{
                background: riskBg[ing.riskLevel] || '#F0EDE8',
                color: riskColors[ing.riskLevel] || '#4E5968',
                borderRadius: 20, padding: '5px 12px', fontSize: 13, fontWeight: 700,
              }}>
                {ing.riskLevel === 'caution' && '⚠️ '}
                {ing.riskLevel === 'danger' && '🚫 '}
                {ing.nameKo}{ing.percentage ? ` ${ing.percentage}%` : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Caution section */}
        {product.cautionIngredients.length > 0 && (
          <div style={{ background: '#FEF6E0', borderRadius: 14, padding: '14px', marginBottom: 16, border: '1px solid rgba(232,168,0,0.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E8A800', marginBottom: 6 }}>⚠️ 주의 성분</div>
            <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>
              {product.cautionIngredients.join(', ')} 성분이 포함되어 있습니다. 장기 급여 시 모니터링이 필요합니다.
            </p>
          </div>
        )}

        {/* Nutrition info */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 16, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>영양 성분</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: '단백질', value: `${product.nutritionInfo.protein}%` },
              { label: '지방', value: `${product.nutritionInfo.fat}%` },
              { label: '섬유', value: `${product.nutritionInfo.fiber}%` },
              { label: '수분', value: `${product.nutritionInfo.moisture}%` },
              { label: '칼슘', value: `${product.nutritionInfo.calcium}%` },
            ].map(n => (
              <div key={n.label} style={{ textAlign: 'center', background: '#F7F4EE', borderRadius: 10, padding: '10px 6px' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#191F28' }}>{n.value}</div>
                <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginTop: 2 }}>{n.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feeding guide */}
        <div style={{ background: '#F0EDE8', borderRadius: 14, padding: '14px', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 4 }}>🍽 급여 가이드</div>
          <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>{product.feedingGuide}</p>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
          <span style={{ fontSize: 13, color: '#8B95A1' }}>최저가 기준</span>
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: 'rgba(247,244,238,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 32px', borderTop: '1px solid #E5E8EB',
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/analysis')}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: '#fff', border: '1.5px solid #E5E8EB',
              fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer',
            }}>
            분석 리포트 보기
          </button>
          <button
            onClick={() => { setInCompare(true); navigate('/comparison'); }}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: inCompare ? '#FEF6E0' : '#fff',
              border: `1.5px solid ${inCompare ? '#F5C518' : '#E5E8EB'}`,
              fontSize: 14, fontWeight: 700,
              color: inCompare ? '#CA8A04' : '#4E5968', cursor: 'pointer',
            }}>
            {inCompare ? '비교함 ✓' : '비교함 추가'}
          </button>
        </div>
        <button onClick={() => alert('외부 쇼핑몰로 이동합니다')}
          style={{
            width: '100%', height: 52, borderRadius: 14,
            background: '#F5C518', border: 'none', cursor: 'pointer',
            fontSize: 16, fontWeight: 800, color: '#191F28',
          }}>
          최저가로 구매하기
        </button>
      </div>
    </div>
  );
}
