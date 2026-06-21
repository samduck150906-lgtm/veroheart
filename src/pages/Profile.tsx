// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BERO_PET, MVP_PRODUCTS } from '../data/mvpMock';

const TABS = ['찜', '구매내역', '분석리포트'];

function GradeTag({ grade }) {
  const colors = { A: { bg: '#E7F8F0', color: '#15B36B' }, B: { bg: '#FEF6E0', color: '#E8A800' } };
  const c = colors[grade] || { bg: '#F0EDE8', color: '#6B7684' };
  return <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>{grade}등급</span>;
}

export default function Profile() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('찜');

  const handleLogout = () => {
    localStorage.removeItem('mvp_logged_in');
    localStorage.removeItem('mvp_pet');
    navigate('/login');
  };

  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (BERO_PET.dietScore / 100) * circumference;

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Top card */}
      <div style={{
        background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
        padding: '52px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>{BERO_PET.avatar}</div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', marginBottom: 2 }}>{BERO_PET.name}</h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
              {BERO_PET.breed} · {BERO_PET.age}살 · {BERO_PET.weightKg}kg
            </p>
          </div>
          <div style={{ marginLeft: 'auto', position: 'relative', width: 80, height: 80 }}>
            <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="7" />
              <circle cx="40" cy="40" r="36" fill="none" stroke="#fff" strokeWidth="7"
                strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{BERO_PET.dietScore}</span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>건강점수</span>
            </div>
          </div>
        </div>

        {/* Pet info chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BERO_PET.allergies.map(a => (
            <span key={a} style={{ background: 'rgba(240,68,82,0.85)', color: '#fff', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>⚠️ {a}</span>
          ))}
          {BERO_PET.healthConcerns.map(h => (
            <span key={h} style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 12, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>{h}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Pet info card */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '16px', marginBottom: 16, boxShadow: '0 2px 10px rgba(30,41,59,0.06)' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>반려동물 정보</div>
          {[
            { label: '이름', value: BERO_PET.name },
            { label: '품종', value: BERO_PET.breed },
            { label: '나이', value: `${BERO_PET.age}살` },
            { label: '체중', value: `${BERO_PET.weightKg}kg` },
            { label: '알러지', value: BERO_PET.allergies.join(', ') },
            { label: '건강 고민', value: BERO_PET.healthConcerns.join(', ') },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #F7F4EE' }}>
              <span style={{ width: 80, fontSize: 13, color: '#8B95A1', fontWeight: 600 }}>{item.label}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#191F28' }}>{item.value}</span>
            </div>
          ))}
          <button onClick={() => navigate('/pet-profile')}
            style={{
              width: '100%', height: 44, borderRadius: 12, marginTop: 14,
              background: '#F7F4EE', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 700, color: '#4E5968',
            }}>정보 수정하기</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#F0EDE8', borderRadius: 14, padding: 4, marginBottom: 16 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#191F28' : '#8B95A1',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(30,41,59,0.1)' : 'none',
              }}
            >{tab}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === '찜' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MVP_PRODUCTS.slice(0, 2).map(product => (
              <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
                style={{ background: '#fff', borderRadius: 16, padding: '14px', boxShadow: '0 1px 4px rgba(30,41,59,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 52, height: 52, borderRadius: 12, background: '#F7F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>{product.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28', marginBottom: 4 }}>{product.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <GradeTag grade={product.grade} />
                    <span style={{ fontSize: 11, color: '#6B7684' }}>궁합 {product.compatibilityScore}%</span>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === '구매내역' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '30px 20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🛒</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4E5968' }}>구매 내역이 없습니다</p>
          </div>
        )}

        {activeTab === '분석리포트' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '30px 20px', textAlign: 'center', boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#4E5968' }}>저장된 분석 리포트가 없습니다</p>
            <button onClick={() => navigate('/scanner')}
              style={{ marginTop: 14, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
              사료 스캔하기
            </button>
          </div>
        )}

        {/* Logout */}
        <button onClick={handleLogout}
          style={{
            width: '100%', height: 50, borderRadius: 14, marginTop: 24,
            background: '#fff', border: '1.5px solid #E5E8EB', cursor: 'pointer',
            fontSize: 15, fontWeight: 700, color: '#F04452',
          }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
