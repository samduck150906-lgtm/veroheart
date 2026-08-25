/**
 * 회귀 테스트 — 비교함 상한과 찜 낙관적 갱신.
 *
 * 배경 1: 스토어는 4개까지 담고 비교 화면은 3개만 그려서, 4번째 제품이 "비교 담김"
 *         으로 표시된 채 비교표에서 조용히 사라졌다. 5번째부터는 새로 담은 제품이
 *         아니라 기존 항목이 유지돼 담기 자체가 무시됐다.
 * 배경 2: 찜은 낙관적으로 켜 두고 서버 오류를 통째로 삼켜, 저장에 실패해도 화면에는
 *         찜한 것처럼 남았다가 새로고침에서 사라졌다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const addFavorite = vi.fn();
const removeFavorite = vi.fn();
const notifyWarning = vi.fn();
const notifyError = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } },
  getProducts: vi.fn(async () => []),
  getInitialSessionUser: vi.fn(async () => null),
  getUserPets: vi.fn(async () => []),
  saveUserPet: vi.fn(async () => null),
  deleteUserPet: vi.fn(async () => true),
  getFavorites: vi.fn(async () => []),
  addFavorite: (...args: unknown[]) => addFavorite(...args),
  removeFavorite: (...args: unknown[]) => removeFavorite(...args),
  addRecentView: vi.fn(async () => {}),
  getRecentViews: vi.fn(async () => []),
  signOut: vi.fn(async () => {}),
}));

vi.mock('./useNotification', () => ({
  notify: {
    warning: (...args: unknown[]) => notifyWarning(...args),
    error: (...args: unknown[]) => notifyError(...args),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const { useStore, MAX_COMPARISON } = await import('./useStore');

const initial = useStore.getState();

beforeEach(() => {
  useStore.setState({ ...initial, comparisonList: [], favorites: [], userId: null });
  addFavorite.mockReset();
  removeFavorite.mockReset();
  notifyWarning.mockReset();
  notifyError.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('비교함 상한', () => {
  it(`${MAX_COMPARISON}개까지는 담긴다`, () => {
    const { addToComparison } = useStore.getState();
    for (let i = 0; i < MAX_COMPARISON; i += 1) {
      expect(addToComparison(`p${i}`)).toBe(true);
    }
    expect(useStore.getState().comparisonList).toHaveLength(MAX_COMPARISON);
  });

  it('상한을 넘긴 담기는 거절되고 기존 목록을 바꾸지 않는다', () => {
    const { addToComparison } = useStore.getState();
    for (let i = 0; i < MAX_COMPARISON; i += 1) addToComparison(`p${i}`);

    const before = useStore.getState().comparisonList;
    expect(addToComparison('overflow')).toBe(false);
    expect(useStore.getState().comparisonList).toEqual(before);
    expect(useStore.getState().comparisonList).not.toContain('overflow');
  });

  it('이미 담긴 제품을 다시 담으면 거절하고 중복되지 않는다', () => {
    const { addToComparison } = useStore.getState();
    expect(addToComparison('dup')).toBe(true);
    expect(addToComparison('dup')).toBe(false);
    expect(useStore.getState().comparisonList).toEqual(['dup']);
  });

  it('빼고 나면 다시 담을 수 있다', () => {
    const { addToComparison, removeFromComparison } = useStore.getState();
    for (let i = 0; i < MAX_COMPARISON; i += 1) addToComparison(`p${i}`);
    expect(addToComparison('later')).toBe(false);

    removeFromComparison('p0');
    expect(addToComparison('later')).toBe(true);
    expect(useStore.getState().comparisonList).toContain('later');
    expect(useStore.getState().comparisonList).toHaveLength(MAX_COMPARISON);
  });
});

describe('찜 낙관적 갱신', () => {
  it('비로그인 상태에서는 찜 상태를 바꾸지 않고 로그인을 안내한다', async () => {
    await useStore.getState().toggleFavorite('prod-1');
    expect(useStore.getState().favorites).toEqual([]);
    expect(notifyWarning).toHaveBeenCalled();
    expect(addFavorite).not.toHaveBeenCalled();
  });

  it('서버 저장에 성공하면 찜이 유지된다', async () => {
    useStore.setState({ userId: 'u1' });
    addFavorite.mockResolvedValue(true);

    await useStore.getState().toggleFavorite('prod-1');
    expect(useStore.getState().favorites).toEqual(['prod-1']);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('서버 저장에 실패하면 낙관적 추가를 되돌린다', async () => {
    useStore.setState({ userId: 'u1' });
    addFavorite.mockResolvedValue(false);

    await useStore.getState().toggleFavorite('prod-1');
    expect(useStore.getState().favorites).toEqual([]);
    expect(notifyError).toHaveBeenCalled();
  });

  it('서버 삭제에 실패하면 낙관적 해제를 되돌린다', async () => {
    useStore.setState({ userId: 'u1', favorites: ['prod-1'] });
    removeFavorite.mockResolvedValue(false);

    await useStore.getState().toggleFavorite('prod-1');
    expect(useStore.getState().favorites).toEqual(['prod-1']);
    expect(notifyError).toHaveBeenCalled();
  });
});
