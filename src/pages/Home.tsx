import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const { products, profile } = useStore();

  // Personalized Recommendations: Filter by species and prioritize health concerns
  const personalRecs = products
    .filter(p => !p.category.includes('사료') || (profile.species === 'Dog' ? p.category.includes('강아지') || p.category.includes('개') : p.category.includes('고양이') || p.category.includes('묘')))
    .filter(p => p.ingredients.some(ing => profile.healthConcerns.some(c => ing.purpose.includes(c))))
    .slice(0, 4);

  return (
    <div>
      <Helmet>
        <title>베로하트 - 실사용 펫 헬스케어 커머스</title>
        <meta name="description" content="우리 아이를 위한 바른 성분 앱. 실시간 분석과 나에게 딱 맞는 사료 구매." />
      </Helmet>

      {/* 고민 맞춤 큐레이션 (Personalized Section) */}
      {personalRecs.length > 0 && (
        <section style={{ marginBottom: '40px', backgroundColor: 'var(--primary-dark)', margin: '0 -20px 40px -20px', padding: '32px 20px', color: '#fff' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} color="#FCD34D" /> 
            <span>{profile.name}를 위한 맞춤 추천</span>
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            {profile.healthConcerns.join(', ')} 고민을 해결해줄 성분 위주로 선정했어요.
          </p>
          <div style={{ 
            display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px',
            msOverflowStyle: 'none', scrollbarWidth: 'none'
          }}>
            {personalRecs.map((p) => (
              <div key={p.id} className="card animate-scale-in" style={{ flex: '0 0 240px', padding: '12px', backgroundColor: '#fff', color: 'var(--text-dark)' }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 랭킹 섹션 */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <span>인기 급상승 랭킹 🔥</span>
          <span style={{ fontSize: '14px', color: 'var(--text-light)', fontWeight: 400, cursor: 'pointer' }}>더보기 {`>`}</span>
        </h2>
        <div>
          {products.slice(0, 5).map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <span style={{ 
                fontSize: '24px', fontWeight: 900, width: '28px', textAlign: 'center', fontStyle: 'italic',
                color: idx < 3 ? 'var(--primary)' : 'var(--text-light)' 
              }}>{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <ProductCard product={p} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 타겟 광고 배너 */}
      <TargetedAd />

      {/* 추천 카테고리 (Mock Category Navigation) */}
      <section style={{ marginTop: '40px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '20px' }}>카테고리별 탐색</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {['사료', '간식', '영양제', '용품'].map(cat => (
            <div key={cat} style={{ textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#F3F4F6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', fontSize: '24px' }}>
                {cat === '사료' ? '🍖' : cat === '간식' ? '🦴' : cat === '영양제' ? '💊' : '🧸'}
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{cat}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
