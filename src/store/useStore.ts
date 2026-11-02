import { create } from 'zustand';
import type { AuthChangeEvent, RealtimeChannel, Session } from '@supabase/supabase-js';
import type { UserPetProfile, Product } from '../types';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getProducts,
  getInitialSessionUser,
  getUserPets,
  saveUserPet,
  deleteUserPet,
  getFavorites,
  addFavorite,
  removeFavorite,
  addRecentView,
  getRecentViews,
  getProductDetail,
  getVisibleProductsByIds,
  signOut as supabaseSignOut
} from '../lib/supabase';
import { notify } from './useNotification';
import { rememberSelectedPet, restoreSelectedPet, sortPetsByRegistration } from '../lib/petPreferences';
import {
  mapProductFromSupabaseRow,
  mapPetProfileFromRow,
  ageGroupFromAge,
} from '../lib/supabaseRowTypes';

/**
 * 비교함에 담을 수 있는 최대 제품 수.
 * 비교 화면이 나란히 세우는 열 수와 반드시 같아야 한다 — 예전에는 스토어가 4개까지
 * 받아들이고 화면은 3개만 그려서, 4번째 제품이 "담김"으로 표시된 채 비교표에서
 * 조용히 사라졌다.
 */
export const MAX_COMPARISON = 3;

/**
 * 초기화 대기 상한(ms).
 *
 * initApp 은 예외는 잡지만, 모바일 네트워크에서 요청이 거부도 응답도 하지 않고
 * 매달려 있으면 catch 가 돌지 않아 스플래시에 영영 갇힌다. 이 시간이 지나면
 * 남은 조회는 계속 두되 화면부터 열어 준다.
 */
const BOOT_TIMEOUT_MS = 8000;

/**
 * 제품 상세 요청 순번.
 *
 * 사용자가 A 를 눌렀다가 곧바로 B 로 넘어가면 두 요청이 동시에 떠 있게 된다.
 * 순번 없이 응답 순서대로 반영하면 늦게 도착한 A 가 B 화면을 덮어써서,
 * 주소는 B 인데 B 의 점수·분석 자리에 A 의 결과가 표시된다.
 * 마지막으로 시작한 요청의 응답만 반영한다.
 */
let productDetailRequestId = 0;
let productsRequestId = 0;
let recentViewsRevision = 0;
let recentViewsRequestId = 0;
let fullRecentHistory: { epoch: number; userId: string | null } | null = null;
const recentViewWrites = new Map<string, Promise<void>>();

/**
 * 세션 초기화 순번.
 *
 * initApp 은 watchdog(8초) 때문에 응답을 기다리는 도중에도 앱이 열린다. 그 사이
 * 사용자가 로그아웃하면, 뒤늦게 도착한 초기화 결과가 userId/isLoggedIn 을 다시
 * 켜서 세션 없이 로그인된 것처럼 보이는 상태가 만들어진다. 로그아웃·재초기화가
 * 순번을 올리고, 지난 순번의 결과는 버린다.
 */
let sessionEpoch = 0;
let authSubscription: { unsubscribe: () => void } | null = null;
const privateReset = {
  profile: DEFAULT_USER_PET_PROFILE, pets: [], activePetId: null,
  favorites: [], recentViews: [], comparisonList: [],
  isLoadingRecentViews: false, recentViewsError: '', guestRecentViewIds: [],
};

let adminDataSyncChannel: RealtimeChannel | null = null;
let adminDataSyncTimer: ReturnType<typeof setTimeout> | null = null;

interface StoreState {
  userId: string | null;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  /** 현재 활성(선택된) 반려동물 프로필. 앱 전역 추천·분석 기준. */
  profile: UserPetProfile;
  /** 사용자가 등록한 모든 반려동물 (다이어리·프로필 선택용) */
  pets: UserPetProfile[];
  /** 활성 반려동물 id (pets 중 하나) */
  activePetId: string | null;
  updateProfile: (updates: Partial<UserPetProfile>) => Promise<void>;
  /** 로그인 사용자의 모든 반려동물을 다시 불러온다 */
  fetchPets: () => Promise<void>;
  /** 활성 반려동물 전환 */
  selectPet: (petId: string) => void;
  /** 반려동물 생성/수정 (id 없으면 신규) → 저장 후 활성으로 지정 */
  savePet: (data: UserPetProfile) => Promise<UserPetProfile | null>;
  /** 반려동물 삭제 */
  removePet: (petId: string) => Promise<void>;
  products: Product[];
  catalogRevision: number;
  selectedProduct: Product | null;
  isLoadingProducts: boolean;
  isLoadingCatalog: boolean;
  isLoadingDetail: boolean;
  isInitializing: boolean;
  initApp: () => Promise<void>;
  fetchProducts: (background?: boolean) => Promise<void>;
  fetchProductDetail: (productId: string, background?: boolean) => Promise<void>;
  refreshCatalog: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  recentViews: Product[];
  /** Retry source only; never render products from IDs without public revalidation. */
  guestRecentViewIds: string[];
  isLoadingRecentViews: boolean;
  recentViewsError: string;
  fetchRecentViews: (all?: boolean) => Promise<void>;
  trackRecentView: (productId: string) => Promise<void>;
  comparisonList: string[];
  /** 담기에 성공하면 true, 이미 담겼거나 상한을 넘겨 거절되면 false. */
  addToComparison: (productId: string) => boolean;
  removeFromComparison: (productId: string) => void;
  logout: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  userId: null,
  isLoggedIn: false,
  profile: DEFAULT_USER_PET_PROFILE,
  pets: [],
  activePetId: null,
  products: [],
  catalogRevision: 0,
  selectedProduct: null,
  recentViews: [],
  guestRecentViewIds: [],
  isLoadingRecentViews: false,
  recentViewsError: '',
  isLoadingProducts: false,
  isLoadingCatalog: false,
  isLoadingDetail: false,
  isInitializing: true,

  signOut: async () => { await get().logout(); },

  initApp: async () => {
    const epoch = ++sessionEpoch;
    const isCurrent = () => epoch === sessionEpoch;
    const loadPrivate = async (userId: string, capturedEpoch: number) => {
      if (capturedEpoch !== sessionEpoch || get().userId !== userId) return;
      const [pets, favorites] = await Promise.all([
        getUserPets(userId), getFavorites(userId), get().fetchRecentViews(false),
      ]);
      if (capturedEpoch !== sessionEpoch || get().userId !== userId) return;
      const mapped = sortPetsByRegistration(pets.map(mapPetProfileFromRow));
      const active = restoreSelectedPet(userId, mapped, get().activePetId);
      rememberSelectedPet(userId, active?.id ?? null);
      set({ pets: mapped, activePetId: active?.id ?? null,
        profile: active ?? DEFAULT_USER_PET_PROFILE, favorites });
    };
    // Subscribe before getSession, including guest startup. The callback is synchronous:
    // calling auth/network methods inside it can deadlock the Supabase auth lock.
    if (!authSubscription) {
      const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
        const user = nextSession?.user;
        const id = user && !user.is_anonymous && user.app_metadata?.provider !== 'anonymous' ? user.id : null;
        if (get().userId === id) return;
        const nextEpoch = ++sessionEpoch;
        set({ ...privateReset, userId: id, isLoggedIn: Boolean(id), isInitializing: false });
        if (id) setTimeout(() => { void loadPrivate(id, nextEpoch).catch((error) => console.error('Private data refresh failed:', error)); }, 0);
      });
      authSubscription = data.subscription;
    }
    const bootWatchdog = setTimeout(() => { if (isCurrent()) set({ isInitializing: false }); }, BOOT_TIMEOUT_MS);
    try {
      if (isSupabaseConfigured && !adminDataSyncChannel) {
        const scheduleProductRefresh = () => {
          if (adminDataSyncTimer) clearTimeout(adminDataSyncTimer);
          adminDataSyncTimer = setTimeout(() => {
            void get().refreshCatalog();
          }, 250);
        };
        adminDataSyncChannel = supabase.channel('admin-data-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, scheduleProductRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, scheduleProductRefresh)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'product_ingredients' }, scheduleProductRefresh).subscribe();
      }
      const user = await getInitialSessionUser();
      if (!isCurrent()) return;
      const id = user && !user.is_anonymous && user.app_metadata?.provider !== 'anonymous' ? user.id : null;
      if (get().userId !== id) set(privateReset);
      set({ userId: id, isLoggedIn: Boolean(id) });
      if (id) await loadPrivate(id, epoch);
    } catch (error) {
      console.error('initApp err:', error);
    } finally {
      clearTimeout(bootWatchdog);
      if (isCurrent()) set({ isInitializing: false });
      void get().fetchProducts();
    }
  },

  updateProfile: async (updates) => {
    const { profile, savePet, userId } = get();
    const epoch = sessionEpoch;
    const previous = profile;
    const newProfile = { ...profile, ...updates };
    // 로컬 즉시 반영
    set({ profile: newProfile });

    const saved = await savePet(newProfile);
    // 저장에 실패하면 되돌린다. 몸무게·알레르기는 곧바로 적합도 점수에 반영되므로,
    // 저장되지 않은 값을 남겨 두면 사용자는 저장된 프로필 기준이라 믿고 분석 결과를
    // 보게 되고, 새로고침하면 그 값이 통째로 사라진다.
    // (savePet 은 성공 시 서버가 돌려준 값으로 profile 을 다시 채운다.)
    if (!saved && userId && get().userId === userId && epoch === sessionEpoch) {
      set({ profile: previous });
    }
  },

  fetchPets: async () => {
    const { userId } = get();
    if (!userId) return;
    const epoch = sessionEpoch;
    const rows = await getUserPets(userId);
    if (epoch !== sessionEpoch || get().userId !== userId) return;
    const mapped = sortPetsByRegistration(rows.map(mapPetProfileFromRow));
    const { activePetId } = get();
    const nextActive = restoreSelectedPet(userId, mapped, activePetId);
    rememberSelectedPet(userId, nextActive?.id ?? null);
    set({
      pets: mapped,
      activePetId: nextActive?.id ?? null,
      profile: nextActive ?? DEFAULT_USER_PET_PROFILE,
    });
  },

  selectPet: (petId) => {
    const { pets, userId } = get();
    const target = pets.find((p) => p.id === petId);
    if (target) {
      if (userId) rememberSelectedPet(userId, target.id);
      set({ activePetId: target.id, profile: target });
    }
  },

  savePet: async (data) => {
    const { userId } = get();
    if (!userId) {
      // 비로그인: 로컬 프로필만 갱신 (DB 미연동)
      set({ profile: data });
      return null;
    }
    const epoch = sessionEpoch;
    const isExisting = Boolean(data.id) && data.id !== DEFAULT_USER_PET_PROFILE.id;
    const saved = await saveUserPet({
      id: isExisting ? data.id : undefined,
      user_id: userId,
      name: data.name,
      pet_type: data.species === 'Cat' ? 'cat' : 'dog',
      age_group: ageGroupFromAge(data.age),
      weight: data.weightKg ?? null,
      breed: data.breed ?? null,
      image_url: data.imageUrl ?? null,
      conditions: data.healthConcerns,
      allergies: data.allergies,
    });
    if (!saved?.id || epoch !== sessionEpoch || get().userId !== userId) return null;

    const savedProfile = mapPetProfileFromRow(saved);
    // pets 목록 갱신(신규 추가 또는 기존 갱신)
    const { pets } = get();
    const exists = pets.some((p) => p.id === savedProfile.id);
    const nextPets = exists
      ? pets.map((p) => (p.id === savedProfile.id ? savedProfile : p))
      : [...pets, savedProfile];
    rememberSelectedPet(userId, savedProfile.id);
    set({
      pets: sortPetsByRegistration(nextPets),
      activePetId: savedProfile.id,
      profile: savedProfile,
    });
    return savedProfile;
  },

  removePet: async (petId) => {
    const { userId } = get();
    if (!userId) return;
    const epoch = sessionEpoch;
    const ok = await deleteUserPet(petId, userId);
    if (!ok || epoch !== sessionEpoch || get().userId !== userId) return;
    const { pets, activePetId } = get();
    const nextPets = pets.filter((p) => p.id !== petId);
    const nextActive = restoreSelectedPet(userId, nextPets, activePetId);
    const nextActiveId = nextActive?.id ?? null;
    rememberSelectedPet(userId, nextActiveId);
    set({
      pets: nextPets,
      activePetId: nextActiveId,
      profile: nextActive ?? DEFAULT_USER_PET_PROFILE,
    });
  },

  fetchProducts: async (background = false) => {
    const requestId = ++productsRequestId;
    if (!background) set({ isLoadingProducts: true, isLoadingCatalog: true });
    try {
      const data = await getProducts();
      if (requestId !== productsRequestId) return;
      set((state) => ({ products: data, catalogRevision: state.catalogRevision + 1, isLoadingCatalog: false, isLoadingProducts: state.isLoadingDetail }));
    } catch (err) {
      console.error(err);
      if (requestId !== productsRequestId) return;
      set((state) => ({ products: [], catalogRevision: state.catalogRevision + 1, isLoadingCatalog: false, isLoadingProducts: state.isLoadingDetail }));
    }
  },

  fetchProductDetail: async (id, background = false) => {
    productDetailRequestId += 1;
    const requestId = productDetailRequestId;
    const isStale = () => requestId !== productDetailRequestId;

    if (!background) set({ isLoadingProducts: true, isLoadingDetail: true, selectedProduct: null });
    try {
      const data = await getProductDetail(id);
      if (isStale()) return;
      if (!data) { ++productsRequestId; ++recentViewsRevision; }
      set((state) => ({ selectedProduct: data ?? null, isLoadingDetail: false, isLoadingProducts: data ? state.isLoadingCatalog : false,
        ...(!data ? { isLoadingCatalog: false, catalogRevision: state.catalogRevision + 1 } : {}),
        ...(!data ? { products: state.products.filter((p) => p.id !== id), recentViews: state.recentViews.filter((p) => p.id !== id) } : {}),
      }));
    } catch (err) {
      console.error(err);
      if (isStale()) return;
      ++productsRequestId;
      ++recentViewsRevision;
      if (!background) notify.error('상품 정보를 가져오지 못했습니다.');
      set((state) => ({ selectedProduct: null, isLoadingDetail: false, isLoadingCatalog: false, isLoadingProducts: false,
        catalogRevision: state.catalogRevision + 1,
        products: state.products.filter((p) => p.id !== id), recentViews: state.recentViews.filter((p) => p.id !== id),
      }));
    }
  },

  refreshCatalog: async () => {
    const { selectedProduct, recentViews, userId } = get();
    const epoch = sessionEpoch;
    const revision = ++recentViewsRevision;
    const refreshRecent = async () => {
      if (!recentViews.length) return;
      try {
        const visible = await getVisibleProductsByIds(recentViews.map((p) => p.id));
        if (epoch === sessionEpoch && userId === get().userId && revision === recentViewsRevision) set({ recentViews: visible });
      } catch {
        if (epoch === sessionEpoch && userId === get().userId && revision === recentViewsRevision) set({ recentViews: [] });
      }
    };
    await Promise.all([
      get().fetchProducts(true),
      selectedProduct ? get().fetchProductDetail(selectedProduct.id, true) : Promise.resolve(),
      refreshRecent(),
    ]);
  },

  favorites: [],
  toggleFavorite: async (id) => {
    const { userId, favorites } = get();
    const epoch = sessionEpoch;
    const isFav = favorites.includes(id);

    // 비로그인 상태에서는 저장할 곳이 없다. 낙관적으로 켜 두면 새로고침에서
    // 조용히 사라지므로, 상태를 바꾸지 않고 로그인이 필요하다고 알린다.
    if (!userId) {
      notify.warning('찜하려면 로그인해 주세요.');
      return;
    }

    const next = isFav ? favorites.filter((fid) => fid !== id) : [...favorites, id];
    set({ favorites: next });

    // 어디서 다시 볼 수 있는지 바로 알려 준다. 찜해 놓고 찾지 못한다는 피드백이 있었다.
    if (!isFav) notify.success('저장했습니다 · 마이페이지 > 저장한 제품');

    const ok = isFav ? await removeFavorite(userId, id) : await addFavorite(userId, id);
    if (epoch !== sessionEpoch || get().userId !== userId) return;
    if (!ok) {
      // 서버 저장이 실패하면 낙관적 변경을 되돌린다 — UI 와 DB 가 갈라지면
      // 새로고침 시점에 찜이 사라져 사용자가 저장된 줄 알고 잃는다.
      const current = get().favorites;
      const rolledBack = isFav
        ? (current.includes(id) ? current : [...current, id])
        : current.filter((fid) => fid !== id);
      set({ favorites: rolledBack });
      notify.error('찜 상태를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  },

  fetchRecentViews: async (all = true) => {
    const { userId, recentViews } = get();
    const guestIds = [...new Set([...recentViews.map(product => product.id), ...get().guestRecentViewIds])];
    const epoch = sessionEpoch;
    // Delayed home initialization must not truncate an already requested full list.
    const loadAll = all || (fullRecentHistory?.epoch === epoch && fullRecentHistory.userId === userId);
    if (loadAll) fullRecentHistory = { epoch, userId };
    const request = ++recentViewsRequestId;
    const revision = recentViewsRevision;
    const current = () => epoch === sessionEpoch && userId === get().userId && request === recentViewsRequestId;
    set({ isLoadingRecentViews: true, recentViewsError: '', ...(!userId ? { guestRecentViewIds: guestIds } : {}) });
    try {
      // A fast back navigation must not reload before the detail's view is saved.
      while (userId && recentViewWrites.has(userId)) await recentViewWrites.get(userId);
      if (!current()) return;
      const products = userId
        ? (await getRecentViews(userId, loadAll)).map(mapProductFromSupabaseRow).filter((p): p is Product => Boolean(p))
        : await getVisibleProductsByIds(guestIds);
      if (!current()) return;
      if (revision !== recentViewsRevision) { await get().fetchRecentViews(loadAll); return; }
      ++recentViewsRevision;
      set({ recentViews: products, ...(!userId ? { guestRecentViewIds: products.map(product => product.id) } : {}) });
    } catch (error) {
      if (current()) set({ recentViews: [], recentViewsError: error instanceof Error ? error.message : '최근 본 상품을 불러오지 못했습니다.' });
    } finally {
      if (current()) set({ isLoadingRecentViews: false });
    }
  },

  trackRecentView: async (productId) => {
    const { userId, selectedProduct, recentViews } = get();
    const product = selectedProduct?.id === productId ? selectedProduct : null;
    if (!product) return;
    if (product) {
      ++recentViewsRevision;
      const filtered = recentViews.filter(p => p.id !== productId);
      set({ recentViews: [product, ...filtered], ...(!userId ? {
        guestRecentViewIds: [productId, ...get().guestRecentViewIds.filter(id => id !== productId)],
      } : {}) });
    }
    if (userId) {
      const epoch = sessionEpoch;
      // Preserve visit order even when requests finish out of order.
      const write = (recentViewWrites.get(userId) ?? Promise.resolve()).catch(() => {}).then(() => {
        if (epoch === sessionEpoch && userId === get().userId) return addRecentView(userId, productId);
      });
      recentViewWrites.set(userId, write);
      try { await write; }
      catch { if (epoch === sessionEpoch && userId === get().userId) notify.warning('최근 본 상품을 저장하지 못했습니다.'); }
      finally { if (recentViewWrites.get(userId) === write) recentViewWrites.delete(userId); }
    }
  },
  comparisonList: [],
  addToComparison: (id) => {
    const { comparisonList } = get();
    // 이미 담겼거나 상한을 넘기면 조용히 버리지 않고 거절을 알린다.
    if (comparisonList.includes(id) || comparisonList.length >= MAX_COMPARISON) return false;
    set({ comparisonList: [...comparisonList, id] });
    return true;
  },
  removeFromComparison: (id) => set((state) => ({
    comparisonList: state.comparisonList.filter(cid => cid !== id)
  })),

  logout: async () => {
    ++sessionEpoch;
    set({ ...privateReset, userId: null, isLoggedIn: false, isInitializing: false });
    await supabaseSignOut();
  },
}));
