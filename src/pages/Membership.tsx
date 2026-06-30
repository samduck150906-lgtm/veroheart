// @ts-nocheck
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Lock, Crown, Zap, ChevronLeft, Star } from 'lucide-react';
import { useStore } from '../store/useStore';

const TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '무료',
    color: '#6B7684',
    bg: '#F9FAFB',
    border: '#E5E8EB',
    desc: '기본 성분 분석과 추천을 무료로 이용하세요.',
    features: [
      { text: '반려동물 프로필 1개', included: true },
      { text: '기본 성분 분석 (월 3회)', included: true },
      { text: '상품 랭킹 · 검색', included: true },
      { text: '무제한 성분 분석', included: false },
      { text: '상세 영양 리포트', included: false },
      { text: '유해 성분 즉시 알림', included: false },
      { text: '분석 히스토리 보관', included: false },
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 4900,
    priceLabel: '월 4,900원',
    yearlyPrice: 39000,
    yearlyLabel: '연 39,000원 (월 3,250원)',
    color: '#3B82F6',
    bg: '#EFF6FF',
    border: '#3B82F6',
    badge: '인기',
    desc: '성분 분석을 제한 없이, 더 깊게 활용하세요.',
    features: [
      { text: '반려동물 프로필 3개', included: true },
      { text: '무제한 성분 분석', included: true },
      { text: '상품 랭킹 · 검색', included: true },
      { text: '상세 영양 리포트', included: true },
      { text: '유해 성분 즉시 알림', included: true },
      { text: '분석 히스토리 보관', included: true },
      { text: '신상품 선출시 알림', included: true },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9900,
    priceLabel: '월 9,900원',
    yearlyPrice: 79000,
    yearlyLabel: '연 79,000원 (월 6,583원)',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#7C3AED',
    badge: '최고',
    desc: '전문가 수준의 영양 분석을 모두 누리세요.',
    features: [
      { text: '반려동물 프로필 무제한', included: true },
      { text: '무제한 성분 분석', included: true },
      { text: '상품 랭킹 · 검색', included: true },
      { text: '상세 영양 리포트', included: true },
      { text: '유해 성분 즉시 알림', included: true },
      { text: '분석 히스토리 보관', included: true },
      { text: '신상품 선출시 알림', included: true },
    ],
  },
];

export default function Membership() {
  const navigate = useNavigate();
  const { isLoggedIn, membershipTier = 'free' } = useStore();

  const handleSubscribe = (tier: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    // 결제 연동 준비 중 안내
    alert(`${tier === 'plus' ? 'Plus' : 'Pro'} 구독 결제 기능이 곧 열립니다!\n사전 신청 문의: hello@veroro.co.kr`);
  };

  return (
    <div style={{ paddingBottom: 100 }}>
      <Helmet><title>멤버십 — 베로로</title></Helmet>

      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0 16px' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color="var(--ink)" />
        </button>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>베로로 멤버십</div>
          <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 500, marginTop: 1 }}>우리 아이에게 딱 맞는 플랜을 선택하세요</div>
        </div>
      </div>

      {/* 현재 티어 표시 */}
      {isLoggedIn && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 12,
          background: 'var(--brand-tint-2)', marginBottom: 20,
        }}>
          <Crown size={15} color="var(--brand-deep)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            현재 플랜: <strong style={{ color: 'var(--brand-deep)' }}>
              {membershipTier === 'pro' ? 'Pro' : membershipTier === 'plus' ? 'Plus' : 'Free'}
            </strong>
          </span>
        </div>
      )}

      {/* 티어 카드 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {TIERS.map((tier) => {
          const isCurrentTier = membershipTier === tier.id;
          return (
            <div
              key={tier.id}
              style={{
                borderRadius: 18,
                border: `2px solid ${isCurrentTier ? tier.color : tier.border}`,
                background: isCurrentTier ? tier.bg : 'var(--surface)',
                padding: '20px 18px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {tier.badge && (
                <span style={{
                  position: 'absolute', top: 14, right: 14,
                  padding: '3px 10px', borderRadius: 99,
                  background: tier.color, color: '#fff',
                  fontSize: 11, fontWeight: 800,
                }}>{tier.badge}</span>
              )}

              {isCurrentTier && (
                <span style={{
                  position: 'absolute', top: 14, right: tier.badge ? 60 : 14,
                  padding: '3px 10px', borderRadius: 99,
                  background: tier.color, color: '#fff',
                  fontSize: 11, fontWeight: 800,
                }}>현재 플랜</span>
              )}

              {/* 티어 헤더 */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                  {tier.id === 'pro' && <Crown size={16} color={tier.color} />}
                  {tier.id === 'plus' && <Zap size={16} color={tier.color} />}
                  {tier.id === 'free' && <Star size={16} color={tier.color} />}
                  <span style={{ fontSize: 18, fontWeight: 900, color: tier.color }}>{tier.name}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                  {tier.priceLabel}
                </div>
                {tier.yearlyLabel && (
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600 }}>
                    또는 {tier.yearlyLabel} 절약
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6 }}>{tier.desc}</div>
              </div>

              {/* 기능 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {tier.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {f.included
                      ? <Check size={15} color={tier.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      : <Lock size={13} color="#D1D5DB" strokeWidth={2} style={{ flexShrink: 0 }} />
                    }
                    <span style={{
                      fontSize: 13.5, fontWeight: f.included ? 600 : 400,
                      color: f.included ? 'var(--ink)' : '#8B95A1',
                      textDecoration: f.included ? 'none' : 'none',
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* CTA 버튼 */}
              {tier.id === 'free' ? (
                <div style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: 'var(--fill)', textAlign: 'center',
                  fontSize: 14, fontWeight: 700, color: 'var(--ink-faint)',
                }}>현재 플랜</div>
              ) : isCurrentTier ? (
                <div style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: tier.bg, border: `1px solid ${tier.border}`,
                  textAlign: 'center', fontSize: 14, fontWeight: 700, color: tier.color,
                }}>이용 중</div>
              ) : (
                <button
                  onClick={() => handleSubscribe(tier.id)}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 12,
                    background: tier.color, border: 'none', cursor: 'pointer',
                    fontSize: 15, fontWeight: 800, color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {tier.name} 시작하기
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 환불 정책 안내 */}
      <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 12, background: 'var(--fill)' }}>
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.6, margin: 0 }}>
          • 구독은 언제든지 취소할 수 있으며, 취소 후에도 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.<br />
          • 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.<br />
          • 문의: <a href="mailto:hello@veroro.co.kr" style={{ color: 'var(--brand-deep)', fontWeight: 600 }}>hello@veroro.co.kr</a>
        </p>
      </div>
    </div>
  );
}
