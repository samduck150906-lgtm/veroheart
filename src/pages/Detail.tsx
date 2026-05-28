// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  ExternalLink,
  Shield,
  MessageSquare,
  Star,
  Trash2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { 
  getReviews, 
  createReview, 
  deleteReview,
} from '../lib/supabase';
import { buildProductConclusion } from '../utils/productConclusion';
import { COUPANG_PARTNERS_DISCLOSURE } from '../constants/coupangPartners';
import { REVIEW_QUICK_TAGS } from '../constants/reviewTags';

const getVerificationMeta = (s: string) => {
  if (s === 'verified') return { bg: 'var(--surface-muted)', color: 'var(--text-dark)', label: '베로로 공식 인증' };
  if (s === 'needs_review') return { bg: 'var(--warning-soft)', color: 'var(--warning)', label: '정보 재검토 중' };
  return { bg: 'var(--surface-muted)', color: 'var(--text-muted)', label: '영양 성분 검수 대기' };
};

interface Ingredient { id: string; riskLevel: string; nameKo: string; nameEn?: string; purpose?: string; description?: string; }
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import { openCoupangForProduct } from '../utils/externalPurchase';
import BottomSheet from '../components/BottomSheet';
import { TossCard } from '../components/TossUI';
import ProductImage from '../components/ProductImage';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    userId,
    profile, 
    selectedProduct: product, 
    isLoadingProducts, 
    fetchProductDetail, 
    comparisonList, 
    addToComparison, 
    removeFromComparison, 
    addToCart,
    products,
    favorites,
    trackRecentView,
  } = useStore();

  type ReviewRow = {
    id: string;
    user_id: string;
    rating: number;
    content: string;
    created_at: string;
    users?: { email?: string | null };
  };
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const isFav = favorites.includes(id || '');

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
      trackRecentView(id);
      getReviews(id).then(setReviews);
    }
  }, [id, fetchProductDetail, trackRecentView]);

  const toggleReviewTag = (tag: string) => {
    setReviewTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmitReview = async () => {
    if (!userId) { navigate('/login'); return; }
    const tagLine = reviewTags.length > 0 ? `# ${reviewTags.join(' · ')}` : '';
    const body = [tagLine, reviewContent.trim()].filter(Boolean).join('\n\n');
    if (!body) return;
    setIsSubmitting(true);
    const review = await createReview(userId, id!, reviewRating, body);
    if (review) {
      setReviewTags([]);
      setReviews(prev => [{ ...review, users: { email: 'me' } }, ...prev]);
      setReviewContent('');
      setReviewRating(5);
    }
    setIsSubmitting(false);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!userId) return;
    await deleteReview(reviewId, userId);
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  };

  if (isLoadingProducts) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 200px)',
          padding: '40px 24px',
        }}
      >
        <Loader2 size={48} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px', color: '#6B7280', fontWeight: 600 }}>
          제품 정보를 불러오는 중입니다...
        </p>
      </div>
    );
  }

  if (!product) return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>
        제품을 찾을 수 없습니다.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          padding: '12px 22px',
          borderRadius: '14px',
          background: 'var(--text-dark)',
          color: '#fff',
          border: 'none',
          fontWeight: 600,
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        홈으로 이동
      </button>
    </div>
  );

  const report = product ? generateAnalysisReport(product, profile) : null;
  const conclusion = product && report ? buildProductConclusion(product, profile, report) : null;
  const isComparing = comparisonList.includes(product?.id || '');
  const verificationMeta = getVerificationMeta(product.verificationStatus);

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

  // selectedIngredient state moved to top with other hooks
  
  // Headline with calm semantic colors
  let headline = `${profile.name}가 안심하고 먹을 수 있어요`;
  let headlineColor = 'var(--text-dark)';
  let dangerIngs = product.ingredients?.filter(i => i.riskLevel === 'danger') || [];
  let cautionIngs = product.ingredients?.filter(i => i.riskLevel === 'caution') || [];
  let allergyIngs = product.ingredients?.filter(ing => profile.allergies.some(a => ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase())))) || [];

  if (allergyIngs.length > 0 || dangerIngs.length > 0) {
    const count = new Set([...allergyIngs, ...dangerIngs]).size;
    headline = `주의 성분이 ${count}개 발견됐어요`;
    headlineColor = 'var(--danger)';
  } else if (cautionIngs.length > 0) {
    headline = `확인해야 할 성분이 ${cautionIngs.length}개 있어요`;
    headlineColor = 'var(--warning)';
  }

  return (
    <div className="animate-stack-push detail-page-root" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로로</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      {conclusion && (
        <section
          aria-label="맞춤 결론"
          style={{
            marginBottom: '20px',
            padding: '18px 20px',
            borderRadius: '16px',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderLeft: `3px solid ${
              conclusion.tone === 'alert'
                ? 'var(--danger)'
                : conclusion.tone === 'match'
                  ? 'var(--safe)'
                  : 'var(--warning)'
            }`,
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-dark)',
              lineHeight: 1.4,
              letterSpacing: '-0.015em',
            }}
          >
            {conclusion.headline}
          </p>
          {conclusion.subline ? (
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.55 }}>
              {conclusion.subline}
            </p>
          ) : null}
        </section>
      )}

      <div className="detail-fab-stack" aria-label="빠른 이동">
        <button
          type="button"
          className="detail-back-fab"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={18} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.12)' }}>
        <ProductImage src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <TossCard style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ marginBottom: '8px', fontSize: '13px', color: 'var(--text-light)', fontWeight: 700 }}>{product.brand}</div>
        <h1 style={{ fontSize: '26px', lineHeight: 1.3, marginBottom: '14px', fontWeight: 900 }}>{product.name}</h1>
      
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 800,
              padding: '7px 10px',
              borderRadius: '999px',
              background: verificationMeta.bg,
              color: verificationMeta.color,
            }}
          >
            <Shield size={14} />
            {verificationMeta.label}
          </div>
          {product.targetPetType && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              {product.targetPetType === 'dog' ? <Dog size={14} /> : (product.targetPetType === 'cat' ? <Cat size={14} /> : <Layers size={14} />)}
              {product.targetPetType === 'dog' ? '강아지용' : (product.targetPetType === 'cat' ? '고양이용' : '공용')}
            </div>
          )}
          {product.targetLifeStage && product.targetLifeStage.length > 0 && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              <Calendar size={14} />
              {product.targetLifeStage.join(', ')}
            </div>
          )}
          {product.formulation && (
            <div className="ui-badge ui-badge-muted" style={{ display: 'inline-flex' }}>
              <Layers size={14} />
              {product.formulation}
            </div>
          )}
        </div>
      </TossCard>

      <button
        onClick={() => navigate('/analysis', { state: { product } })}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px 18px',
          background: 'var(--surface-elevated)',
          color: 'var(--text-dark)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          cursor: 'pointer',
          marginBottom: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--surface-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={16} strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-dark)' }}>
              AI 영양 리포트 보기
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 500, marginTop: '1px' }}>
              건물기준 변환 · 급여량 · 유해성분 탐지
            </div>
          </div>
        </div>
        <ChevronRight size={16} color="var(--text-light)" strokeWidth={2} />
      </button>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          className="btn btn-outline"
          aria-label={isComparing ? '비교함에서 빼기' : '비교함에 담기'}
          style={{ flex: 1, height: '48px' }}
          onClick={() => {
            isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
          }}
        >
          <GitCompare size={16} strokeWidth={1.8} />
          <span>비교</span>
        </button>

        <button
          className="btn btn-primary"
          aria-label="쿠팡에서 최저가 구매하기 (외부 링크)"
          style={{ flex: 2, height: '48px', fontWeight: 600, fontSize: '15px' }}
          onClick={() => {
            openCoupangForProduct(product);
          }}
        >
          쿠팡 최저가 구매
          <ExternalLink size={14} strokeWidth={1.8} />
        </button>
      </div>
      <p
        style={{
          margin: '0 0 28px',
          padding: '0 4px',
          fontSize: '10.5px',
          lineHeight: 1.5,
          fontWeight: 500,
          color: 'var(--text-light)',
          textAlign: 'right',
          letterSpacing: '-0.01em',
        }}
      >
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>

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

      {/* Ingredient Analysis — calm semantic colors */}
      <section style={{ marginBottom: '40px' }}>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: headlineColor,
            lineHeight: 1.4,
            marginBottom: '20px',
            letterSpacing: '-0.02em',
          }}
        >
          {headline}
        </h2>

        {/* Nutrition Summary */}
        <div
          style={{
            backgroundColor: 'var(--surface-muted)',
            padding: '16px 18px',
            borderRadius: '14px',
            marginBottom: '28px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500, lineHeight: 1.6, margin: 0 }}>
            {profile.healthConcerns.includes('비만')
              ? '다이어트가 필요한 아이에겐 지방 수치가 다소 높으니 급여량을 10% 줄여주세요.'
              : '조단백질이 풍부하여 근육 형성과 에너지 보충에 도움이 됩니다.'}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>전성분 상세</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 500 }}>
            총 {product.ingredients?.length}개
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {product.ingredients?.map(ing => {
            const isAllergy = profile.allergies.some(a =>
              ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
            );
            const isDanger = isAllergy || ing.riskLevel === 'danger';
            const isCaution = !isDanger && ing.riskLevel === 'caution';
            const accentColor = isDanger ? 'var(--danger)' : isCaution ? 'var(--warning)' : 'var(--safe)';

            return (
              <button
                key={ing.id}
                onClick={() => setSelectedIngredient({ ...ing, isAllergy })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: '4px',
                      height: '24px',
                      borderRadius: '2px',
                      background: accentColor,
                      flexShrink: 0,
                    }}
                    aria-hidden
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-dark)' }}>
                      {ing.nameKo}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '2px', fontWeight: 500 }}>
                      {ing.purpose}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: accentColor, fontWeight: 600, marginLeft: '12px', flexShrink: 0 }}>
                  {isDanger ? (isAllergy ? '알레르기' : '주의') : isCaution ? '확인 필요' : '안전'}
                </span>
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

      {/* 브랜드 바로가기 */}
      <div style={{ marginBottom: '32px' }}>
        <Link to={`/brand/${encodeURIComponent(product.brand)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#F9FAFB', borderRadius: '16px', textDecoration: 'none', color: '#111827', border: '1px solid #F3F4F6' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '2px' }}>브랜드</div>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>{product.brand}의 다른 제품 보기</div>
          </div>
          <ArrowLeft size={18} style={{ transform: 'rotate(180deg)', color: '#9CA3AF' }} />
        </Link>
      </div>

      {/* 리뷰 섹션 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
          <MessageSquare size={20} /> 후기 <span style={{ color: '#94A3B8', fontWeight: 700 }}>{reviews.length}</span>
        </h2>
        <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px', fontWeight: 600 }}>
          키워드만 골라도 돼요. {profile.name}와 비슷한 아이 집사의 글을 모아보려면 태그를 활용해 보세요.
        </p>

        {/* 리뷰 작성 */}
        <div style={{ background: '#F9FAFB', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {REVIEW_QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleReviewTag(tag)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: reviewTags.includes(tag) ? 'none' : '1px solid #E5E7EB',
                  background: reviewTags.includes(tag) ? '#111827' : '#fff',
                  color: reviewTags.includes(tag) ? '#fff' : '#374151',
                  cursor: 'pointer',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setReviewRating(star)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                <Star size={24} fill={star <= reviewRating ? '#FCD34D' : 'none'} color={star <= reviewRating ? '#FCD34D' : '#D1D5DB'} />
              </button>
            ))}
          </div>
          <textarea
            value={reviewContent}
            onChange={e => setReviewContent(e.target.value)}
            placeholder={userId ? '한 줄 덧붙이기 (선택)' : '로그인 후 작성'}
            disabled={!userId}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', resize: 'none', height: '80px', boxSizing: 'border-box', background: userId ? '#fff' : '#F3F4F6' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            {userId ? (
              <button onClick={handleSubmitReview} disabled={isSubmitting || !reviewContent.trim()} style={{ padding: '12px 24px', background: '#111827', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', opacity: isSubmitting || !reviewContent.trim() ? 0.5 : 1 }}>
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
            ) : (
              <Link to="/login" style={{ padding: '12px 24px', background: '#111827', color: '#fff', borderRadius: '12px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
                로그인하고 리뷰 쓰기
              </Link>
            )}
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF', background: '#F9FAFB', borderRadius: '16px' }}>
              아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
            </div>
          ) : reviews.map(review => (
            <div key={review.id} style={{ padding: '16px 20px', background: '#fff', border: '1px solid #F3F4F6', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={14} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : '#E5E7EB'} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {review.users?.email?.split('@')[0] || '익명'} · {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
                {review.user_id === userId && (
                  <button onClick={() => handleDeleteReview(review.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB' }}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: 0 }}>{review.content}</p>
            </div>
          ))}
        </div>
      </section>

      <p
        style={{
          margin: '32px 0 0',
          padding: '14px 16px',
          fontSize: '11px',
          lineHeight: 1.55,
          fontWeight: 600,
          color: '#64748B',
          textAlign: 'center',
          background: '#F1F5F9',
          borderRadius: '14px',
        }}
      >
        {COUPANG_PARTNERS_DISCLOSURE}
      </p>
    </div>
  );
}

function VetBadge({ riskLevel }: { riskLevel: string }) {
  if (riskLevel === 'safe') return null;
  const isDanger = riskLevel === 'danger';
  return (
    <div style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '8px', background: isDanger ? '#FEF2F2' : '#FFFBEB', color: isDanger ? '#991B1B' : '#92400E', border: `1px solid ${isDanger ? '#FECACA' : '#FDE68A'}` }}>
      {isDanger ? '⚠️ 수의사 주의' : '👁 확인 권장'}
    </div>
  );
}

function getVetComment(ingredients: Ingredient[]): string {
  const dangerCount = ingredients.filter(i => i.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter(i => i.riskLevel === 'caution').length;
  if (dangerCount > 0) {
    return `이 제품에는 ${dangerCount}개의 주의 성분이 포함되어 있습니다. 특히 BHA, BHT, 에톡시퀸 등 합성 보존료나 인공색소는 장기 섭취 시 간 부담을 줄 수 있으며, 알레르기 반응이 있는 반려동물에게는 주의가 필요합니다. 급여 전 수의사와 상담하세요.`;
  }
  if (cautionCount > 0) {
    return `전반적으로 안전한 성분 구성이나 ${cautionCount}개 성분은 개체에 따라 반응이 다를 수 있습니다. 처음 급여 시 소량부터 시작하고 이상 반응(구토, 설사, 피부 발진 등)이 있으면 즉시 중단하세요.`;
  }
  return `주요 성분 모두 안전 등급으로 분류되었습니다. 천연 단백질원 위주의 건강한 구성입니다. 다만 각 반려동물마다 체질이 다르므로 처음에는 소량씩 테스트하며 급여하는 것을 권장합니다.`;
}
