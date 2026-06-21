// @ts-nocheck
import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { MOCK_INGREDIENTS_DICT } from '../data/mvpMock';

const FILTER_CATS = ['전체', '영양소', '방부제', '기능성 성분', '미네랄'];

const riskColors = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const riskBg = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const riskLabel = { safe: '안전', caution: '주의', danger: '위험' };

export default function IngredientDictionary() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');

  const filtered = MOCK_INGREDIENTS_DICT.filter(ing => {
    if (activeFilter !== '전체' && ing.category !== activeFilter) return false;
    if (query && !ing.name.includes(query) && !ing.nameEn.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#191F28', letterSpacing: '-0.03em', marginBottom: 4 }}>성분사전</h1>
        <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 14 }}>사료 성분을 쉽게 이해하세요</p>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#fff', borderRadius: 14, padding: '0 16px',
          boxShadow: '0 1px 4px rgba(30,41,59,0.08)', marginBottom: 14,
        }}>
          <SearchIcon size={18} color="#8B95A1" strokeWidth={2.2} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="성분명 검색..."
            style={{ flex: 1, height: 46, border: 'none', outline: 'none', fontSize: 15, color: '#191F28', background: 'transparent' }}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20 }}>
          {FILTER_CATS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 700,
                background: activeFilter === f ? '#191F28' : '#fff',
                color: activeFilter === f ? '#fff' : '#6B7684',
                boxShadow: '0 1px 3px rgba(30,41,59,0.06)',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Ingredient cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(ing => (
            <div key={ing.id} style={{ background: '#fff', borderRadius: 18, padding: '16px', boxShadow: '0 2px 10px rgba(30,41,59,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{ing.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>{ing.name}</div>
                    <div style={{ fontSize: 12, color: '#8B95A1' }}>{ing.nameEn}</div>
                  </div>
                </div>
                <span style={{ background: riskBg[ing.riskLevel], color: riskColors[ing.riskLevel], fontSize: 11, fontWeight: 800, borderRadius: 8, padding: '4px 10px' }}>
                  {riskLabel[ing.riskLevel]}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.6, marginBottom: 10 }}>{ing.description}</p>
              <div style={{ background: '#F7F4EE', borderRadius: 10, padding: '10px 12px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#8B95A1' }}>권장 기준: </span>
                <span style={{ fontSize: 12, color: '#4E5968', fontWeight: 600 }}>{ing.recommendation}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
