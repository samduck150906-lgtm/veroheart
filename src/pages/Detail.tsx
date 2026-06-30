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
import { toDryMatter, calculateCalories } from '../analysis/nutrition';
import { openCoupangForProduct } from '../utils/externalPurchase';
import BottomSheet from '../components/BottomSheet';
import FeedingGuideCalculator from '../components/FeedingGuideCalculator';
import ProductImageSlider from '../components/ProductImageSlider';
import { CAUTION_INGREDIENT, MEDICAL_DISCLAIMER, PRE_PURCHASE } from '../copy/ui';

const RISK_COLORS = { safe: '#15B36B', caution: '#E8A800', danger: '#F04452' };
const RISK_BG = { safe: '#E7F8F0', caution: '#FEF6E0', danger: '#FFF0ED' };
const RISK_LABEL = { safe: '안전', caution: '주의', danger: '위험' };

export default function Detail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, selectedProduct, profile, isLoggedIn, favorites, toggleFavorite, addToComparison, removeFromComparison, comparisonList, userId, trackRecentView } = useStore();

  const product = useMemo(() => {
    const found = id ? products.find(p => p.id === id) : null;
    return found || selectedProduct || products[0];
  }, [id, products, selectedProduct]);

  const [inCompare, setInCompare] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!product?.id) return;
    let active = true;
    getReviews(product.id)
      .then(data => { if (active) setReviews(data || []); })
      .catch(() => { /* noop */ });
    return () => { active = false; };
  }, [product?.id]);

  const handleScrollTop = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!userId) return;
    try {
      await deleteReview(reviewId, userId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (e) { /* noop */ }
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

  const isComparing = comparisonList.includes(product?.id || '');
  const verificationMeta = getVerificationMeta(product.verificationStatus);


  // 제품 칼로리 밀도 계산 (FeedingGuideCalculator 전달용)
  const productKcalPer100g = useMemo(() => {
    if (!product?.guaranteedAnalysis) return 0;
    return calculateCalories(product.guaranteedAnalysis).kcalPer100g;
  }, [product?.guaranteedAnalysis]);

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


      {/* CHANGED(Tailwind, #6→재배치 #5): 불릿 텍스트 → 아이콘 체크 카드 (스코어 다음) */}
      <div className="mb-4 bg-white rounded-[14px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <p className="text-[13px] font-semibold text-[#1A1A1A] mb-3">{PRE_PURCHASE.sectionTitle}</p>
        <div className="flex flex-col gap-2.5">
          {PRE_PURCHASE.checklist.map((text, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#EAFAF1] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-[#15B36B] font-bold">✓</span>
              </div>
              <p className="text-[13px] text-[#6B7684] leading-snug">{text}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#8B95A1] mt-3 pt-3 border-t border-[#EFEFEF]">{MEDICAL_DISCLAIMER.short}</p>
      </div>

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

        {/* Caution ingredients */}
        {cautionList.length > 0 && (
          <div style={{ background: '#FEF6E0', borderRadius: 14, padding: '14px', marginBottom: 14, border: '1px solid rgba(232,168,0,0.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#E8A800', marginBottom: 6 }}>⚠️ 주의 성분</div>
            <p style={{ fontSize: 13, color: '#4E5968', lineHeight: 1.5 }}>
              {cautionList.map(i => i.nameKo).join(', ')} 성분이 포함되어 있습니다.
            </p>
          </div>
        )}

        {/* Guaranteed Analysis */}
        {ga && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '14px', marginBottom: 14, boxShadow: '0 1px 4px rgba(30,41,59,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#191F28', marginBottom: 12 }}>등록 성분량</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: '단백질', value: ga.crudeProtein },
                { label: '지방', value: ga.crudeFat },
                { label: '섬유', value: ga.crudeFiber },
                { label: '수분', value: ga.moisture },
                { label: '칼슘', value: ga.calcium },
                { label: '인', value: ga.phosphorus },
              ].filter(n => n.value != null && n.value > 0).map(n => (
                <div key={n.label} style={{ textAlign: 'center', background: '#F7F4EE', borderRadius: 10, padding: '10px 6px' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#191F28' }}>{n.value}%</div>
                  <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginTop: 2 }}>{n.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price */}
        {product.price > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#191F28' }}>{product.price.toLocaleString()}원</span>
            <span style={{ fontSize: 13, color: '#8B95A1' }}>최저가 기준</span>
          </div>
        )}
      </section>
        </>
      )}


      {/* CHANGED(Tailwind, #10): 리뷰 빈 상태 → 일러스트 + 리뷰 작성 CTA */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[16px] font-bold text-[#1A1A1A]">리뷰</h3>
          {reviews.length > 0 && <span className="text-[13px] text-[#8B95A1]">{reviews.length}개</span>}
        </div>
        {reviews.length === 0 ? (
          <div className="bg-white rounded-[16px] p-6 text-center shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-1">아직 리뷰가 없어요</p>
            <p className="text-[13px] text-[#8B95A1] mb-4">이 사료를 드셔봤다면 첫 번째 리뷰를 남겨주세요!</p>
            <button
              type="button"
              onClick={() => navigate('/login', { state: { from: `/product/${product.id}` } })}
              className="w-full py-3 border-2 border-[#F5C842] rounded-[12px] text-[14px] font-bold text-[#F5C842]"
            >
              ✏️ 리뷰 작성하기
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map(review => {
              const tagMatch = review.content.match(/^#\s*(.+?)(\n\n|\n|$)/);
              const tags = tagMatch ? tagMatch[1].split(' · ').map(t => t.trim()).filter(Boolean) : [];
              const text = tagMatch ? review.content.slice(tagMatch[0].length).trim() : review.content;
              return (
                <div key={review.id} className="p-4 bg-white border border-[#EFEFEF] rounded-[16px]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex gap-0.5 mb-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} fill={s <= review.rating ? '#FCD34D' : 'none'} color={s <= review.rating ? '#FCD34D' : '#E5E8EB'} />
                        ))}
                      </div>
                      <div className="text-[12px] text-[#8B95A1]">{review.users?.nickname || '익명'} · {new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                    {review.user_id === userId && (
                      <button onClick={() => handleDeleteReview(review.id)} className="bg-transparent border-0 cursor-pointer text-[#D1D5DB]">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  {text ? <p className="text-[14px] text-[#374151] leading-relaxed m-0 mb-2.5">{text}</p> : null}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-[#F2F4F6] rounded-full text-[12px] font-bold text-[#374151]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
      {isDanger ? CAUTION_INGREDIENT.danger.badge : CAUTION_INGREDIENT.warning.badge}
    </div>
  );
}

function getVetComment(ingredients: Ingredient[]): string {
  const dangerCount = ingredients.filter(i => i.riskLevel === 'danger').length;
  const cautionCount = ingredients.filter(i => i.riskLevel === 'caution').length;
  if (dangerCount > 0) {
    return `${dangerCount}가지 주의 성분이 들어 있어요. ${CAUTION_INGREDIENT.danger.hint}`;
  }
  if (cautionCount > 0) {
    return `${cautionCount}가지 성분을 한 번 더 확인해보면 좋겠어요. ${CAUTION_INGREDIENT.warning.hint}`;
  }
  return `${CAUTION_INGREDIENT.safe.description} ${CAUTION_INGREDIENT.safe.hint}`;
}

/** 등록성분량(보증성분) 섹션 — 라벨 표기값 + 건물기준(DMB) 환산 + 추정 칼로리 */
function GuaranteedAnalysisSection({ ga }: { ga?: Product['guaranteedAnalysis'] }) {
  if (!ga) return null;

  const moisture = ga.moisture ?? 0;
  const rows: { label: string; value?: number; unit?: string; dmb?: boolean }[] = [
    { label: '조단백질', value: ga.crudeProtein, dmb: true },
    { label: '조지방', value: ga.crudeFat, dmb: true },
    { label: '조섬유', value: ga.crudeFiber, dmb: true },
    { label: '조회분', value: ga.crudeAsh, dmb: true },
    { label: '수분', value: ga.moisture },
    { label: '칼슘', value: ga.calcium, dmb: true },
    { label: '인', value: ga.phosphorus, dmb: true },
  ].filter((r) => r.value != null);

  if (rows.length === 0) return null;

  const cal = calculateCalories({
    crudeProtein: ga.crudeProtein,
    crudeFat: ga.crudeFat,
    crudeFiber: ga.crudeFiber,
    crudeAsh: ga.crudeAsh,
    moisture: ga.moisture,
  });

  return (
    <section style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)' }}>등록성분량 (보증성분)</h3>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>표기 기준 · 건물기준(DMB)</span>
      </div>

      <div style={{ border: '1px solid var(--border-color, #EEF0F3)', borderRadius: 'var(--border-radius-md, 14px)', overflow: 'hidden' }}>
        {rows.map((r, idx) => {
          const dmb = r.dmb && r.value != null ? toDryMatter(r.value, moisture) : null;
          return (
            <div
              key={r.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: idx % 2 === 0 ? 'var(--bg-color, #fff)' : 'rgba(0,0,0,0.015)',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' }}>{r.label}</span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <strong style={{ fontSize: '15px', color: 'var(--text-dark)' }}>{r.value}%</strong>
                {dmb != null && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    (건물기준 {dmb.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {cal.kcalPer100g > 0 && (
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '8px', lineHeight: 1.5 }}>
          추정 열량 약 <strong>{cal.kcalPer100g} kcal/100g</strong> · 단백 {cal.distribution.protein}% / 지방 {cal.distribution.fat}% / 탄수 {cal.distribution.carbs}%
          <br />
          습식·건식은 수분 차이가 커서 <strong>건물기준(DMB)</strong> 비교가 더 정확해요. 표기 함량만으로 원료별 실제 비율은 알 수 없어요.
        </p>
      )}
    </section>
  );
}
