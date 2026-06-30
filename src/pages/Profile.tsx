// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Heart, Crown } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import ProductImage from '../components/ProductImage';
import { getRecommendationBreakdown, gradeFromScore } from '../utils/score';
import { FAVORITES_EMPTY } from '../copy/ui';

const TABS = ['찜', '구매내역', '분석리포트'] as const;
type Tab = (typeof TABS)[number];

const TAB_PARAM_MAP: Record<string, Tab> = {
  favorites: '찜',
  orders: '구매내역',
  reports: '분석리포트',
};

const GRADE_COLOR: Record<string, string> = { A: '#15B36B', B: '#6BB04E', C: '#E8A800', D: '#F04452', F: '#8B95A1' };
const GRADE_BG: Record<string, string> = { A: '#ECFDF5', B: '#F0FDE8', C: '#FFFBEB', D: '#FFF1F2', F: '#F2F4F6' };

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '결제 대기',
  paid: '결제 완료',
  completed: '배송 완료',
  cancelled: '취소됨',
  failed: '결제 실패',
};

function ScoreCircle({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0, marginLeft: 'auto' }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6" />
        <circle cx="40" cy="40" r="36" fill="none" stroke="#fff" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>/ 100</span>
      </div>
    </div>
  );
}

export default function Profile() {
  const {
    isLoggedIn,
    profile,
    signOut,
    favorites,
    products,
    orders,
    reports,
    membershipTier,
    fetchOrders,
    fetchReports,
  } = useStore();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<Tab>('찜');

  useEffect(() => {
    if (tabParam && TAB_PARAM_MAP[tabParam]) {
      setActiveTab(TAB_PARAM_MAP[tabParam]);
    }
  }, [tabParam]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchOrders?.();
      fetchReports?.();
    }
  }, [isLoggedIn, fetchOrders, fetchReports]);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';

  const healthScore = useMemo(() => {
    let s = 92;
    s -= (profile?.allergies?.length || 0) * 4;
    s -= (profile?.healthConcerns?.length || 0) * 2;
    return Math.max(60, Math.min(98, s));
  }, [profile]);

  useEffect(() => {
    if (!userId) return;
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchOrders, fetchReports, userId]);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const petName = hasPetProfile ? profile.name : '내 반려동물';
  const speciesLabel = profile?.breed || (profile?.species === 'Cat' ? '고양이' : '강아지');
  const isPremium = membershipTier && membershipTier !== 'free';

  return (
    <div style={{ paddingBottom: 90 }}>
      <Helmet><title>마이펫 · 베로로</title></Helmet>

      {/* Top Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #F5C518 0%, #CA8A04 100%)',
        padding: '52px 20px 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {profile?.species === 'Cat' ? '🐱' : '🐶'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
                {petName}
              </span>
              {isPremium && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(255,255,255,0.92)', color: '#A16207', borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 800 }}>
                  <Crown size={11} /> {String(membershipTier).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              {speciesLabel}
              {profile?.age ? ` · ${profile.age}살` : ''}
              {profile?.weightKg ? ` · ${profile.weightKg}kg` : ''}
            </div>
          </div>
          <ScoreCircle score={healthScore} />
        </div>

        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginBottom: 6 }}>
          식단 건강 점수 · {healthScore}점
        </div>

        {hasPetProfile ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {profile?.allergies?.map(a => (
              <span key={a} style={{ background: '#F04452', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>⚠️ {a} 알러지</span>
            ))}
            {profile?.healthConcerns?.slice(0, 3).map(h => (
              <span key={h} style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{h}</span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
            {isLoggedIn ? '펫 정보를 등록해보세요' : '로그인 후 펫 정보를 등록해보세요'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(isLoggedIn ? '/pet-profile' : '/login')}
          style={{
            flex: 1, height: 46, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: '#F5C518', fontSize: 14, fontWeight: 700, color: '#191F28',
          }}
        >
          {hasPetProfile ? '정보 수정하기' : (isLoggedIn ? '펫 등록하기' : '로그인하기')}
        </button>
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            style={{
              height: 46, padding: '0 20px', borderRadius: 12,
              border: '1.5px solid #E5E8EB', cursor: 'pointer',
              background: '#fff', fontSize: 14, fontWeight: 600, color: '#6B7684',
            }}
          >
            로그아웃
          </button>
        )}
      </div>

      {/* Pet Info Card */}
      {hasPetProfile && (
        <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 18, padding: 20, boxShadow: '0 1px 8px rgba(30,41,59,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 14, letterSpacing: '-0.02em' }}>🐾 펫 정보</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: '이름', value: profile.name },
              { label: '종류', value: profile.species === 'Cat' ? '고양이' : '강아지' },
              { label: '품종', value: profile.breed || '-' },
              { label: '나이', value: profile.age ? `${profile.age}살` : '-' },
              { label: '체중', value: profile.weightKg ? `${profile.weightKg}kg` : '-' },
              { label: '성별', value: profile.gender || '-' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#F7F4EE', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#8B95A1', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ margin: '16px 0 0', borderBottom: '1px solid #EAEDF0' }}>
        <div style={{ display: 'flex', padding: '0 16px' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, height: 44, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === tab ? 800 : 600,
                color: activeTab === tab ? '#191F28' : '#8B95A1',
                borderBottom: activeTab === tab ? '2.5px solid #F5C518' : '2.5px solid transparent',
                transition: 'color 0.15s ease',
              }}
            >{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* 찜 (Favorites) */}
        {activeTab === '찜' && (
          favoriteProducts.length > 0 ? (
            (() => {
              const scored = favoriteProducts.map(p => ({
                p,
                bd: hasPetProfile ? getRecommendationBreakdown(p, profile) : null,
              })).sort((a, b) => (b.bd?.total ?? 0) - (a.bd?.total ?? 0));

              return (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {scored.map(({ p, bd }) => {
                    const grade = bd ? gradeFromScore(bd.total) : null;
                    return (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/product/${p.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 13,
                          padding: '13px 0', borderBottom: '1px solid var(--hairline)',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                          borderBottomColor: 'var(--hairline)',
                        }}
                      >
                        <div style={{ width: 68, height: 68, borderRadius: 14, overflow: 'hidden', flexShrink: 0, background: 'var(--fill)', position: 'relative' }}>
                          <ProductImage src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {grade && (
                            <span style={{
                              position: 'absolute', bottom: 4, left: 4,
                              padding: '1px 6px', borderRadius: 5, fontSize: 10, fontWeight: 800,
                              background: GRADE_BG[grade], color: GRADE_COLOR[grade],
                            }}>{grade}</span>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 2 }}>{p.brand}</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {p.name}
                          </div>
                          {bd?.allergyHits?.length > 0 && (
                            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 11, fontWeight: 700, color: '#BE123C', background: '#FFF1F2', padding: '2px 7px', borderRadius: 5 }}>
                              ⚠ {bd.allergyHits.join(', ')} 포함
                            </span>
                          )}
                        </div>

                        {bd && (
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: grade ? GRADE_COLOR[grade] : 'var(--ink)', letterSpacing: '-0.02em' }}>
                              {bd.total}<span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)' }}>점</span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', fontWeight: 600, marginTop: 2 }}>
                              {p.price?.toLocaleString()}원
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div style={{ padding: '54px 28px', textAlign: 'center' }}>
              <Heart size={30} stroke="var(--ink-faint)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{FAVORITES_EMPTY.title}</div>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginBottom: 6 }}>{FAVORITES_EMPTY.description}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 16 }}>{FAVORITES_EMPTY.hint}</div>
              <button
                onClick={() => navigate('/')}
                style={{
                  cursor: 'pointer', fontSize: 14, fontWeight: 700, color: 'var(--brand-deep)',
                  background: 'var(--brand-tint)', border: '1px solid var(--brand-line)', padding: '11px 20px', borderRadius: 12,
                }}
              >
                {FAVORITES_EMPTY.cta}
              </button>
            </div>
          )
        )}

        {/* 구매내역 (Orders) */}
        {activeTab === '구매내역' && (
          orders?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orders.map(order => (
                <div key={order.id} style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(30,41,59,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#8B95A1', fontWeight: 600 }}>
                      {new Date(order.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: order.status === 'cancelled' || order.status === 'failed' ? '#F04452' : '#15B36B' }}>
                      {ORDER_STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  {order.order_items?.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                        <ProductImage src={item.products?.image_url} alt={item.products?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#8B95A1' }}>{item.products?.brand_name}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.products?.name}</div>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7684', fontWeight: 600 }}>{item.quantity}개</div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #EAEDF0', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: '#6B7684', fontWeight: 600 }}>총 결제금액</span>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#191F28' }}>{order.total_amount?.toLocaleString()}원</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🛍️</div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>구매 내역이 없어요</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>베로로 추천 상품을 둘러보세요</p>
              <button onClick={() => navigate('/search')}
                style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
                상품 둘러보기
              </button>
            </div>
          )
        )}

        {/* 분석리포트 (Reports) */}
        {activeTab === '분석리포트' && (
          reports?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map(report => {
                const score = report.analysis_json?.scores?.final;
                const grade = typeof score === 'number' ? gradeFromScore(score) : null;
                return (
                  <button
                    key={report.id}
                    onClick={() => report.product_id && navigate(`/product/${report.product_id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 14, width: '100%', textAlign: 'left',
                      background: '#fff', borderRadius: 16, border: 'none', cursor: report.product_id ? 'pointer' : 'default',
                      boxShadow: '0 1px 6px rgba(30,41,59,0.06)',
                    }}
                  >
                    <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', background: '#F7F4EE', flexShrink: 0 }}>
                      <ProductImage src={report.products?.image_url} alt={report.products?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: '#8B95A1' }}>{report.products?.brand_name}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#191F28', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {report.products?.name ?? '분석 리포트'}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#8B95A1', marginTop: 2 }}>{new Date(report.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                    {typeof score === 'number' && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 19, fontWeight: 900, color: grade ? GRADE_COLOR[grade] : '#191F28' }}>{Math.round(score)}점</div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#B0B8C1' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
              <p style={{ fontWeight: 600, fontSize: 15 }}>분석 리포트가 없어요</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>스캐너로 사료 성분표를 촬영해보세요</p>
              <button onClick={() => navigate('/scanner')}
                style={{ marginTop: 16, background: '#F5C518', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>
                스캔하러 가기
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}
