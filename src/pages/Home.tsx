// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BERO_PET, MVP_PRODUCTS } from '../data/mvpMock';

const CATEGORIES = [
  { icon: '🥣', label: '사료' },
  { icon: '🦴', label: '간식' },
  { icon: '💊', label: '영양제' },
  { icon: '🦷', label: '구강' },
  { icon: '🛁', label: '피부·목욕' },
  { icon: '👁️', label: '눈·귀' },
  { icon: '🧻', label: '배변' },
  { icon: '🎾', label: '생활용품' },
];

function GradeTag({ grade }) {
  const colors = { A: { bg: '#E7F8F0', color: '#15B36B' }, B: { bg: '#FEF6E0', color: '#E8A800' }, C: { bg: '#FFF0ED', color: '#F04452' } };
  const c = colors[grade] || colors.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 12, borderRadius: 6, padding: '2px 7px' }}>{grade}등급</span>
  );
}

function AnimatedScore({ target }) {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = () => {
      current += 2;
      if (current >= target) { setScore(target); return; }
      setScore(current);
      requestAnimationFrame(step);
    };
    const timeout = setTimeout(() => requestAnimationFrame(step), 300);
    return () => clearTimeout(timeout);
  }, [target]);

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: 96, height: 96 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="7" />
        <circle cx="48" cy="48" r="40" fill="none" stroke="#fff" strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.05s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const dogProducts = MVP_PRODUCTS.filter(p => p.targetPetType === 'dog').slice(0, 2);

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Pet Profile Card */}
      <div style={{
        margin: '16px 16px 0',
        borderRadius: 20,
        background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
        padding: '20px 20px 22px',
        boxShadow: '0 4px 20px rgba(245,197,24,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 54, height: 54, borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>
              {BERO_PET.avatar}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                {BERO_PET.name} · {BERO_PET.breed} · {BERO_PET.age}살
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{BERO_PET.weightKg}kg</div>
            </div>
          </div>
          <AnimatedScore target={BERO_PET.dietScore} />
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 8 }}>식단 건강 점수</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {BERO_PET.allergies.map(a => (
            <span key={a} style={{ background: '#F04452', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
              ⚠️ 알러지: {a}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>관심 케어:</span>
          {BERO_PET.healthConcerns.map(h => (
            <span key={h} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 12, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{h}</span>
          ))}
          <button
            onClick={() => navigate('/pet-profile')}
            style={{
              marginLeft: 'auto', background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: 10,
              padding: '4px 12px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >정보 수정</button>
        </div>
      </div>

      {/* Category Grid */}
      <div style={{ padding: '20px 16px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>카테고리</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => navigate('/search')}
              style={{
                background: '#fff', border: 'none', borderRadius: 16,
                padding: '14px 8px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
              }}
            >
              <span style={{ fontSize: 24 }}>{cat.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#4E5968' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recommended Section */}
      <div style={{ padding: '22px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em' }}>
            🎯 {BERO_PET.name}에게 맞춤 추천
          </h2>
          <button onClick={() => navigate('/search')} style={{ background: 'none', border: 'none', fontSize: 13, color: '#8B95A1', cursor: 'pointer', fontWeight: 600 }}>전체보기</button>
        </div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {dogProducts.map(product => (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              style={{
                minWidth: 180, background: '#fff', borderRadius: 18,
                padding: 16, boxShadow: '0 2px 12px rgba(30,41,59,0.07)',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>{product.emoji}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <GradeTag grade={product.grade} />
                <span style={{ background: '#F0EDE8', color: '#4E5968', borderRadius: 6, padding: '2px 7px', fontSize: 11, fontWeight: 700 }}>
                  궁합 {product.compatibilityScore}%
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 3 }}>{product.brand}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28', lineHeight: 1.4, marginBottom: 8 }}>{product.name}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>{product.price.toLocaleString()}원</div>
              <button
                onClick={(e) => { e.stopPropagation(); navigate('/comparison'); }}
                style={{
                  width: '100%', height: 36, borderRadius: 10,
                  background: '#F7F4EE', border: '1px solid #E5E8EB',
                  fontSize: 13, fontWeight: 700, color: '#4E5968', cursor: 'pointer',
                }}
              >비교하기</button>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Viewed */}
      <div style={{ padding: '22px 16px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28', letterSpacing: '-0.02em', marginBottom: 14 }}>최근 본 상품</h2>
        <div style={{
          background: '#fff', borderRadius: 16, padding: '20px', textAlign: 'center',
          color: '#B0B8C1', fontSize: 14, boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
          <p style={{ fontWeight: 600 }}>아직 본 상품이 없어요</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>사료를 검색하고 우리 아이에게 맞는지 확인해보세요</p>
          <button
            onClick={() => navigate('/search')}
            style={{
              marginTop: 14, background: '#F5C518', border: 'none', borderRadius: 10,
              padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer',
            }}
          >검색하러 가기</button>
        </div>
      </div>
    </div>
  );
}
