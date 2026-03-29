import { create } from 'zustand';
import { mockPetProfile } from '../data/mock';
import type { UserPetProfile } from '../data/mock';

interface StoreState {
  profile: UserPetProfile;
  updateProfile: (updates: Partial<UserPetProfile>) => void;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  comparisonList: string[];
  addToComparison: (productId: string) => void;
  removeFromComparison: (productId: string) => void;
  cart: { productId: string; quantity: number }[];
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
}

export const useStore = create<StoreState>((set) => ({
  profile: mockPetProfile,
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
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
  addToCart: (id, qty = 1) => set((state) => {
    const existing = state.cart.find(c => c.productId === id);
    if (existing) {
      return { cart: state.cart.map(c => c.productId === id ? { ...c, quantity: c.quantity + qty } : c) };
    }
    return { cart: [...state.cart, { productId: id, quantity: qty }] };
  }),
  removeFromCart: (id) => set((state) => ({
    cart: state.cart.filter(c => c.productId !== id)
  })),
  clearCart: () => set({ cart: [] })
}));
