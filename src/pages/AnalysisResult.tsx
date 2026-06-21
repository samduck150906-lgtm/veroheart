// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { MVP_PRODUCTS, BERO_PET } from '../data/mvpMock';

const TABS = ['종합', '영양소', '전성분', '알러지'];

function ScoreGauge({ score, grade }) {
  const colors = { A: '#15B36B', B: '#E8A800', C: '#F04452' };
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="48" fill="none" stroke="#F0EDE8" strokeWidth="10" />
          <circle cx="60" cy="60" r="48" fill="none" stroke={colors[grade] || '#15B36B'} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#191F28' }}>{score}</span>
          <span style={{ fontSize: 12, color: '#8B95A1', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
      <div style={{
        marginTop: 10, width: 36, height: 36, borderRadius: '50%',
        background: colors[grade] || '#15B36B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 16, fontWeight: 900,
      }}>{grade}</div>
      <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>안전도 점수</p>
    </div>
  );
}

export default function AnalysisResult() {
  const navigate = useNavigate();
  const product = MVP_PRODUCTS[0];
  const [activeTab, setActiveTab] = useState('종합');

  const radarData = [
    { subject: '단백질', value: product.nutritionInfo.protein, fullMark: 50 },
    { subject: '지방', value: product.nutritionInfo.fat, fullMark: 30 },
    { subject: '섬유', value: product.nutritionInfo.fiber * 5, fullMark: 30 },
    { subject: '칼슘', value: product.nutritionInfo.calcium * 20, fullMark: 30 },
    { subject: '수분', value: product.nutritionInfo.moisture, fullMark: 30 },
  ];

  const riskColors = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
  const riskBg = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
  const riskLabel = { safe: '안전', caution: '주의', danger: '위험' };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 32 }}>{product.emoji}</span>
          <div>
            <div style={{ fontSize: 12, color: '#8B95A1' }}>{product.brand}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#191F28' }}>{product.name}</div>
          </div>
        </div>

        <ScoreGauge score={product.safetyScore} grade={product.grade} />

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#F0EDE8', borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                background: activeTab === tab ? '#fff' : 'transparent',
                color: activeTab === tab ? '#191F28' : '#8B95A1',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(30,41,59,0.1)' : 'none',
                transition: 'all 0.2s',
              }}
            >{tab}</button>
          ))}
        </div>

        {/* 종합 tab */}
        {activeTab === '종합' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>✅ 좋은 점</div>
              {[
                '글루코사민 함유 — 관절 케어에 도움',
                '유기농 원료 사용',
                '오리고기 38% 고단백 구성',
              ].map((point, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, background: '#E7F8F0', borderRadius: 10, padding: '10px 12px' }}>
                  <span style={{ color: '#15B36B', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#191F28', fontWeight: 600 }}>{point}</span>
                </div>
              ))}
            </div>
            {product.cautionIngredients.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>⚠️ 주의 사항</div>
                {product.cautionIngredients.map((ing, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, background: '#FEF6E0', borderRadius: 10, padding: '10px 12px' }}>
                    <span style={{ color: '#E8A800', flexShrink: 0 }}>⚠️</span>
                    <span style={{ fontSize: 13, color: '#191F28', fontWeight: 600 }}>{ing} 함유 — 합성 방부제, 장기 급여 시 모니터링 필요</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background: '#fff', borderRadius: 14, padding: '14px', boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 10 }}>알러지 체크</div>
              {BERO_PET.allergies.map(allergy => {
                const hasAllergen = product.ingredients.some(ing => ing.nameKo.includes(allergy) || allergy.includes(ing.nameKo));
                return (
                  <div key={allergy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F0EDE8' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#191F28' }}>{allergy}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: hasAllergen ? '#F04452' : '#15B36B' }}>
                      {hasAllergen ? '⚠️ 포함' : '✓ 미포함'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 영양소 tab */}
        {activeTab === '영양소' && (
          <div>
            <div style={{ height: 220, marginBottom: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#F0EDE8" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#4E5968', fontWeight: 700 }} />
                  <Radar name="영양소" dataKey="value" stroke="#F5C518" fill="#F5C518" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '단백질', value: product.nutritionInfo.protein, unit: '%', good: product.nutritionInfo.protein >= 18 },
                { label: '지방', value: product.nutritionInfo.fat, unit: '%', good: product.nutritionInfo.fat >= 5 },
                { label: '조섬유', value: product.nutritionInfo.fiber, unit: '%', good: true },
                { label: '수분', value: product.nutritionInfo.moisture, unit: '%', good: true },
                { label: '칼슘', value: product.nutritionInfo.calcium, unit: '%', good: product.nutritionInfo.calcium >= 0.8 },
              ].map(n => (
                <div key={n.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{n.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 6, background: '#F0EDE8', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(n.value * 2, 100)}%`, height: '100%', background: n.good ? '#15B36B' : '#E8A800', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#191F28', minWidth: 40, textAlign: 'right' }}>{n.value}{n.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 전성분 tab */}
        {activeTab === '전성분' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {product.ingredients.map(ing => (
              <div key={ing.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(30,41,59,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{ing.nameKo}</div>
                  <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2 }}>{ing.nameEn} · {ing.purpose}</div>
                </div>
                <span style={{ background: riskBg[ing.riskLevel], color: riskColors[ing.riskLevel], fontSize: 11, fontWeight: 800, borderRadius: 8, padding: '3px 8px', flexShrink: 0 }}>
                  {riskLabel[ing.riskLevel]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 알러지 tab */}
        {activeTab === '알러지' && (
          <div>
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px', marginBottom: 16, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>
                {BERO_PET.name}의 알러지 성분
              </div>
              {BERO_PET.allergies.map(allergy => {
                const hasAllergen = product.ingredients.some(ing => ing.nameKo.includes(allergy));
                return (
                  <div key={allergy} style={{
                    background: hasAllergen ? '#FFF0ED' : '#E7F8F0',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#191F28' }}>{allergy}</div>
                      <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 2 }}>
                        {hasAllergen ? '이 제품에 포함되어 있습니다' : '이 제품에 포함되지 않습니다'}
                      </div>
                    </div>
                    <span style={{ fontSize: 22 }}>{hasAllergen ? '⚠️' : '✅'}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ background: '#F7F4EE', borderRadius: 14, padding: '14px' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 8 }}>🍽 급여 계산기</div>
              <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>{product.feedingGuide}</p>
              <div style={{ marginTop: 12, background: '#fff', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#F5C518' }}>120g</div>
                <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 4 }}>베로(5.2kg) 기준 1일 권장량</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
