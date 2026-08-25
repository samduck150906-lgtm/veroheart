import { create } from 'zustand';
import type { AuthChangeEvent, RealtimeChannel, Session } from '@supabase/supabase-js';
import type { UserPetProfile, Product } from '../types';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import {
  supabase,
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
  signOut as supabaseSignOut
} from '../lib/supabase';
import { notify } from './useNotification';
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

/**
 * 세션 초기화 순번.
 *
 * initApp 은 watchdog(8초) 때문에 응답을 기다리는 도중에도 앱이 열린다. 그 사이
 * 사용자가 로그아웃하면, 뒤늦게 도착한 초기화 결과가 userId/isLoggedIn 을 다시
 * 켜서 세션 없이 로그인된 것처럼 보이는 상태가 만들어진다. 로그아웃·재초기화가
 * 순번을 올리고, 지난 순번의 결과는 버린다.
 */
let sessionEpoch = 0;

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
  selectedProduct: Product | null;
  isLoadingProducts: boolean;
  isInitializing: boolean;
  initApp: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchProductDetail: (productId: string) => Promise<void>;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  recentViews: Product[];
  trackRecentView: (productId: string) => void;
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
  selectedProduct: null,
  recentViews: [],
  isLoadingProducts: false,
  isInitializing: true,

  signOut: async () => {
    await supabaseSignOut();
    set({
      userId: null,
      isLoggedIn: false,
      favorites: [],
      recentViews: [],
      profile: DEFAULT_USER_PET_PROFILE,
      pets: [],
      activePetId: null,
    });
    get().fetchProducts();
  },

  initApp: async () => {
    sessionEpoch += 1;
    const epoch = sessionEpoch;
    /** 이 초기화가 아직 최신인지 — 아니면 결과를 반영하지 않는다. */
    const isCurrent = () => epoch === sessionEpoch;

    const bootWatchdog = setTimeout(() => {
      if (get().isInitializing) {
        console.warn('[VeRoRo] 초기화 응답이 늦어 먼저 화면을 엽니다.');
        set({ isInitializing: false });
      }
    }, BOOT_TIMEOUT_MS);

    try {
      const scheduleProductRefresh = () => {
        if (adminDataSyncTimer) clearTimeout(adminDataSyncTimer);
        adminDataSyncTimer = setTimeout(() => {
          const { fetchProducts, fetchProductDetail, selectedProduct } = get();
          fetchProducts();
          if (selectedProduct?.id) {
            fetchProductDetail(selectedProduct.id);
          }
        }, 250);
      };

      if (!adminDataSyncChannel) {
        adminDataSyncChannel = supabase
          .channel('admin-data-sync')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'products' },
            scheduleProductRefresh
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'ingredients' },
            scheduleProductRefresh
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'product_ingredients' },
            scheduleProductRefresh
          )
          .subscribe();
      }

      const user = await getInitialSessionUser();
      if (!isCurrent()) return;
      if (!user) {
        set({
          isInitializing: false,
          profile: DEFAULT_USER_PET_PROFILE,
          userId: null,
          isLoggedIn: false,
        });
        get().fetchProducts();
        return;
      }

      const isReal = user.app_metadata?.provider !== 'anonymous' && !user.is_anonymous;
      const handleAuthStateChange = (_event: AuthChangeEvent, nextSession: Session | null) => {
        const nextUser = nextSession?.user;
        const nextIsReal = !!nextUser && nextUser.app_metadata?.provider !== 'anonymous' && !nextUser.is_anonymous;
        set({
          userId: nextUser?.id ?? null,
          isLoggedIn: nextIsReal,
        });
      };
      supabase.auth.onAuthStateChange(handleAuthStateChange);
      set({ userId: user.id, isLoggedIn: isReal });

      // 아래 조회는 모두 네트워크를 탄다. 사이에 로그아웃이 끼면 그 결과를
      // 다시 채워 넣지 않도록 매 단계에서 순번을 확인한다.
      const applyIfCurrent = (patch: Partial<StoreState>) => {
        if (isCurrent()) set(patch);
      };

      // Fetch Pet Profiles (모든 반려동물 — 다이어리/선택 지원)
      const pets = await getUserPets(user.id);
      if (pets && pets.length > 0) {
        const mapped = pets.map(mapPetProfileFromRow);
        applyIfCurrent({
          pets: mapped,
          activePetId: mapped[0].id,
          profile: mapped[0],
        });
      }

      // Fetch Favorites
      const favData = await getFavorites(user.id);
      applyIfCurrent({ favorites: favData });

      // Fetch Recent Views
      const recentData = await getRecentViews(user.id);
      if (recentData.length > 0) {
        const mapped = recentData.map(mapProductFromSupabaseRow).filter(Boolean) as Product[];
        applyIfCurrent({ recentViews: mapped });
      }

      await get().fetchProducts();
      set({ isInitializing: false });
    } catch (err) {
      console.error('initApp err:', err);
      set({ isInitializing: false });
      get().fetchProducts();
    } finally {
      clearTimeout(bootWatchdog);
      // 어느 경로로 빠져나오든 스플래시는 반드시 닫는다.
      if (get().isInitializing) set({ isInitializing: false });
    }
  },

  updateProfile: async (updates) => {
    const { profile, savePet } = get();
    const previous = profile;
    const newProfile = { ...profile, ...updates };
    // 로컬 즉시 반영
    set({ profile: newProfile });

    const saved = await savePet(newProfile);
    // 저장에 실패하면 되돌린다. 몸무게·알레르기는 곧바로 적합도 점수에 반영되므로,
    // 저장되지 않은 값을 남겨 두면 사용자는 저장된 프로필 기준이라 믿고 분석 결과를
    // 보게 되고, 새로고침하면 그 값이 통째로 사라진다.
    // (savePet 은 성공 시 서버가 돌려준 값으로 profile 을 다시 채운다.)
    if (!saved && get().userId) {
      set({ profile: previous });
    }
  },

  fetchPets: async () => {
    const { userId } = get();
    if (!userId) return;
    const rows = await getUserPets(userId);
    const mapped = rows.map(mapPetProfileFromRow);
    const { activePetId } = get();
    const nextActive = mapped.find((p) => p.id === activePetId) ?? mapped[0] ?? null;
    set({
      pets: mapped,
      activePetId: nextActive?.id ?? null,
      profile: nextActive ?? DEFAULT_USER_PET_PROFILE,
    });
  },

  selectPet: (petId) => {
    const { pets } = get();
    const target = pets.find((p) => p.id === petId);
    if (target) set({ activePetId: target.id, profile: target });
  },

  savePet: async (data) => {
    const { userId } = get();
    if (!userId) {
      // 비로그인: 로컬 프로필만 갱신 (DB 미연동)
      set({ profile: data });
      return null;
    }
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
    if (!saved?.id) return null;

    const savedProfile = mapPetProfileFromRow(saved);
    // pets 목록 갱신(신규 추가 또는 기존 갱신)
    const { pets } = get();
    const exists = pets.some((p) => p.id === savedProfile.id);
    const nextPets = exists
      ? pets.map((p) => (p.id === savedProfile.id ? savedProfile : p))
      : [...pets, savedProfile];
    set({
      pets: nextPets,
      activePetId: savedProfile.id,
      profile: savedProfile,
    });
    return savedProfile;
  },

  removePet: async (petId) => {
    const { userId, pets, activePetId } = get();
    if (!userId) return;
    const ok = await deleteUserPet(petId, userId);
    if (!ok) return;
    const nextPets = pets.filter((p) => p.id !== petId);
    const nextActiveId = activePetId === petId ? (nextPets[0]?.id ?? null) : activePetId;
    set({
      pets: nextPets,
      activePetId: nextActiveId,
      profile: nextPets.find((p) => p.id === nextActiveId) ?? DEFAULT_USER_PET_PROFILE,
    });
  },

  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    try {
      const data = await getProducts();
      set({ products: data, isLoadingProducts: false });
    } catch (err) {
      console.error(err);
      set({ products: [], isLoadingProducts: false });
    }
  },

  fetchProductDetail: async (id) => {
    productDetailRequestId += 1;
    const requestId = productDetailRequestId;
    const isStale = () => requestId !== productDetailRequestId;

    set({ isLoadingProducts: true, selectedProduct: null });
    try {
      const data = await getProductDetail(id);
      if (isStale()) return;
      set({ selectedProduct: data ?? null, isLoadingProducts: false });
    } catch (err) {
      console.error(err);
      if (isStale()) return;
      notify.error('상품 정보를 가져오지 못했습니다.');
      set({ selectedProduct: null, isLoadingProducts: false });
    }
  },

  favorites: [],
  toggleFavorite: async (id) => {
    const { userId, favorites } = get();
    const isFav = favorites.includes(id);

    // 비로그인 상태에서는 저장할 곳이 없다. 낙관적으로 켜 두면 새로고침에서
    // 조용히 사라지므로, 상태를 바꾸지 않고 로그인이 필요하다고 알린다.
    if (!userId) {
      notify.warning('찜하려면 로그인이 필요해요.');
      return;
    }

    const next = isFav ? favorites.filter((fid) => fid !== id) : [...favorites, id];
    set({ favorites: next });

    const ok = isFav ? await removeFavorite(userId, id) : await addFavorite(userId, id);
    if (!ok) {
      // 서버 저장이 실패하면 낙관적 변경을 되돌린다 — UI 와 DB 가 갈라지면
      // 새로고침 시점에 찜이 사라져 사용자가 저장된 줄 알고 잃는다.
      const current = get().favorites;
      const rolledBack = isFav
        ? (current.includes(id) ? current : [...current, id])
        : current.filter((fid) => fid !== id);
      set({ favorites: rolledBack });
      notify.error('찜 상태를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  },

  trackRecentView: async (productId) => {
    const { userId, products, recentViews } = get();
    const product = products.find(p => p.id === productId);
    if (product) {
      const filtered = recentViews.filter(p => p.id !== productId);
      set({ recentViews: [product, ...filtered].slice(0, 10) });
    }
    if (userId) await addRecentView(userId, productId);
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
    // 진행 중인 초기화 결과가 로그아웃 뒤에 도착해 세션을 되살리지 못하게 한다.
    sessionEpoch += 1;
    try {
      await supabaseSignOut();
      // 개인화 상태를 모두 비운다 — recentViews를 남기면 다음 사용자에게
      // 이전 사용자의 '최근 본 제품'이 노출된다. isLoggedIn도 auth 리스너에
      // 의존하지 않고 즉시 내린다.
      set({
        userId: null,
        isLoggedIn: false,
        profile: DEFAULT_USER_PET_PROFILE,
        pets: [],
        activePetId: null,
        favorites: [],
        recentViews: [],
      });
    } catch (err) {
      console.error(err);
    }
  }
}));

