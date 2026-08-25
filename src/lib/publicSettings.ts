/**
 * 사용자 앱이 읽는 공개 런타임 설정(app_settings).
 *
 * - `is_public = true` 인 키만 anon SELECT 정책으로 읽을 수 있다.
 * - 관리자 콘솔(admin-write Edge Function)만 쓸 수 있다.
 * - 앱 세션당 1회만 조회하고 캐시한다. 조회 실패 시 안전한 기본값으로 되돌아가
 *   설정 테이블이 없는 환경(마이그레이션 미적용)에서도 기능이 끊기지 않는다.
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ServiceNotice {
  enabled: boolean;
  message: string;
}

export interface PublicSettings {
  maintenanceMode: boolean;
  signupEnabled: boolean;
  viralEventVisible: boolean;
  serviceNotice: ServiceNotice;
  phase2AliasObservationEnabled: boolean;
}

/** 설정을 못 읽었을 때의 기본값 — 서비스가 열려 있는 상태를 기본으로 둔다. */
export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  maintenanceMode: false,
  signupEnabled: true,
  viralEventVisible: true,
  serviceNotice: { enabled: false, message: '' },
  phase2AliasObservationEnabled: false,
};

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return fallback;
}

function asNotice(value: unknown): ServiceNotice {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    return {
      enabled: asBoolean(v.enabled, false),
      message: typeof v.message === 'string' ? v.message : '',
    };
  }
  return { enabled: false, message: '' };
}

export function mapSettingsRows(rows: { key: string; value: unknown }[]): PublicSettings {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return {
    maintenanceMode: asBoolean(byKey.get('maintenance_mode'), DEFAULT_PUBLIC_SETTINGS.maintenanceMode),
    signupEnabled: asBoolean(byKey.get('signup_enabled'), DEFAULT_PUBLIC_SETTINGS.signupEnabled),
    viralEventVisible: asBoolean(byKey.get('viral_event_visible'), DEFAULT_PUBLIC_SETTINGS.viralEventVisible),
    serviceNotice: byKey.has('service_notice')
      ? asNotice(byKey.get('service_notice'))
      : DEFAULT_PUBLIC_SETTINGS.serviceNotice,
    phase2AliasObservationEnabled: asBoolean(
      byKey.get('phase2_alias_observation_enabled'),
      DEFAULT_PUBLIC_SETTINGS.phase2AliasObservationEnabled,
    ),
  };
}

/**
 * 캐시 수명(ms).
 *
 * 예전에는 세션당 1회만 읽고 영구 캐시했다. 그래서 관리자가 점검 모드를 켜거나
 * 가입을 닫아도, 이미 앱을 열어 둔 사용자에게는 새로고침 전까지 반영되지 않았다.
 * 운영 스위치는 "지금 눌러서 지금 먹히는" 것이 목적이므로 수명을 둔다.
 * (요청 자체는 공개 키 몇 줄짜리 SELECT 라 5분 간격이면 부담이 없다.)
 */
const SETTINGS_TTL_MS = 5 * 60 * 1000;

let cached: PublicSettings | null = null;
let cachedAt = 0;
let inFlight: Promise<PublicSettings> | null = null;

/** 테스트 전용 — 캐시를 비운다. */
export function __resetPublicSettingsCache(): void {
  cached = null;
  cachedAt = 0;
  inFlight = null;
}

function isCacheFresh(): boolean {
  return cached !== null && Date.now() - cachedAt < SETTINGS_TTL_MS;
}

export async function loadPublicSettings(): Promise<PublicSettings> {
  if (isCacheFresh()) return cached as PublicSettings;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isSupabaseConfigured) return DEFAULT_PUBLIC_SETTINGS;
    try {
      const { data, error } = await supabase.from('app_settings').select('key, value');
      if (error || !data) return DEFAULT_PUBLIC_SETTINGS;
      const settings = mapSettingsRows(data as { key: string; value: unknown }[]);
      cached = settings;
      cachedAt = Date.now();
      return settings;
    } catch {
      return DEFAULT_PUBLIC_SETTINGS;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** 공개 설정 훅. 로드 전에는 안전한 기본값을 돌려준다. */
export function usePublicSettings(): PublicSettings {
  const [settings, setSettings] = useState<PublicSettings>(cached ?? DEFAULT_PUBLIC_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      loadPublicSettings().then((next) => {
        if (!cancelled) setSettings(next);
      });
    };

    sync();
    // 캐시가 만료될 즈음 한 번 더 확인하고, 앱을 다시 앞으로 가져올 때도 맞춘다
    // (모바일에서는 탭을 며칠씩 열어 두는 일이 흔하다).
    const timer = window.setInterval(sync, SETTINGS_TTL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return settings;
}
