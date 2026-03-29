import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Utensils, Bone, Pill, Activity, Bath, Eye, Trash2, Home as HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CATEGORY_ITEMS = [
  { name: '사료', icon: Utensils, emoji: '🍖' },
  { name: '간식', icon: Bone, emoji: '🦴' },
  { name: '영양제', icon: Pill, emoji: '💊' },
  { name: '구강관리', icon: Activity, emoji: '🦷' },
  { name: '피부·목욕', icon: Bath, emoji: '🧼' },
  { name: '눈·귀 케어', icon: Eye, emoji: '👁️' },
  { name: '배변/위생', icon: Trash2, emoji: '💩' },
  { name: '용품', icon: HomeIcon, emoji: '🏠' }
];

export default function Home() {
  const { products, profile } = useStore();
  const navigate = useNavigate();

  // Personalized Recommendations: Filter by species and prioritize health concerns
  const personalRecs = products
    .filter(p => !p.mainCategory?.includes('사료') || 
      (profile.species === 'Dog' ? p.targetPetType === 'dog' : p.targetPetType === 'cat') ||
      p.targetPetType === 'all'
    )
    .filter(p => {
      const hasDirectMatch = p.healthConcerns?.some(c => profile.healthConcerns.includes(c));
      const hasIngredientMatch = p.ingredients.some(ing => profile.healthConcerns.some(c => ing.purpose.includes(c)));
      return hasDirectMatch || hasIngredientMatch;
    })
    .slice(0, 4);

  return (
    <div>
      <Helmet>
        <title>베로하트 - 실사용 펫 헬스케어 커머스</title>
        <meta name="description" content="우리 아이를 위한 바른 성분 앱. 실시간 분석과 나에게 딱 맞는 사료 구매." />
      </Helmet>

      {/* Personalized Section */}
      {personalRecs.length > 0 && (
        <section style={{ marginBottom: '40px', backgroundColor: 'var(--primary-dark)', margin: '0 -20px 40px -20px', padding: '32px 20px', color: '#fff' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900 }}>
            <Sparkles size={24} color="#FCD34D" /> 
            <span>{profile.name}를 위한 맞춤 추천</span>
          </h2>
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '24px' }}>
            {profile.healthConcerns.join(', ')} 고민을 해결해줄 제품들을 모았어요.
          </p>
          <div style={{ 
            display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px',
            msOverflowStyle: 'none', scrollbarWidth: 'none'
          }}>
            {personalRecs.map((p) => (
              <div key={p.id} className="card animate-scale-in" style={{ flex: '0 0 240px', padding: '12px', backgroundColor: '#fff', color: 'var(--text-dark)', borderRadius: '16px' }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ranking Section */}
      <section style={{ marginBottom: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontWeight: 800 }}>
          <span>인기 급상승 랭킹 🔥</span>
        </h2>
        <div style={{ display: 'grid', gap: '16px' }}>
          {products.slice(0, 4).map((p, idx) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', borderRadius: '16px', border: '1px solid #F3F4F6' }}>
              <span style={{ 
                fontSize: '24px', fontWeight: 900, width: '28px', textAlign: 'center', fontStyle: 'italic',
                color: idx < 3 ? 'var(--primary)' : '#D1D5DB' 
              }}>{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <ProductCard product={p} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <TargetedAd />

      {/* Category Grid */}
      <section style={{ marginTop: '48px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '24px', fontWeight: 800 }}>카테고리별 탐색</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {CATEGORY_ITEMS.map(item => (
            <div 
              key={item.name} 
              onClick={() => navigate(`/search?category=${item.name}`)}
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{ 
                width: '100%', aspectRatio: '1/1', backgroundColor: '#F9FAFB', 
                borderRadius: '24px', display: 'flex', alignItems: 'center', 
                justifyContent: 'center', marginBottom: '10px', fontSize: '28px',
                border: '1px solid #F3F4F6'
              }}>
                {item.emoji}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4B5563' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
