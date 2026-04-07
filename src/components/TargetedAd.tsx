import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, rankProductsForProfile } from '../utils/score';

export default function TargetedAd() {
  const { profile, products } = useStore();
  const ranked = rankProductsForProfile(products, profile, { limit: 1 });
  const topCandidate = ranked[0];
  const targetConcern = profile.healthConcerns[0] || '';

  if (!topCandidate) return null;

  const { product: adProduct, score } = topCandidate;

  return (
    <div style={{
      margin: '24px 0', padding: '16px', borderRadius: '12px',
      background: 'linear-gradient(135deg, var(--primary) 0%, #B83D28 100%)',
      color: '#fff', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
        Sponsor
      </div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 800 }}>
        {targetConcern ? `${targetConcern} 고민 기준 추천 상품` : '실데이터 기반 추천 상품'} 🐶
      </h3>
      <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '16px' }}>
        실제 카탈로그와 프로필 기준 적합도 {score}점으로 계산되었습니다.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
        <img src={adProduct.imageUrl} alt={adProduct.name} style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 600 }}>{adProduct.brand}</div>
          <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.2 }}>{adProduct.name}</div>
        </div>
        <Link to={`/product/${adProduct.id}`} className="btn" style={{ padding: '8px 12px', fontSize: '12px', background: '#fff', color: 'var(--primary-dark)', borderRadius: '20px' }}>
          자세히보기
        </Link>
      </div>
    </div>
  );
}
