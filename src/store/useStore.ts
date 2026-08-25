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
  updateProfile: (updates: Partial<UserPetProfile>) => void;
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

      // Fetch Pet Profiles (모든 반려동물 — 다이어리/선택 지원)
      const pets = await getUserPets(user.id);
      if (pets && pets.length > 0) {
        const mapped = pets.map(mapPetProfileFromRow);
        set({
          pets: mapped,
          activePetId: mapped[0].id,
          profile: mapped[0],
        });
      }

      // Fetch Favorites
      const favData = await getFavorites(user.id);
      set({ favorites: favData });

      // Fetch Recent Views
      const recentData = await getRecentViews(user.id);
      if (recentData.length > 0) {
        const mapped = recentData.map(mapProductFromSupabaseRow).filter(Boolean) as Product[];
        set({ recentViews: mapped });
      }

      await get().fetchProducts();
      set({ isInitializing: false });
    } catch (err) {
      console.error('initApp err:', err);
      set({ isInitializing: false });
      get().fetchProducts();
    }
  },

  updateProfile: async (updates) => {
    const { profile, savePet } = get();
    const newProfile = { ...profile, ...updates };
    // 로컬 즉시 반영
    set({ profile: newProfile });
    await savePet(newProfile);
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
    set({ isLoadingProducts: true, selectedProduct: null });
    try {
      const { getProductDetail } = await import('../lib/supabase');
      const data = await getProductDetail(id);
      if (data) {
        set({ 
          selectedProduct: data, 
          isLoadingProducts: false 
        });
      } else {
        set({ selectedProduct: null, isLoadingProducts: false });
      }
    } catch (err) {
      const { notify } = await import('./useNotification');
      notify.error('상품 정보를 가져오지 못했습니다.');
      console.error(err);
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
    try {
      const { signOut } = await import('../lib/supabase');
      await signOut();
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

