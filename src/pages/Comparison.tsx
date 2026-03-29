import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { mockProducts } from '../data/mock';
import { calculateCompatibilityScore } from '../utils/score';
import { X } from 'lucide-react';

export default function Comparison() {
  const navigate = useNavigate();
  const { profile, comparisonList, removeFromComparison } = useStore();
  
  const products = comparisonList.map(id => mockProducts.find(p => p.id === id)).filter(Boolean) as typeof mockProducts;

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '16px' }}>비교함이 비어있습니다.<br/>마음에 드는 제품을 담아 꼼꼼히 비교해보세요!</p>
        <button className="btn btn-primary" onClick={() => navigate('/search')}>제품 탐색하러 가기</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '24px' }}>제품 비교 ({products.length}/4)</h2>
      
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {products.map(p => {
          const score = calculateCompatibilityScore(p, profile);
          return (
            <div key={p.id} className="card" style={{ flex: '0 0 240px', position: 'relative', padding: '16px' }}>
              <button 
                onClick={() => removeFromComparison(p.id)}
                style={{
                  position: 'absolute', top: '8px', right: '8px', background: '#fff',
                  border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              ><X size={16} /></button>
              
              <div style={{ width: '100%', height: '160px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 600 }}>{p.brand}</div>
              <div style={{ fontSize: '15px', fontWeight: 700, margin: '4px 0 12px', lineHeight: 1.3, height: '40px', overflow: 'hidden' }}>{p.name}</div>
              
              <div style={{ padding: '12px', background: 'rgba(31,222,145,0.1)', borderRadius: '8px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 600 }}>궁합 점수</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-dark)' }}>{score}점</div>
              </div>
              
              <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>가격</span>
                  <span style={{ fontWeight: 600 }}>{p.price.toLocaleString()}원</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>평점</span>
                  <span style={{ fontWeight: 600 }}>★ {p.averageRating}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>주의 성분</span>
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>
                    {p.ingredients.filter(i => i.riskLevel === 'danger').length}개
                  </span>
                </div>
              </div>
              
              <button className="btn btn-outline" style={{ width: '100%', marginTop: '12px', padding: '10px' }} onClick={() => navigate(`/product/${p.id}`)}>상세 보기</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
