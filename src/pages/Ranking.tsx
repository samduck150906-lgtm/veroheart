// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { MVP_PRODUCTS } from '../data/mvpMock';

const FILTERS = ['사료', '간식', '영양제', '강아지', '고양이'];

function GradeTag({ grade }) {
  const colors = { A: { bg: '#E7F8F0', color: '#15B36B' }, B: { bg: '#FEF6E0', color: '#E8A800' }, C: { bg: '#FFF0ED', color: '#F04452' } };
  const c = colors[grade] || colors.B;
  return (
    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 6px' }}>{grade}등급</span>
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('사료');

  const sorted = [...MVP_PRODUCTS].sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  const avgCompat = Math.round(sorted.reduce((s, p) => s + p.compatibilityScore, 0) / sorted.length);
  const topGrade = sorted.filter(p => p.grade === 'A').length;

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>이번 주 랭킹</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 16 }}>베로의 궁합 점수 기준으로 정렬됩니다</p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{
                flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeFilter === f ? '#F5C518' : '#fff',
                color: activeFilter === f ? '#191F28' : '#6B7684',
                boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { label: '총 상품', value: `${sorted.length}개` },
            { label: '평균 궁합', value: `${avgCompat}%` },
            { label: 'A등급', value: `${topGrade}개` },
          ].map(stat => (
            <div key={stat.label} style={{
              flex: 1, background: '#fff', borderRadius: 14, padding: '12px',
              textAlign: 'center', boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#191F28' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((product, idx) => (
          <div key={product.id} onClick={() => navigate(`/product/${product.id}`)}
            style={{
              background: '#fff', borderRadius: 18, padding: '16px',
              boxShadow: idx === 0 ? '0 4px 16px rgba(245,197,24,0.2)' : '0 1px 4px rgba(30,41,59,0.06)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              border: idx === 0 ? '1.5px solid rgba(245,197,24,0.3)' : 'none',
            }}
          >
            <div style={{ width: 36, textAlign: 'center', flexShrink: 0 }}>
              {idx < 3 ? (
                <span style={{ fontSize: 24 }}>{MEDALS[idx]}</span>
              ) : (
                <span style={{ fontSize: 18, fontWeight: 900, color: '#B0B8C1' }}>{idx + 1}</span>
              )}
            </div>

            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: idx === 0 ? 'linear-gradient(135deg, #FEF6E0, #FDE68A)' : '#F7F4EE',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
            }}>{product.emoji}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 2 }}>{product.brand}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28', lineHeight: 1.3, marginBottom: 5 }}>{product.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <GradeTag grade={product.grade} />
                <span style={{ fontSize: 12, color: '#6B7684' }}>⭐ {product.averageRating}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#15B36B' }}>궁합 {product.compatibilityScore}%</span>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28' }}>{product.price.toLocaleString()}원</div>
              <ChevronRight size={16} color="#B0B8C1" style={{ marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
