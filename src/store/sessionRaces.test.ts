/**
 * 회귀 테스트 — 늦게 도착한 응답이 최신 상태를 덮어쓰는 문제.
 *
 * 배경 1(제품 상세): A 를 눌렀다가 곧바로 B 로 넘어가면 두 요청이 동시에 뜬다.
 *   순번이 없으면 늦게 온 A 가 B 화면을 덮어써, 주소는 B 인데 A 의 점수·분석이
 *   표시된다. 사용자는 다른 제품의 분석 결과를 그 제품의 것으로 읽게 된다.
 * 배경 2(세션): 스플래시 watchdog(8초) 때문에 초기화가 끝나기 전에도 앱이 열린다.
 *   그 사이 로그아웃하면 뒤늦게 도착한 초기화 결과가 세션을 되살렸다.
 * 배경 3(프로필): 저장에 실패해도 낙관적 변경이 남아, 저장되지 않은 몸무게·알레르기
 *   기준으로 적합도 점수가 표시됐다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProductDetail = vi.fn();
const saveUserPet = vi.fn();
const supabaseSignOut = vi.fn(async () => {});

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } },
  getProducts: vi.fn(async () => []),
  getProductDetail: (...a: unknown[]) => getProductDetail(...a),
  getInitialSessionUser: vi.fn(async () => null),
  getUserPets: vi.fn(async () => []),
  saveUserPet: (...a: unknown[]) => saveUserPet(...a),
  deleteUserPet: vi.fn(async () => true),
  getFavorites: vi.fn(async () => []),
  addFavorite: vi.fn(async () => true),
  removeFavorite: vi.fn(async () => true),
  addRecentView: vi.fn(async () => {}),
  getRecentViews: vi.fn(async () => []),
  signOut: (...a: unknown[]) => supabaseSignOut(...(a as [])),
}));

vi.mock('./useNotification', () => ({
  notify: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const { useStore } = await import('./useStore');
const initial = useStore.getState();

/** 해소 시점을 테스트가 직접 정하는 지연 응답 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  useStore.setState({ ...initial, selectedProduct: null, userId: null, favorites: [] });
  getProductDetail.mockReset();
  saveUserPet.mockReset();
});

describe('제품 상세 요청 순서', () => {
  it('늦게 도착한 이전 요청이 최신 제품을 덮어쓰지 않는다', async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    getProductDetail.mockImplementation((id: string) => (id === 'A' ? a.promise : b.promise));

    const slow = useStore.getState().fetchProductDetail('A');
    const fast = useStore.getState().fetchProductDetail('B');

    // 나중에 시작한 B 가 먼저 도착하고, 먼저 시작한 A 가 뒤늦게 도착한다.
    b.resolve({ id: 'B', name: '빠른 제품' });
    await fast;
    expect(useStore.getState().selectedProduct?.id).toBe('B');

    a.resolve({ id: 'A', name: '느린 제품' });
    await slow;

    // 늦게 온 A 가 현재 화면(B)을 덮어쓰면 안 된다.
    expect(useStore.getState().selectedProduct?.id).toBe('B');
    expect(useStore.getState().isLoadingProducts).toBe(false);
  });

  it('늦게 도착한 이전 요청의 실패가 최신 화면을 지우지 않는다', async () => {
    const a = deferred<unknown>();
    const b = deferred<unknown>();
    getProductDetail.mockImplementation((id: string) => (id === 'A' ? a.promise : b.promise));

    const slow = useStore.getState().fetchProductDetail('A');
    const fast = useStore.getState().fetchProductDetail('B');

    b.resolve({ id: 'B', name: '빠른 제품' });
    await fast;

    a.reject(new Error('네트워크 실패'));
    await slow;

    expect(useStore.getState().selectedProduct?.id).toBe('B');
  });

  it('가장 최근 요청이 빈 결과면 화면을 비운다', async () => {
    const b = deferred<unknown>();
    getProductDetail.mockImplementation(() => b.promise);

    const only = useStore.getState().fetchProductDetail('B');
    b.resolve(null);
    await only;

    expect(useStore.getState().selectedProduct).toBeNull();
    expect(useStore.getState().isLoadingProducts).toBe(false);
  });
});

describe('프로필 저장 실패 롤백', () => {
  it('저장에 실패하면 낙관적 변경을 되돌린다', async () => {
    useStore.setState({ userId: 'u1', profile: { ...initial.profile, weightKg: 5, name: '보리' } });
    saveUserPet.mockResolvedValue(null); // 오프라인 등으로 저장 실패

    await useStore.getState().updateProfile({ weightKg: 9 });

    expect(useStore.getState().profile.weightKg).toBe(5);
  });

  it('저장에 성공하면 서버가 돌려준 값이 남는다', async () => {
    useStore.setState({ userId: 'u1', profile: { ...initial.profile, weightKg: 5, name: '보리' } });
    saveUserPet.mockResolvedValue({
      id: 'pet-1',
      user_id: 'u1',
      name: '보리',
      pet_type: 'dog',
      age_group: 'adult',
      weight: 9,
      breed: null,
      image_url: null,
      conditions: [],
      allergies: [],
    });

    await useStore.getState().updateProfile({ weightKg: 9 });

    expect(useStore.getState().profile.weightKg).toBe(9);
  });

  it('비로그인 상태에서는 로컬 프로필 변경을 유지한다', async () => {
    useStore.setState({ userId: null, profile: { ...initial.profile, weightKg: 5 } });

    await useStore.getState().updateProfile({ weightKg: 9 });

    expect(useStore.getState().profile.weightKg).toBe(9);
    expect(saveUserPet).not.toHaveBeenCalled();
  });
});
