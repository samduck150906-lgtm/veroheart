// @ts-nocheck
import { create } from 'zustand';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UserPetProfile, Product, SupabaseOrderWithItems, Banner, MembershipTier } from '../types';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import {
  supabase,
  getProducts,
  getInitialSessionUser,
  getUserPets,
  saveUserPet,
  fetchCartItems,
  saveCartItem,
  removeCartItemFromDB,
  clearUserCart,
  getFavorites,
  addFavorite,
  removeFavorite,
  addRecentView,
  getRecentViews,
  signOut as supabaseSignOut,
  getBanners,
  saveBanner as dbSaveBanner,
  deleteBannerFromDB
} from '../lib/supabase';

let adminDataSyncChannel: any = null;
let adminDataSyncTimer: ReturnType<typeof setTimeout> | null = null;

const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'default-1',
    title: '지금 꼭 챙겨야 할\n영양 맞춤 사료 라인업',
    subtitle: '수의 영양학 추천 BEST 모아보기',
    imageUrl: '🥫',
    linkUrl: '/ranking',
    bgColor: 'linear-gradient(135deg, #FFF3C4 0%, #FFE066 100%)'
  },
  {
    id: 'default-quiz',
    title: '우리 아이 맞춤 사료 찾기\n3초 성향테스트 시작하기 ⚡',
    subtitle: '간단한 질문으로 알아보는 우리 아이 사료 성향',
    imageUrl: '✨',
    linkUrl: '/event/personality-quiz',
    bgColor: 'linear-gradient(135deg, #FFFDEB 0%, #FDE68A 100%)'
  },
  {
    id: 'default-2',
    title: '우리아이 맞춤 성분 분석\n간편하게 성분 검색하기',
    subtitle: '알레르기/위험 성분을 1초만에 감지',
    imageUrl: '🔍',
    linkUrl: '/search',
    bgColor: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)'
  },
  {
    id: 'default-3',
    title: '동반자 펫 등록하고\n맞춤 정보 받기',
    subtitle: '마이펫 정보 입력하러 가기',
    imageUrl: '🐶',
    linkUrl: '/profile',
    bgColor: 'linear-gradient(135deg, #FCE7F3 0%, #FBCFE8 100%)'
  }
];

interface StoreState {
  userId: string | null;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  profile: UserPetProfile;
  updateProfile: (updates: Partial<UserPetProfile>) => void;
  products: Product[];
  selectedProduct: Product | null;
  orders: SupabaseOrderWithItems[];
  isLoadingProducts: boolean;
  isInitializing: boolean;
  initApp: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchProductDetail: (productId: string) => Promise<void>;
  fetchOrders: () => Promise<void>;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  recentViews: Product[];
  trackRecentView: (productId: string) => void;
  comparisonList: string[];
  addToComparison: (productId: string) => void;
  removeFromComparison: (productId: string) => void;
  cart: { productId: string; quantity: number }[];
  addToCart: (productId: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  logout: () => Promise<void>;
  // Banner management
  banners: Banner[];
  fetchBanners: () => Promise<void>;
  saveBanner: (banner: Partial<Banner>) => Promise<void>;
  deleteBanner: (bannerId: string) => Promise<void>;
  // Membership
  membershipTier: MembershipTier;
  fetchMembership: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  userId: null,
  isLoggedIn: false,
  profile: DEFAULT_USER_PET_PROFILE,
  products: [],
  selectedProduct: null,
  orders: [],
  recentViews: [],
  isLoadingProducts: false,
  isInitializing: true,
  banners: DEFAULT_BANNERS,
  membershipTier: 'free' as MembershipTier,
  fetchMembership: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const { getUserMembershipTier } = await import('../lib/supabase');
      const tier = await getUserMembershipTier(userId);
      set({ membershipTier: tier });
    } catch (err) {
      console.error('fetchMembership err:', err);
    }
  },

  signOut: async () => {
    await supabaseSignOut();
    set({
      userId: null,
      isLoggedIn: false,
      orders: [],
      favorites: [],
      recentViews: [],
      cart: [],
      profile: DEFAULT_USER_PET_PROFILE,
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
        const localBreed = localStorage.getItem('vh_pet_breed_local') || '';
        const localGender = localStorage.getItem('vh_pet_gender_local') || '남아';
        const localPersonality = localStorage.getItem('vh_pet_personality_local') || '활발함 ⚡';
        set({
          isInitializing: false,
          profile: { ...DEFAULT_USER_PET_PROFILE, breed: localBreed, gender: localGender, personality: localPersonality },
          userId: null,
          isLoggedIn: false,
        });
        get().fetchProducts();
        get().fetchBanners();
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

      // Fetch Pet Profile
      const pets = await getUserPets(user.id);
      if (pets && pets.length > 0) {
        const p = pets[0];
        const localBreed = localStorage.getItem('vh_pet_breed_' + user.id) || '';
        const localGender = localStorage.getItem('vh_pet_gender_' + user.id) || '남아';
        const localPersonality = localStorage.getItem('vh_pet_personality_' + user.id) || '활발함 ⚡';
        set({
          profile: {
            id: p.id,
            name: p.name,
            species: p.pet_type === 'cat' ? 'Cat' : 'Dog',
            age: p.age_group === 'baby' ? 1 : p.age_group === 'senior' ? 10 : 4,
            weightKg: p.weight,
            healthConcerns: p.conditions || [],
            allergies: p.allergies || [],
            gender: localGender,
            personality: localPersonality
          }
        });
      }

      // Fetch Cart & Favorites
      const [cartData, favData] = await Promise.all([
        fetchCartItems(user.id),
        getFavorites(user.id)
      ]);
      set({
        cart: cartData.map(c => ({ productId: c.productId, quantity: c.quantity })),
        favorites: favData
      });

      // Fetch Recent Views
      const recentData = await getRecentViews(user.id);
      if (recentData.length > 0) {
        set({ recentViews: recentData as any[] });
      }

      const { fetchProducts, fetchOrders, fetchBanners, fetchMembership } = get();
      await Promise.all([fetchProducts(), fetchOrders(), fetchBanners(), fetchMembership()]);
      set({ isInitializing: false });
    } catch (err) {
      console.error('initApp err:', err);
      set({ isInitializing: false });
      get().fetchProducts();
      get().fetchBanners();
    }
  },

  updateProfile: async (updates) => {
    const { userId, profile } = get();
    const newProfile = { ...profile, ...updates };
    set({ profile: newProfile });

    if (newProfile.breed != null) {
      localStorage.setItem('vh_pet_breed_' + (userId || 'local'), newProfile.breed);
    }
    if (newProfile.gender != null) {
      localStorage.setItem('vh_pet_gender_' + (userId || 'local'), newProfile.gender);
    }
    if (newProfile.personality != null) {
      localStorage.setItem('vh_pet_personality_' + (userId || 'local'), newProfile.personality);
    }

    if (!userId) return;

    const saved = await saveUserPet({
      id: profile.id !== DEFAULT_USER_PET_PROFILE.id ? profile.id : undefined,
      user_id: userId,
      name: newProfile.name,
      pet_type: newProfile.species === 'Cat' ? 'cat' : 'dog',
      age_group: newProfile.age < 2 ? 'baby' : newProfile.age > 7 ? 'senior' : 'adult',
      weight: newProfile.weightKg,
      conditions: newProfile.healthConcerns,
      allergies: newProfile.allergies,
    });

    if (saved?.id) {
      set({ profile: { ...get().profile, id: saved.id } });
    }
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

  fetchOrders: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const { getOrders } = await import('../lib/supabase');
      const data = await getOrders(userId);
      set({ orders: data as SupabaseOrderWithItems[] });
    } catch (err) {
      console.error(err);
    }
  },

  favorites: [],
  toggleFavorite: async (id) => {
    const { userId, favorites } = get();
    const isFav = favorites.includes(id);
    set({ favorites: isFav ? favorites.filter(fid => fid !== id) : [...favorites, id] });
    if (userId) {
      if (isFav) await removeFavorite(userId, id);
      else await addFavorite(userId, id);
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
  addToComparison: (id) => set((state) => ({
    comparisonList: state.comparisonList.includes(id) 
      ? state.comparisonList 
      : [...state.comparisonList, id].slice(0, 4) // max 4
  })),
  removeFromComparison: (id) => set((state) => ({
    comparisonList: state.comparisonList.filter(cid => cid !== id)
  })),
  cart: [],
  
  addToCart: async (id, qty = 1) => {
    const { userId, cart } = get();
    let newQuantity = qty;
    
    const existing = cart.find(c => c.productId === id);
    if (existing) {
      newQuantity = existing.quantity + qty;
      set({ cart: cart.map(c => c.productId === id ? { ...c, quantity: newQuantity } : c) });
    } else {
      set({ cart: [...cart, { productId: id, quantity: qty }] });
    }

    if (userId) {
      await saveCartItem(userId, id, newQuantity);
    }
  },

  updateCartQuantity: async (id, qty) => {
    const { userId, cart } = get();
    if (qty <= 0) {
      set({ cart: cart.filter(c => c.productId !== id) });
      if (userId) {
        await removeCartItemFromDB(userId, id);
      }
      return;
    }

    set({
      cart: cart.map(c => c.productId === id ? { ...c, quantity: qty } : c)
    });

    if (userId) {
      await saveCartItem(userId, id, qty);
    }
  },
  
  removeFromCart: async (id) => {
    const { userId, cart } = get();
    set({ cart: cart.filter(c => c.productId !== id) });
    if (userId) {
      await removeCartItemFromDB(userId, id);
    }
  },
  
  clearCart: async () => {
    const { userId } = get();
    set({ cart: [] });
    if (userId) {
      await clearUserCart(userId);
    }
  },

  logout: async () => {
    try {
      const { signOut } = await import('../lib/supabase');
      await signOut();
      set({ userId: null, profile: DEFAULT_USER_PET_PROFILE, orders: [], reports: [], cart: [], favorites: [] });
    } catch (err) {
      console.error(err);
    }
  },

  fetchBanners: async () => {
    let list: any[] = [];
    try {
      const dbBanners = await getBanners();
      list = dbBanners;
    } catch (err) {
      console.warn('getBanners error, falling back:', err);
    }
    
    const localBannersStr = localStorage.getItem('vh_local_banners');
    const localBanners = localBannersStr ? JSON.parse(localBannersStr) : [];
    
    const merged = [...list, ...localBanners];
    if (merged.length === 0) {
      set({ banners: DEFAULT_BANNERS });
    } else {
      // De-duplicate by id
      const unique = [];
      const ids = new Set();
      merged.forEach(b => {
        if (!ids.has(b.id)) {
          ids.add(b.id);
          unique.push(b);
        }
      });
      set({ banners: unique });
    }
  },

  saveBanner: async (bannerData) => {
    const banner = {
      id: bannerData.id || crypto.randomUUID(),
      title: bannerData.title || '',
      subtitle: bannerData.subtitle || '',
      imageUrl: bannerData.imageUrl || '',
      linkUrl: bannerData.linkUrl || '',
      bgColor: bannerData.bgColor || 'linear-gradient(135deg, #FFF3C4 0%, #FFE066 100%)',
    };
    
    try {
      await dbSaveBanner(banner);
    } catch (err) {
      console.warn('Could not save banner to DB, saving locally');
    }
    
    const localBannersStr = localStorage.getItem('vh_local_banners');
    let localBanners = localBannersStr ? JSON.parse(localBannersStr) : [];
    if (localBanners.some((b: any) => b.id === banner.id)) {
      localBanners = localBanners.map((b: any) => b.id === banner.id ? banner : b);
    } else {
      localBanners.push(banner);
    }
    localStorage.setItem('vh_local_banners', JSON.stringify(localBanners));
    
    await get().fetchBanners();
  },

  deleteBanner: async (bannerId) => {
    try {
      await deleteBannerFromDB(bannerId);
    } catch (err) {
      console.warn(err);
    }
    
    const localBannersStr = localStorage.getItem('vh_local_banners');
    if (localBannersStr) {
      let localBanners = JSON.parse(localBannersStr);
      localBanners = localBanners.filter((b: any) => b.id !== bannerId);
      localStorage.setItem('vh_local_banners', JSON.stringify(localBanners));
    }
    
    await get().fetchBanners();
  }
}));

