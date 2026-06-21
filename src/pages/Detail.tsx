// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, ChevronLeft } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';

const GRADE_COLORS = {
  A: '#15B36B', B: '#E8A800', C: '#F04452', D: '#F04452', F: '#8B95A1',
};

const RISK_COLORS = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const RISK_LABEL = { safe: '안전', caution: '주의', danger: '위험' };

function GradeCircle({ grade }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: GRADE_COLORS[grade] || '#8B95A1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 18, fontWeight: 900,
    }}>{grade}</div>
  );
}

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, selectedProduct, profile, isLoggedIn, favorites, toggleFavorite, addToComparison, trackRecentView } = useStore();

  const product = useMemo(() => {
    const found = id ? products.find(p => p.id === id) : null;
    return found || selectedProduct || products[0];
  }, [id, products, selectedProduct]);

  const [inCompare, setInCompare] = useState(false);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  const isFav = favorites?.includes(product?.id);

  const compatScore = useMemo(() => {
    if (!product || !hasPetProfile) return null;
    return calculateCompatibilityScore(product, profile);
  }, [product, profile, hasPetProfile]);

  const grade = compatScore != null ? gradeFromScore(compatScore) : null;

  const ga = product?.guaranteedAnalysis;

  const cautionList = (product?.ingredients || []).filter(i => i.riskLevel === 'caution' || i.riskLevel === 'danger');

  if (!product) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#B0B8C1' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
        <p style={{ fontWeight: 600 }}>상품을 찾을 수 없어요</p>
        <button onClick={() => navigate('/search')} style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
          검색으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Product image */}
      <div style={{
        height: 220, background: 'linear-gradient(135deg, #FEF9C3, #FDE68A)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        overflow: 'hidden',
      }}>
        {product.imageUrl ? (
          <ProductImage src={product.imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 72 }}>🥫</span>
        )}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          <button onClick={() => toggleFavorite(product.id)}
            style={{
              width: 40, height: 40, borderRadius: '50%', background: '#fff',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
            <Heart size={18} fill={isFav ? '#F04452' : 'none'} color={isFav ? '#F04452' : '#8B95A1'} />
          </button>
          <button onClick={() => {
            if (navigator.share) {
              navigator.share({ title: product.name, url: window.location.href });
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
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
        <div style={{ fontSize: 13, color: '#8B95A1', marginBottom: 4 }}>{product.brand}</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#191F28', letterSpacing: '-0.02em', marginBottom: 14, lineHeight: 1.3 }}>
          {product.name}
        </h1>

        {/* Rating + Grade row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {grade && <GradeCircle grade={grade} />}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {product.averageRating > 0 && (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>⭐ {Number(product.averageRating).toFixed(1)}</span>
              )}
              {product.reviewsCount > 0 && (
                <span style={{ fontSize: 13, color: '#8B95A1' }}>· 리뷰 {product.reviewsCount.toLocaleString()}</span>
              )}
              {compatScore != null && (
                <span style={{ fontSize: 13, color: '#CA8A04', fontWeight: 700 }}>· 궁합 {compatScore}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Ingredients */}
        {product.ingredients?.length > 0 && (
          <div style={{ background: '#F7F4EE', borderRadius: 14, padding: '14px', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>주요 성분</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.ingredients.slice(0, 12).map((ing, idx) => (
                <span key={ing.id || idx} style={{
                  background: RISK_BG[ing.riskLevel] || '#F0EDE8',
                  color: RISK_COLORS[ing.riskLevel] || '#4E5968',
                  borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700,
                }}>
                  {ing.riskLevel === 'caution' && '⚠️ '}
                  {ing.riskLevel === 'danger' && '🚫 '}
                  {ing.nameKo}
                </span>
              ))}
              {product.ingredients.length > 12 && (
                <button onClick={() => navigate('/analysis', { state: { productId: product.id } })}
                  style={{ background: '#E5E8EB', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 700, color: '#6B7684', cursor: 'pointer' }}>
                  +{product.ingredients.length - 12}개 더보기
                </button>
              )}
            </div>
          </div>
        )}

        {/* Caution ingredients */}
        {cautionList.length > 0 && (
          <div style={{ background: '#FEF6E0', borderRadius: 14, padding: '14px', marginBottom: 14, border: '1px solid rgba(232,168,0,0.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E8A800', marginBottom: 6 }}>⚠️ 주의 성분</div>
            <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>
              {cautionList.map(i => i.nameKo).join(', ')} 성분이 포함되어 있습니다.
            </p>
          </div>
        )}

        {/* Guaranteed Analysis */}
        {ga && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 14, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>등록 성분량</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: '단백질', value: ga.crudeProtein },
                { label: '지방', value: ga.crudeFat },
                { label: '섬유', value: ga.crudeFiber },
                { label: '수분', value: ga.moisture },
                { label: '칼슘', value: ga.calcium },
                { label: '인', value: ga.phosphorus },
              ].filter(n => n.value != null && n.value > 0).map(n => (
                <div key={n.label} style={{ textAlign: 'center', background: '#F7F4EE', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#191F28' }}>{n.value}%</div>
                  <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginTop: 2 }}>{n.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        {product.price > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
            <span style={{ fontSize: 13, color: '#8B95A1' }}>최저가 기준</span>
          </div>
        )}
      </div>

      {/* Fixed bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: 'rgba(247,244,238,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 32px', borderTop: '1px solid #E5E8EB',
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/analysis', { state: { productId: product.id } })}
            style={{
              flex: 1, height: 46, borderRadius: 12,
              background: '#fff', border: '1.5px solid #E5E8EB',
              fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer',
            }}>
            분석 리포트
          </button>
          <button
            onClick={() => {
              addToComparison(product.id);
              setInCompare(true);
              navigate('/comparison');
            }}
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
        <button
          onClick={() => {
            if (product.coupangLink) {
              window.open(product.coupangLink, '_blank', 'noopener');
            } else {
              navigate('/search');
            }
          }}
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
