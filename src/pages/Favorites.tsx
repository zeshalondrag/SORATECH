import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { X, Heart } from 'lucide-react';
import { favoritesApi, productsApi, reviewsApi, type Favorite, type Product } from '@/lib/api';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

const Favorites = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, favorites: storeFavorites } = useStore();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState('popular');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortedProducts, setSortedProducts] = useState<Product[]>([]);
  const [productRatings, setProductRatings] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error('Необходимо войти в систему для просмотра избранного');
      navigate('/');
      return;
    }
    loadFavorites();
  }, [isAuthenticated, user]);

  // Обновляем страницу при изменении избранного в store (только если мы на странице избранного)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Перезагружаем данные при изменении количества избранного в store
      // Это поможет обновить страницу после добавления товара в избранное
      const timer = setTimeout(() => {
        if (window.location.pathname === '/favorites') {
          loadFavorites();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [storeFavorites.length, isAuthenticated, user]);

  const loadFavorites = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [favoritesData, productsData, reviewsData] = await Promise.all([
        favoritesApi.getAll(),
        productsApi.getAll(),
        reviewsApi.getAll(),
      ]);

      // Фильтруем избранное текущего пользователя (сравниваем как числа для надежности)
      const userFavorites = favoritesData.filter(f => Number(f.userId) === Number(user.id));
      console.log('Favorites data:', favoritesData);
      console.log('User ID:', user.id);
      console.log('User favorites:', userFavorites);
      setFavorites(userFavorites);

      // Получаем товары из избранного (сравниваем как числа для надежности)
      const favoriteProducts = productsData.filter(p => 
        userFavorites.some(f => Number(f.productId) === Number(p.id))
      );
      console.log('Favorite products:', favoriteProducts);
      setProducts(favoriteProducts);

      // Вычисляем рейтинги для товаров
      const ratingsMap: Record<number, number> = {};
      favoriteProducts.forEach(p => {
        const productReviews = reviewsData.filter(r => r.productId === p.id);
        if (productReviews.length > 0) {
          ratingsMap[p.id] = productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length;
        } else {
          ratingsMap[p.id] = 0;
        }
      });
      setProductRatings(ratingsMap);
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      toast.error('Ошибка загрузки избранного');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (productId: number) => {
    if (!user) return;
    try {
      const favorite = favorites.find(f => 
        Number(f.productId) === Number(productId) && Number(f.userId) === Number(user.id)
      );
      if (favorite && favorite.id) {
        await favoritesApi.delete(favorite.id);
        // Обновляем store
        const { removeFromFavorites } = useStore.getState();
        removeFromFavorites(String(productId));
        toast.success('Товар удален из избранного');
        loadFavorites();
      }
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      toast.error('Ошибка при удалении из избранного');
    }
  };

  useEffect(() => {
    let sorted = [...products];

    // Фильтр по наличию
    if (onlyInStock) {
      sorted = sorted.filter(p => (p.stockQuantity || 0) > 0);
    }

    // Сортировка
    switch (sortBy) {
      case 'price-asc':
        sorted = sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        sorted = sorted.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        sorted = sorted.sort((a, b) => (productRatings[b.id] || 0) - (productRatings[a.id] || 0));
        break;
      case 'popular':
      default:
        sorted = sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
        break;
    }

    setSortedProducts(sorted);
  }, [products, sortBy, onlyInStock, productRatings]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
          <div>Загрузка...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        {sortedProducts.length > 0 ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-3xl font-bold">Избранное</h1>
                <span className="text-muted-foreground text-3xl">
                  {products.length} {products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Все товары</h2>
              <div className="flex items-center gap-4 flex-wrap">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Сначала популярные</SelectItem>
                    <SelectItem value="price-asc">Сначала дешёвые</SelectItem>
                    <SelectItem value="price-desc">Сначала дорогие</SelectItem>
                    <SelectItem value="rating">По рейтингу</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="in-stock"
                    checked={onlyInStock}
                    onCheckedChange={(checked) => setOnlyInStock(checked === true)}
                  />
                  <label
                    htmlFor="in-stock"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Есть в наличии
                  </label>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              {sortedProducts.map((product) => {
                const favorite = favorites.find(f => 
                  Number(f.productId) === Number(product.id) && Number(f.userId) === Number(user?.id)
                );
                return (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} viewMode="list" hideFavoriteIcon={true} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 right-4 z-10"
                      onClick={() => handleRemoveFavorite(product.id)}
                      title="Удалить из избранного"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Heart className="h-16 w-16 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold mb-2">
                    В избранном пока ничего нет
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Нажмите на иконку избранного для добавления в избранное
                  </p>
                </div>
                <Button onClick={() => navigate('/categories')} variant="outline">
                  Перейти в каталог
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Favorites;

