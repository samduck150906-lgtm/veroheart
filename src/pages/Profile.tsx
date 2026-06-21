// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';

const TABS = ['찜', '구매내역', '분석리포트'];

const GRADE_COLORS = {
  A: { bg: '#E7F8F0', color: '#15B36B' },
  B: { bg: '#FEF6E0', color: '#E8A800' },
  C: { bg: '#FFF0ED', color: '#F04452' },
  F: { bg: '#F2F4F6', color: '#8B95A1' },
};

function GradeTag({ grade }) {
  const c = GRADE_COLORS[grade] || { bg: '#F0EDE8', color: '#6B7684' };
  return <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>{grade}등급</span>;
}

function ScoreCircle({ score }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#fff" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { profile, isLoggedIn, signOut, favorites, products, orders, reports } = useStore();
  const [activeTab, setActiveTab] = useState('찜');

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  const favoriteProducts = useMemo(() => {
    if (!favorites?.length || !products?.length) return [];
    return favorites.map(id => products.find(p => p.id === id)).filter(Boolean);
  }, [favorites, products]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const petName = hasPetProfile ? profile.name : '내 반려동물';
  const speciesLabel = profile?.breed || (profile?.species === 'Cat' ? '고양이' : '강아지');

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Top Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
        padding: '52px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {profile?.species === 'Cat' ? '🐱' : '🐶'}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
              {petName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              {speciesLabel}
              {profile?.age ? ` · ${profile.age}살` : ''}
              {profile?.weightKg ? ` · ${profile.weightKg}kg` : ''}
            </div>
          </div>
          <ScoreCircle score={healthScore} />
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: 6 }}>
          식단 건강 점수 · {healthScore}점
        </div>

        {hasPetProfile ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {profile?.allergies?.map(a => (
              <span key={a} style={{ background: '#F04452', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>⚠️ {a} 알러지</span>
            ))}
            {profile?.healthConcerns?.slice(0, 3).map(h => (
              <span key={h} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{h}</span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {isLoggedIn ? '펫 정보를 등록해보세요' : '로그인 후 펫 정보를 등록해보세요'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          style={{
            flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#F5C518', fontSize: 14, fontWeight: 700, color: '#191F28',
          }}
        >
          {hasPetProfile ? '정보 수정하기' : (isLoggedIn ? '펫 등록하기' : '로그인하기')}
        </button>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            style={{
              height: 46, padding: '0 20px', borderRadius: 12,
              border: '1.5px solid #E5E8EB', cursor: 'pointer',
              background: '#fff', fontSize: 14, fontWeight: 600, color: '#6B7684',
            }}
          >
            로그아웃
          </button>
        )}
      </div>

      {/* Pet Info Card */}
      {hasPetProfile && (
        <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 1px 8px rgba(30,41,59,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>🐾 펫 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: '이름', value: profile.name },
              { label: '종류', value: profile.species === 'Cat' ? '고양이' : '강아지' },
              { label: '품종', value: profile.breed || '-' },
              { label: '나이', value: profile.age ? `${profile.age}살` : '-' },
              { label: '체중', value: profile.weightKg ? `${profile.weightKg}kg` : '-' },
              { label: '성별', value: profile.gender || '-' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#F7F4EE', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ margin: '16px 0 0', borderBottom: '1px solid #EAEDF0' }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, height: 44, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === tab ? 800 : 600,
                color: activeTab === tab ? '#191F28' : '#8B95A1',
                borderBottom: activeTab === tab ? '2.5px solid #F5C518' : '2.5px solid transparent',
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {activeTab === '찜' && (
          favoriteProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>❤️</div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>찜한 상품이 없어요</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>마음에 드는 상품에 하트를 눌러보세요</p>
              <button onClick={() => navigate('/search')}
                style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
                상품 둘러보기
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {favoriteProducts.map(product => {
                const score = hasPetProfile ? calculateCompatibilityScore(product, profile) : null;
                const grade = score != null ? gradeFromScore(score) : null;
                return (
                  <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                    style={{ background: '#fff', borderRadius: 16, padding: '14px', boxShadow: '0 1px 6px rgba(30,41,59,0.06)', cursor: 'pointer', display: 'flex', gap: 12 }}>
                    <div style={{ width: 56, height: 56, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                      <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                        {grade && <GradeTag grade={grade} />}
                      </div>
                      <div style={{ fontSize: 11, color: '#8B95A1' }}>{product.brand}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>
                        {product.name.length > 25 ? product.name.slice(0, 25) + '…' : product.name}
                      </div>
                      {product.price > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginTop: 4 }}>{product.price.toLocaleString()}원</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {activeTab === '구매내역' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>주문 내역이 없어요</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>구매한 상품이 여기에 표시됩니다</p>
          </div>
        )}

        {activeTab === '분석리포트' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <p style={{ fontWeight: 600, fontSize: 15 }}>분석 리포트가 없어요</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>스캐너로 사료 성분표를 촬영해보세요</p>
            <button onClick={() => navigate('/scanner')}
              style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
              스캔하러 가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
