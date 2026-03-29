import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore } from '../utils/score';

export default function TargetedAd() {
  const { profile, products } = useStore();
  
  // 간단한 타겟팅 로직: 유저의 첫 번째 고민과 일치하는 제품 하나 추천, 없으면 첫번째 상품.
  const targetConcern = profile.healthConcerns[0] || '';
  let adProduct = products.find(p => p.ingredients?.some(i => i.purpose.includes(targetConcern)));
  
  // 없다면 아무거나
  if (!adProduct) adProduct = products[0];
  
  if (!adProduct) return null;

  const score = calculateCompatibilityScore(adProduct, profile);

  return (
    <div style={{
      margin: '24px 0', padding: '16px', borderRadius: '12px',
      background: 'linear-gradient(135deg, #1FDE91 0%, #0d9b62 100%)',
      color: '#fff', boxShadow: 'var(--shadow-md)', position: 'relative', overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '10px', right: '12px', fontSize: '10px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
        Sponsor
      </div>
      <h3 style={{ fontSize: '18px', marginBottom: '8px', fontWeight: 800 }}>
        {targetConcern ? `아이의 ${targetConcern}이 걱정된다면?` : '지금 가장 인기있는 추천 상품!'} 🐶
      </h3>
      <p style={{ fontSize: '13px', opacity: 0.9, marginBottom: '16px' }}>
        현재 프로필 기반 궁합 점수 {score}점으로 확인되었습니다.
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
