import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  OctagonAlert,
  Ban,
  Check,
  ChevronRight,
  ChevronDown,
  Star,
  Sparkles,
  GitCompare,
  Heart,
  ExternalLink,
  RefreshCw,
  WifiOff,
  Inbox,
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
  const safe = { fg: 'var(--pdp-safe-fg)', bg: 'var(--pdp-safe-bg)' };
  const good = { fg: 'var(--pdp-good-fg)', bg: 'var(--pdp-good-bg)' };
  const caution = { fg: 'var(--pdp-caution-fg)', bg: 'var(--pdp-caution-bg)' };
  const danger = { fg: 'var(--pdp-danger-fg)', bg: 'var(--pdp-danger-bg)' };
  if (s >= 90) return { grade: 'A+', tone: 'excellent', ...safe, ring: '#16A34A', label: '매우 안전' };
  if (s >= 85) return { grade: 'A', tone: 'excellent', ...safe, ring: '#22C55E', label: '안전' };
  if (s >= 75) return { grade: 'B', tone: 'good', ...good, ring: '#4ADE80', label: '대체로 안전' };
  if (s >= 60) return { grade: 'C', tone: 'caution', ...caution, ring: '#F59E0B', label: '확인 필요' };
  if (s >= 45) return { grade: 'D', tone: 'caution', ...caution, ring: '#F97316', label: '주의' };
  return { grade: 'F', tone: 'danger', ...danger, ring: '#EF4444', label: '비추천' };
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
  excellent: { fg: 'var(--pdp-safe-fg)', bg: 'var(--pdp-safe-bg)' },
  good: { fg: 'var(--pdp-good-fg)', bg: 'var(--pdp-good-bg)' },
  caution: { fg: 'var(--pdp-caution-fg)', bg: 'var(--pdp-caution-bg)' },
  danger: { fg: 'var(--pdp-danger-fg)', bg: 'var(--pdp-danger-bg)' },
  neutral: { fg: 'var(--pdp-neutral-fg)', bg: 'var(--pdp-neutral-bg)' },
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
  if (isAllergy) return { icon: <Ban size={16} strokeWidth={2.4} />, label: '알레르기', fg: 'var(--pdp-caution-fg)', bg: 'var(--pdp-caution-bg)', line: 'var(--pdp-caution-line,#FDE68A)' };
  if (level === 'danger') return { icon: <OctagonAlert size={16} strokeWidth={2.4} />, label: '위험', fg: 'var(--pdp-danger-fg)', bg: 'var(--pdp-danger-bg)', line: 'var(--pdp-danger-line,#FECACA)' };
  if (level === 'caution') return { icon: <AlertTriangle size={16} strokeWidth={2.4} />, label: '주의', fg: 'var(--pdp-caution-fg)', bg: 'var(--pdp-caution-bg)', line: 'var(--pdp-caution-line,#FDE68A)' };
  return { icon: <ShieldCheck size={16} strokeWidth={2.4} />, label: '안전', fg: 'var(--pdp-safe-fg)', bg: 'var(--pdp-safe-bg)', line: 'transparent' };
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

/* ─── Sticky top score bar + scroll progress (spec §21, P0-3) ─── */
export function StickyScoreBar({ score, name, visible, progress }: { score: number; name: string; visible: boolean; progress: number }) {
  const meta = gradeFromScore(score);
  return (
    <div
      aria-hidden={!visible}
      style={{
        position: 'fixed', top: 0, left: '50%', transform: `translateX(-50%) translateY(${visible ? '0' : '-110%'})`,
        width: '100%', maxWidth: 480, zIndex: 20, transition: 'transform 240ms cubic-bezier(0.2,0,0,1)',
        background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--pdp-line,#E5E8EB)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: meta.bg, color: meta.fg, fontWeight: 900, fontSize: 14, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(score)} <span style={{ fontSize: 12 }}>{meta.grade}</span>
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--pdp-ink,#0F172A)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
      </div>
      <div style={{ height: 3, background: 'transparent' }}>
        <div style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: '100%', background: meta.ring, transition: 'width 80ms linear' }} />
      </div>
    </div>
  );
}

/* ─── AI 종합 의견 (3줄, spec §16b) ─── */
export function AiVerdictCard({ lines }: { lines: { icon: ReactNode; text: string }[] }) {
  return (
    <section aria-label="AI 종합 의견" style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: 'var(--pdp-e2,0 8px 24px rgba(15,23,42,.06))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', marginBottom: 14 }}>
        🧠 AI 종합 의견
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {lines.slice(0, 3).map((l, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ flexShrink: 0, marginTop: 1, color: 'var(--pdp-ink-faint,#94A3B8)' }}>{l.icon}</span>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.55 }}>{l.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── PDP skeleton (spec §22) ─── */
function SkelBox({ w, h, r = 12, mb = 0 }: { w: string | number; h: number; r?: number; mb?: number }) {
  return <div className="pdp-skel" style={{ width: w, height: h, borderRadius: r, marginBottom: mb }} />;
}
export function PdpSkeleton() {
  return (
    <div aria-hidden style={{ padding: '4px 0 96px' }}>
      <SkelBox w="100%" h={240} r={24} mb={20} />
      <SkelBox w="55%" h={16} mb={8} />
      <SkelBox w="80%" h={26} mb={20} />
      {/* gauge card */}
      <div style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 24, marginBottom: 16, boxShadow: 'var(--pdp-e2)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <div className="pdp-skel" style={{ width: 132, height: 132, borderRadius: 999 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><SkelBox w={140} h={20} r={999} /></div>
      </div>
      {/* glance grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => <SkelBox key={i} w="100%" h={58} r={16} />)}
      </div>
      {/* fit */}
      <div style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: 'var(--pdp-e2)' }}>
        <SkelBox w="50%" h={18} mb={14} />
        <SkelBox w="100%" h={10} r={999} mb={14} />
        <SkelBox w="70%" h={14} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => <SkelBox key={i} w="100%" h={72} r={16} mb={10} />)}
    </div>
  );
}

/* ─── Alternative products carousel (spec §18, 4 types) ─── */
export interface AltCardData {
  id: string;
  brand: string;
  name: string;
  imageUrl: string;
  score: number;
  deltaScore: number;
  price: number;
  deltaPrice: number;
  tag: string;
  tagTone: SafetyTone | 'neutral';
}

function AltCard({ a, onOpen }: { a: AltCardData; onOpen: (id: string) => void }) {
  const meta = gradeFromScore(a.score);
  const tagColor = TONE_TILE[a.tagTone] ?? TONE_TILE.neutral;
  return (
    <button
      type="button"
      onClick={() => onOpen(a.id)}
      style={{
        flex: '0 0 auto', width: 220, scrollSnapAlign: 'start', textAlign: 'left', cursor: 'pointer',
        background: 'var(--pdp-surface,#fff)', border: '1px solid var(--pdp-line,#E5E8EB)', borderRadius: 20, padding: 12,
        boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))',
      }}
    >
      <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 800, color: tagColor.fg, background: tagColor.bg, padding: '4px 10px', borderRadius: 999, marginBottom: 10 }}>{a.tag}</span>
      <div style={{ height: 96, borderRadius: 14, marginBottom: 10, background: '#F1F5F9', overflow: 'hidden' }}>
        <img src={a.imageUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)' }}>{a.brand}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', lineHeight: 1.35, height: 38, overflow: 'hidden' }}>{a.name}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 900, color: meta.fg, background: meta.bg, padding: '3px 8px', borderRadius: 999 }}>
          {Math.round(a.score)}점
          {a.deltaScore > 0 && <span style={{ fontSize: 11 }}>▲{a.deltaScore}</span>}
        </span>
        <span style={{ textAlign: 'right' }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 900, color: 'var(--pdp-ink,#0F172A)' }}>{a.price.toLocaleString()}원</span>
          {a.deltaPrice < 0 && <span style={{ fontSize: 11, fontWeight: 800, color: '#16A34A' }}>{a.deltaPrice.toLocaleString()}원</span>}
        </span>
      </div>
    </button>
  );
}

export function AltProductCarousel({ items, onOpen }: { items: AltCardData[]; onOpen: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <section aria-label="대체 상품" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', marginBottom: 14 }}>
        🔄 이런 대체 상품은 어때요?
      </div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', padding: '2px 20px 6px', margin: '0 -20px' }}>
        {items.map((a) => <AltCard key={a.id} a={a} onOpen={onOpen} />)}
      </div>
    </section>
  );
}

/* ─── Nutrition balance: donut (구성비) + radar (균형) — SVG, no deps (spec §I) ─── */
const MACRO: { key: keyof import('../../types').NutritionData; label: string; color: string }[] = [
  { key: 'protein', label: '단백질', color: '#16A34A' },
  { key: 'fat', label: '지방', color: '#F59E0B' },
  { key: 'carb', label: '탄수화물', color: '#3182F6' },
  { key: 'fiber', label: '식이섬유', color: '#22C55E' },
  { key: 'moisture', label: '수분', color: '#38BDF8' },
  { key: 'ash', label: '회분', color: '#94A3B8' },
];

function NutritionDonut({ data }: { data: import('../../types').NutritionData }) {
  const slices = MACRO.map((m) => ({ ...m, value: Number(data[m.key] ?? 0) })).filter((s) => s.value > 0);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  // 누적 오프셋을 가변 변수 없이 prefix-sum으로 계산
  const fracs = slices.map((s) => s.value / total);
  const offsets = fracs.map((_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} aria-hidden>
        <circle cx="64" cy="64" r={R} fill="none" stroke="var(--pdp-line,#E5E8EB)" strokeWidth="16" />
        {slices.map((s, i) => {
          const dash = fracs[i] * C;
          return (
            <circle key={i} cx="64" cy="64" r={R} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offsets[i] * C} />
          );
        })}
      </svg>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        {slices.map((s, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--pdp-ink-muted,#475569)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <span style={{ color: 'var(--pdp-ink,#0F172A)', fontWeight: 800 }}>{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RadarAxis { label: string; value: number } // value 0~100
function NutritionRadar({ axes }: { axes: RadarAxis[] }) {
  const N = axes.length;
  const size = 200, cx = size / 2, cy = size / 2, R = 72;
  const pt = (i: number, r: number) => {
    const ang = (-90 + (i * 360) / N) * (Math.PI / 180);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = axes.map((a, i) => pt(i, (Math.max(0, Math.min(100, a.value)) / 100) * R).join(',')).join(' ');
  return (
    <svg width="100%" height="220" viewBox={`0 0 ${size} ${size + 20}`} aria-hidden style={{ display: 'block' }}>
      {rings.map((ring, ri) => (
        <polygon key={ri} points={axes.map((_, i) => pt(i, ring * R).join(',')).join(' ')} fill="none" stroke="var(--pdp-line,#E5E8EB)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--pdp-line,#E5E8EB)" strokeWidth="1" />;
      })}
      <polygon points={poly} fill="rgba(22,163,74,0.16)" stroke="#16A34A" strokeWidth="2" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, R + 14);
        return (
          <text key={i} x={x} y={y} fontSize="11" fontWeight="700" fill="#475569" textAnchor="middle" dominantBaseline="middle">{a.label}</text>
        );
      })}
    </svg>
  );
}

export function NutritionCard({ data, radar }: { data: import('../../types').NutritionData; radar: RadarAxis[] }) {
  return (
    <section aria-label="영양 밸런스" style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: 'var(--pdp-e2,0 8px 24px rgba(15,23,42,.06))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', marginBottom: 16 }}>
        📊 영양 밸런스
      </div>
      <NutritionDonut data={data} />
      {radar.length >= 3 && (
        <>
          <div style={{ height: 1, background: 'var(--pdp-line,#E5E8EB)', margin: '18px 0 6px' }} />
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)', marginBottom: 4 }}>영양 균형</div>
          <NutritionRadar axes={radar} />
        </>
      )}
    </section>
  );
}

/* ─── Review summary + rating distribution (spec §20) ─── */
export function ReviewSummaryCard({ ratings, topTags, summary }: { ratings: number[]; topTags: string[]; summary?: string }) {
  const total = ratings.length;
  if (total === 0) return null;
  const avg = ratings.reduce((s, r) => s + r, 0) / total;
  const counts = [5, 4, 3, 2, 1].map((star) => ratings.filter((r) => Math.round(r) === star).length);
  return (
    <section aria-label="리뷰 요약" style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 24, padding: 20, marginBottom: 16, boxShadow: 'var(--pdp-e2,0 8px 24px rgba(15,23,42,.06))' }}>
      {summary ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ flexShrink: 0, color: '#7C3AED' }}><Sparkles size={18} /></span>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.55 }}>{summary}</p>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--pdp-ink,#0F172A)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{avg.toFixed(1)}</div>
          <div style={{ display: 'flex', gap: 1, justifyContent: 'center', margin: '4px 0 2px' }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} size={13} color="#FBBF24" fill={i < Math.round(avg) ? '#FBBF24' : 'none'} />
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)' }}>{total.toLocaleString()}개</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {counts.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)', width: 20 }}>{5 - i}점</span>
              <span style={{ flex: 1, height: 7, borderRadius: 999, background: 'var(--pdp-line,#E5E8EB)', overflow: 'hidden' }}>
                <span style={{ display: 'block', width: `${total ? (c / total) * 100 : 0}%`, height: '100%', background: '#FBBF24', borderRadius: 999 }} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pdp-ink-faint,#94A3B8)', width: 26, textAlign: 'right' }}>{total ? Math.round((c / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
      {topTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {topTags.map((t, i) => (
            <span key={i} style={{ padding: '6px 12px', borderRadius: 999, background: '#F1F5F9', color: '#334155', fontSize: 12.5, fontWeight: 700 }}>{t}</span>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── FAQ / AI Q&A accordion (spec §14 FAQ, §14 AI Q&A) ─── */
export interface QaItem { q: string; a: string }
export function FaqAccordion({ items, title = '자주 묻는 질문', ai = false }: { items: QaItem[]; title?: string; ai?: boolean }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!items.length) return null;
  return (
    <section aria-label={title} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)', marginBottom: 14 }}>
        {ai ? '🤖 AI에게 물어보기' : '❓ 자주 묻는 질문'}
      </div>
      <div style={{ background: 'var(--pdp-surface,#fff)', borderRadius: 20, boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))', overflow: 'hidden' }}>
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--pdp-line,#E5E8EB)' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px' }}
              >
                <span style={{ flexShrink: 0, color: ai ? '#7C3AED' : 'var(--pdp-ink-faint,#94A3B8)' }}>
                  {ai ? <Sparkles size={16} /> : <span style={{ fontWeight: 900, fontSize: 15 }}>Q</span>}
                </span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: 'var(--pdp-ink,#0F172A)' }}>{it.q}</span>
                <ChevronDown size={18} color="var(--pdp-ink-faint,#94A3B8)" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: '0 18px 18px 44px', fontSize: 14, fontWeight: 500, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.6 }}>{it.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Empty state (spec §23) ─── */
export function EmptyState({ emoji = '🐾', title, desc, actionLabel, onAction }: { emoji?: string; title: string; desc?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '36px 24px', background: 'var(--pdp-surface,#fff)', borderRadius: 20, boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--pdp-surface-soft,#F7F8FA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 14 }} aria-hidden>
        {emoji || <Inbox size={24} />}
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)' }}>{title}</p>
      {desc ? <p style={{ margin: '6px 0 0', fontSize: 13.5, fontWeight: 500, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.55 }}>{desc}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" onClick={onAction} style={{ marginTop: 18, height: 44, padding: '0 20px', borderRadius: 14, border: 'none', background: 'var(--pdp-ink,#0F172A)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>{actionLabel}</button>
      ) : null}
    </div>
  );
}

/* ─── Error state (spec §24) ─── */
export function ErrorState({ title = '정보를 불러오지 못했어요', desc = '잠시 후 다시 시도해 주세요.', onRetry }: { title?: string; desc?: string; onRetry?: () => void }) {
  return (
    <div role="alert" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '36px 24px', background: 'var(--pdp-surface,#fff)', borderRadius: 20, boxShadow: 'var(--pdp-e1,0 1px 2px rgba(15,23,42,.04))' }}>
      <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--pdp-danger-bg,#FEF2F2)', color: 'var(--pdp-danger-fg,#B91C1C)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }} aria-hidden>
        <AlertTriangle size={24} />
      </div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--pdp-ink,#0F172A)' }}>{title}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13.5, fontWeight: 500, color: 'var(--pdp-ink-muted,#475569)', lineHeight: 1.55 }}>{desc}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={{ marginTop: 18, height: 44, padding: '0 20px', borderRadius: 14, border: '1px solid var(--pdp-line,#E5E8EB)', background: 'var(--pdp-surface,#fff)', color: 'var(--pdp-ink,#0F172A)', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> 다시 시도
        </button>
      ) : null}
    </div>
  );
}

/* ─── Offline banner (Dynamic-Island style, spec §24) ─── */
export function OfflineBanner({ online }: { online: boolean }) {
  return (
    <div
      role="status"
      aria-hidden={online}
      style={{
        position: 'fixed', top: 10, left: '50%', transform: `translateX(-50%) translateY(${online ? '-140%' : '0'})`,
        zIndex: 40, transition: 'transform 280ms cubic-bezier(0.2,0,0,1)',
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '9px 16px', borderRadius: 999, background: '#0F172A', color: '#fff',
        fontSize: 13, fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,.28)',
      }}
    >
      <WifiOff size={15} /> 오프라인 · 저장된 정보를 표시 중
    </div>
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
