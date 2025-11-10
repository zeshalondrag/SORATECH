import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, GitCompare, Minus, Plus, HelpCircle } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ReviewModal } from '@/components/products/ReviewModal';
import { ProductCard } from '@/components/products/ProductCard';
import { 
  productsApi, 
  categoriesApi, 
  productCharacteristicsApi, 
  characteristicsApi,
  reviewsApi,
  ordersApi,
  suppliersApi,
  type Product, 
  type Category,
  type Characteristic,
  type ProductCharacteristic,
  type Review,
  type Order,
  type Supplier
} from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CharacteristicWithDescription {
  name: string;
  value: string;
  description: string;
}

const Product = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    addToCart, 
    toggleFavorite, 
    toggleComparison, 
    favorites, 
    comparison, 
    cart, 
    updateQuantity, 
    addToRecentlyViewed, 
    recentlyViewed,
    user
  } = useStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [characteristics, setCharacteristics] = useState<CharacteristicWithDescription[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [activeTab, setActiveTab] = useState('specs');

  useEffect(() => {
    if (id) {
      loadProductData();
    }
  }, [id, user]);

  const loadProductData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const productId = parseInt(id);
      const [productData, allProducts, allCategories, allProductCharacteristics, allCharacteristics, allReviews, allOrders, allSuppliers] = await Promise.all([
        productsApi.getById(productId),
        productsApi.getAll(),
        categoriesApi.getAll(),
        productCharacteristicsApi.getAll(),
        characteristicsApi.getAll(),
        reviewsApi.getAll(),
        user ? ordersApi.getAll() : Promise.resolve([]),
        suppliersApi.getAll()
      ]);

      setProduct(productData);
      
      // Находим категорию товара
      const productCategory = allCategories.find(c => c.id === productData.categoryId);
      setCategory(productCategory || null);

      // Находим поставщика товара
      const productSupplier = allSuppliers.find(s => s.id === productData.supplierId);
      setSupplier(productSupplier || null);

      // Загружаем характеристики товара
      const productChars = allProductCharacteristics.filter(pc => pc.productId === productId);
      const charMap = new Map(allCharacteristics.map(c => [c.id, c]));
      const charsWithNames: CharacteristicWithDescription[] = productChars.map(pc => {
        const char = charMap.get(pc.characteristicId);
        return {
          name: char?.nameCharacteristic || '',
          value: pc.description,
          description: char?.description || ''
        };
      });
      setCharacteristics(charsWithNames);

      // Загружаем отзывы товара
      const productReviews = allReviews.filter(r => r.productId === productId);
      setReviews(productReviews);

      // Вычисляем рейтинг и количество отзывов
      let calculatedRating = 0;
      let calculatedReviewCount = 0;
      if (productReviews.length > 0) {
        calculatedRating = productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length;
        calculatedReviewCount = productReviews.length;
        setRating(calculatedRating);
        setReviewCount(calculatedReviewCount);
      } else {
        setRating(0);
        setReviewCount(0);
      }

      // Вычисляем наличие товара
      const calculatedInStock = (productData.stockQuantity || 0) > 0;

      // Проверяем, купил ли пользователь товар
      if (user) {
        const userOrders = allOrders.filter(o => o.userId === user.id);
        const purchased = userOrders.some(order => 
          order.orderItems?.some(item => item.productId === productId)
        );
        setHasPurchased(purchased);
      } else {
        setHasPurchased(false);
      }

      // Находим похожие товары
      const similar = allProducts
        .filter(p => p.categoryId === productData.categoryId && p.id !== productId)
        .slice(0, 4);
      setSimilarProducts(similar);

      // Добавляем в недавно просмотренные (преобразуем в формат для store)
      const productForStore = {
        ...productData,
        id: String(productData.id),
        name: productData.nameProduct,
        category: productCategory?.nameCategory || '',
        image: productData.imageUrl || '/placeholder.svg',
        images: [productData.imageUrl || '/placeholder.svg'],
        specs: {},
        rating: calculatedRating,
        reviewCount: calculatedReviewCount,
        inStock: calculatedInStock,
        categoryId: String(productData.categoryId)
      };
      addToRecentlyViewed(productForStore);
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error('Ошибка загрузки товара');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
          <div>Товар не найден</div>
        </main>
        <Footer />
      </div>
    );
  }

  const isFavorite = favorites.some((p) => String(p.id) === String(product.id));
  const isInComparison = comparison.some((p) => String(p.id) === String(product.id));
  const cartItem = cart.find((item) => String(item.id) === String(product.id));
  const inCart = !!cartItem;
  const inStock = (product.stockQuantity || 0) > 0;
  const maxQuantity = product.stockQuantity || 0;

  const handleAddToCart = () => {
    if (!inStock) {
      toast.error('Товар отсутствует в наличии');
      return;
    }
    // Преобразуем Product из API в формат для store
    const productForCart = {
      ...product,
      id: String(product.id),
      name: product.nameProduct,
      category: category?.nameCategory || '',
      image: product.imageUrl || '/placeholder.svg',
      images: [product.imageUrl || '/placeholder.svg'],
      specs: {},
      rating: rating,
      reviewCount: reviewCount,
      inStock: inStock,
      categoryId: String(product.categoryId)
    };
    addToCart(productForCart);
    toast.success('Товар добавлен в корзину');
  };

  const handleIncreaseQuantity = () => {
    if (!cartItem) return;
    if (cartItem.quantity >= maxQuantity) {
      toast.error(`Можно добавить не более ${maxQuantity} товаров`);
      return;
    }
    updateQuantity(String(product.id), cartItem.quantity + 1);
  };

  const handleDecreaseQuantity = () => {
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      updateQuantity(String(product.id), 0);
    } else {
      updateQuantity(String(product.id), cartItem.quantity - 1);
    }
  };

  const handleToggleFavorite = () => {
    const productForStore = {
      ...product,
      id: String(product.id),
      name: product.nameProduct,
      category: category?.nameCategory || '',
      image: product.imageUrl || '/placeholder.svg',
      images: [product.imageUrl || '/placeholder.svg'],
      specs: {},
      rating: rating,
      reviewCount: reviewCount,
      inStock: inStock,
      categoryId: String(product.categoryId)
    };
    toggleFavorite(productForStore);
    toast.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное');
  };

  const handleToggleComparison = () => {
    const productForStore = {
      ...product,
      id: String(product.id),
      name: product.nameProduct,
      category: category?.nameCategory || '',
      image: product.imageUrl || '/placeholder.svg',
      images: [product.imageUrl || '/placeholder.svg'],
      specs: {},
      rating: rating,
      reviewCount: reviewCount,
      inStock: inStock,
      categoryId: String(product.categoryId)
    };
    toggleComparison(productForStore);
    toast.success(isInComparison ? 'Удалено из сравнения' : 'Добавлено в сравнение');
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!user) {
      toast.error('Необходимо войти в систему');
      return;
    }
    if (!hasPurchased) {
      toast.error('Вы можете оставить отзыв только после покупки товара');
      return;
    }
    try {
      await reviewsApi.create({
        productId: product.id,
        userId: user.id,
        rating,
        commentText: comment
      });
      toast.success('Отзыв успешно добавлен');
      setIsReviewModalOpen(false);
      loadProductData();
    } catch (error: any) {
      toast.error('Ошибка при добавлении отзыва');
    }
  };

  // Маппинг ID категорий на slug (как в Catalog.tsx)
  const categorySlugMap: Record<number, string> = {
    1: 'cpu',
    2: 'gpu',
    3: 'motherboard',
    4: 'ram',
    5: 'ssd',
    6: 'hdd',
    7: 'cooling',
    8: 'psu',
    9: 'case',
  };

  const categorySlug = category ? categorySlugMap[category.id] || category.id.toString() : '';
  
  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Категории', href: '/categories' },
    { label: category?.nameCategory || 'Категория', href: category ? `/catalog/${categorySlug}` : '' },
    { label: product.nameProduct, href: '' }
  ];

  // Подсчет рейтинга по звездам
  const ratingDistribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => Math.floor(Number(r.rating)) === stars).length;
    return { stars, count, percentage: reviewCount > 0 ? (count / reviewCount) * 100 : 0 };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Название товара */}
        <h1 className="text-3xl font-bold mb-8">{product.nameProduct}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          {/* Gallery */}
          <div>
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
              <img
                src={product.imageUrl || '/placeholder.svg'}
                alt={product.nameProduct}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Столбец 1: Информация о товаре */}
          <div className="space-y-4">
            {/* Артикул */}
            <div>
              <p className="text-sm text-muted-foreground">Артикул: {product.article}</p>
            </div>

            {/* Рейтинг и отзывы */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted'
                    }`}
                  />
                ))}
                <span className="ml-2 font-medium">{rating.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {reviewCount} {reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов'}
              </span>
            </div>

            {/* Краткое описание */}
            <div>
              <h2 className="text-lg font-semibold mb-2">Кратко о товаре</h2>
            </div>

            {/* Список характеристик */}
            {characteristics.length > 0 && (
              <div>
                <ul className="space-y-2">
                  {characteristics.map((char, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="font-medium">{char.name}:</span>{' '}
                      <span className="text-muted-foreground">{char.value}</span>
                    </li>
                  ))}
                </ul>
                {characteristics.length > 5 && (
                  <button
                    onClick={() => setActiveTab('specs')}
                    className="text-sm text-primary hover:underline mt-2"
                  >
                    Полные характеристики
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Столбец 2: Цена и покупка */}
          <div className="space-y-4">
            {/* Цена и статус в одной строке */}
            <div className="flex items-center justify-between">
              <div className="text-4xl font-bold">
                {product.price.toLocaleString('ru-RU')} ₽
              </div>
              {inStock ? (
                <Badge variant="default">В наличии</Badge>
              ) : (
                <Badge variant="secondary">Нет в наличии</Badge>
              )}
            </div>

            {/* Кнопка быстрый заказ */}
            <Button variant="secondary" size="lg" className="w-full">
              Быстрый заказ
            </Button>

            {/* Кнопка в корзине */}
            {!inCart ? (
              <>
                {inStock ? (
                  <Button onClick={handleAddToCart} size="lg" className="w-full">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    В корзину
                  </Button>
                ) : (
                  <Button disabled size="lg" className="w-full">
                    Нет в наличии
                  </Button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => navigate('/cart')}
                >
                  В корзине: {cartItem.quantity}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDecreaseQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleIncreaseQuantity}
                  disabled={cartItem.quantity >= maxQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Иконки сравнение и избранное */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                className="flex-1"
                onClick={handleToggleFavorite}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current text-primary' : ''}`} /> В избранное
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                className="flex-1"
                onClick={handleToggleComparison}
              >
                <GitCompare className={`h-5 w-5 ${isInComparison ? 'fill-current text-primary' : ''}`} /> Сравнить
              </Button>
            </div>

            {/* Данные поставщика */}
            {supplier && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3">Поставщик</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground whitespace-nowrap">Производитель</span>
                    <span className="flex-1 border-b border-dotted border-muted-foreground/30"></span>
                    <span className="font-medium text-right">{supplier.nameSupplier}</span>
                  </div>
                  {supplier.contactEmail && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Почта</span>
                      <span className="flex-1 border-b border-dotted border-muted-foreground/30"></span>
                      <span className="font-medium text-right">{supplier.contactEmail}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground whitespace-nowrap">Телефон</span>
                      <span className="flex-1 border-b border-dotted border-muted-foreground/30"></span>
                      <span className="font-medium text-right">{supplier.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="specs">Характеристики</TabsTrigger>
            <TabsTrigger value="description">Описание</TabsTrigger>
            <TabsTrigger value="reviews">Отзывы ({reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {characteristics.map((char, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-4 font-medium w-1/3">
                        <div className="flex items-center gap-2">
                          {char.name}
                          {char.description && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">{char.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{char.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              * Проверяйте полное описание на официальном сайте производителя
            </p>
          </TabsContent>

          <TabsContent value="description">
            <div className="prose max-w-none">
              <p>{product.description}</p>
              <p className="text-sm text-muted-foreground mt-4">
                * Проверяйте полное описание на официальном сайте производителя
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Reviews List */}
              <div className="lg:col-span-2 space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-medium mb-1">
                            {review.user?.nickname || review.user?.firstName || 'Пользователь'}
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(Number(review.rating))
                                    ? 'fill-primary text-primary'
                                    : 'text-muted'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(review.reviewDate), 'dd MMMM yyyy', { locale: ru })}
                        </div>
                      </div>
                      {review.product && (
                        <div className="text-sm text-muted-foreground mb-2">
                          Товар: {review.product.name || product.nameProduct}
                        </div>
                      )}
                      {review.commentText && (
                        <p className="text-sm">{review.commentText}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Отзывов пока нет
                  </div>
                )}
              </div>

              {/* Rating Summary */}
              <div className="space-y-4">
                <div className="border rounded-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold mb-2">{rating.toFixed(1)}</div>
                    <div className="flex justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(rating)
                              ? 'fill-primary text-primary'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      На основе {reviewCount} {reviewCount === 1 ? 'отзыва' : reviewCount < 5 ? 'отзывов' : 'отзывов'}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {ratingDistribution.map(({ stars, count, percentage }) => (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-sm w-3">{stars}</span>
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={() => {
                      if (!user) {
                        toast.error('Необходимо войти в систему');
                        return;
                      }
                      if (!hasPurchased) {
                        toast.error('Вы можете оставить отзыв только после покупки товара');
                        return;
                      }
                      setIsReviewModalOpen(true);
                    }}
                    className="w-full"
                    disabled={!hasPurchased}
                  >
                    Написать отзыв
                  </Button>
                  {!hasPurchased && user && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Оставить отзыв можно только после покупки товара
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Похожие товары</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p as any} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 1 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Вы недавно смотрели</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewed
                .filter((p) => String(p.id) !== String(product.id))
                .slice(0, 4)
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      
      {/* Review Modal */}
      <ReviewModal
        open={isReviewModalOpen}
        onOpenChange={setIsReviewModalOpen}
        productName={product.nameProduct}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default Product;
