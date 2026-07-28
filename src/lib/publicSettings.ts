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

let cached: PublicSettings | null = null;
let inFlight: Promise<PublicSettings> | null = null;

/** 테스트 전용 — 캐시를 비운다. */
export function __resetPublicSettingsCache(): void {
  cached = null;
  inFlight = null;
}

export async function loadPublicSettings(): Promise<PublicSettings> {
  if (cached) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isSupabaseConfigured) return DEFAULT_PUBLIC_SETTINGS;
    try {
      const { data, error } = await supabase.from('app_settings').select('key, value');
      if (error || !data) return DEFAULT_PUBLIC_SETTINGS;
      const settings = mapSettingsRows(data as { key: string; value: unknown }[]);
      cached = settings;
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
    loadPublicSettings().then((next) => {
      if (!cancelled) setSettings(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return settings;
}
