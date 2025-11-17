import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, GitCompare, Minus, Plus, HelpCircle, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { formatPrice } from '@/lib/currency';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Separator } from '@/components/ui/separator';
import { ReviewModal } from '@/components/products/ReviewModal';
import { ProductCard } from '@/components/products/ProductCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  productsApi, 
  categoriesApi, 
  productCharacteristicsApi, 
  characteristicsApi,
  reviewsApi,
  suppliersApi,
  adminUsersApi,
  type Product, 
  type Category,
  type Characteristic,
  type ProductCharacteristic,
  type Review,
  type Supplier,
  type User
} from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    removeFromCart,
    addToRecentlyViewed, 
    recentlyViewed,
    user,
    isAuthenticated,
    currency
  } = useStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [characteristics, setCharacteristics] = useState<CharacteristicWithDescription[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [usersMap, setUsersMap] = useState<Map<number, User>>(new Map());
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
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
      const [productData, allProducts, allCategories, allProductCharacteristics, allCharacteristics, allReviews, allSuppliers] = await Promise.all([
        productsApi.getById(productId),
        productsApi.getAll(),
        categoriesApi.getAll(),
        productCharacteristicsApi.getAll(),
        characteristicsApi.getAll(),
        reviewsApi.getAll(),
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
      
      // Загружаем пользователей для отзывов
      try {
        const allUsers = await adminUsersApi.getAll();
        const usersMapData = new Map<number, User>();
        allUsers.forEach(u => usersMapData.set(u.id, u));
        setUsersMap(usersMapData);
        
        // Связываем пользователей с отзывами
        const reviewsWithUsers = productReviews.map(review => ({
          ...review,
          user: review.user || usersMapData.get(review.userId)
        }));
        setReviews(reviewsWithUsers);
      } catch (error) {
        // Если не удалось загрузить пользователей, используем отзывы как есть
        console.warn('Could not load users for reviews:', error);
        setReviews(productReviews);
      }

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

      // Проверяем, может ли пользователь оставить отзыв (купил ли товар со статусом "Доставлен")
      if (user && isAuthenticated) {
        try {
          const checkResult = await reviewsApi.check(productId);
          // canReview уже учитывает hasPurchased и отсутствие существующего отзыва
          setHasPurchased(checkResult.canReview);
        } catch (error: any) {
          console.error('Error checking review eligibility:', error);
          // Если ошибка авторизации, просто не разрешаем оставлять отзыв
          setHasPurchased(false);
        }
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

  const handleAddToCart = async () => {
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
    try {
      await addToCart(productForCart);
    toast.success('Товар добавлен в корзину');
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      toast.error('Ошибка при добавлении товара в корзину');
    }
  };

  const handleIncreaseQuantity = async () => {
    if (!cartItem) return;
    if (cartItem.quantity >= maxQuantity) {
      toast.error(`Можно добавить не более ${maxQuantity} товаров`);
      return;
    }
    try {
      await updateQuantity(String(product.id), cartItem.quantity + 1);
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast.error('Ошибка при обновлении количества');
    }
  };

  const handleDecreaseQuantity = async () => {
    if (!cartItem) return;
    if (cartItem.quantity <= 1) {
      removeFromCart(String(product.id));
    } else {
      try {
        await updateQuantity(String(product.id), cartItem.quantity - 1);
      } catch (error: any) {
        console.error('Error updating quantity:', error);
        toast.error('Ошибка при обновлении количества');
      }
    }
  };

  const handleToggleFavorite = async () => {
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
    try {
      await toggleFavorite(productForStore);
    toast.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное');
    } catch (error: any) {
      // Ошибка уже обработана в toggleFavorite (открытие модального окна авторизации)
    }
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
    if (editingReview) {
      // Редактирование существующего отзыва
      try {
        await reviewsApi.update(editingReview.id, {
          rating,
          commentText: comment
        });
        toast.success('Отзыв успешно обновлен');
        setEditingReview(null);
        setIsReviewModalOpen(false);
        loadProductData();
      } catch (error: any) {
        toast.error('Ошибка при обновлении отзыва');
      }
    } else {
      // Создание нового отзыва
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
    }
  };

  const handleEditReview = (review: Review) => {
    if (!user || Number(review.userId) !== Number(user.id)) {
      toast.error('Вы можете редактировать только свои отзывы');
      return;
    }
    setEditingReview(review);
    setIsReviewModalOpen(true);
  };

  const handleDeleteReview = async () => {
    if (!deletingReview || !user) return;
    
    try {
      await reviewsApi.delete(deletingReview.id);
      toast.success('Отзыв успешно удален');
      setDeletingReview(null);
      loadProductData();
    } catch (error: any) {
      toast.error('Ошибка при удалении отзыва');
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
            <div className="aspect-square rounded-lg overflow-hidden mb-4 border border-muted">
              <img
                src={product.imageUrl || '/placeholder.svg'}
                alt={product.nameProduct}
                className="p-4 w-full h-full object-cover"
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
                {formatPrice(product.price, currency)}
              </div>
              {inStock ? (
                <Badge variant="default">В наличии: {product.stockQuantity} {product.stockQuantity === 1 ? 'шт.' : product.stockQuantity < 5 ? 'шт.' : 'шт.'}</Badge>
              ) : (
                <Badge variant="secondary">Нет в наличии</Badge>
              )}
            </div>

            {/* Кнопка быстрый заказ */}
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full"
              onClick={async () => {
                if (!inStock) {
                  toast.error('Товар отсутствует в наличии');
                  return;
                }
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
                try {
                  await addToCart(productForCart);
                  toast.success('Товар добавлен в корзину');
                  navigate('/cart');
                } catch (error: any) {
                  console.error('Error adding to cart:', error);
                  toast.error('Ошибка при добавлении товара в корзину');
                }
              }}
            >
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
            <p className="text-sm text-muted-foreground py-4">
              * Уважаемые покупатели! Пожалуйста, проверяйте описание товара на официальном сайте производителя перед покупкой. Уточняйте спецификацию, наличие на складе и цену у менеджеров интернет-магазина. Внешний вид, комплектация и характеристики могут быть изменены производителем без предварительного уведомления.
            </p>
          </TabsContent>

          <TabsContent value="description">
            <div className="prose max-w-none">
              {product.description ? (
                product.description.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className={index > 0 ? 'mt-4' : ''}>
                      {paragraph.trim()}
                    </p>
                  )
                ))
              ) : (
                <p className="text-muted-foreground">Описание отсутствует</p>
              )}
              <p className="text-sm text-muted-foreground mt-4 py-8">
                * Уважаемые покупатели! Пожалуйста, проверяйте описание товара на официальном сайте производителя перед покупкой. Уточняйте спецификацию, наличие на складе и цену у менеджеров интернет-магазина. Внешний вид, комплектация и характеристики могут быть изменены производителем без предварительного уведомления.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Reviews List */}
              <div className="lg:col-span-2 space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => {
                    const isUserReview = user && Number(review.userId) === Number(user.id);
                    const reviewUser = review.user || usersMap.get(review.userId);
                    const userName = reviewUser?.nickname || reviewUser?.firstName || 'Пользователь';
                    const userInitials = userName.charAt(0).toUpperCase();
                    
                    return (
                      <div key={review.id} className="border rounded-lg p-6 bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-4">
                          {/* Аватарка */}
                          <Avatar className="h-12 w-12 border-2">
                            <AvatarImage src={(reviewUser as any)?.avatarUrl} alt={userName} />
                            <AvatarFallback className="font-semibold">
                              {userInitials}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Основной контент */}
                          <div className="flex-1 min-w-0">
                            {/* Заголовок с никнеймом, датой и действиями */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-base truncate">
                                    {userName}
                                  </h4>
                                  {isUserReview && (
                                    <Badge variant="default" className="text-xs">
                                      Ваш отзыв
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span>{format(new Date(review.reviewDate), 'dd MMMM yyyy', { locale: ru })}</span>
                                </div>
                              </div>
                              
                              {/* Иконки редактирования и удаления */}
                              {isUserReview && (
                                <div className="flex items-center gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditReview(review)}
                                    title="Редактировать отзыв"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setDeletingReview(review)}
                                    title="Удалить отзыв"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            {/* Рейтинг */}
                            <div className="flex items-center gap-1 mb-3">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < Math.floor(Number(review.rating))
                                      ? 'fill-primary text-primary'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              ))}
                            </div>
                            
                            {/* Товар */}
                            {review.product && (
                              <div className="text-sm text-muted-foreground mb-3 pb-3 border-b">
                                <span className="font-medium">Товар:</span> {review.product.name || product?.nameProduct || 'Товар'}
                              </div>
                            )}
                            
                            {/* Комментарий */}
                            {review.commentText && (
                              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {review.commentText}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                      setEditingReview(null);
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
        {isAuthenticated && recentlyViewed.length > 0 && (
          <section>
            <h2 className="text-3xl font-bold mb-4">Вы недавно смотрели</h2>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {recentlyViewed.slice(0, 5).map((product) => (
                <ProductCard key={product.id} product={product} />
                ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <BackToTopButton />
      
      {/* Review Modal */}
      <ReviewModal
        open={isReviewModalOpen}
        onOpenChange={(open) => {
          setIsReviewModalOpen(open);
          if (!open) {
            setEditingReview(null);
          }
        }}
        productName={product.nameProduct}
        onSubmit={handleReviewSubmit}
        review={editingReview}
      />

      {/* Delete Review Dialog */}
      <AlertDialog open={!!deletingReview} onOpenChange={(open) => !open && setDeletingReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить отзыв?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Product;
