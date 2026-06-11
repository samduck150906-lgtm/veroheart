import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, ThumbsUp, RefreshCw, Check, EyeOff } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  getAnalysisRules,
  setAnalysisRuleActive,
  getUnmatchedIngredients,
  setUnmatchedStatus,
  type AnalysisRuleRow,
  type UnmatchedIngredientRow,
} from '../../lib/supabase';

type Tab = 'rules' | 'unmatched';

const SEVERITY_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  danger: { label: '위험', color: '#F04452', icon: <ShieldAlert size={15} /> },
  caution: { label: '주의', color: '#F59E0B', icon: <AlertTriangle size={15} /> },
  watch: { label: '관찰', color: '#CA8A04', icon: <AlertTriangle size={15} /> },
  good: { label: '좋은 점', color: '#15803D', icon: <ThumbsUp size={15} /> },
  info: { label: '정보', color: '#3182F6', icon: <ShieldCheck size={15} /> },
};

const AdminAnalysis: React.FC = () => {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<AnalysisRuleRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedIngredientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [r, u] = await Promise.all([getAnalysisRules(), getUnmatchedIngredients()]);
    setRules(r);
    setUnmatched(u);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const toggleRule = async (rule: AnalysisRuleRow) => {
    const next = !rule.is_active;
    setRules((prev) => prev.map((x) => (x.id === rule.id ? { ...x, is_active: next } : x)));
    await setAnalysisRuleActive(rule.id, next);
    notify.success(`규칙 "${rule.title}" ${next ? '활성화' : '비활성화'}`);
  };

  const updateUnmatched = async (
    row: UnmatchedIngredientRow,
    status: 'resolved' | 'ignored',
  ) => {
    setUnmatched((prev) => prev.map((x) => (x.id === row.id ? { ...x, status } : x)));
    await setUnmatchedStatus(row.id, status);
    notify.success(`"${row.raw_name}" ${status === 'resolved' ? '처리됨' : '무시'}로 표시`);
  };

  const pendingCount = useMemo(
    () => unmatched.filter((u) => u.status === 'pending').length,
    [unmatched],
  );

  return (
    <div style={{ maxWidth: 920 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setTab('rules')}
          style={tabStyle(tab === 'rules')}
        >
          규칙 관리 ({rules.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('unmatched')}
          style={tabStyle(tab === 'unmatched')}
        >
          미매칭 원료 검수 ({pendingCount})
        </button>
        <button
          type="button"
          onClick={load}
          style={{ marginLeft: 'auto', ...iconBtn }}
          title="새로고침"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading && <p style={{ color: '#9CA3AF', fontSize: 14 }}>불러오는 중…</p>}

      {!loading && tab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rules.length === 0 && (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>
              등록된 규칙이 없어요. (analysis_rules 시드 마이그레이션을 적용했는지 확인하세요.)
            </p>
          )}
          {rules.map((rule) => {
            const meta = SEVERITY_META[rule.severity] ?? SEVERITY_META.info;
            return (
              <div key={rule.id} style={card(rule.is_active)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={badge(meta.color)}>
                    {meta.icon} {meta.label}
                  </span>
                  <strong style={{ fontSize: 14, color: '#111827' }}>{rule.title}</strong>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {rule.score_delta > 0 ? `+${rule.score_delta}` : rule.score_delta}점
                  </span>
                  {rule.species && rule.species !== 'both' && (
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {rule.species === 'dog' ? '🐶 강아지' : '🐱 고양이'}
                    </span>
                  )}
                  <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rule.is_active}
                      onChange={() => toggleRule(rule)}
                    />
                    <span style={{ fontSize: 12, color: rule.is_active ? '#15803D' : '#9CA3AF' }}>
                      {rule.is_active ? '활성' : '비활성'}
                    </span>
                  </label>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4B5563', lineHeight: 1.5 }}>
                  {rule.message_template}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                  {rule.id} · 근거: {rule.evidence_level}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!loading && tab === 'unmatched' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unmatched.length === 0 && (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>
              아직 기록된 미매칭 원료가 없어요. 스캐너 분석에서 사전에 없는 원료가 나오면 여기에 쌓여요.
            </p>
          )}
          {unmatched.map((row) => (
            <div key={row.id} style={card(row.status === 'pending')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <strong style={{ fontSize: 14, color: '#111827' }}>{row.raw_name}</strong>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{row.occurrences}회 발견</span>
                <span style={statusBadge(row.status)}>{statusLabel(row.status)}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    style={iconBtn}
                    title="사전 등록 완료 처리"
                    onClick={() => updateUnmatched(row, 'resolved')}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    style={iconBtn}
                    title="무시"
                    onClick={() => updateUnmatched(row, 'ignored')}
                  >
                    <EyeOff size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    borderRadius: 12,
    border: 'none',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    background: active ? 'var(--primary, #3182F6)' : '#F3F4F6',
    color: active ? '#fff' : '#4B5563',
  };
}

const iconBtn: React.CSSProperties = {
  padding: 8,
  borderRadius: 10,
  border: '1px solid #E5E7EB',
  background: '#fff',
  cursor: 'pointer',
  color: '#4B5563',
  display: 'inline-flex',
  alignItems: 'center',
};

function card(active: boolean): React.CSSProperties {
  return {
    padding: '14px 16px',
    borderRadius: 14,
    border: '1px solid #EEF0F3',
    background: active ? '#fff' : '#FAFAFA',
    opacity: active ? 1 : 0.7,
  };
}

function badge(color: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    color: '#fff',
    background: color,
  };
}

function statusLabel(status: string) {
  return status === 'resolved' ? '처리됨' : status === 'ignored' ? '무시' : '대기';
}

function statusBadge(status: string): React.CSSProperties {
  const color = status === 'resolved' ? '#15803D' : status === 'ignored' ? '#9CA3AF' : '#F59E0B';
  return {
    padding: '2px 8px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    color,
    background: `${color}1A`,
  };
}

export default AdminAnalysis;
