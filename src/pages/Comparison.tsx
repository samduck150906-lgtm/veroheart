// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { MVP_PRODUCTS } from '../data/mvpMock';

export default function Comparison() {
  const navigate = useNavigate();
  const products = [MVP_PRODUCTS[0], MVP_PRODUCTS[1]];

  const rows = [
    { label: '궁합 점수', key: 'compatibilityScore', format: v => `${v}%`, winFn: (a, b) => a > b },
    { label: '가격', key: 'price', format: v => `${v.toLocaleString()}원`, winFn: (a, b) => a < b },
    { label: '평점', key: 'averageRating', format: v => `⭐ ${v}`, winFn: (a, b) => a > b },
    { label: '안전도', key: 'safetyScore', format: v => `${v}점`, winFn: (a, b) => a > b },
    { label: '등급', key: 'grade', format: v => v, winFn: (a, b) => a < b },
    { label: '주의 성분', key: 'cautionIngredients', format: v => v.length === 0 ? '없음' : v.join(', '), winFn: (a, b) => a.length < b.length },
  ];

  const gradeColors = { A: { bg: '#E7F8F0', color: '#15B36B' }, B: { bg: '#FEF6E0', color: '#E8A800' } };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>비교함</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 20 }}>최대 4개 상품을 비교할 수 있어요</p>

        {/* Product headers */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 90, flexShrink: 0 }} />
          {products.map(p => (
            <div key={p.id} onClick={() => navigate(`/product/${p.id}`)}
              style={{
                flex: 1, background: '#fff', borderRadius: 16, padding: '14px 10px',
                textAlign: 'center', boxShadow: '0 2px 10px rgba(30,41,59,0.08)', cursor: 'pointer',
              }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>{p.emoji}</div>
              <div style={{ fontSize: 11, color: '#8B95A1', marginBottom: 4 }}>{p.brand}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#191F28', lineHeight: 1.3 }}>{p.name}</div>
              {(() => {
                const c = gradeColors[p.grade] || { bg: '#F0EDE8', color: '#4E5968' };
                return (
                  <span style={{ display: 'inline-block', marginTop: 8, background: c.bg, color: c.color, fontSize: 11, fontWeight: 800, borderRadius: 6, padding: '2px 8px' }}>{p.grade}등급</span>
                );
              })()}
            </div>
          ))}
          {/* Add more */}
          <button onClick={() => navigate('/search')}
            style={{
              width: 70, background: '#fff', borderRadius: 16, padding: '14px 8px',
              border: '2px dashed #E5E8EB', cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0,
            }}>
            <Plus size={20} color="#B0B8C1" />
            <span style={{ fontSize: 10, color: '#B0B8C1', fontWeight: 700 }}>추가</span>
          </button>
        </div>

        {/* Comparison rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(row => {
            const vals = products.map(p => p[row.key]);
            const winners = vals.map((v, i) => i === 0 ? row.winFn(vals[0], vals[1]) : row.winFn(vals[1], vals[0]));

            return (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 90, flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#8B95A1' }}>{row.label}</div>
                {products.map((p, i) => (
                  <div key={p.id}
                    style={{
                      flex: 1, background: winners[i] ? '#FEF6E0' : '#fff',
                      borderRadius: 12, padding: '12px 10px', textAlign: 'center',
                      border: winners[i] ? '1.5px solid rgba(245,197,24,0.4)' : '1.5px solid transparent',
                      boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
                    }}>
                    {winners[i] && <div style={{ fontSize: 10, marginBottom: 2 }}>🏆</div>}
                    <div style={{ fontSize: 13, fontWeight: 800, color: winners[i] ? '#CA8A04' : '#191F28' }}>
                      {row.format(p[row.key])}
                    </div>
                  </div>
                ))}
                <div style={{ width: 70, flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
