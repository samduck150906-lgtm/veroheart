// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MVP_PRODUCTS, BERO_PET } from '../data/mvpMock';

export default function ScanResult() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const product = MVP_PRODUCTS[0];

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F4EE' }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>{product.emoji}</div>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(245,197,24,0.3)', borderTopColor: '#F5C518', borderRadius: '50%', animation: 'spin 0.85s linear infinite', marginBottom: 16 }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>성분 분석 중...</p>
        <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>베로에게 맞는지 확인하고 있어요</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const riskColors = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
  const riskBg = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
  const riskLabel = { safe: '안전', caution: '주의', danger: '위험' };

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Scan badge */}
      <div style={{ background: '#E7F8F0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>📸</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#15B36B' }}>스캔 완료 — 성분 분석 결과</span>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Product header */}
        <div style={{
          background: 'linear-gradient(135deg, #FEF9C3, #FDE68A)', borderRadius: 18,
          height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16, fontSize: 72,
        }}>{product.emoji}</div>

        <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 4 }}>{product.brand}</div>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#191F28', letterSpacing: '-0.02em', marginBottom: 12 }}>{product.fullName}</h1>

        {/* Score card */}
        <div style={{
          background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
          borderRadius: 18, padding: '20px', marginBottom: 16, textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 4 }}>베로와의 궁합</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: '#fff' }}>{product.compatibilityScore}%</div>
          <div style={{ display: 'inline-block', background: '#15B36B', color: '#fff', borderRadius: 12, padding: '4px 16px', fontSize: 14, fontWeight: 800, marginTop: 8 }}>
            {product.grade}등급 · 강력 추천
          </div>
        </div>

        {/* Quick analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {['글루코사민 함유 — 관절 건강 케어에 도움', '유기농 오리고기 38% — 고단백 구성'].map((point, i) => (
            <div key={i} style={{ background: '#E7F8F0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ color: '#15B36B' }}>✓</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#191F28' }}>{point}</span>
            </div>
          ))}
          {product.cautionIngredients.map((ing, i) => (
            <div key={i} style={{ background: '#FEF6E0', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span>⚠️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#191F28' }}>{ing} 함유 — 합성 방부제, 모니터링 권장</span>
            </div>
          ))}
        </div>

        {/* Allergen check */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 16, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>알러지 체크</div>
          {BERO_PET.allergies.map(allergy => {
            const hasAllergen = product.ingredients.some(ing => ing.nameKo.includes(allergy));
            return (
              <div key={allergy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#191F28' }}>{allergy}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: hasAllergen ? '#F04452' : '#15B36B' }}>
                  {hasAllergen ? '⚠️ 포함' : '✓ 미포함 (안전)'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom actions */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520,
        background: 'rgba(247,244,238,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px 32px', borderTop: '1px solid #E5E8EB',
        display: 'flex', flexDirection: 'column', gap: 10, zIndex: 50,
      }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/analysis')}
            style={{ flex: 1, height: 46, borderRadius: 12, background: '#fff', border: '1.5px solid #E5E8EB', fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer' }}>
            상세 리포트 보기
          </button>
          <button onClick={() => navigate('/comparison')}
            style={{ flex: 1, height: 46, borderRadius: 12, background: '#fff', border: '1.5px solid #E5E8EB', fontSize: 14, fontWeight: 700, color: '#4E5968', cursor: 'pointer' }}>
            비교함 추가
          </button>
        </div>
        <button onClick={() => alert('외부 쇼핑몰로 이동합니다')}
          style={{ width: '100%', height: 52, borderRadius: 14, background: '#F5C518', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 800, color: '#191F28' }}>
          최저가로 구매하기
        </button>
      </div>
    </div>
  );
}
