import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Ban,
  Check,
  ChevronRight,
  GitCompare,
  Heart,
  ExternalLink,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
 * PDP (Product Detail Page) redesign parts — P0 components.
 * Design tokens live in index.css (:root --pdp-*). Grounded in the
 * app's real data: score (generateAnalysisReport), risk levels, and
 * the personalized breakdown (getRecommendationBreakdown).
 * ──────────────────────────────────────────────────────────── */

export type SafetyTone = 'excellent' | 'good' | 'caution' | 'danger';

export interface GradeMeta {
  grade: string;
  tone: SafetyTone;
  fg: string;
  bg: string;
  ring: string;
  label: string;
}

/** 0–100 score → letter grade + semantic color band (spec §9.3 / §29). */
function gradeFromScore(score: number): GradeMeta {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 90) return { grade: 'A+', tone: 'excellent', fg: '#15803D', bg: '#ECFDF5', ring: '#16A34A', label: '매우 안전' };
  if (s >= 85) return { grade: 'A', tone: 'excellent', fg: '#15803D', bg: '#ECFDF5', ring: '#22C55E', label: '안전' };
  if (s >= 75) return { grade: 'B', tone: 'good', fg: '#16A34A', bg: '#F0FDF4', ring: '#4ADE80', label: '대체로 안전' };
  if (s >= 60) return { grade: 'C', tone: 'caution', fg: '#B45309', bg: '#FFFBEB', ring: '#F59E0B', label: '확인 필요' };
  if (s >= 45) return { grade: 'D', tone: 'caution', fg: '#B45309', bg: '#FFFBEB', ring: '#F97316', label: '주의' };
  return { grade: 'F', tone: 'danger', fg: '#B91C1C', bg: '#FEF2F2', ring: '#EF4444', label: '비추천' };
}

/** Count-up that respects prefers-reduced-motion (spec §13). */
function useCountUp(to: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // 모션 최소화 사용자: 애니메이션 없이 최종값 즉시 표시
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.round(to * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [to, durationMs]);
  return value;
}

/* ─── AI Safety Score gauge (spec §16 hero) ─── */
export function ScoreGauge({ score, oneLiner }: { score: number; oneLiner?: string }) {
  const meta = gradeFromScore(score);
  const shown = useCountUp(score);
  const R = 54;
  const C = 2 * Math.PI * R;
  const [swept, setSwept] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSwept(true), 60);
    return () => clearTimeout(t);
  }, []);
  const offset = swept ? C * (1 - Math.max(0, Math.min(100, score)) / 100) : C;

  return (
    <section
      aria-label="AI 안전점수"
      style={{
        background: 'var(--pdp-surface, #fff)',
        borderRadius: 24,
        padding: '24px 20px',
        marginBottom: 16,
        boxShadow: 'var(--pdp-e2, 0 8px 24px rgba(15,23,42,.06))',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--pdp-ink-faint,#94A3B8)', letterSpacing: '0.02em', marginBottom: 12 }}>
        AI 안전점수
      </div>
      <div style={{ position: 'relative', width: 132, height: 132, margin: '0 auto' }}>
        <svg width="132" height="132" viewBox="0 0 132 132" style={{ transform: 'rotate(-90deg)' }} aria-hidden>
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--pdp-line,#E5E8EB)" strokeWidth="12" />
          <circle
            cx="66"
            cy="66"
            r={R}
            fill="none"
            stroke={meta.ring}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1000ms cubic-bezier(0.05,0.7,0.1,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1, color: 'var(--pdp-ink,#0F172A)', fontVariantNumeric: 'tabular-nums' }}>
            {shown}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)' }}>/ 100</div>
        </div>
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, padding: '6px 14px', borderRadius: 999, background: meta.bg, color: meta.fg }}>
        <span style={{ fontSize: 18, fontWeight: 900 }}>{meta.grade}</span>
        <span style={{ fontSize: 14, fontWeight: 800 }}>{meta.label}</span>
      </div>
      {oneLiner ? (
        <p style={{ margin: '14px 4px 0', fontSize: 15, fontWeight: 600, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.5 }}>{oneLiner}</p>
      ) : null}
    </section>
  );
}

/* ─── At-a-Glance summary grid (spec §7 GlanceGrid) ─── */
export interface GlanceTileData {
  icon: ReactNode;
  label: string;
  value: string;
  tone: SafetyTone | 'neutral';
}

const TONE_TILE: Record<string, { fg: string; bg: string }> = {
  excellent: { fg: '#15803D', bg: '#ECFDF5' },
  good: { fg: '#16A34A', bg: '#F0FDF4' },
  caution: { fg: '#B45309', bg: '#FFFBEB' },
  danger: { fg: '#B91C1C', bg: '#FEF2F2' },
  neutral: { fg: '#334155', bg: '#F1F5F9' },
};

export function GlanceGrid({ tiles }: { tiles: GlanceTileData[] }) {
  return (
    <section aria-label="핵심 요약" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
      {tiles.map((t, i) => {
        const c = TONE_TILE[t.tone] ?? TONE_TILE.neutral;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 16, background: 'var(--pdp-surface,#fff)', boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))' }}>
            <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {t.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)' }}>{t.label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.value}</div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

/* ─── Fit-for-my-pet card (spec §7 FitForPetCard) ─── */
export function FitForPetCard({ petName, percent, chips, reasons }: { petName: string; percent: number; chips: string[]; reasons: string[] }) {
  const meta = gradeFromScore(percent);
  const shown = useCountUp(percent, 700);
  return (
    <section
      aria-label={`${petName} 적합도`}
      style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: 'var(--pdp-e2,0 8px 24px rgba(15,23,42,.06))' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)' }}>
          🐶 {petName} 적합도
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: meta.fg, fontVariantNumeric: 'tabular-nums' }}>{shown}%</div>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: 'var(--pdp-line,#E5E8EB)', overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${shown}%`, height: '100%', borderRadius: 999, background: meta.ring, transition: 'width 700ms cubic-bezier(0.05,0.7,0.1,1)' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: reasons.length ? 12 : 0 }}>
        {chips.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontSize: 12.5, fontWeight: 700 }}>
            <Check size={13} strokeWidth={2.6} /> {c}
          </span>
        ))}
      </div>
      {reasons.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {reasons.slice(0, 3).map((r, i) => (
            <li key={i} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.5 }}>· {r}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ─── Risk dual-encoding (icon + color + label) — color-blind safe (spec §12) ─── */
type Risk = 'safe' | 'caution' | 'danger';
function riskMeta(level: Risk | undefined, isAllergy?: boolean) {
  if (isAllergy) return { icon: <Ban size={16} strokeWidth={2.4} />, label: '알레르기', fg: '#B45309', bg: '#FFFBEB', line: '#FDE68A' };
  if (level === 'danger') return { icon: <OctagonAlert size={16} strokeWidth={2.4} />, label: '위험', fg: '#B91C1C', bg: '#FEF2F2', line: '#FECACA' };
  if (level === 'caution') return { icon: <AlertTriangle size={16} strokeWidth={2.4} />, label: '주의', fg: '#B45309', bg: '#FFFBEB', line: '#FDE68A' };
  return { icon: <ShieldCheck size={16} strokeWidth={2.4} />, label: '안전', fg: '#15803D', bg: '#ECFDF5', line: 'transparent' };
}

export interface IngredientLike {
  nameKo: string;
  nameEn?: string;
  purpose?: string;
  riskLevel?: string;
  isAllergy?: boolean;
}

/** One ingredient card with dual-encoded risk badge (spec §17). */
export function IngredientCard({ ing, onOpen }: { ing: IngredientLike; onOpen: () => void }) {
  const m = riskMeta(ing.riskLevel as Risk | undefined, ing.isAllergy);
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: 16, borderRadius: 16, marginBottom: 10,
        background: 'var(--pdp-surface,#fff)',
        border: m.line === 'transparent' ? '1px solid var(--pdp-line,#E5E8EB)' : `1px solid ${m.line}`,
        boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))',
      }}
    >
      <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, background: m.bg, color: m.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {m.icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)' }}>{ing.nameKo}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: m.fg, background: m.bg, padding: '2px 8px', borderRadius: 999 }}>{m.label}</span>
        </span>
        {ing.purpose ? (
          <span style={{ display: 'block', marginTop: 3, fontSize: 13, fontWeight: 500, color: 'var(--pdp-ink-muted,#475569)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ing.purpose}
          </span>
        ) : null}
      </span>
      <ChevronRight size={18} color="var(--pdp-ink-faint,#94A3B8)" />
    </button>
  );
}

/* ─── Sticky bottom CTA bar (spec §21) ─── */
export function StickyCtaBar({
  price,
  isFav,
  isComparing,
  onFav,
  onCompare,
  buyHref,
  onBuy,
}: {
  price: number;
  isFav: boolean;
  isComparing: boolean;
  onFav: () => void;
  onCompare: () => void;
  buyHref?: string | null;
  onBuy: () => void;
}) {
  const priceLabel = price > 0 ? `${price.toLocaleString()}원 · 구매하기` : '구매하기';
  return (
    <div
      role="region"
      aria-label="구매"
      style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 0,
        width: '100%', maxWidth: 480, zIndex: 30,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px calc(12px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--pdp-surface,#fff)',
        borderTop: '1px solid var(--pdp-line,#E5E8EB)',
        boxShadow: '0 -8px 28px rgba(15,23,42,.08)',
      }}
    >
      <button type="button" onClick={onFav} aria-pressed={isFav} aria-label="찜하기"
        style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, border: '1px solid var(--pdp-line,#E5E8EB)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <Heart size={22} color={isFav ? '#F04452' : '#94A3B8'} fill={isFav ? '#F04452' : 'none'} />
      </button>
      <button type="button" onClick={onCompare} aria-pressed={isComparing} aria-label="비교 담기"
        style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, border: '1px solid var(--pdp-line,#E5E8EB)', background: isComparing ? '#EFF6FF' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        <GitCompare size={20} color={isComparing ? '#1D4ED8' : '#334155'} />
      </button>
      {buyHref ? (
        <a href={buyHref} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, height: 48, borderRadius: 14, background: 'var(--primary,#FEE500)', color: '#191919', fontWeight: 900, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}>
          {priceLabel} <ExternalLink size={17} />
        </a>
      ) : (
        <button type="button" onClick={onBuy}
          style={{ flex: 1, height: 48, borderRadius: 14, border: 'none', background: 'var(--primary,#FEE500)', color: '#191919', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
          {priceLabel}
        </button>
      )}
    </div>
  );
}
