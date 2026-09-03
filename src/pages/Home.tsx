import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ProductThumb from '../components/ProductThumb';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { normalizeProductDisplayName, resolveBrandLabel } from '../utils/productDisplay';
import { gradePalette, VR } from '../lib/veroroDesign';
import type { PetSafetyScan } from '../utils/petSafety';
import type { Product } from '../types';

// category 값은 DB products.main_category 실측값('사료'/'간식'/'영양제')과 일치해야 한다.
// 부제는 등록 건수 대신 카테고리가 무엇인지 알려 준다. 건수는 보호자에게 의미가 없고,
// DB 가 작아 보이는 역효과만 있었다.
const CATEGORIES = [
  { label: '사료', hint: '매일 먹는 주식' },
  { label: '간식', hint: '훈련·보상용' },
  { label: '영양제', hint: '부족한 영양 보충' },
] as const;

export default function Home() {
  const { profile, products, recentViews, isLoggedIn } = useStore();
  const navigate = useNavigate();

  const [safetyScan, setSafetyScan] = useState<PetSafetyScan | null>(null);
  useEffect(() => {
    if (recentViews.length === 0) {
      setSafetyScan(null);
      return;
    }
    let cancelled = false;
    import('../utils/petSafety').then(({ scanIngredientRisks }) => {
      if (!cancelled) setSafetyScan(scanIngredientRisks(recentViews, profile));
    });
    return () => {
      cancelled = true;
    };
  }, [recentViews, profile]);

  const petLabel = isLoggedIn && profile.name ? profile.name : '우리 아이';

  /** 프로필 기준 점수 상위 제품 — '우리 아이한테 잘 맞는 것들' */
  const recommended = useMemo(() => {
    const recentIds = new Set(recentViews.map((p) => p.id));
    return products
      .filter((p) => !recentIds.has(p.id))
      .map((p) => ({ product: p, verdict: resolveProductDisplayVerdict(p, profile) }))
      .sort((a, b) => b.verdict.score - a.verdict.score)
      .slice(0, 3);
  }, [products, recentViews, profile]);

  /** 최근 본 제품에서 걸린 성분들 — 위험/주의 두 단계로 나눠 보여준다 */
  const alertRows = useMemo(() => {
    if (!safetyScan) return [];
    const dangerSet = new Set(safetyScan.dangerNames);
    return safetyScan.flagged
      .flatMap((f) =>
        f.hits.map((hit) => ({
          key: `${f.id}-${hit}`,
          level: dangerSet.has(hit) ? '위험' : '주의',
          ingredient: hit,
          product: f.name,
        }))
      )
      .slice(0, 3);
  }, [safetyScan]);

  const openProduct = (id: string) => navigate(`/product/${id}`);
  const goCategory = (category: string) =>
    navigate({ pathname: '/search', search: `?category=${encodeURIComponent(category)}` });

  const gradeOf = (product: Product) => resolveProductDisplayVerdict(product, profile);

  return (
    <div style={{ padding: '6px 0 28px' }}>
      <Helmet>
        <title>베로로 — 사료·간식·영양제 성분 분석</title>
        <meta name="description" content="반려동물 사료·간식·영양제의 원재료와 성분을 분석하고, 먹은 제품을 기록하세요." />
      </Helmet>

      <h1 style={{ margin: '14px 0 4px', fontSize: '29px', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.18 }}>
        우리 아이한테<br />괜찮을까?
      </h1>
      <p style={{ margin: '0 0 18px', fontSize: '14px', color: VR.muted, lineHeight: 1.5 }}>
        성분 하나하나 뜯어서 등급으로 알려줄게.
      </p>

      {/* 1순위 액션 — 바코드 스캔 */}
      <button
        type="button"
        onClick={() => navigate('/scan')}
        className="vr-sheen"
        style={{
          width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer',
          background: 'var(--vr-yellow)', borderRadius: '20px', padding: '20px',
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px',
        }}
      >
        <span style={{
          width: '52px', height: '52px', borderRadius: '15px', background: '#15150F', flex: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFD90A" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" />
            <path d="M7 8v8M11 8v8M15 8v8M18 8v8" strokeWidth="1.6" />
          </svg>
        </span>
        <span style={{ position: 'relative' }}>
          <span style={{ display: 'block', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.03em', color: '#15150F' }}>
            바코드 스캔하기
          </span>
          <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#6B5C00', marginTop: '2px' }}>
            뒷면 바코드만 찍으면 3초 안에 등급 확인
          </span>
        </span>
      </button>

      {/* 카테고리 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '9px', marginBottom: '22px' }}>
        {CATEGORIES.map(({ label, hint }) => (
          <button
            key={label}
            type="button"
            onClick={() => goCategory(label)}
            style={{
              background: 'var(--vr-soft)', borderRadius: '15px', padding: '14px 12px',
              border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ display: 'block', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--vr-ink)' }}>
              {label}
            </span>
            <span style={{ display: 'block', fontSize: '11.5px', color: VR.sub, marginTop: '3px', fontWeight: 600 }}>
              {hint}
            </span>
          </button>
        ))}
      </div>

      {/* 최근 본 제품에서 걸린 성분 */}
      {alertRows.length > 0 && (
        <button
          type="button"
          onClick={() => navigate('/analysis')}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            border: '1.5px solid var(--danger-line)', background: 'var(--danger-bg)',
            borderRadius: '18px', padding: '16px', marginBottom: '24px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="vr-pulse"
              style={{
                width: '22px', height: '22px', borderRadius: '50%', background: 'var(--danger-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '13px', fontWeight: 800, flex: 'none',
              }}
            >
              !
            </span>
            <span style={{ fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--vr-ink)' }}>
              최근 본 제품에서 주의 성분 {alertRows.length}건
            </span>
          </span>

          <span style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginTop: '11px' }}>
            {alertRows.map((row) => (
              <span key={row.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface)', borderRadius: '11px', padding: '9px 11px' }}>
                <span style={{
                  fontSize: '11px', fontWeight: 800, color: 'var(--danger-strong)', background: 'var(--danger-bg)',
                  padding: '2px 6px', borderRadius: '5px', flex: 'none',
                }}>
                  {row.level}
                </span>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--vr-ink)' }}>{row.ingredient}</span>
                <span style={{
                  fontSize: '11.5px', color: VR.sub, marginLeft: 'auto', minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {row.product}
                </span>
              </span>
            ))}
          </span>

          <span style={{ display: 'block', marginTop: '11px', fontSize: '12.5px', fontWeight: 800, color: 'var(--danger-strong)' }}>
            {petLabel} 프로필 기준으로 다시 스캔했어 →
          </span>
        </button>
      )}

      {/* 최근 본 상품 */}
      {recentViews.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '11px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em' }}>최근 본 상품</h2>
            <button
              type="button"
              onClick={() => navigate('/search')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12.5px', fontWeight: 700, color: VR.sub }}
            >
              더 보기
            </button>
          </div>
          <div className="vr-rail vr-bleed" style={{ padding: '0 16px 4px', marginBottom: '24px' }}>
            {recentViews.slice(0, 8).map((p) => {
              const { grade } = gradeOf(p);
              const palette = gradePalette(grade);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openProduct(p.id)}
                  style={{ width: '132px', flex: 'none', border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ position: 'relative', display: 'block' }}>
                    <ProductThumb src={p.imageUrl} alt={p.name} monoSource={resolveBrandLabel(p) || p.name} height={132} radius={15} fontSize={26} />
                    <span
                      className="vr-grade-pill"
                      style={{ position: 'absolute', left: '8px', top: '8px', color: palette.fg, background: palette.bg }}
                    >
                      {grade}
                    </span>
                  </span>
                  <span style={{ display: 'block', fontSize: '11.5px', color: VR.sub, fontWeight: 700, marginTop: '8px' }}>{resolveBrandLabel(p)}</span>
                  <span className="line-clamp-2" style={{ display: 'block', fontSize: '13px', fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.02em', color: 'var(--vr-ink)' }}>
                    {normalizeProductDisplayName(p)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 프로필 기반 추천 */}
      {recommended.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '11px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {petLabel}한테 잘 맞는 것들
            </h2>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: VR.sub }}>프로필 기반</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '24px' }}>
            {recommended.map(({ product, verdict }) => {
              const palette = gradePalette(verdict.grade);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProduct(product.id)}
                  className="vr-card"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '11px',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <ProductThumb src={product.imageUrl} alt={product.name} monoSource={resolveBrandLabel(product) || product.name} size={58} radius={12} fontSize={16} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'block', fontSize: '11.5px', color: VR.sub, fontWeight: 700 }}>{resolveBrandLabel(product)}</span>
                    <span style={{
                      display: 'block', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--vr-ink)',
                    }}>
                      {normalizeProductDisplayName(product)}
                    </span>
                    <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--safe-strong)', marginTop: '3px' }}>
                      {petLabel}와 {verdict.score}% 맞아
                    </span>
                  </span>
                  <span style={{
                    width: '38px', height: '38px', borderRadius: '11px', flex: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 800, color: palette.fg, background: palette.bg,
                  }}>
                    {verdict.grade}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 성향 테스트 진입 */}
      <button
        type="button"
        onClick={() => navigate('/event/personality-quiz')}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
          borderRadius: '18px', background: 'var(--vr-inverse)', padding: '18px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#FFD90A', letterSpacing: '0.04em' }}>EVENT</span>
          <span style={{ display: 'block', fontSize: '17px', fontWeight: 800, color: 'var(--vr-on-inverse)', letterSpacing: '-0.03em', marginTop: '3px' }}>
            우리 아이 성향 테스트 8문항
          </span>
          <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--vr-on-inverse-sub)', marginTop: '3px' }}>
            성향 알면 사료 고르기 훨씬 쉬워져
          </span>
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD90A" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
