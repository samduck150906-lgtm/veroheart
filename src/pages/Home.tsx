import { mockProducts } from '../data/mock';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';

export default function Home() {
  return (
    <div>
      <Helmet>
        <title>베로하트 - 실사용 펫 헬스케어 커머스</title>
        <meta name="description" content="우리 아이를 위한 바른 성분 앱. 실시간 분석과 나에게 딱 맞는 사료 구매." />
      </Helmet>
      {/* 랭킹 섹션 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <span>실시간 랭킹 🔥</span>
          <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 400 }}>더보기 {`>`}</span>
        </h2>
        <div>
          {mockProducts.map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '20px', fontWeight: 800, width: '24px', textAlign: 'center',
                color: idx === 0 ? 'var(--primary)' : 'var(--text-light)' 
              }}>{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <ProductCard product={p} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 고민 맞춤 큐레이션 */}
      <section>
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>우리 아이 맞춤 픽 ✨</h2>
        <div style={{ 
          display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px',
          margin: '0 -20px', paddingLeft: '20px', paddingRight: '20px', 
          msOverflowStyle: 'none', scrollbarWidth: 'none'
        }}>
          {mockProducts.map((p) => (
            <div key={p.id} className="card" style={{ flex: '0 0 200px', padding: '12px' }}>
              <div style={{ width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px' }}>
                <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{p.brand}</div>
              <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 타겟 광고 배너 */}
      <TargetedAd />

      {/* 랭킹 섹션 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <span>실시간 랭킹 🔥</span>
          <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 400 }}>더보기 {`>`}</span>
        </h2>
        <div>
          {mockProducts.map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '20px', fontWeight: 800, width: '24px', textAlign: 'center',
                color: idx === 0 ? 'var(--primary)' : 'var(--text-light)' 
              }}>{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <ProductCard product={p} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
