import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
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
  ChevronRight,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { generateAnalysisReport } from '../utils/analysis';
import Analyzer from '../components/Analyzer';
import { getReviews, createReview, deleteReview } from '../lib/supabase';
import { CORE_COPY, UGC_COPY } from '../copy/marketing';
import { notify } from '../store/useNotification';

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

  if (isLoadingProducts) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '16px',
      }}>
        <Loader2 size={36} color="var(--primary)" style={{ animation: 'spin 0.85s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>제품 정보를 불러오는 중...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!product) return (
    <div style={{ textAlign: 'center', padding: '80px 24px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>제품을 찾을 수 없습니다.</p>
      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '16px', padding: '12px 24px', background: 'var(--primary)',
          color: '#fff', border: 'none', borderRadius: '12px',
          fontWeight: 700, cursor: 'pointer',
        }}
      >
        홈으로 이동
      </button>
    </div>
  );

  const report = product ? generateAnalysisReport(product, profile) : null;
  const isComparing = comparisonList.includes(product?.id || '');

  const getRiskColor = (level: string) => {
    if (level === 'danger') return '#EF4444';
    if (level === 'caution') return '#F59E0B';
    return '#10B981';
  };

  const getRiskBg = (level: string) => {
    if (level === 'danger') return 'rgba(239, 68, 68, 0.08)';
    if (level === 'caution') return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(16, 185, 129, 0.08)';
  };

  const getRiskLabel = (level: string) => {
    if (level === 'danger') return '주의';
    if (level === 'caution') return '확인';
    return '안전';
  };

  const dangerCount = product.ingredients?.filter(i => i.riskLevel === 'danger').length || 0;
  const cautionCount = product.ingredients?.filter(i => i.riskLevel === 'caution').length || 0;
  const safeCount = product.ingredients?.filter(i => i.riskLevel === 'safe').length || 0;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <Helmet>
        <title>{product.name} - 베로로</title>
        <meta name="description" content={`${product.brand}의 ${product.name} 전성분 분석 결과 및 구매`} />
      </Helmet>

      {/* Hero Image */}
      <div style={{
        position: 'relative', width: '100%', height: '320px',
        borderRadius: '24px', overflow: 'hidden', marginBottom: '24px',
        boxShadow: '0 16px 32px rgba(0,0,0,0.12)',
      }}>
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '140px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
        }} />

        {/* Score overlay */}
        {report && (
          <div style={{
            position: 'absolute', bottom: '16px', left: '16px', right: '16px',
            background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)',
            padding: '14px 18px', borderRadius: '18px',
            display: 'flex', alignItems: 'center', gap: '16px',
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
              background: report.score >= 80 ? '#10B981' : (report.score >= 60 ? '#F59E0B' : '#EF4444'),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: '18px', fontWeight: 900,
              boxShadow: `0 4px 12px ${report.score >= 80 ? 'rgba(16,185,129,0.4)' : report.score >= 60 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.4)'}`,
            }}>
              {report.score}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#1F2937' }}>{report.summary}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                전성분 {product.ingredients?.length}개 정밀 분석 완료
              </div>
            </div>
            {/* Mini ingredient stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
              {dangerCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444' }}>⚠ {dangerCount}위험</span>
              )}
              {cautionCount > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B' }}>👁 {cautionCount}확인</span>
              )}
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>✓ {safeCount}안전</span>
            </div>
          </div>
        )}
      </div>

      {/* Brand + Title */}
      <div style={{ marginBottom: '6px', fontSize: '13px', color: 'var(--text-light)', fontWeight: 600 }}>
        {product.brand}
      </div>
      <h1 style={{ fontSize: '22px', lineHeight: 1.35, marginBottom: '14px', fontWeight: 900, color: 'var(--text-dark)' }}>
        {product.name}
      </h1>

      {/* Metadata Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {product.targetPetType && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#F3F4F6', padding: '6px 12px',
            borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#4B5563',
          }}>
            {product.targetPetType === 'dog' ? <Dog size={13} /> : (product.targetPetType === 'cat' ? <Cat size={13} /> : <Layers size={13} />)}
            {product.targetPetType === 'dog' ? '강아지용' : (product.targetPetType === 'cat' ? '고양이용' : '공용')}
          </span>
        )}
        {product.targetLifeStage && product.targetLifeStage.length > 0 && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#F3F4F6', padding: '6px 12px',
            borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#4B5563',
          }}>
            <Calendar size={13} />
            {product.targetLifeStage.join(', ')}
          </span>
        )}
        {product.formulation && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#F3F4F6', padding: '6px 12px',
            borderRadius: '999px', fontSize: '12px', fontWeight: 700, color: '#4B5563',
          }}>
            <Layers size={13} />
            {product.formulation}
          </span>
        )}
      </div>

      {/* Price + Rating */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', padding: '16px 20px', borderRadius: '16px',
        background: 'var(--surface-elevated)', border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--primary-dark)' }}>
          {product.price.toLocaleString()}
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>원</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={14} fill={s <= Math.round(product.averageRating) ? '#FCD34D' : 'none'} color={s <= Math.round(product.averageRating) ? '#FCD34D' : '#E5E7EB'} />
            ))}
          </div>
          <span style={{ fontWeight: 700, fontSize: '14px' }}>{product.averageRating}</span>
          <span style={{ color: 'var(--text-light)', fontSize: '13px' }}>({product.reviewsCount})</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => toggleFavorite(product.id)}
            style={{
              width: '52px', height: '52px', borderRadius: '14px',
              border: '1.5px solid',
              borderColor: isFav ? 'rgba(239,68,68,0.3)' : '#E5E7EB',
              background: isFav ? 'rgba(239,68,68,0.08)' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
              transition: 'all var(--transition-bounce)',
            }}
            aria-label={isFav ? '찜 해제' : '찜하기'}
          >
            <Heart
              size={20}
              fill={isFav ? '#EF4444' : 'none'}
              color={isFav ? '#EF4444' : '#9CA3AF'}
              style={{ transition: 'transform var(--transition-bounce)' }}
            />
          </button>
          <button
            style={{
              flex: 1, height: '52px', borderRadius: '14px',
              border: `1.5px solid ${isComparing ? 'var(--primary)' : '#E5E7EB'}`,
              background: isComparing ? 'rgba(255,107,74,0.08)' : '#fff',
              color: isComparing ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => {
              isComparing ? removeFromComparison(product.id) : addToComparison(product.id);
            }}
          >
            <GitCompare size={18} />
            {isComparing ? '비교 중' : '비교하기'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            style={{
              flex: 1, height: '52px', borderRadius: '14px',
              border: '1.5px solid #E5E7EB',
              background: '#fff', color: 'var(--text-dark)',
              fontWeight: 700, fontSize: '15px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => {
              addToCart(product.id, 1);
              notify.success('장바구니에 담았어요.');
            }}
          >
            <ShoppingBag size={18} />
            장바구니
          </button>
          <button
            type="button"
            style={{
              flex: 1, height: '52px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #111827, #374151)',
              color: '#fff', fontWeight: 800, fontSize: '15px',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              transition: 'all var(--transition-fast)',
            }}
            onClick={() => {
              addToCart(product.id, 1);
              navigate('/checkout');
            }}
          >
            <Zap size={18} />
            바로 구매
          </button>
        </div>
      </div>

      {/* 수의사 한마디 */}
      <div style={{
        marginBottom: '28px', padding: '18px',
        background: '#F0FDF4', borderRadius: '20px',
        border: '1px solid #BBF7D0', display: 'flex', gap: '14px', alignItems: 'flex-start',
      }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: '#10B981', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, fontSize: '18px',
          boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
        }}>🩺</div>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
            수의사 전문가 코멘트
          </div>
          <p style={{ fontSize: '14px', color: '#047857', lineHeight: 1.6, margin: 0 }}>
            {getVetComment(product.ingredients || [])}
          </p>
        </div>
      </div>

      {/* 정밀 분석 리포트 */}
      <section style={{
        marginBottom: '32px', background: '#F8FAFC',
        padding: '22px', borderRadius: '24px', border: '1px solid #E2E8F0',
      }}>
        <h2 style={{
          fontSize: '17px', fontWeight: 800, marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark)',
        }}>
          <ShieldCheck size={20} color="#3B82F6" /> {profile.name} 맞춤 분석 리포트
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {report?.highlights.map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '14px 16px',
              borderRadius: '14px',
              backgroundColor: h.type === 'positive' ? '#ECFDF5' : (h.type === 'negative' ? '#FEF2F2' : '#FFFBEB'),
              color: h.type === 'positive' ? '#065F46' : (h.type === 'negative' ? '#991B1B' : '#92400E'),
              fontSize: '14px', fontWeight: 600, lineHeight: 1.5,
              border: `1px solid ${h.type === 'positive' ? '#BBF7D0' : h.type === 'negative' ? '#FECACA' : '#FDE68A'}`,
            }}>
              {h.type === 'positive'
                ? <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                : <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
              }
              {h.text}
            </div>
          ))}
        </div>

        <p style={{ marginTop: '18px', fontSize: '14px', color: '#4B5563', lineHeight: 1.7 }}>
          {report?.detailedAnalysis}
        </p>
      </section>

      {/* 성분 요약 바 */}
      {product.ingredients && product.ingredients.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-dark)' }}>전성분 분석</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{product.ingredients.length}개 성분</span>
          </div>

          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: '4px', height: '10px', borderRadius: '999px',
            overflow: 'hidden', marginBottom: '10px',
          }}>
            {safeCount > 0 && (
              <div style={{
                flex: safeCount, background: '#10B981',
                transition: 'flex 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            )}
            {cautionCount > 0 && (
              <div style={{
                flex: cautionCount, background: '#F59E0B',
                transition: 'flex 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            )}
            {dangerCount > 0 && (
              <div style={{
                flex: dangerCount, background: '#EF4444',
                transition: 'flex 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              안전 {safeCount}
            </span>
            {cautionCount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
                확인 {cautionCount}
              </span>
            )}
            {dangerCount > 0 && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                주의 {dangerCount}
              </span>
            )}
          </div>

          <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '16px', lineHeight: 1.5 }}>
            {CORE_COPY.thorough}
          </p>

          {/* Ingredient list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {product.ingredients?.map(ing => {
              const isAllergy = profile.allergies.some(a =>
                ing.nameKo.includes(a) || (ing.nameEn && ing.nameEn.toLowerCase().includes(a.toLowerCase()))
              );
              return (
                <div key={ing.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '16px',
                  background: isAllergy ? '#FEF2F2' : '#fff',
                  border: `1px solid ${isAllergy ? '#FECACA' : '#F1F5F9'}`,
                  boxShadow: isAllergy ? 'none' : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'box-shadow var(--transition-fast)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: getRiskBg(ing.riskLevel),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div style={{
                        width: '11px', height: '11px', borderRadius: '50%',
                        backgroundColor: getRiskColor(ing.riskLevel),
                      }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#1F2937' }}>
                        {ing.nameKo}{' '}
                        <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 400 }}>{ing.nameEn}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '1px', fontWeight: 500 }}>
                        {ing.purpose}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {isAllergy && (
                      <div style={{
                        background: '#EF4444', color: '#fff',
                        padding: '4px 10px', borderRadius: '999px',
                        fontSize: '10px', fontWeight: 900, whiteSpace: 'nowrap',
                      }}>
                        알레르기 ⚠
                      </div>
                    )}
                    <VetBadge riskLevel={ing.riskLevel} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 브랜드 바로가기 */}
      <div style={{ marginBottom: '28px' }}>
        <Link
          to={`/brand/${encodeURIComponent(product.brand)}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', background: 'var(--surface-elevated)',
            borderRadius: '16px', textDecoration: 'none', color: '#111827',
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: 'var(--shadow-sm)',
            transition: 'box-shadow var(--transition-fast)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>
              브랜드 제품 탐색
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{product.brand}의 다른 제품 보기</div>
          </div>
          <ChevronRight size={18} color="#9CA3AF" />
        </Link>
      </div>

      {/* 리뷰 섹션 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{
          fontSize: '18px', fontWeight: 900, marginBottom: '8px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <MessageSquare size={19} color="var(--primary)" /> 사용 후기
          <span style={{
            fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
            background: '#F3F4F6', padding: '2px 10px', borderRadius: '999px',
          }}>
            {reviews.length}
          </span>
        </h2>
        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, marginBottom: '16px', fontWeight: 500 }}>
          {UGC_COPY.honestReviews}
        </p>

        {/* 리뷰 작성 */}
        <div style={{
          background: '#F9FAFB', borderRadius: '20px', padding: '18px',
          marginBottom: '20px', border: '1px solid #F3F4F6',
        }}>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setReviewRating(star)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
              >
                <Star
                  size={24}
                  fill={star <= reviewRating ? '#FCD34D' : 'none'}
                  color={star <= reviewRating ? '#FCD34D' : '#D1D5DB'}
                  style={{ transition: 'transform var(--transition-bounce)' }}
                />
              </button>
            ))}
          </div>
          <textarea
            value={reviewContent}
            onChange={e => setReviewContent(e.target.value)}
            placeholder={userId
              ? `솔직한 후기를 남겨주세요. (${UGC_COPY.palatability})`
              : '로그인 후 리뷰를 작성할 수 있어요.'
            }
            disabled={!userId}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              border: '1.5px solid #E5E7EB', fontSize: '14px', outline: 'none',
              resize: 'none', height: '80px', boxSizing: 'border-box',
              background: userId ? '#fff' : '#F3F4F6',
              fontFamily: 'inherit', lineHeight: 1.6,
              transition: 'border-color var(--transition-fast)',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            {userId ? (
              <button
                onClick={handleSubmitReview}
                disabled={isSubmitting || !reviewContent.trim()}
                style={{
                  padding: '12px 24px',
                  background: isSubmitting || !reviewContent.trim()
                    ? '#E5E7EB'
                    : 'linear-gradient(135deg, #111827, #374151)',
                  color: isSubmitting || !reviewContent.trim() ? '#9CA3AF' : '#fff',
                  borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                  border: 'none', cursor: isSubmitting || !reviewContent.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {isSubmitting ? '등록 중...' : '리뷰 등록'}
              </button>
            ) : (
              <Link
                to="/login"
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #111827, #374151)',
                  color: '#fff', borderRadius: '12px',
                  fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                }}
              >
                로그인하고 리뷰 쓰기
              </Link>
            )}
          </div>
        </div>

        {/* 리뷰 목록 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reviews.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 20px',
              color: '#9CA3AF', background: '#F9FAFB', borderRadius: '16px',
            }}>
              <MessageSquare size={32} color="#E5E7EB" style={{ margin: '0 auto 10px', display: 'block' }} />
              아직 리뷰가 없습니다. 첫 리뷰를 작성해보세요!
            </div>
          ) : reviews.map(review => (
            <div key={review.id} style={{
              padding: '16px', background: '#fff',
              border: '1px solid #F3F4F6', borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: '10px',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={13} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : '#E5E7EB'} />
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 500 }}>
                    {review.users?.email?.split('@')[0] || '익명'} · {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
                {review.user_id === userId && (
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#D1D5DB', padding: '4px', borderRadius: '8px',
                      transition: 'color var(--transition-fast)',
                    }}
                    aria-label="리뷰 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.65, margin: 0 }}>
                {review.content}
              </p>
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
    <div style={{
      fontSize: '10px', fontWeight: 700, padding: '3px 8px',
      borderRadius: '8px',
      background: isDanger ? '#FEF2F2' : '#FFFBEB',
      color: isDanger ? '#991B1B' : '#92400E',
      border: `1px solid ${isDanger ? '#FECACA' : '#FDE68A'}`,
      whiteSpace: 'nowrap',
    }}>
      {isDanger ? '⚠️ 주의' : '👁 확인'}
    </div>
  );
}

function getVetComment(ingredients: any[]): string {
  const dangerCount = ingredients.filter(i => i.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter(i => i.riskLevel === 'caution').length;
  if (dangerCount > 0) {
    return `이 제품에는 ${dangerCount}개의 주의 성분이 포함되어 있습니다. BHA, BHT, 에톡시퀸 등 합성 보존료나 인공색소는 장기 섭취 시 간 부담을 줄 수 있으며, 알레르기 반응이 있는 반려동물에게 특히 주의가 필요합니다. 급여 전 수의사와 상담하세요.`;
  }
  if (cautionCount > 0) {
    return `전반적으로 안전한 성분 구성이나 ${cautionCount}개 성분은 개체에 따라 반응이 다를 수 있습니다. 처음 급여 시 소량부터 시작하고 이상 반응(구토, 설사, 피부 발진 등)이 있으면 즉시 중단하세요.`;
  }
  return `주요 성분 모두 안전 등급으로 분류되었습니다. 천연 단백질원 위주의 건강한 구성입니다. 다만 각 반려동물마다 체질이 다르므로 처음에는 소량씩 테스트하며 급여하는 것을 권장합니다.`;
}
