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
import type { Ingredient } from '../types';
import { CORE_COPY } from '../copy/marketing';
import { notify } from '../store/useNotification';
import { TossButton, TossCard, TossSectionTitle } from '../components/TossUI';
import { openCoupangForProduct } from '../utils/externalPurchase';
import { COUPANG_PARTNERS_DISCLOSURE } from '../constants/coupangPartners';
import { buildProductConclusion } from '../utils/productConclusion';
import { REVIEW_QUICK_TAGS } from '../constants/reviewTags';

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
  const conclusion = product && report ? buildProductConclusion(product, profile, report) : null;
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

      {conclusion && (
        <section
          aria-label="맞춤 결론"
          style={{
            marginBottom: '20px',
            padding: '22px 20px',
            borderRadius: '22px',
            background:
              conclusion.tone === 'alert'
                ? 'linear-gradient(145deg, #FEF2F2 0%, #FFF 100%)'
                : conclusion.tone === 'match'
                  ? 'linear-gradient(145deg, #ECFDF5 0%, #FFF 100%)'
                  : 'linear-gradient(145deg, #FFFBEB 0%, #FFF 100%)',
            border:
              conclusion.tone === 'alert'
                ? '1px solid #FECACA'
                : conclusion.tone === 'match'
                  ? '1px solid #BBF7D0'
                  : '1px solid #FDE68A',
            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.06)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 900,
              color: '#0F172A',
              lineHeight: 1.35,
              letterSpacing: '-0.02em',
            }}
          >
            {conclusion.headline}
          </p>
          {conclusion.subline ? (
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#475569', lineHeight: 1.55 }}>
              {conclusion.subline}
            </p>
          ) : null}
        </section>
      )}

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

      <div style={{ position: 'relative', width: '100%', height: '320px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 16px 40px -12px rgb(0 0 0 / 0.12)' }}>
        <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', padding: '0 2px' }}>
            검수 <span style={{ color: verificationMeta.color }}>{verificationMeta.label}</span>
            {product.manufacturerName ? ` · ${product.manufacturerName}` : ''}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <TossButton
              onClick={() => toggleFavorite(product.id)}
              variant="outline"
              style={{ height: '56px', width: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Heart size={22} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : '#9CA3AF'} />
            </TossButton>
            <TossButton
              variant="outline"
              style={{ flex: 1, height: '56px', borderRadius: '16px' }}
              onClick={() => {
                if (isComparing) removeFromComparison(product.id);
                else addToComparison(product.id);
              }}
            >
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
          <p style={{ margin: 0, fontSize: '11px', color: '#94A3B8', lineHeight: 1.45, fontWeight: 600 }}>
            구매는 쿠팡에서 이어집니다.
          </p>
        </div>
      </TossCard>

      {/* 수의사 한마디 */}
      <div style={{ marginBottom: '32px', padding: '20px', background: '#F0FDF4', borderRadius: '20px', border: '1px solid #BBF7D0', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' }}>🩺</div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#065F46', marginBottom: '6px', letterSpacing: '0.02em' }}>한 줄 체크</div>
          <p style={{ fontSize: '14px', color: '#047857', lineHeight: 1.6, margin: 0 }}>
            {getVetComment(product.ingredients || [])}
          </p>
        </div>
      </div>

      {/* 정밀 분석 리포트 */}
      <TossCard style={{ marginBottom: '36px', background: '#FAFAF9', padding: '22px 20px', border: '1px solid #E7E5E4' }}>
        <TossSectionTitle
          title="맞춤 요약"
          right={<ShieldCheck size={18} color="#64748B" />}
          style={{ marginBottom: '16px' }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(report?.highlights ?? []).slice(0, 3).map((h, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: h.type === 'positive' ? '#ECFDF5' : h.type === 'negative' ? '#FEF2F2' : '#FFFBEB',
                color: h.type === 'positive' ? '#065F46' : h.type === 'negative' ? '#991B1B' : '#92400E',
                fontSize: '14px',
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {h.type === 'positive' ? <CheckCircle2 size={18} style={{ flexShrink: 0 }} /> : <AlertCircle size={18} style={{ flexShrink: 0 }} />}
              <span>{h.text}</span>
            </div>
          ))}
        </div>

        {report?.detailedAnalysis ? (
          <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#64748B', lineHeight: 1.6, fontWeight: 500 }}>
            {report.detailedAnalysis}
          </p>
        ) : null}
      </TossCard>

      {/* 전성분 분석 */}
      <div style={{ marginBottom: '6px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px' }}>성분</h2>
        <p style={{ margin: 0, fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>{product.ingredients?.length ?? 0}개</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '18px' }}>
        {product.ingredients?.map(ing => {
          const isAllergy = profile.allergies.some(a => 
            ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
          );
          const purposeShort = ing.purpose?.trim();
          return (
            <div key={ing.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 16px', borderRadius: '18px', background: isAllergy ? '#FEF2F2' : '#fff',
              border: isAllergy ? '1px solid #FECACA' : '1px solid #F1F5F9',
              boxShadow: isAllergy ? 'none' : '0 1px 3px rgba(0,0,0,0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', minWidth: 0 }}>
                <div style={{ 
                  width: '10px', height: '44px', borderRadius: '6px', backgroundColor: getRiskColor(ing.riskLevel), flexShrink: 0,
                }} aria-hidden />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '16px', color: '#0F172A', lineHeight: 1.35 }}>
                    {ing.nameKo}
                    {purposeShort ? (
                      <span style={{ fontWeight: 600, color: '#64748B' }}> ({purposeShort})</span>
                    ) : null}
                  </div>
                  {ing.nameEn ? (
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px', fontWeight: 500 }}>{ing.nameEn}</div>
                  ) : null}
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
