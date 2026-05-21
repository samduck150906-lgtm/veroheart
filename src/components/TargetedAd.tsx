import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { rankProductsForProfile } from '../utils/score';

export default function TargetedAd() {
  const { profile, products } = useStore();
  const ranked = rankProductsForProfile(products, profile, { limit: 1 });
  const topCandidate = ranked[0];
  const targetConcern = profile.healthConcerns[0] || '';

  if (!topCandidate) return null;

  const { product: adProduct, score } = topCandidate;
  const isCat = profile.species === 'Cat';

  // Premium, curated color systems matching pet species (no generic hardcoded values)
  const adGradient = isCat
    ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' // Deep Premium Indigo-Violet for cats
    : 'linear-gradient(135deg, #81C995 0%, #059669 100%)'; // Soft Mint to Emerald Green for dogs

  const adEmoji = isCat ? '🐱' : '🐶';

  return (
    <div style={{
      margin: '18px 0', padding: '16px', borderRadius: '16px',
      background: adGradient,
      color: '#fff', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
        Sponsor
      </div>
      <h3 style={{ fontSize: '16px', marginBottom: '6px', fontWeight: 800 }}>
        {targetConcern ? `${targetConcern} 고민 기준 추천 상품` : '실데이터 기반 추천 상품'} {adEmoji}
      </h3>
      <p style={{ fontSize: '12.5px', opacity: 0.9, marginBottom: '14px' }}>
        실제 카탈로그와 프로필 기준 적합도 {score}점으로 계산되었습니다.
      </p>
      
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.12)', padding: '12px', borderRadius: '10px' }}>
        <img src={adProduct.imageUrl} alt={adProduct.name} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'cover' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8 }}>{adProduct.brand}</div>
          <div className="line-clamp-1" style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1.25 }}>{adProduct.name}</div>
        </div>
        <Link to={`/product/${adProduct.id}`} className="btn" style={{ padding: '8px 12px', fontSize: '12px', background: '#fff', color: isCat ? '#4F46E5' : '#059669', borderRadius: '20px', fontWeight: 700, flexShrink: 0, textDecoration: 'none' }}>
          자세히보기
        </Link>
      </div>
    </div>
  );
}
