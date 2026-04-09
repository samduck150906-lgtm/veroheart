import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronUp,
  GitCompare,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Dog,
  Cat,
  Calendar,
  Layers,
  Star,
  Heart,
  MessageSquare,
  Trash2,
  Shield,
  ExternalLink
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import Analyzer from '../components/Analyzer';
import { getReviews, createReview, deleteReview } from '../lib/supabase';
import { CORE_COPY, UGC_COPY } from '../copy/marketing';
import { notify } from '../store/useNotification';
import { TossButton, TossCard, TossSectionTitle } from '../components/TossUI';
import { openCoupangForProduct } from '../utils/externalPurchase';

function getVerificationMeta(status?: 'pending' | 'verified' | 'needs_review') {
  if (status === 'verified') {
    return { label: '검수 완료', bg: '#DCFCE7', color: '#166534' };
  }
  if (status === 'needs_review') {
    return { label: '재검토 필요', bg: '#FEE2E2', color: '#991B1B' };
  }
  return { label: '검수 대기', bg: '#FEF3C7', color: '#92400E' };
}

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
    favorites,
    toggleFavorite,
    userId,
    trackRecentView
  } = useStore();

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFav = favorites.includes(id || '');

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
      trackRecentView(id);
      getReviews(id).then(setReviews);
    }
  }, [id, fetchProductDetail, trackRecentView]);

  const handleSubmitReview = async () => {
    if (!userId) { navigate('/login'); return; }
    if (!reviewContent.trim()) return;
    setIsSubmitting(true);
    const review = await createReview(userId, id!, reviewRating, reviewContent);
    if (review) {
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

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  const verificationMeta = getVerificationMeta(product.verificationStatus);

  const getRiskColor = (level: string) => {
    if (level === 'danger') return '#EF4444';
    if (level === 'caution') return '#F59E0B';
    return '#10B981';
  };

  return (
    <div className="animate-fade-in detail-page-root" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로로</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      <div className="detail-fab-stack" aria-label="빠른 이동 버튼">
        <button
          type="button"
          className="detail-back-fab"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={24} strokeWidth={2.25} aria-hidden />
        </button>
        <button
          type="button"
          className="detail-scroll-top-fab"
          onClick={handleScrollTop}
          aria-label="맨 위로 이동"
        >
          <ChevronUp size={22} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%', height: '360px', borderRadius: '28px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}>
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

        <div style={{ display: 'grid', gap: '8px', marginBottom: '18px' }}>
          {product.manufacturerName && (
            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
              제조사 <span style={{ color: '#0F172A', fontWeight: 800 }}>{product.manufacturerName}</span>
            </div>
          )}
          {product.verifiedAt && (
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
              최근 검수일 {new Date(product.verifiedAt).toLocaleDateString()}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '6px' }}>판매가</div>
            <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary-dark)' }}>{product.price.toLocaleString()}원</div>
          </div>
          <div className="ui-info-card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8A9099', fontWeight: 700, marginBottom: '6px' }}>리뷰 평점</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 900, fontSize: '22px' }}>
              <span style={{ color: '#FCD34D' }}>★</span>
              {product.averageRating}
              <span style={{ color: '#9CA3AF', fontSize: '13px', fontWeight: 700 }}>({product.reviewsCount})</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '16px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Shield size={16} color="#0F172A" />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>데이터 신뢰 원칙</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
              베로로는 크롤링보다 사람 검수 비중을 높여 제품 정보를 다룹니다. AI는 추천과 해석을 돕지만,
              제조사/성분에 대한 검토와 카탈로그 검증은 운영자가 계속 보완합니다.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.6, fontWeight: 600 }}>
              현재 이 제품 상태: <strong>{verificationMeta.label}</strong>
              {product.manufacturerName ? ` · 제조사 ${product.manufacturerName}` : ''}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <TossButton
              onClick={() => toggleFavorite(product.id)}
              variant="outline"
              style={{ height: '56px', width: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Heart size={22} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : '#9CA3AF'} />
            </TossButton>
            <TossButton variant="outline" style={{ flex: 1, height: '56px', borderRadius: '16px' }} onClick={() => {
              isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
            }}>
              <GitCompare size={20} />
              <span style={{ marginLeft: '8px' }}>{isComparing ? '비교 해제' : '비교 추가'}</span>
            </TossButton>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <TossButton
              variant="outline"
              style={{ flex: 1, height: '56px', borderRadius: '16px', fontWeight: 800, fontSize: '15px' }}
              onClick={() => {
                addToCart(product.id, 1);
                notify.success('장바구니에 담았어요.');
              }}
            >
              장바구니 담기
            </TossButton>
            <TossButton
              style={{ flex: 1, backgroundColor: '#111827', color: '#fff', borderRadius: '16px', fontWeight: 800, fontSize: '15px', gap: '6px' }}
              onClick={() => {
                addToCart(product.id, 1);
                navigate('/checkout');
              }}
            >
              바로 구매
            </TossButton>
          </div>
          <TossButton
            variant="soft"
            style={{ height: '54px', borderRadius: '16px', fontWeight: 800, fontSize: '15px' }}
            onClick={() => {
              openCoupangForProduct(product);
            }}
          >
            <ExternalLink size={18} />
            쿠팡 앱에서 이어서 보기
          </TossButton>
          <p style={{ margin: 0, fontSize: '11px', color: '#64748B', lineHeight: 1.5, fontWeight: 600 }}>
            베로로에서 분석·추천한 뒤 구매는 외부 쇼핑앱으로 연결됩니다.
            {product.coupangProductId
              ? ' 등록된 쿠팡 상품으로 바로 연결을 시도합니다.'
              : ' 앱이 없거나 상품 연결 정보가 없으면 웹 검색으로 이동합니다.'}
          </p>
        </div>
      </TossCard>

      {/* 수의사 한마디 */}
      <div style={{ marginBottom: '32px', padding: '20px', background: '#F0FDF4', borderRadius: '20px', border: '1px solid #BBF7D0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>🩺</div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>수의사 전문가 코멘트</div>
          <p style={{ fontSize: '14px', color: '#047857', lineHeight: 1.6, margin: 0 }}>
            {getVetComment(product.ingredients || [])}
          </p>
        </div>
      </div>

      {/* 정밀 분석 리포트 */}
      <TossCard style={{ marginBottom: '40px', background: '#FFFEF7', padding: '24px' }}>
        <TossSectionTitle
          title={`${profile.name} 맞춤 분석 리포트`}
          right={<ShieldCheck size={20} color="#1D4ED8" />}
          style={{ marginBottom: '20px' }}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {report?.highlights.map((h, i) => (
            <div key={i} style={{ 
              display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '16px', borderRadius: '16px',
              backgroundColor: h.type === 'positive' ? '#ECFDF5' : (h.type === 'negative' ? '#FEF2F2' : '#FFFBEB'),
              color: h.type === 'positive' ? '#065F46' : (h.type === 'negative' ? '#991B1B' : '#92400E'),
              fontSize: '14px', fontWeight: 600, lineHeight: 1.5
            }}>
              {h.type === 'positive' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              {h.text}
            </div>
          ))}
        </div>
        
        <p style={{ marginTop: '20px', fontSize: '15px', color: '#4B5563', lineHeight: 1.7, padding: '0 8px' }}>
          {report?.detailedAnalysis}
        </p>
        <div
          style={{
            marginTop: '18px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            fontSize: '12px',
            lineHeight: 1.6,
            color: '#1E3A8A',
            fontWeight: 600,
          }}
        >
          이 분석은 현재 구축된 성분 사전과 상품 메타데이터를 바탕으로 생성됩니다. 최종 급여 판단은 반려동물 상태,
          제조사 정보, 원재료 공개 수준을 함께 보고 결정하는 것이 안전합니다.
        </div>
      </TossCard>

      {/* 전성분 분석 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 900 }}>전성분 분석</h2>
        <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>성분 개수: {product.ingredients?.length}개</div>
      </div>
      <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '20px', lineHeight: 1.5 }}>{CORE_COPY.thorough}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {product.ingredients?.map(ing => {
          const isAllergy = profile.allergies.some(a => 
            ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
          );
          return (
            <div key={ing.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '20px', background: isAllergy ? '#FEF2F2' : '#fff',
              border: isAllergy ? '1px solid #FECACA' : '1px solid #F1F5F9',
              boxShadow: isAllergy ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  width: '44px', height: '44px', borderRadius: '14px', background: `${getRiskColor(ing.riskLevel)}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: getRiskColor(ing.riskLevel) }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: '#1F2937' }}>
                    {ing.nameKo} <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 400 }}>{ing.nameEn}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px', fontWeight: 500 }}>{ing.purpose}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                {isAllergy && (
                  <div
                    title={CORE_COPY.allergyAlert}
                    style={{ background: '#EF4444', color: '#fff', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 900, maxWidth: '120px', textAlign: 'center', lineHeight: 1.25 }}
                  >
                    알레르기 주의보
                  </div>
                )}
                <VetBadge riskLevel={ing.riskLevel} />
              </div>
            </div>
          );
        })}
      </div>

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
        <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={20} /> 사용 후기 ({reviews.length})
        </h2>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.55, marginBottom: '18px', fontWeight: 600 }}>
          {UGC_COPY.honestReviews}
        </p>
        <p style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '16px', lineHeight: 1.45 }}>
          {UGC_COPY.allergyList} · {UGC_COPY.settleDown}
        </p>

        {/* 리뷰 작성 */}
        <div style={{ background: '#F9FAFB', borderRadius: '20px', padding: '20px', marginBottom: '24px', border: '1px solid #F3F4F6' }}>
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
            placeholder={userId ? `솔직한 후기를 남겨주세요. (${UGC_COPY.palatability})` : '로그인 후 리뷰를 작성할 수 있어요.'}
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

      <Analyzer />
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

function getVetComment(ingredients: any[]): string {
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
