/**
 * Phase 2 별칭 리졸버 — 관찰(observation) 전용 배선.
 *
 * 계약: docs/phase2-alias-resolver-integration-contract.md
 *
 * 이 모듈이 하는 일
 *   - exact 별칭 매칭 결과를 집계한다
 *   - 매칭되지 않은 원료 문자열을 검수 큐(unmatched_ingredients)에 적재한다
 *
 * 이 모듈이 절대 하지 않는 일
 *   - 점수 변경 / 위험도 판정 변경 / 알레르기 판정 변경
 *   - 원본 원재료 문자열 대체 (분석 엔진에는 항상 원문이 그대로 전달된다)
 *   - canonical / alias row 자동 생성
 *   - 기본값 활성화 (플래그가 꺼져 있으면 네트워크 호출이 0건이다)
 *
 * 플래그 구조
 *   1) 빌드 플래그 `VITE_ENABLE_PHASE2_ALIAS_OBSERVATION` (기본 false)
 *      → false 면 이 모듈은 어떤 쿼리도 만들지 않는다.
 *   2) 런타임 킬 스위치 `app_settings.phase2_alias_observation_enabled`
 *      → 빌드 플래그가 켜진 상태에서 재배포 없이 끌 수 있다.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { isPhase2ObservationBuildEnabled } from './phase2ObservationFlag';
import {
  normalizePhase2AliasKey,
  resolvePhase2Alias,
  type Phase2AliasSeed,
  type Phase2CanonicalSeed,
} from './phase2AliasResolver';

export interface Phase2ObservationSeed {
  canonicals: Phase2CanonicalSeed[];
  aliases: Phase2AliasSeed[];
}

export interface Phase2ObservationSummary {
  /** 플래그가 꺼져 있어 아무것도 하지 않았는지 여부 */
  skipped: boolean;
  matched: number;
  unmatched: number;
  ambiguous: number;
  blocked: number;
  /** 큐에 실제로 적재를 시도한 건수(세션 내 중복 제외) */
  queued: number;
}

const EMPTY_SUMMARY: Phase2ObservationSummary = {
  skipped: true,
  matched: 0,
  unmatched: 0,
  ambiguous: 0,
  blocked: 0,
  queued: 0,
};

export { isPhase2ObservationBuildEnabled };

let runtimeKillSwitch = true;

/** 운영 킬 스위치. app_settings 값을 앱이 읽어 넣는다(기본은 켜짐 = 빌드 플래그를 따름). */
export function setPhase2ObservationRuntimeEnabled(enabled: boolean): void {
  runtimeKillSwitch = enabled;
}

export function isPhase2ObservationEnabled(): boolean {
  return isPhase2ObservationBuildEnabled() && runtimeKillSwitch;
}

// 세션 동안 이미 보고한 정규화 키 — 같은 원료로 무한히 RPC 를 부르지 않는다.
const reportedKeys = new Set<string>();

/** 테스트 전용 — 모듈 상태를 초기화한다. */
export function __resetPhase2ObservationState(): void {
  reportedKeys.clear();
  runtimeKillSwitch = true;
  cachedSeed = null;
  cachedSeedPromise = null;
  killSwitchChecked = false;
}

let cachedSeed: Phase2ObservationSeed | null = null;
let cachedSeedPromise: Promise<Phase2ObservationSeed> | null = null;
let killSwitchChecked = false;

/**
 * 운영 킬 스위치 확인 — app_settings 에 명시적으로 false 가 저장돼 있을 때만 끈다.
 * 행이 없거나 조회에 실패하면 빌드 플래그를 그대로 따른다(관찰이 조용히 꺼지지 않게).
 * 빌드 플래그가 꺼져 있으면 이 함수는 호출되지 않으므로 추가 쿼리도 없다.
 */
async function ensureRuntimeKillSwitch(): Promise<void> {
  if (killSwitchChecked || !isSupabaseConfigured) return;
  killSwitchChecked = true;
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'phase2_alias_observation_enabled')
      .maybeSingle();
    if (error || !data) return;
    if (data.value === false || data.value === 'false') runtimeKillSwitch = false;
  } catch {
    // 조회 실패는 무시 — 빌드 플래그 기준으로 계속한다.
  }
}

interface CanonicalRow {
  id: string;
  canonical_name_ko: string;
}
interface AliasRow {
  alias_text: string;
  canonical_ingredient_id: string;
}

/**
 * canonical 시드를 1회만 읽어 캐시한다. 플래그가 꺼져 있으면 호출되지 않는다.
 * 조회 실패는 빈 시드로 처리한다 — 관찰이 실패해도 분석은 계속되어야 한다.
 */
async function loadSeed(): Promise<Phase2ObservationSeed> {
  if (cachedSeed) return cachedSeed;
  if (cachedSeedPromise) return cachedSeedPromise;

  cachedSeedPromise = (async () => {
    if (!isSupabaseConfigured) return { canonicals: [], aliases: [] };
    try {
      const [canonicalRes, aliasRes] = await Promise.all([
        supabase.from('canonical_ingredients').select('id, canonical_name_ko').eq('status', 'active'),
        supabase.from('canonical_ingredient_aliases').select('alias_text, canonical_ingredient_id'),
      ]);

      const canonicalRows = (canonicalRes.data ?? []) as CanonicalRow[];
      const nameById = new Map(canonicalRows.map((row) => [row.id, row.canonical_name_ko]));

      const seed: Phase2ObservationSeed = {
        canonicals: canonicalRows.map((row) => ({
          canonicalName: row.canonical_name_ko,
          canonicalId: row.id,
        })),
        aliases: ((aliasRes.data ?? []) as AliasRow[])
          .filter((row) => nameById.has(row.canonical_ingredient_id))
          .map((row) => ({
            alias: row.alias_text,
            canonicalName: nameById.get(row.canonical_ingredient_id) as string,
            canonicalId: row.canonical_ingredient_id,
          })),
      };
      cachedSeed = seed;
      return seed;
    } catch {
      return { canonicals: [], aliases: [] };
    } finally {
      cachedSeedPromise = null;
    }
  })();

  return cachedSeedPromise;
}

export interface ObserveOptions {
  productId?: string | null;
  /** 테스트/드라이런용 시드 주입. 없으면 DB에서 읽는다. */
  seed?: Phase2ObservationSeed;
  /** 미매칭 큐 적재 함수 주입(테스트용). */
  reportUnmatched?: (rawName: string, productId: string | null) => Promise<void>;
}

async function defaultReportUnmatched(rawName: string, productId: string | null): Promise<void> {
  if (!isSupabaseConfigured) return;
  // SECURITY DEFINER RPC — 정규화 키 기준 upsert 라 중복 row 가 생기지 않는다.
  await supabase.rpc('log_unmatched_ingredient', { p_raw: rawName, p_product_id: productId });
}

/**
 * 원재료 라벨 목록을 관찰한다. 어떤 경우에도 예외를 던지지 않으며,
 * 반환값은 진단용일 뿐 분석 결과에 사용되지 않는다.
 */
export async function observeIngredientLabels(
  labels: string[],
  options: ObserveOptions = {},
): Promise<Phase2ObservationSummary> {
  if (!isPhase2ObservationBuildEnabled()) return { ...EMPTY_SUMMARY };
  await ensureRuntimeKillSwitch();
  if (!isPhase2ObservationEnabled()) return { ...EMPTY_SUMMARY };
  if (!Array.isArray(labels) || labels.length === 0) return { ...EMPTY_SUMMARY, skipped: false };

  try {
    const seed = options.seed ?? (await loadSeed());
    const report = options.reportUnmatched ?? defaultReportUnmatched;
    const productId = options.productId ?? null;

    const summary: Phase2ObservationSummary = {
      skipped: false,
      matched: 0,
      unmatched: 0,
      ambiguous: 0,
      blocked: 0,
      queued: 0,
    };

    const pending: string[] = [];
    const seenThisRun = new Set<string>();

    for (const label of labels) {
      const raw = String(label ?? '').trim();
      if (!raw) continue;
      const key = normalizePhase2AliasKey(raw);
      if (!key || seenThisRun.has(key)) continue;
      seenThisRun.add(key);

      const result = resolvePhase2Alias({
        label: raw,
        aliases: seed.aliases,
        canonicals: seed.canonicals,
      });

      if (result.status === 'matched') summary.matched += 1;
      else if (result.status === 'ambiguous') summary.ambiguous += 1;
      else if (result.status === 'blocked') summary.blocked += 1;
      else {
        summary.unmatched += 1;
        if (!reportedKeys.has(key)) {
          reportedKeys.add(key);
          pending.push(raw);
        }
      }
    }

    // fire-and-forget: 적재 실패가 화면 동작에 영향을 주지 않도록 개별 예외를 삼킨다.
    await Promise.all(
      pending.map((raw) =>
        report(raw, productId).catch((err) => {
          console.warn('phase2 observation queue failed:', err);
        }),
      ),
    );
    summary.queued = pending.length;

    return summary;
  } catch (err) {
    console.warn('phase2 observation failed:', err);
    return { ...EMPTY_SUMMARY, skipped: false };
  }
}
