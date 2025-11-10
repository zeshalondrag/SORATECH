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
  login: (user: User, token: string) => Promise<void>;
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
  favoriteIds: Record<string, number>;
  addToFavorites: (product: Product, favoriteId?: number) => void;
  removeFromFavorites: (productId: string) => void;
  toggleFavorite: (product: Product) => Promise<void>;
  loadFavorites: () => Promise<void>;
  
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
      login: async (user, token) => {
        localStorage.setItem('auth_token', token);
        set({ user, isAuthenticated: true });
        // Загружаем избранное после входа
        setTimeout(() => {
          get().loadFavorites();
        }, 100);
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
      favoriteIds: {} as Record<string, number>, // productId -> favoriteId mapping
      addToFavorites: (product, favoriteId?: number) =>
        set((state) => {
          if (state.favorites.find((p) => p.id === product.id)) {
            return state;
          }
          const newFavoriteIds = { ...state.favoriteIds };
          if (favoriteId) {
            newFavoriteIds[product.id] = favoriteId;
          }
          return { 
            favorites: [...state.favorites, product],
            favoriteIds: newFavoriteIds
          };
        }),
      removeFromFavorites: (productId) =>
        set((state) => {
          const newFavoriteIds = { ...state.favoriteIds };
          delete newFavoriteIds[productId];
          return {
            favorites: state.favorites.filter((p) => p.id !== productId),
            favoriteIds: newFavoriteIds
          };
        }),
      toggleFavorite: async (product) => {
        const { favorites, favoriteIds, user, isAuthenticated } = get();
        
        // Проверка авторизации
        if (!isAuthenticated || !user) {
          get().openAuthModal('login');
          return;
        }

        const exists = favorites.find((p) => p.id === product.id);
        
        try {
          if (exists) {
            // Удаляем из избранного через API
            const favoriteId = favoriteIds[product.id];
            if (favoriteId) {
              const { favoritesApi } = await import('@/lib/api');
              await favoritesApi.delete(favoriteId);
            }
            get().removeFromFavorites(product.id);
          } else {
            // Добавляем в избранное через API
            const { favoritesApi } = await import('@/lib/api');
            const created = await favoritesApi.create({
              userId: user.id,
              productId: typeof product.id === 'string' ? parseInt(product.id) : product.id
            });
            get().addToFavorites(product, created.id);
          }
        } catch (error: any) {
          console.error('Error toggling favorite:', error);
          throw error;
        }
      },
      loadFavorites: async () => {
        const { user, isAuthenticated } = get();
        if (!isAuthenticated || !user) return;
        
        try {
          const { favoritesApi, productsApi } = await import('@/lib/api');
          const [favoritesData, productsData] = await Promise.all([
            favoritesApi.getAll(),
            productsApi.getAll(),
          ]);

          const userFavorites = favoritesData.filter(f => f.userId === user.id);
          const favoriteProducts = productsData
            .filter(p => userFavorites.some(f => f.productId === p.id))
            .map(p => {
              const favorite = userFavorites.find(f => f.productId === p.id);
              return {
                ...p,
                id: String(p.id),
                name: p.nameProduct,
                category: '',
                image: p.imageUrl || '/placeholder.svg',
                images: [p.imageUrl || '/placeholder.svg'],
                specs: {},
                rating: 0,
                reviewCount: 0,
                inStock: (p.stockQuantity || 0) > 0,
                categoryId: String(p.categoryId)
              };
            });

          const favoriteIdsMap: Record<string, number> = {};
          userFavorites.forEach(f => {
            if (f.id) {
              favoriteIdsMap[String(f.productId)] = f.id;
            }
          });

          set({ 
            favorites: favoriteProducts,
            favoriteIds: favoriteIdsMap
          });
        } catch (error: any) {
          console.error('Error loading favorites:', error);
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
        favoriteIds: state.favoriteIds,
        comparison: state.comparison,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
