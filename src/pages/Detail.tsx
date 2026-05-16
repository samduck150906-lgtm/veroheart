import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  GitCompare, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  Dog, 
  Cat, 
  Calendar,
  Layers,
  ExternalLink
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import Analyzer from '../components/Analyzer';
import BottomSheet from '../components/BottomSheet';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    profile, 
    selectedProduct: product, 
    isLoadingProducts, 
    fetchProductDetail, 
    comparisonList, 
    addToComparison, 
    removeFromComparison, 
    addToCart,
    products
  } = useStore();
  
  useEffect(() => {
    if (id) fetchProductDetail(id);
  }, [id, fetchProductDetail]);

  if (isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="mt-4 text-gray-500 font-medium">제품 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!product) return (
    <div className="text-center p-12">
      <p className="text-gray-500">제품을 찾을 수 없습니다.</p>
      <button onClick={() => navigate('/')} className="mt-4 text-primary font-bold">홈으로 이동</button>
    </div>
  );

  const report = product ? generateAnalysisReport(product, profile) : null;
  const isComparing = comparisonList.includes(product?.id || '');

  // find alternative
  let alternativeProduct = null;
  if (report && report.score < 80) {
    const scoredProducts = products
      .filter(p => p.id !== product?.id && p.category === product?.category)
      .map(p => ({ p, score: generateAnalysisReport(p, profile).score }))
      .sort((a, b) => b.score - a.score);
    
    if (scoredProducts.length > 0 && scoredProducts[0].score >= 80) {
      alternativeProduct = scoredProducts[0];
    }
  }

  // DER Calculation
  const getFeedingAmount = () => {
    if (!profile.weight) return null;
    const rer = 70 * Math.pow(profile.weight, 0.75);
    const der = rer * 1.6; // Average adult multiplier
    const kcalPerKg = 3500; // Mock average
    const grams = (der / kcalPerKg) * 1000;
    return Math.round(grams);
  };
  const feedingGrams = getFeedingAmount();

  const getRiskColor = (level: string) => {
    if (level === 'danger') return '#F04452'; // Toss Red
    if (level === 'caution') return '#F59E0B'; // Yellow
    return '#3182F6'; // Toss Blue for safe
  };

  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  
  // Create Toss-style Headline Data
  let headline = `${profile.name}가 안심하고 먹을 수 있어요!`;
  let headlineColor = '#191F28';
  let dangerIngs = product.ingredients?.filter(i => i.riskLevel === 'danger') || [];
  let cautionIngs = product.ingredients?.filter(i => i.riskLevel === 'caution') || [];
  let allergyIngs = product.ingredients?.filter(ing => profile.allergies.some(a => ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase())))) || [];
  
  if (allergyIngs.length > 0 || dangerIngs.length > 0) {
    const count = new Set([...allergyIngs, ...dangerIngs]).size;
    headline = `주의 성분이 ${count}개 발견됐어요`;
    headlineColor = '#F04452'; // Toss Red
  } else if (cautionIngs.length > 0) {
    headline = `확인해야 할 성분이 ${cautionIngs.length}개 있어요`;
    headlineColor = '#F59E0B';
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로하트 커머스</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      <button onClick={() => navigate(-1)} style={{
        background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
        gap: '8px', marginBottom: '16px', color: 'var(--text-dark)', fontWeight: 600
      }}>
        <ArrowLeft size={20} /> 뒤로
      </button>

      <div style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '24px', overflow: 'hidden', marginBottom: '32px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
        <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {report && (
          <div style={{
            position: 'absolute', bottom: '20px', left: '20px', right: '20px',
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
            padding: '16px 20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', background: report.score >= 80 ? '#10B981' : (report.score >= 60 ? '#F59E0B' : '#EF4444'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 900
            }}>
              {report.score}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#1F2937' }}>{report.summary}</div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>전성분 {product.ingredients?.length}개 정밀 분석 완료</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-light)', fontWeight: 600 }}>{product.brand}</div>
      <h1 style={{ fontSize: '24px', lineHeight: 1.3, marginBottom: '16px', fontWeight: 900 }}>{product.name}</h1>
      
      {/* V2 Metadata Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {product.targetPetType && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>
            {product.targetPetType === 'dog' ? <Dog size={14} /> : (product.targetPetType === 'cat' ? <Cat size={14} /> : <Layers size={14} />)}
            {product.targetPetType === 'dog' ? '강아지용' : (product.targetPetType === 'cat' ? '고양이용' : '공용')}
          </div>
        )}
        {product.targetLifeStage && product.targetLifeStage.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>
            <Calendar size={14} />
            {product.targetLifeStage.join(', ')}
          </div>
        )}
        {product.formulation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', padding: '6px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>
            <Layers size={14} />
            {product.formulation}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary-dark)' }}>{product.price.toLocaleString()}원</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '16px', color: '#FCD34D' }}>★</span>
          <span style={{ fontWeight: 700 }}>{product.averageRating}</span> 
          <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button className="btn btn-outline" style={{ flex: 1, height: '56px', borderRadius: 'var(--border-radius-md)' }} onClick={() => {
          isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
        }}>
          <GitCompare size={20} />
          <span style={{ marginLeft: '4px' }}>비교</span>
        </button>
        
        {product.productUrl ? (
          <a 
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={{ 
              flex: 2, borderRadius: 'var(--border-radius-md)', 
              fontWeight: 800, fontSize: '17px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: '8px', textDecoration: 'none'
            }}
          >
            🚀 쿠팡 최저가 구매 <ExternalLink size={18} />
          </a>
        ) : (
          <button className="btn btn-primary" style={{ flex: 2, borderRadius: 'var(--border-radius-md)', fontWeight: 800, fontSize: '17px', gap: '8px' }} onClick={() => {
            addToCart(product.id, 1);
            navigate('/checkout');
          }}>
            바로 구매하기
          </button>
        )}
      </div>

      {alternativeProduct && (
        <div className="card" style={{ backgroundColor: 'var(--bg-color)', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontWeight: 800, marginBottom: '8px' }}>
            <AlertCircle size={20} /> 앗! 이 사료는 아이와 맞지 않을 수 있어요.
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-dark)', marginBottom: '16px', lineHeight: 1.5 }}>
            대신 <b>{profile.name}</b>와(과) 궁합이 <b style={{ color: 'var(--safe)' }}>{alternativeProduct.score}점</b>인 이 사료는 어떠세요?
          </p>
          <button 
            className="btn btn-outline"
            style={{ width: '100%', borderRadius: 'var(--border-radius-sm)', fontWeight: 700 }}
            onClick={() => navigate(`/product/${alternativeProduct?.p.id}`)}
          >
            {alternativeProduct.p.brand} {alternativeProduct.p.name} 보러가기
          </button>
        </div>
      )}

      {/* 일일 급여량 계산기 */}
      <section className="card" style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)' }}>
          <Dog size={22} color="var(--safe)" /> {profile.name} 맞춤 일일 급여량
        </h2>
        {feedingGrams ? (
          <div>
            <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--safe)', marginBottom: '8px' }}>
              하루 약 {feedingGrams}g
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {profile.weight}kg 기준 (평균 활동량 적용)<br/>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>*평균 칼로리(3500kcal/kg) 기준 추정치입니다.</span>
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              몸무게를 입력하시면 정확한 권장 급여량을 알려드려요!
            </p>
            <button 
              className="btn btn-outline" 
              style={{ borderRadius: 'var(--border-radius-sm)', width: '100%' }}
              onClick={() => navigate('/profile')}
            >
              몸무게 입력하러 가기
            </button>
          </div>
        )}
      </section>

      {/* Toss-style Ingredient Analysis */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 900, color: headlineColor, lineHeight: 1.4, marginBottom: '24px', letterSpacing: '-0.02em' }}>
          {headline}
        </h2>
        
        {/* Nutrition Summary */}
        <div style={{ backgroundColor: 'var(--secondary)', padding: '20px', borderRadius: 'var(--border-radius-lg)', marginBottom: '32px' }}>
          <p style={{ fontSize: '15px', color: 'var(--text-dark)', fontWeight: 600, lineHeight: 1.6 }}>
            {profile.healthConcerns.includes('비만') 
              ? "다이어트가 필요한 아이에겐 지방 수치가 다소 높으니 급여량을 10% 줄여주세요." 
              : "조단백질이 풍부하여 근육 형성과 에너지 보충에 아주 좋습니다."}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>전성분 상세</h3>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>총 {product.ingredients?.length}개</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {product.ingredients?.map(ing => {
            const isAllergy = profile.allergies.some(a => 
              ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
            );
            const isDanger = isAllergy || ing.riskLevel === 'danger';
            const isCaution = !isDanger && ing.riskLevel === 'caution';

            return (
              <button 
                key={ing.id} 
                onClick={() => setSelectedIngredient({ ...ing, isAllergy })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px', borderRadius: 'var(--border-radius-md)', 
                  background: 'var(--bg-color)', border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background-color 0.2s', width: '100%'
                }}
                className="hover:bg-gray-50 active:bg-gray-100"
              >
                <div>
                  <div style={{ fontWeight: isDanger || isCaution ? 800 : 600, fontSize: '16px', color: isDanger ? '#F04452' : (isCaution ? '#F59E0B' : 'var(--text-dark)') }}>
                    {ing.nameKo}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 500 }}>{ing.purpose}</div>
                </div>
                {isDanger && (
                  <div style={{ background: '#FEE2E2', color: '#F04452', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                    {isAllergy ? '알레르기 위험' : '주의 성분'}
                  </div>
                )}
                {isCaution && (
                  <div style={{ background: '#FEF3C7', color: '#D97706', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 800 }}>
                    확인 필요
                  </div>
                )}
                {!isDanger && !isCaution && (
                  <div style={{ fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>
                    안전
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom Sheet for Ingredient Details */}
      <BottomSheet 
        isOpen={!!selectedIngredient} 
        onClose={() => setSelectedIngredient(null)}
        title={selectedIngredient?.nameKo || ''}
      >
        {selectedIngredient && (
          <div>
            <div style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px', fontWeight: 500 }}>
              {selectedIngredient.nameEn} · {selectedIngredient.purpose}
            </div>
            
            {selectedIngredient.isAllergy ? (
              <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '16px', color: '#F04452', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                {profile.name}의 알레르기 유발 성분입니다. 절대 급여하지 마세요!
              </div>
            ) : selectedIngredient.riskLevel === 'danger' ? (
              <div style={{ backgroundColor: '#FEE2E2', padding: '20px', borderRadius: '16px', color: '#F04452', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                지속적인 급여 시 간이나 신장에 무리를 줄 수 있는 성분입니다.
              </div>
            ) : selectedIngredient.riskLevel === 'caution' ? (
              <div style={{ backgroundColor: '#FEF3C7', padding: '20px', borderRadius: '16px', color: '#D97706', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                특정 질환이 있는 아이에게는 조심해서 급여해야 하는 성분입니다.
              </div>
            ) : (
              <div style={{ backgroundColor: 'var(--secondary)', padding: '20px', borderRadius: '16px', color: 'var(--text-dark)', fontWeight: 700, fontSize: '16px', lineHeight: 1.5 }}>
                안심하고 먹일 수 있는 좋은 원료입니다.
              </div>
            )}
            
            {selectedIngredient.description && (
              <p style={{ marginTop: '24px', fontSize: '15px', color: 'var(--text-dark)', lineHeight: 1.6, fontWeight: 500 }}>
                {selectedIngredient.description}
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      <Analyzer />
    </div>
  );
}
