import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, ShoppingBag, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

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
    addToCart 
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

  const getRiskColor = (level: string) => {
    if (level === 'danger') return '#EF4444';
    if (level === 'warning') return '#F59E0B';
    return '#10B981';
  };

  const handleBuy = () => {
    if (product) {
      addToCart(product.id, 1);
      alert('장바구니에 담겼습니다! 🛒');
    }
  };

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
      <h1 style={{ fontSize: '24px', lineHeight: 1.3, marginBottom: '16px' }}>{product.name}</h1>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800 }}>{product.price.toLocaleString()}원</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '16px', color: '#FCD34D' }}>★</span>
          <span style={{ fontWeight: 700 }}>{product.averageRating}</span> 
          <span style={{ color: 'var(--text-muted)' }}>({product.reviewsCount})</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <button className="btn btn-outline" style={{ flex: 1, padding: '12px 0' }} onClick={() => {
          isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
        }}>
          <GitCompare size={18} /> 비교
        </button>
        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#FF5A5F', padding: '12px 0' }} onClick={handleBuy}>
          <ShoppingBag size={18} color="#fff" /> 장바구니
        </button>
        <button className="btn btn-primary" style={{ flex: 1, backgroundColor: '#1F2937', color: '#fff', padding: '12px 0' }} onClick={() => {
          addToCart(product.id, 1);
          navigate('/checkout');
        }}>
          💰 바로 구매
        </button>
      </div>

      {/* 정밀 분석 리포트 */}
      <section style={{ marginBottom: '40px', background: '#F8FAFC', padding: '24px', borderRadius: '20px', border: '1px solid #E2E8F0' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} className="text-blue-600" /> {profile.name} 맞춤 분석 리포트
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report?.highlights.map((h, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', borderRadius: '12px',
              backgroundColor: h.type === 'positive' ? '#ECFDF5' : (h.type === 'negative' ? '#FEF2F2' : '#FFFBEB'),
              color: h.type === 'positive' ? '#065F46' : (h.type === 'negative' ? '#991B1B' : '#92400E'),
              fontSize: '14px', fontWeight: 500
            }}>
              {h.type === 'positive' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {h.text}
            </div>
          ))}
        </div>
        
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#4B5563', lineHeight: 1.6 }}>
          {report?.detailedAnalysis}
        </p>
      </section>

      {/* 전성분 분석 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800 }}>전성분 분석</h2>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>성분 개수: {product.ingredients?.length}개</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {product.ingredients?.map(ing => {
          const isAllergy = profile.allergies.some(a => 
            ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
          );
          return (
            <div key={ing.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '16px', background: isAllergy ? '#FEF2F2' : '#fff',
              border: isAllergy ? '1px solid #FECACA' : '1px solid #F1F5F9',
              boxShadow: isAllergy ? 'none' : '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '12px', background: `${getRiskColor(ing.riskLevel)}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getRiskColor(ing.riskLevel) }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#1F2937' }}>
                    {ing.nameKo} <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 400 }}>{ing.nameEn}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px' }}>{ing.purpose}</div>
                </div>
              </div>
              {isAllergy && (
                <div style={{ background: '#EF4444', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                  알러지 경보
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
