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
  cartIds: Record<string, number>;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  loadCart: () => Promise<void>;
  
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
        // Загружаем избранное и корзину после входа
        setTimeout(() => {
          get().loadFavorites();
          get().loadCart();
        }, 100);
      },
      logout: () => {
        authApi.logout();
        set({ user: null, isAuthenticated: false });
      },
      setUser: (user) => set({ user }),
      
      // Cart
      cart: [],
      cartIds: {} as Record<string, number>, // productId -> cartId mapping
      addToCart: async (product) => {
        const { cart, cartIds, user, isAuthenticated } = get();
        const existingItem = cart.find((item) => item.id === product.id);
        
        if (existingItem) {
          // Обновляем количество в API
          if (isAuthenticated && user && cartIds[product.id]) {
            try {
              const { cartsApi } = await import('@/lib/api');
              // Получаем текущий элемент для получения всех данных
              const currentCart = await cartsApi.getById(cartIds[product.id]);
              await cartsApi.update(cartIds[product.id], {
                id: currentCart.id,
                userId: currentCart.userId,
                productId: currentCart.productId,
                quantity: existingItem.quantity + 1,
              });
            } catch (error: any) {
              console.error('Error updating cart in API:', error);
              throw error;
            }
          }
          set({
            cart: cart.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          // Создаем новый элемент в API
          if (isAuthenticated && user) {
            try {
              const { cartsApi } = await import('@/lib/api');
              const productIdNum = typeof product.id === 'string' ? parseInt(product.id) : product.id;
              
              // Проверяем, нет ли уже такого товара в корзине на сервере
              const existingCarts = await cartsApi.getAll();
              const existingCart = existingCarts.find(
                c => Number(c.userId) === Number(user.id) && Number(c.productId) === productIdNum
              );
              
              if (existingCart) {
                // Если товар уже есть в корзине на сервере, обновляем количество
                // Получаем текущий элемент для получения всех данных
                const currentCart = await cartsApi.getById(existingCart.id);
                const updated = await cartsApi.update(existingCart.id, {
                  id: currentCart.id,
                  userId: currentCart.userId,
                  productId: currentCart.productId,
                  quantity: currentCart.quantity + 1,
                });
                const newCartIds = { ...cartIds };
                if (updated.id) {
                  newCartIds[product.id] = updated.id;
                }
                // Обновляем существующий товар в корзине, а не добавляем новый
                const existingItem = cart.find((item) => item.id === product.id);
                if (existingItem) {
                  set({
                    cart: cart.map((item) =>
                      item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                    ),
                    cartIds: newCartIds
                  });
                } else {
                  set({ 
                    cart: [...cart, { ...product, quantity: currentCart.quantity + 1 }],
                    cartIds: newCartIds
                  });
                }
              } else {
                // Создаем новый элемент
                // Убеждаемся, что userId и productId - числа
                const userIdNum = typeof user.id === 'string' ? parseInt(user.id) : user.id;
                const created = await cartsApi.create({
                  userId: userIdNum,
                  productId: productIdNum,
                  quantity: 1,
                });
                const newCartIds = { ...cartIds };
                if (created.id) {
                  newCartIds[product.id] = created.id;
                }
                set({ 
                  cart: [...cart, { ...product, quantity: 1 }],
                  cartIds: newCartIds
                });
              }
            } catch (error: any) {
              console.error('Error adding to cart in API:', error);
              const errorMessage = error?.message || error?.title || error?.detail || 'Ошибка при добавлении товара в корзину';
              // Показываем ошибку, но не добавляем локально, чтобы избежать рассинхронизации
              throw new Error(errorMessage);
            }
          } else {
            // Неавторизованный пользователь - только локально
            set({ cart: [...cart, { ...product, quantity: 1 }] });
          }
        }
      },
      removeFromCart: (productId) => {
        const { cartIds, user, isAuthenticated } = get();
        if (isAuthenticated && user && cartIds[productId]) {
          // Удаляем из API
          (async () => {
            try {
              const { cartsApi } = await import('@/lib/api');
              await cartsApi.delete(cartIds[productId]);
            } catch (error) {
              console.error('Error removing from cart in API:', error);
            }
          })();
          const newCartIds = { ...cartIds };
          delete newCartIds[productId];
          set({ 
            cart: get().cart.filter((item) => item.id !== productId),
            cartIds: newCartIds
          });
        } else {
          set((state) => ({
            cart: state.cart.filter((item) => item.id !== productId),
          }));
        }
      },
      updateQuantity: async (productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        const { cartIds, user, isAuthenticated } = get();
        // Обновляем в API
        if (isAuthenticated && user && cartIds[productId]) {
          try {
            const { cartsApi } = await import('@/lib/api');
            // Получаем текущий элемент для получения всех данных
            const currentCart = await cartsApi.getById(cartIds[productId]);
            await cartsApi.update(cartIds[productId], {
              id: currentCart.id,
              userId: currentCart.userId,
              productId: currentCart.productId,
              quantity: quantity,
            });
          } catch (error: any) {
            console.error('Error updating quantity in API:', error);
            // Не обновляем локальное состояние, если API не сработал
            throw error;
          }
        }
        set((state) => ({
          cart: state.cart.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        }));
      },
      clearCart: () => {
        const { cartIds, user, isAuthenticated } = get();
        if (isAuthenticated && user) {
          // Удаляем все из API
          Object.values(cartIds).forEach(cartId => {
            (async () => {
              try {
                const { cartsApi } = await import('@/lib/api');
                await cartsApi.delete(cartId);
              } catch (error) {
                console.error('Error clearing cart in API:', error);
              }
            })();
          });
        }
        set({ cart: [], cartIds: {} });
      },
      loadCart: async () => {
        const { user, isAuthenticated } = get();
        if (!isAuthenticated || !user) return;
        
        try {
          const { cartsApi, productsApi } = await import('@/lib/api');
          const [cartsData, productsData] = await Promise.all([
            cartsApi.getAll(),
            productsApi.getAll(),
          ]);

          const userCarts = cartsData.filter(c => Number(c.userId) === Number(user.id));
          const cartProducts = productsData
            .filter(p => userCarts.some(c => Number(c.productId) === Number(p.id)))
            .map(p => {
              const cart = userCarts.find(c => Number(c.productId) === Number(p.id));
              return {
                id: String(p.id),
                name: p.nameProduct,
                price: p.price,
                image: p.imageUrl || '/placeholder.svg',
                category: '',
                categoryId: String(p.categoryId),
                images: [p.imageUrl || '/placeholder.svg'],
                rating: 0,
                reviewCount: 0,
                inStock: (p.stockQuantity || 0) > 0,
                specs: {},
                description: p.description,
                quantity: cart?.quantity || 1,
              };
            });

          const cartIdsMap: Record<string, number> = {};
          userCarts.forEach(c => {
            if (c.id) {
              cartIdsMap[String(c.productId)] = c.id;
            }
          });

          set({ 
            cart: cartProducts,
            cartIds: cartIdsMap
          });
        } catch (error: any) {
          console.error('Error loading cart:', error);
        }
      },
      
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
        cartIds: state.cartIds,
        favorites: state.favorites,
        favoriteIds: state.favoriteIds,
        comparison: state.comparison,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
);
