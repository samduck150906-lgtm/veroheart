import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { notify } from '../../store/useNotification';
import {
  fetchSettings,
  saveSettings,
  type AdminSettingRow,
  type SettingKey,
  type SettingsMap,
} from '../../lib/adminApi';

/** DB(app_settings)에서 런타임으로 바꿀 수 있는 불리언 설정 */
const BOOLEAN_SETTINGS: { key: SettingKey; title: string; description: string }[] = [
  {
    key: 'maintenance_mode',
    title: '점검 모드',
    description: '켜면 사용자 앱에 점검 안내를 노출합니다.',
  },
  {
    key: 'signup_enabled',
    title: '신규 회원 가입 허용',
    description: '끄면 신규 가입 화면에서 가입을 막습니다.',
  },
  {
    key: 'viral_event_visible',
    title: '바이럴 이벤트 노출',
    description: '성향 테스트·공유 이벤트 진입 노출 여부입니다.',
  },
  {
    key: 'phase2_alias_observation_enabled',
    title: 'Phase 2 별칭 관찰 모드',
    description:
      '켜면 원재료 매칭 결과만 관찰·기록합니다. 사용자 점수·위험도 판정에는 영향이 없습니다.',
  },
];

/** 배포(환경변수)로만 바꿀 수 있는 값 — 토글로 위장하지 않고 읽기 전용으로 표시한다. */
const DEPLOY_ONLY = [
  { label: 'Supabase 프로젝트 URL', envKey: 'VITE_SUPABASE_URL' },
  { label: 'Supabase anon 키', envKey: 'VITE_SUPABASE_ANON_KEY' },
  { label: '카카오 JavaScript 키', envKey: 'VITE_KAKAO_JAVASCRIPT_KEY' },
  { label: 'Edge Function CORS 허용 도메인', envKey: 'CORS_ALLOWED_ORIGINS' },
];

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return false;
}

interface ServiceNotice {
  enabled: boolean;
  message: string;
}

function asNotice(value: unknown): ServiceNotice {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return { enabled: asBoolean(v.enabled), message: typeof v.message === 'string' ? v.message : '' };
  }
  return { enabled: false, message: '' };
}

const AdminSettings: React.FC = () => {
  const [rows, setRows] = useState<AdminSettingRow[] | null>(null);
  const [draft, setDraft] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSettings();
      setRows(data);
      setDraft(Object.fromEntries(data.map((row) => [row.key, row.value])) as SettingsMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 서버에 저장된 현재 설정을 불러온다.
    load();
  }, [load]);

  const original = useMemo(
    () => Object.fromEntries((rows ?? []).map((row) => [row.key, JSON.stringify(row.value)])),
    [rows],
  );

  const dirty = useMemo(
    () => Object.entries(draft).some(([key, value]) => original[key] !== JSON.stringify(value)),
    [draft, original],
  );

  const notice = asNotice(draft.service_notice);

  const handleSave = async () => {
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const changed: SettingsMap = {};
      for (const [key, value] of Object.entries(draft)) {
        if (original[key] !== JSON.stringify(value)) changed[key as SettingKey] = value;
      }
      const count = await saveSettings(changed);
      notify.success(`설정 ${count}건을 저장했습니다.`);
      await load();
    } catch (err) {
      notify.error(`저장 실패: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-toolbar">
        <div className="admin-title-wrap">
          <h2>시스템 설정</h2>
          <p>서버(app_settings)에 저장되는 런타임 설정입니다.</p>
        </div>
        <button type="button" className="admin-btn-primary" onClick={handleSave} disabled={saving || !dirty || loading}>
          {saving ? '저장 중…' : dirty ? '변경사항 저장' : '변경사항 없음'}
        </button>
      </div>

      {loading ? (
        <div className="admin-card">
          <div className="admin-empty">설정을 불러오는 중입니다…</div>
        </div>
      ) : error ? (
        <div className="admin-card">
          <strong>설정을 불러오지 못했습니다.</strong>
          <p className="admin-item-sub" style={{ marginTop: 6 }}>{error}</p>
          <p className="admin-item-sub" style={{ marginTop: 6 }}>
            app_settings 테이블이 아직 없다면 20260728140000_admin_console_operations.sql 마이그레이션을 적용해 주세요.
          </p>
          <button type="button" className="admin-btn-soft" style={{ marginTop: 10 }} onClick={load}>
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <div className="admin-settings-grid">
            {BOOLEAN_SETTINGS.map((setting) => {
              const row = (rows ?? []).find((r) => r.key === setting.key);
              const enabled = asBoolean(draft[setting.key]);
              return (
                <article className="admin-setting-item" key={setting.key}>
                  <h4>{setting.title}</h4>
                  <p>{setting.description}</p>
                  <button
                    type="button"
                    className={`admin-setting-toggle ${enabled ? 'active' : ''}`}
                    aria-pressed={enabled}
                    onClick={() => setDraft((prev) => ({ ...prev, [setting.key]: !enabled }))}
                  >
                    {enabled ? '활성화됨' : '비활성화됨'}
                  </button>
                  {row?.updatedAt && (
                    <p className="admin-item-sub" style={{ marginTop: 8 }}>
                      최근 변경: {new Date(row.updatedAt).toLocaleString('ko-KR')}
                      {row.updatedBy ? ` · ${row.updatedBy}` : ''}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <article className="admin-card" style={{ marginTop: 14 }}>
            <h3 className="admin-card-title">서비스 공지</h3>
            <button
              type="button"
              className={`admin-setting-toggle ${notice.enabled ? 'active' : ''}`}
              aria-pressed={notice.enabled}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  service_notice: { ...asNotice(prev.service_notice), enabled: !notice.enabled },
                }))
              }
            >
              {notice.enabled ? '노출 중' : '숨김'}
            </button>
            <div className="admin-form-group" style={{ marginTop: 12 }}>
              <label htmlFor="setting-notice-message">공지 문구</label>
              <textarea
                id="setting-notice-message"
                rows={2}
                maxLength={300}
                value={notice.message}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    service_notice: { ...asNotice(prev.service_notice), message: e.target.value },
                  }))
                }
                placeholder="사용자에게 보여줄 공지 문구"
              />
            </div>
          </article>

          <article className="admin-card" style={{ marginTop: 14 }}>
            <h3 className="admin-card-title">
              <Lock size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              배포 환경에서만 변경 가능
            </h3>
            <p className="admin-item-sub" style={{ marginBottom: 10 }}>
              아래 값은 재배포가 필요한 환경변수입니다. 관리자 콘솔에서 바꿀 수 없습니다.
            </p>
            {DEPLOY_ONLY.map((item) => (
              <div className="admin-progress-row" key={item.envKey} style={{ padding: '6px 0' }}>
                <span>{item.label}</span>
                <code className="admin-item-sub">{item.envKey}</code>
              </div>
            ))}
          </article>
        </>
      )}
    </div>
  );
};

export default AdminSettings;
