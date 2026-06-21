// @ts-nocheck
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import { calculateCompatibilityScore, gradeFromScore } from '../utils/score';
import ProductImage from '../components/ProductImage';

const TABS = ['종합', '영양소', '전성분', '알러지'];

const GRADE_STROKE = { A: '#15B36B', B: '#E8A800', C: '#F04452', D: '#F04452', F: '#8B95A1' };
const RISK_COLORS = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const RISK_LABEL = { safe: '안전', caution: '주의', danger: '위험' };

function ScoreGauge({ score, grade }) {
  const color = GRADE_STROKE[grade] || '#15B36B';
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r="48" fill="none" stroke="#F0EDE8" strokeWidth="10" />
          <circle cx="60" cy="60" r="48" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: '#191F28' }}>{score}</span>
          <span style={{ fontSize: 12, color: '#8B95A1', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
      <div style={{
        marginTop: 10, width: 36, height: 36, borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 16, fontWeight: 900,
      }}>{grade}</div>
      <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>종합 점수</p>
    </div>
  );
}

export default function AnalysisResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const { products, selectedProduct, profile, isLoggedIn } = useStore();

  const [activeTab, setActiveTab] = useState('종합');

  const productId = location.state?.productId || selectedProduct?.id;
  const product = useMemo(() => {
    if (productId) return products.find(p => p.id === productId) || selectedProduct;
    return selectedProduct || products[0];
  }, [productId, products, selectedProduct]);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const compatScore = useMemo(() => {
    if (!product) return 75;
    if (hasPetProfile) return calculateCompatibilityScore(product, profile);
    return 75;
  }, [product, profile, hasPetProfile]);

  const grade = gradeFromScore(compatScore);

  const safeIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'safe');
  const cautionIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'caution');
  const dangerIngredients = (product?.ingredients || []).filter(i => i.riskLevel === 'danger');

  const allergyConflicts = useMemo(() => {
    if (!hasPetProfile || !profile?.allergies?.length || !product?.ingredients) return [];
    const allergies = profile.allergies.map(a => a.toLowerCase());
    return product.ingredients.filter(ing =>
      allergies.some(a => (ing.nameKo || '').toLowerCase().includes(a) || (ing.nameEn || '').toLowerCase().includes(a))
    );
  }, [product, profile, hasPetProfile]);

  const ga = product?.guaranteedAnalysis;
  const radarData = ga ? [
    { subject: '단백질', value: Math.min(100, (ga.crudeProtein || 0) * 2.5) },
    { subject: '지방', value: Math.min(100, (ga.crudeFat || 0) * 5) },
    { subject: '섬유', value: Math.min(100, (ga.crudeFiber || 0) * 10) },
    { subject: '수분', value: Math.min(100, (ga.moisture || 0) * 10) },
    { subject: '칼슘', value: Math.min(100, (ga.calcium || 0) * 50) },
  ] : [];

  const positives = [
    safeIngredients.length > 5 ? `안전 성분 ${safeIngredients.length}가지 확인` : null,
    cautionIngredients.length === 0 && dangerIngredients.length === 0 ? '주의/위험 성분 없음 ✓' : null,
    allergyConflicts.length === 0 && hasPetProfile ? '알러지 성분 미포함 ✓' : null,
    ga?.crudeProtein && ga.crudeProtein > 25 ? `고단백 사료 (단백질 ${ga.crudeProtein}%)` : null,
  ].filter(Boolean);

  const cautions = [
    cautionIngredients.length > 0 ? `주의 성분 ${cautionIngredients.length}가지: ${cautionIngredients.map(i => i.nameKo).slice(0, 3).join(', ')}` : null,
    dangerIngredients.length > 0 ? `위험 성분 ${dangerIngredients.length}가지: ${dangerIngredients.map(i => i.nameKo).slice(0, 2).join(', ')}` : null,
    allergyConflicts.length > 0 ? `알러지 의심 성분: ${allergyConflicts.map(i => i.nameKo).join(', ')}` : null,
  ].filter(Boolean);

  if (!product) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center', color: '#B0B8C1' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
        <p style={{ fontWeight: 600 }}>분석할 상품이 없어요</p>
        <button onClick={() => navigate('/search')} style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
          상품 검색하기
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 90 }}>
      {/* Product Header */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
          <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#8B95A1', marginBottom: 3 }}>{product.brand}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#191F28', lineHeight: 1.4 }}>{product.name}</div>
        </div>
      </div>

      {/* Score Gauge */}
      <div style={{ background: '#fff', margin: '16px 16px 0', borderRadius: 20, boxShadow: '0 2px 12px rgba(30,41,59,0.06)' }}>
        <ScoreGauge score={compatScore} grade={grade} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #EAEDF0', margin: '16px 0 0', padding: '0 16px' }}>
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

      <div style={{ padding: '16px 16px 0' }}>
        {/* 종합 Tab */}
        {activeTab === '종합' && (
          <div>
            {positives.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#15B36B', marginBottom: 10 }}>✅ 좋은 점</h3>
                {positives.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: '#191F28' }}>
                    <span style={{ color: '#15B36B', flexShrink: 0 }}>✓</span> {p}
                  </div>
                ))}
              </div>
            )}
            {cautions.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#E8A800', marginBottom: 10 }}>⚠️ 주의 사항</h3>
                {cautions.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13, color: '#191F28' }}>
                    <span style={{ color: '#E8A800', flexShrink: 0, marginTop: 1 }}>!</span> {c}
                  </div>
                ))}
              </div>
            )}
            {positives.length === 0 && cautions.length === 0 && (
              <div style={{ background: '#fff', borderRadius: 18, padding: 18, textAlign: 'center', color: '#B0B8C1', boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                <p>성분 정보가 충분하지 않아요</p>
              </div>
            )}
          </div>
        )}

        {/* 영양소 Tab */}
        {activeTab === '영양소' && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
            {ga ? (
              <>
                {radarData.length > 0 && (
                  <div style={{ height: 220, marginBottom: 16 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#F0EDE8" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: '#6B7684' }} />
                        <Radar dataKey="value" stroke="#F5C518" fill="#F5C518" fillOpacity={0.2} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
                {[
                  { label: '조단백질', value: ga.crudeProtein, unit: '%', color: '#F5C518' },
                  { label: '조지방', value: ga.crudeFat, unit: '%', color: '#15B36B' },
                  { label: '조섬유', value: ga.crudeFiber, unit: '%', color: '#4E5968' },
                  { label: '수분', value: ga.moisture, unit: '%', color: '#B0B8C1' },
                  { label: '칼슘', value: ga.calcium, unit: '%', color: '#CA8A04' },
                  { label: '인', value: ga.phosphorus, unit: '%', color: '#8B95A1' },
                ].filter(r => r.value != null && r.value > 0).map(row => (
                  <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 56, fontSize: 12, fontWeight: 700, color: '#6B7684' }}>{row.label}</div>
                    <div style={{ flex: 1, height: 8, background: '#F0EDE8', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, row.value * 3)}%`, height: '100%', background: row.color, borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 800, color: '#191F28' }}>{row.value}{row.unit}</div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#B0B8C1' }}>
                <p style={{ fontWeight: 600 }}>등록된 영양소 정보가 없어요</p>
              </div>
            )}
          </div>
        )}

        {/* 전성분 Tab */}
        {activeTab === '전성분' && (
          <div>
            {product.ingredients.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, textAlign: 'center', color: '#B0B8C1', boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                <p style={{ fontWeight: 600 }}>성분 정보가 없어요</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {product.ingredients.map((ing, idx) => (
                  <div key={ing.id || idx} style={{
                    background: '#fff', borderRadius: 14, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 1px 4px rgba(30,41,59,0.05)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#B0B8C1', fontWeight: 700, width: 22 }}>{idx + 1}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{ing.nameKo}</div>
                        {ing.nameEn && <div style={{ fontSize: 11, color: '#8B95A1' }}>{ing.nameEn}</div>}
                      </div>
                    </div>
                    <span style={{
                      background: RISK_BG[ing.riskLevel] || '#F0EDE8',
                      color: RISK_COLORS[ing.riskLevel] || '#6B7684',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>
                      {RISK_LABEL[ing.riskLevel] || '정보없음'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 알러지 Tab */}
        {activeTab === '알러지' && (
          <div>
            {!hasPetProfile ? (
              <div style={{ background: '#fff', borderRadius: 18, padding: 20, textAlign: 'center', boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🐾</div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#4E5968', marginBottom: 6 }}>펫 정보를 등록해주세요</p>
                <p style={{ fontSize: 13, color: '#8B95A1', marginBottom: 16 }}>알러지 체크를 위해 반려동물 정보가 필요해요</p>
                <button onClick={() => navigate('/pet-profile')}
                  style={{ background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
                  정보 등록하기
                </button>
              </div>
            ) : (
              <div>
                {profile.allergies.length === 0 ? (
                  <div style={{ background: '#fff', borderRadius: 18, padding: 20, textAlign: 'center', color: '#B0B8C1', boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                    <p style={{ fontWeight: 600 }}>등록된 알러지가 없어요</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>마이펫에서 알러지를 등록해보세요</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ background: '#fff', borderRadius: 18, padding: 18, boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>
                        {profile.name || '우리 아이'}의 알러지 체크
                      </h3>
                      {profile.allergies.map(allergen => {
                        const conflict = allergyConflicts.some(ing =>
                          (ing.nameKo || '').toLowerCase().includes(allergen.toLowerCase())
                        );
                        return (
                          <div key={allergen} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 0', borderBottom: '1px solid #F2F4F6',
                          }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{allergen}</span>
                            <span style={{
                              background: conflict ? '#FFF0ED' : '#E7F8F0',
                              color: conflict ? '#F04452' : '#15B36B',
                              borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 800,
                            }}>
                              {conflict ? '⚠️ 포함됨' : '✓ 미포함'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {allergyConflicts.length === 0 ? (
                      <div style={{ background: '#E7F8F0', borderRadius: 14, padding: 16, textAlign: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#15B36B' }}>✓ 알러지 성분이 검출되지 않았어요</span>
                      </div>
                    ) : (
                      <div style={{ background: '#FFF0ED', borderRadius: 14, padding: 16 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#F04452' }}>⚠️ 알러지 성분이 포함되어 있어요. 급여 전 수의사와 상담하세요.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
