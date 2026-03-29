import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, ShoppingBag } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { mockProducts } from '../data/mock';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, comparisonList, addToComparison, removeFromComparison, addToCart } = useStore();
  
  const product = mockProducts.find(p => p.id === id);
  if (!product) return <div>제품을 찾을 수 없습니다.</div>;

  const score = calculateCompatibilityScore(product, profile);
  const isComparing = comparisonList.includes(product.id);

  const getRiskColor = (level: string) => {
    if (level === 'danger') return 'var(--danger)';
    if (level === 'warning') return 'var(--warning)';
    return 'var(--safe)';
  };

  const handleBuy = () => {
    addToCart(product.id, 1);
    alert('장바구니에 담겼습니다! 🛒');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로하트 커머스</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: '8px', marginBottom: '16px', color: 'var(--text-dark)', fontWeight: 600
      }}>
        <ArrowLeft size={20} /> 뒤로
      </button>

      <div style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
        <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{
          position: 'absolute', bottom: '16px', right: '16px',
          background: 'rgba(255,255,255,0.9)', padding: '8px 16px', borderRadius: '24px',
          fontWeight: 800, fontSize: '20px', color: score >= 80 ? 'var(--safe)' : (score >= 50 ? 'var(--warning)' : 'var(--danger)')
        }}>
          궁합 {score}점
        </div>
      </div>

      <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
      <h1 style={{ fontSize: '24px', lineHeight: 1.3, marginBottom: '16px' }}>{product.name}</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>{product.price.toLocaleString()}원</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '16px', color: '#FCD34D' }}>★</span>
          <span style={{ fontWeight: 700 }}>{product.averageRating}</span> 
          <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <button className="btn btn-outline" style={{ flex: 1, padding: '12px 0' }} onClick={() => {
          isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
        }}>
          <GitCompare size={18} /> 비교
        </button>
        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#FF5A5F', padding: '12px 0' }} onClick={handleBuy}>
          <ShoppingBag size={18} color="#fff" /> 장바구니
        </button>
        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#1F2937', color: '#fff', padding: '12px 0' }} onClick={() => {
          addToCart(product.id, 1);
          navigate('/checkout');
        }}>
          💰 바로 구매
        </button>
      </div>

      {/* 전성분 분석 */}
      <h2 style={{ fontSize: '20px', marginBottom: '16px', borderTop: '1px solid #eee', paddingTop: '24px' }}>전성분 분석</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {product.ingredients.map(ing => {
          const isAllergy = profile.allergies.includes(ing.nameKo);
          return (
            <div key={ing.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '12px', background: isAllergy ? '#FEF2F2' : '#F9FAFB',
              border: isAllergy ? '1px solid #FECACA' : '1px solid transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRiskColor(ing.riskLevel) }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>
                    {ing.nameKo} <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 400 }}>{ing.nameEn}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{ing.purpose}</div>
                </div>
              </div>
              {isAllergy && <div style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: 700 }}>알러지 경고!</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
