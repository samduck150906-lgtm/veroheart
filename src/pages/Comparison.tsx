import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';
import { X, GitCompare, ShieldCheck, Star, ShoppingBag } from 'lucide-react';

export default function Comparison() {
  const navigate = useNavigate();
  const { profile, products: storeProducts, comparisonList, removeFromComparison } = useStore();
  
  const products = comparisonList.map(id => storeProducts.find(p => p.id === id)).filter(Boolean) as typeof storeProducts;

  if (products.length === 0) {
    return (
      <div className="ui-info-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <div className="ui-icon-pill" style={{ margin: '0 auto 14px', width: '56px', height: '56px' }}>
          <GitCompare size={22} color="var(--primary-dark)" />
        </div>
        <p style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 800 }}>
          비교함이 비어있습니다.<br/>마음에 드는 제품을 담아 꼼꼼히 비교해보세요!
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/search')}>제품 탐색하러 가기</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <section className="ui-hero-panel" style={{ marginBottom: '18px', padding: '20px' }}>
        <span className="ui-badge ui-badge-soft" style={{ marginBottom: '10px', display: 'inline-flex' }}>
          <GitCompare size={13} />
          compare
        </span>
        <h2 style={{ fontSize: '25px', marginBottom: '8px', fontWeight: 900 }}>제품 비교 ({products.length}/4)</h2>
        <p style={{ fontSize: '14px', color: '#67707C', lineHeight: 1.6 }}>
          가격, 평점, 주의 성분, 맞춤 궁합을 한 자리에서 비교해 더 빠르게 결정해보세요.
        </p>
      </section>

      <div className="ui-grid-3" style={{ marginBottom: '18px' }}>
        <div className="ui-info-card" style={{ padding: '16px' }}>
          <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><ShieldCheck size={16} color="#10B981" /></div>
          <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>비교 기준</div>
          <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>주의 성분과 안전 비율</div>
        </div>
        <div className="ui-info-card" style={{ padding: '16px' }}>
          <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><Star size={16} color="#F59E0B" /></div>
          <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>비교 기준</div>
          <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>평점과 리뷰 반응</div>
        </div>
        <div className="ui-info-card" style={{ padding: '16px' }}>
          <div className="ui-icon-pill" style={{ marginBottom: '10px' }}><ShoppingBag size={16} color="var(--primary-dark)" /></div>
          <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700 }}>비교 기준</div>
          <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>{profile.name} 맞춤 궁합 점수</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {products.map(p => {
          const score = calculateCompatibilityScore(p, profile);
          const dangerCount = p.ingredients?.filter(i => i.riskLevel === 'danger').length || 0;
          const safeRatio = p.ingredients?.length
            ? Math.round((p.ingredients.filter(i => i.riskLevel === 'safe').length / p.ingredients.length) * 100)
            : 0;
          return (
            <div key={p.id} className="ui-info-card" style={{ flex: '0 0 260px', position: 'relative', padding: '16px' }}>
              <button 
                onClick={() => removeFromComparison(p.id)}
                style={{
                  position: 'absolute', top: '8px', right: '8px', background: '#fff',
                  border: 'none', borderRadius: '50%', padding: '4px', cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              ><X size={16} /></button>
              
              <div style={{ width: '100%', height: '168px', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 700 }}>{p.brand}</div>
              <div style={{ fontSize: '16px', fontWeight: 800, margin: '4px 0 12px', lineHeight: 1.4, minHeight: '44px' }}>{p.name}</div>
              
              <div style={{ padding: '14px', background: 'rgba(31,222,145,0.1)', borderRadius: '14px', textAlign: 'center', marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', color: 'var(--primary-dark)', fontWeight: 700 }}>{profile.name} 궁합 점수</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary-dark)' }}>{score}점</div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span className="ui-badge ui-badge-muted">평점 {p.averageRating}</span>
                <span className="ui-badge ui-badge-muted">리뷰 {p.reviewsCount}</span>
                <span className="ui-badge ui-badge-soft">안전 {safeRatio}%</span>
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
                    {dangerCount}개
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>안전 성분 비율</span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>{safeRatio}%</span>
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
