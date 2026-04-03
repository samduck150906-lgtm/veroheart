import { useState } from 'react';
import { useStore } from '../store/useStore';
import ProductCard from '../components/ProductCard';
import TargetedAd from '../components/TargetedAd';
import { Helmet } from 'react-helmet-async';
import { Sparkles, Clock, ChevronRight, X, Tag, FlaskConical, Star, ShieldCheck, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MOCK_EVENTS } from '../lib/supabase';
import { HOME_HERO } from '../copy/marketing';
import { HOME_CATEGORY_ITEMS } from '../constants/productCategories';

export default function Home() {
  const { products, profile, recentViews } = useStore();
  const navigate = useNavigate();
  const [closedEvents, setClosedEvents] = useState<string[]>([]);
  const visibleEvents = MOCK_EVENTS.filter(e => !closedEvents.includes(e.id));

  const personalRecs = products
    .filter(p => !p.mainCategory?.includes('사료') ||
      (profile.species === 'Dog' ? p.targetPetType === 'dog' : p.targetPetType === 'cat') ||
      p.targetPetType === 'all'
    )
    .filter(p => {
      const hasDirectMatch = p.healthConcerns?.some(c => profile.healthConcerns.includes(c));
      const hasIngredientMatch = p.ingredients.some(ing => profile.healthConcerns.some(c => ing.purpose.includes(c)));
      return hasDirectMatch || hasIngredientMatch;
    })
    .slice(0, 4);

  const features = [
    {
      icon: <FlaskConical size={20} color="var(--primary)" />,
      title: '전성분 정밀 분석',
      desc: '위험 성분을 한눈에',
      bg: 'rgba(255, 107, 74, 0.08)',
    },
    {
      icon: <ShieldCheck size={20} color="#10B981" />,
      title: '알레르기 감지',
      desc: '우리 아이 맞춤 경고',
      bg: 'rgba(16, 185, 129, 0.08)',
    },
    {
      icon: <Star size={20} color="#F59E0B" />,
      title: '궁합 점수',
      desc: '최적의 제품 추천',
      bg: 'rgba(245, 158, 11, 0.08)',
    },
    {
      icon: <MessageSquare size={20} color="#7C6F9C" />,
      title: '집사 커뮤니티',
      desc: '찐 후기만 모았어요',
      bg: 'rgba(124, 111, 156, 0.08)',
    },
  ];

  return (
    <div>
      <Helmet>
        <title>베로로 — 성분 분석 &amp; 집사들의 찐 리뷰</title>
        <meta name="description" content="베로로 — 사료 성분 분석과 집사들의 찐 리뷰. 의심 대신 베로로 하세요." />
      </Helmet>

      {/* Hero Section */}
      <section style={{
        marginBottom: '24px',
        padding: '24px 20px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(255, 245, 240, 0.92) 100%)',
        border: '1px solid rgba(232, 90, 60, 0.1)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, right: -20,
          width: '120px', height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,74,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <p style={{
          fontSize: '11px', fontWeight: 700, color: 'var(--community-tint)',
          marginBottom: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--community-tint)', display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          베로로 공식
        </p>
        <h1 style={{
          fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)',
          lineHeight: 1.4, letterSpacing: '-0.03em', margin: '0 0 10px',
        }}>
          {HOME_HERO.headline}
        </h1>
        <p style={{
          fontSize: '14px', fontWeight: 600, color: '#4B5563',
          lineHeight: 1.6, margin: '0 0 16px',
        }}>
          {HOME_HERO.sub}
        </p>
        <div style={{
          fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)',
          padding: '12px 14px', borderRadius: '14px',
          background: 'rgba(232, 90, 60, 0.07)',
          border: '1px dashed rgba(232, 90, 60, 0.22)',
          marginBottom: '10px',
          lineHeight: 1.55,
        }}>
          {HOME_HERO.customTable}
        </div>
        <p style={{
          fontSize: '12px', color: '#9CA3AF', fontWeight: 500,
          lineHeight: 1.5, margin: 0, fontStyle: 'italic',
        }}>
          {HOME_HERO.footnote}
        </p>
      </section>

      {/* Feature Cards */}
      <section style={{ marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {features.map(f => (
            <div
              key={f.title}
              style={{
                padding: '16px',
                borderRadius: '18px',
                background: f.bg,
                border: '1px solid rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'default',
              }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '2px' }}>{f.title}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 이벤트/쿠폰 배너 */}
      {visibleEvents.length > 0 && (
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {visibleEvents.map(ev => (
              <div key={ev.id} style={{
                background: ev.color, borderRadius: '18px', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px',
                position: 'relative', border: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Tag size={18} color="#374151" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 800, background: '#111827',
                      color: '#fff', padding: '2px 8px', borderRadius: '6px',
                    }}>{ev.badge}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '2px' }}>{ev.title}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{ev.desc}</div>
                  {ev.code && (
                    <div style={{
                      fontSize: '13px', fontWeight: 700, color: '#374151', marginTop: '6px',
                      background: 'rgba(0,0,0,0.05)', display: 'inline-block',
                      padding: '4px 10px', borderRadius: '8px', fontFamily: 'monospace',
                    }}>
                      {ev.code}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setClosedEvents(prev => [...prev, ev.id])}
                  style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: 'rgba(0,0,0,0.06)', border: 'none', cursor: 'pointer',
                    color: '#9CA3AF', width: '24px', height: '24px',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  aria-label="배너 닫기"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Personalized Section */}
      {personalRecs.length > 0 && (
        <section style={{
          marginBottom: '40px',
          background: 'linear-gradient(135deg, #E85A3C 0%, #C94A32 100%)',
          margin: '0 -20px 32px -20px',
          padding: '28px 20px',
          color: '#fff',
          borderRadius: '0 0 28px 28px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 900, margin: 0 }}>
              <Sparkles size={22} color="#FDE68A" />
              <span>{profile.name}를 위한 추천</span>
            </h2>
            <button
              onClick={() => navigate('/search')}
              style={{
                background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                color: '#fff', padding: '6px 12px', borderRadius: '999px',
                fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              더보기 <ChevronRight size={14} />
            </button>
          </div>
          <p style={{ fontSize: '13px', opacity: 0.75, marginBottom: '20px', margin: '0 0 20px' }}>
            {profile.healthConcerns.join(', ')} 고민을 해결해줄 제품들
          </p>
          <div className="no-scrollbar" style={{
            display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px',
          }}>
            {personalRecs.map((p) => (
              <div
                key={p.id}
                className="animate-fade-in"
                style={{
                  flex: '0 0 200px', padding: '10px',
                  backgroundColor: '#fff', color: 'var(--text-dark)',
                  borderRadius: '18px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                }}
              >
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 인기 랭킹 */}
      <section style={{ marginBottom: '40px' }}>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 className="section-title">
            인기 급상승 랭킹 🔥
          </h2>
          <button
            onClick={() => navigate('/ranking')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '13px', color: 'var(--primary)', fontWeight: 600,
            }}
          >
            전체보기 <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {products.slice(0, 4).map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 14px', borderRadius: '18px',
                border: idx < 3
                  ? `1px solid ${['rgba(245,158,11,0.25)', 'rgba(148,163,184,0.25)', 'rgba(205,124,46,0.25)'][idx]}`
                  : '1px solid rgba(232, 90, 60, 0.08)',
                background: idx < 3
                  ? `${['rgba(245,158,11,0.04)', 'rgba(148,163,184,0.04)', 'rgba(205,124,46,0.04)'][idx]}`
                  : 'var(--surface-elevated)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{
                fontSize: idx < 3 ? '26px' : '20px',
                fontWeight: 900, width: '32px', textAlign: 'center',
                fontStyle: idx >= 3 ? 'italic' : 'normal',
                color: idx >= 3 ? '#D1D5DB' : undefined,
                lineHeight: 1,
              }}>
                {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ProductCard product={p} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <TargetedAd />

      {/* 최근 본 제품 */}
      {recentViews.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 className="section-title">
              <Clock size={18} color="var(--text-muted)" /> 최근 본 제품
            </h2>
            <button
              onClick={() => navigate('/search')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600,
              }}
            >
              더보기 <ChevronRight size={14} />
            </button>
          </div>
          <div className="no-scrollbar" style={{
            display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px',
          }}>
            {recentViews.slice(0, 6).map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                style={{ flexShrink: 0, width: '92px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '92px', height: '92px', borderRadius: '16px',
                  overflow: 'hidden', marginBottom: '6px',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                </div>
                <div className="line-clamp-2" style={{
                  fontSize: '11px', fontWeight: 600, color: '#374151', lineHeight: 1.4,
                }}>
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 카테고리 탐색 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 className="section-title" style={{ marginBottom: '16px' }}>카테고리별 탐색</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {HOME_CATEGORY_ITEMS.map(item => (
            <div
              key={item.name}
              onClick={() =>
                navigate({
                  pathname: '/search',
                  search: `?category=${encodeURIComponent(item.name)}`,
                })
              }
              style={{ textAlign: 'center', cursor: 'pointer' }}
            >
              <div style={{
                width: '100%', aspectRatio: '1/1',
                background: 'linear-gradient(145deg, #FFF5F0 0%, #FFEAE0 100%)',
                borderRadius: '20px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', marginBottom: '8px', fontSize: '26px',
                border: '1px solid rgba(232, 90, 60, 0.08)',
                transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                boxShadow: '0 2px 6px rgba(232, 90, 60, 0.06)',
              }}>
                {item.emoji}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>{item.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
