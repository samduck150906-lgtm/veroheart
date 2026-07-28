/**
 * Phase 2 관찰 모드 안전성 테스트.
 *
 * 핵심 계약: 플래그 ON/OFF 어느 쪽에서도 분석 점수·판정은 바뀌지 않는다.
 * 이 파일은 관찰 모듈 자체가 (a) OFF 일 때 아무 일도 하지 않고,
 * (b) ON 일 때도 기록만 하며 원본 문자열을 보존하는지 확인한다.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ENV_KEY = 'VITE_ENABLE_PHASE2_ALIAS_OBSERVATION';

// 관찰 모듈은 시드/적재 함수를 주입받으므로 Supabase 클라이언트가 필요 없다.
// 모듈 리셋마다 실제 클라이언트가 새로 생성되지 않도록 모킹한다.
vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: [] }) }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

const SEED = {
  canonicals: [{ canonicalName: '닭고기', canonicalId: 'c1' }],
  aliases: [
    { alias: '닭 고기', canonicalName: '닭고기', canonicalId: 'c1' },
    { alias: 'chicken', canonicalName: '닭고기', canonicalId: 'c1' },
  ],
};

async function loadModule() {
  vi.resetModules();
  return import('./phase2Observation');
}

describe('phase2Observation', () => {
  const originalEnv = import.meta.env[ENV_KEY];

  beforeEach(() => {
    import.meta.env[ENV_KEY] = 'false';
  });

  afterEach(() => {
    import.meta.env[ENV_KEY] = originalEnv;
    vi.restoreAllMocks();
  });

  it('플래그가 꺼져 있으면 아무 것도 하지 않고 네트워크 호출도 없다', async () => {
    const mod = await loadModule();
    const report = vi.fn();

    const summary = await mod.observeIngredientLabels(['닭고기', '알 수 없는 원료'], {
      seed: SEED,
      reportUnmatched: report,
    });

    expect(summary.skipped).toBe(true);
    expect(summary.queued).toBe(0);
    expect(report).not.toHaveBeenCalled();
  });

  it('기본값은 비활성이다 (환경변수 미설정)', async () => {
    delete import.meta.env[ENV_KEY];
    const mod = await loadModule();
    expect(mod.isPhase2ObservationEnabled()).toBe(false);
  });

  it("문자열 'true' 만 활성으로 인정한다", async () => {
    import.meta.env[ENV_KEY] = '1';
    let mod = await loadModule();
    expect(mod.isPhase2ObservationEnabled()).toBe(false);

    import.meta.env[ENV_KEY] = 'true';
    mod = await loadModule();
    expect(mod.isPhase2ObservationEnabled()).toBe(true);
  });

  it('플래그가 켜지면 exact 매칭을 관찰하고 미매칭만 큐에 적재한다', async () => {
    import.meta.env[ENV_KEY] = 'true';
    const mod = await loadModule();
    const report = vi.fn().mockResolvedValue(undefined);

    const summary = await mod.observeIngredientLabels(['닭 고기', 'CHICKEN', '정체불명 원료'], {
      seed: SEED,
      reportUnmatched: report,
      productId: 'p1',
    });

    expect(summary.skipped).toBe(false);
    expect(summary.matched).toBe(2);
    expect(summary.unmatched).toBe(1);
    expect(summary.queued).toBe(1);
    expect(report).toHaveBeenCalledTimes(1);
    // 원본 문자열이 그대로 전달된다 — 정규화된 키로 덮어쓰지 않는다.
    expect(report).toHaveBeenCalledWith('정체불명 원료', 'p1');
  });

  it('같은 미매칭 원료를 세션 내에서 반복 적재하지 않는다', async () => {
    import.meta.env[ENV_KEY] = 'true';
    const mod = await loadModule();
    const report = vi.fn().mockResolvedValue(undefined);

    await mod.observeIngredientLabels(['정체불명 원료'], { seed: SEED, reportUnmatched: report });
    await mod.observeIngredientLabels(['정체불명  원료'], { seed: SEED, reportUnmatched: report });
    await mod.observeIngredientLabels(['정체불명 원료'], { seed: SEED, reportUnmatched: report });

    expect(report).toHaveBeenCalledTimes(1);
  });

  it('적재 실패가 예외로 새어나가지 않는다', async () => {
    import.meta.env[ENV_KEY] = 'true';
    const mod = await loadModule();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const report = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(
      mod.observeIngredientLabels(['정체불명 원료'], { seed: SEED, reportUnmatched: report }),
    ).resolves.toMatchObject({ skipped: false });
  });

  it('canonical row 를 자동 생성하지 않는다 (읽기 전용 시드만 사용)', async () => {
    import.meta.env[ENV_KEY] = 'true';
    const mod = await loadModule();
    const seed = { canonicals: [...SEED.canonicals], aliases: [...SEED.aliases] };
    const report = vi.fn().mockResolvedValue(undefined);

    await mod.observeIngredientLabels(['새로운 원료'], { seed, reportUnmatched: report });

    expect(seed.canonicals).toHaveLength(1);
    expect(seed.aliases).toHaveLength(2);
  });

  it('런타임 킬 스위치를 끄면 빌드 플래그가 켜져 있어도 동작하지 않는다', async () => {
    import.meta.env[ENV_KEY] = 'true';
    const mod = await loadModule();
    const report = vi.fn();

    mod.setPhase2ObservationRuntimeEnabled(false);
    const summary = await mod.observeIngredientLabels(['정체불명 원료'], {
      seed: SEED,
      reportUnmatched: report,
    });

    expect(summary.skipped).toBe(true);
    expect(report).not.toHaveBeenCalled();
  });
});
