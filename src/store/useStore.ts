import { create } from 'zustand';
import { mockPetProfile, mockProducts as staticMockProducts } from '../data/mock';
import type { UserPetProfile, Product } from '../data/mock';
import {
  getProducts,
  initializeAnonymousSession,
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
  mapProductFromRaw,
  signOut as supabaseSignOut
} from '../lib/supabase';

interface StoreState {
  userId: string | null;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
  profile: UserPetProfile;
  updateProfile: (updates: Partial<UserPetProfile>) => void;
  products: Product[];
  selectedProduct: (Product & { ingredients: any[] }) | null;
  orders: any[];
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
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  reports: any[];
  fetchReports: () => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  userId: null,
  isLoggedIn: false,
  profile: mockPetProfile,
  products: [],
  selectedProduct: null,
  orders: [],
  reports: [],
  recentViews: [],
  isLoadingProducts: false,
  isInitializing: true,

  signOut: async () => {
    await supabaseSignOut();
    set({ userId: null, isLoggedIn: false, orders: [], reports: [], favorites: [], recentViews: [], cart: [] });
    get().fetchProducts();
  },

  initApp: async () => {
    try {
      const user = await initializeAnonymousSession();
      if (!user) {
        set({ isInitializing: false });
        get().fetchProducts();
        return;
      }

      const isReal = user.app_metadata?.provider !== 'anonymous' && !user.is_anonymous;
      set({ userId: user.id, isLoggedIn: isReal });

      // Fetch Pet Profile
      const pets = await getUserPets(user.id);
      if (pets && pets.length > 0) {
        const p = pets[0];
        set({
          profile: {
            id: p.id,
            name: p.name,
            species: p.pet_type === 'cat' ? 'Cat' : 'Dog',
            age: p.age_group === 'baby' ? 1 : p.age_group === 'senior' ? 10 : 4,
            healthConcerns: p.conditions || [],
            allergies: p.allergies || []
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
        const mapped = recentData.map(mapProductFromRaw).filter(Boolean) as Product[];
        set({ recentViews: mapped });
      }

      const { fetchProducts, fetchOrders, fetchReports } = get();
      await Promise.all([fetchProducts(), fetchOrders(), fetchReports()]);
      set({ isInitializing: false });
    } catch (err) {
      console.error('initApp err:', err);
      set({ isInitializing: false });
      get().fetchProducts();
    }
  },

  updateProfile: async (updates) => {
    const { userId, profile } = get();
    const newProfile = { ...profile, ...updates };
    set({ profile: newProfile });
    
    if (userId) {
      await saveUserPet({
        id: profile.id !== 'user_1' ? profile.id : undefined, // If default mock, don't pass ID to create new
        user_id: userId,
        name: newProfile.name,
        pet_type: newProfile.species === 'Cat' ? 'cat' : 'dog',
        age_group: newProfile.age < 2 ? 'baby' : newProfile.age > 7 ? 'senior' : 'adult',
        conditions: newProfile.healthConcerns,
        allergies: newProfile.allergies
      });
    }
  },

  fetchProducts: async () => {
    set({ isLoadingProducts: true });
    try {
      const data = await getProducts();
      set({ products: data.length > 0 ? data : staticMockProducts, isLoadingProducts: false });
    } catch (err) {
      console.error(err);
      set({ products: staticMockProducts, isLoadingProducts: false });
    }
  },

  fetchProductDetail: async (id) => {
    set({ isLoadingProducts: true });
    try {
      const { getProductDetail } = await import('../lib/supabase');
      const data = await getProductDetail(id);
      if (data) {
        set({ 
          selectedProduct: data, 
          isLoadingProducts: false 
        });
      } else {
        set({ isLoadingProducts: false });
      }
    } catch (err) {
      const { notify } = await import('./useNotification');
      notify.error('상품 정보를 가져오지 못했습니다.');
      console.error(err);
      set({ isLoadingProducts: false });
    }
  },

  fetchOrders: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const { getOrders } = await import('../lib/supabase');
      const data = await getOrders(userId);
      set({ orders: data });
    } catch (err) {
      console.error(err);
    }
  },

  fetchReports: async () => {
    const { userId } = get();
    if (!userId) return;
    try {
      const { getAnalysisReports } = await import('../lib/supabase');
      const data = await getAnalysisReports(userId);
      set({ reports: data });
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
  }
}));

