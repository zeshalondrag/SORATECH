import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/lib/mockData';
import { User } from '@/lib/api';
import { authApi } from '@/lib/api';

interface CartItem extends Product {
  quantity: number;
}

interface StoreState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  
  // Cart
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Favorites
  favorites: Product[];
  addToFavorites: (product: Product) => void;
  removeFromFavorites: (productId: string) => void;
  toggleFavorite: (product: Product) => void;
  
  // Comparison
  comparison: Product[];
  addToComparison: (product: Product) => void;
  removeFromComparison: (productId: string) => void;
  toggleComparison: (product: Product) => void;
  
  // Recently viewed
  recentlyViewed: Product[];
  addToRecentlyViewed: (product: Product) => void;
  
  // UI
  isAuthModalOpen: boolean;
  authModalView: 'login' | 'register' | 'reset' | 'reset-code';
  openAuthModal: (view?: 'login' | 'register' | 'reset' | 'reset-code') => void;
  closeAuthModal: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, isAuthenticated: true });
      },
      logout: () => {
        authApi.logout();
        set({ user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
      
      // Cart
      cart: [],
      addToCart: (product) => {
        const { cart } = get();
        const existingItem = cart.find((item) => item.id === product.id);
        
        if (existingItem) {
          set({
            cart: cart.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ cart: [...cart, { ...product, quantity: 1 }] });
        }
      },
      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== productId),
        })),
      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
        } else {
          set((state) => ({
            cart: state.cart.map((item) =>
              item.id === productId ? { ...item, quantity } : item
            ),
          }));
        }
      },
      clearCart: () => set({ cart: [] }),
      
      // Favorites
      favorites: [],
      addToFavorites: (product) =>
        set((state) => {
          if (state.favorites.find((p) => p.id === product.id)) {
            return state;
          }
          return { favorites: [...state.favorites, product] };
        }),
      removeFromFavorites: (productId) =>
        set((state) => ({
          favorites: state.favorites.filter((p) => p.id !== productId),
        })),
      toggleFavorite: (product) => {
        const { favorites } = get();
        const exists = favorites.find((p) => p.id === product.id);
        
        if (exists) {
          get().removeFromFavorites(product.id);
        } else {
          get().addToFavorites(product);
        }
      },
      
      // Comparison
      comparison: [],
      addToComparison: (product) =>
        set((state) => {
          if (state.comparison.find((p) => p.id === product.id)) {
            return state;
          }
          return { comparison: [...state.comparison, product] };
        }),
      removeFromComparison: (productId) =>
        set((state) => ({
          comparison: state.comparison.filter((p) => p.id !== productId),
        })),
      toggleComparison: (product) => {
        const { comparison } = get();
        const exists = comparison.find((p) => p.id === product.id);
        
        if (exists) {
          get().removeFromComparison(product.id);
        } else {
          get().addToComparison(product);
        }
      },
      
      // Recently viewed
      recentlyViewed: [],
      addToRecentlyViewed: (product) =>
        set((state) => {
          const filtered = state.recentlyViewed.filter((p) => p.id !== product.id);
          return {
            recentlyViewed: [product, ...filtered].slice(0, 10),
          };
        }),
      
      // UI
      isAuthModalOpen: false,
      authModalView: 'login',
      openAuthModal: (view = 'login') =>
        set({ isAuthModalOpen: true, authModalView: view }),
      closeAuthModal: () => set({ isAuthModalOpen: false }),
    }),
    {
      name: 'sora-tech-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        cart: state.cart,
        favorites: state.favorites,
        comparison: state.comparison,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
