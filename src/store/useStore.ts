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
  clearUserCart 
} from '../lib/supabase';

interface StoreState {
  userId: string | null;
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
  profile: mockPetProfile,
  products: [],
  selectedProduct: null,
  orders: [],
  reports: [],
  isLoadingProducts: false,
  isInitializing: true,
  
  initApp: async () => {
    try {
      const user = await initializeAnonymousSession();
      if (!user) {
        set({ isInitializing: false });
        // Fallback to static data
        get().fetchProducts();
        return;
      }

      set({ userId: user.id });

      // Fetch Pet Profile
      const pets = await getUserPets(user.id);
      if (pets && pets.length > 0) {
        // Map first pet back to local state
        const p = pets[0];
        set({
          profile: {
            id: p.id,
            name: p.name,
            species: p.pet_type === 'cat' ? 'Cat' : 'Dog',
            age: p.age_group === 'baby' ? 1 : p.age_group === 'senior' ? 10 : 4, // Rough mapping
            healthConcerns: p.conditions || [],
            allergies: p.allergies || []
          }
        });
      }

      // Fetch Cart
      const cartData = await fetchCartItems(user.id);
      set({ cart: cartData.map(c => ({ productId: c.productId, quantity: c.quantity })) });

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
  toggleFavorite: (id) => set((state) => ({
    favorites: state.favorites.includes(id)
      ? state.favorites.filter(fid => fid !== id)
      : [...state.favorites, id]
  })),
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

