import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star, GitCompare, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product as ApiProduct, ProductCharacteristic, productCharacteristicsApi, characteristicsApi, Characteristic, reviewsApi, Review } from '@/lib/api';
import { Product as MockProduct } from '@/lib/mockData';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

interface ProductCardProps {
  product: ApiProduct | MockProduct;
  viewMode?: 'grid' | 'list';
  hideFavoriteIcon?: boolean;
}

export const ProductCard = ({ product, viewMode = 'grid', hideFavoriteIcon = false }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart, toggleFavorite, toggleComparison, favorites, comparison, cart, updateQuantity, removeFromCart } = useStore();
  const [characteristics, setCharacteristics] = useState<Array<{ name: string; value: string }>>([]);
  const [rating, setRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  
  // Проверяем, это API продукт или mock продукт
  const isApiProduct = 'nameProduct' in product;
  const productId = isApiProduct ? product.id : product.id;
  const productName = isApiProduct ? product.nameProduct : product.name;
  const productPrice = isApiProduct ? product.price : product.price;
  const productImage = isApiProduct ? (product.imageUrl || '') : product.image;
  const productArticle = isApiProduct ? product.article : '';
  const productStock = isApiProduct ? (product.stockQuantity || 0) : (product.inStock ? 1 : 0);
  const inStock = productStock > 0;
  
  const isFavorite = favorites.some((p) => p.id === productId.toString());
  const isInComparison = comparison.some((p) => p.id === productId.toString());
  const cartItem = cart.find((item) => item.id === productId.toString());
  const inCart = !!cartItem;
  const currentCartQuantity = cartItem?.quantity || 0;

  useEffect(() => {
    if (isApiProduct) {
      loadCharacteristics();
      loadReviews();
    } else {
      setRating(product.rating || 0);
      setReviewCount(product.reviewCount || 0);
    }
  }, [productId, isApiProduct]);

  const loadCharacteristics = async () => {
    if (!isApiProduct) return;
    try {
      const [allProductCharacteristics, allCharacteristics] = await Promise.all([
        productCharacteristicsApi.getAll(),
        characteristicsApi.getAll(),
      ]);
      
      const productChars = allProductCharacteristics.filter((pc) => pc.productId === productId);
      const charMap = new Map(allCharacteristics.map((c) => [c.id, c.nameCharacteristic]));
      
      const charsWithNames = productChars.map((pc) => ({
        name: charMap.get(pc.characteristicId) || '',
        value: pc.description,
      }));
      
      setCharacteristics(charsWithNames);
    } catch (error) {
      console.error('Error loading characteristics:', error);
    }
  };

  const loadReviews = async () => {
    if (!isApiProduct) return;
    try {
      const allReviews = await reviewsApi.getAll();
      const productReviews = allReviews.filter((r) => r.productId === productId);
      setReviewCount(productReviews.length);
      
      if (productReviews.length > 0) {
        const avgRating = productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length;
        setRating(avgRating);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleAddToCart = async () => {
    // Проверяем наличие товара
    if (!inStock) {
      toast.error('Товар отсутствует в наличии');
      return;
    }
    
    // Проверяем, не превышает ли текущее количество в корзине доступное количество
    if (isApiProduct && currentCartQuantity >= productStock) {
      toast.error(`Можно добавить не более ${productStock} шт. товара`);
      return;
    }
    
    // Преобразуем API продукт в формат для корзины
    const cartProduct = isApiProduct ? {
      id: productId.toString(),
      name: productName,
      price: productPrice,
      image: productImage,
      category: '',
      categoryId: product.categoryId.toString(),
      images: [productImage],
      rating: 0,
      reviewCount: 0,
      inStock: (product.stockQuantity || 0) > 0,
      specs: {},
      description: product.description,
    } : product;
    
    try {
      await addToCart(cartProduct);
      toast.success('Товар добавлен в корзину');
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      const errorMessage = error?.message || error?.title || 'Ошибка при добавлении товара в корзину';
      toast.error(errorMessage);
    }
  };

  const handleToggleFavorite = async () => {
    const favProduct = isApiProduct ? {
      id: productId.toString(),
      name: productName,
      price: productPrice,
      image: productImage,
      category: '',
      categoryId: product.categoryId.toString(),
      images: [productImage],
      rating: 0,
      reviewCount: 0,
      inStock: (product.stockQuantity || 0) > 0,
      specs: {},
      description: product.description,
    } : product;
    
    try {
      await toggleFavorite(favProduct);
      toast.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное');
    } catch (error: any) {
      // Ошибка уже обработана в toggleFavorite (открытие модального окна авторизации)
    }
  };

  const handleToggleComparison = () => {
    const compProduct = isApiProduct ? {
      id: productId.toString(),
      name: productName,
      price: productPrice,
      image: productImage,
      category: '',
      categoryId: product.categoryId.toString(),
      images: [productImage],
      rating: 0,
      reviewCount: 0,
      inStock: (product.stockQuantity || 0) > 0,
      specs: {},
      description: product.description,
    } : product;
    
    toggleComparison(compProduct);
    toast.success(isInComparison ? 'Удалено из сравнения' : 'Добавлено в сравнение');
  };

  if (viewMode === 'list') {
    return (
      <Card className="card-hover">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Изображение */}
          <Link to={`/product/${productId}`} className="flex-shrink-0">
            <div className="relative w-48 h-full overflow-hidden rounded-md">
              <img
                src={productImage || '/placeholder.svg'}
                alt={productName}
                className="object-cover w-full h-full"
                loading="lazy"
              />
            </div>
          </Link>

          {/* Контент */}
          <div className="flex-1 flex flex-col">
            {/* Артикул */}
            {productArticle && (
              <p className="text-xs text-muted-foreground mb-1">
                Артикул: {productArticle}
              </p>
            )}

            {/* Название */}
            <Link to={`/product/${productId}`}>
              <h3 className="font-medium text-lg mb-2 group-hover:text-primary transition-colors">
                {productName}
              </h3>
            </Link>

            {/* Характеристики */}
            {characteristics.length > 0 && (
              <p className="text-sm text-muted-foreground mb-2">
                {characteristics.map((char, idx) => (
                  <span key={idx}>
                    {char.name}: {char.value}
                    {idx < characteristics.length - 1 && ', '}
                  </span>
                ))}
              </p>
            )}

            {/* Рейтинг */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                ({reviewCount}{' '}
                {reviewCount === 1
                  ? 'отзыв'
                  : reviewCount < 5
                  ? 'отзыва'
                  : 'отзывов'}
                )
              </span>
            </div>

            {/* Нижний блок — всё в одну строку */}
            <div className="flex items-center justify-between mt-auto gap-4 flex-wrap">
              {/* Цена и наличие */}
              <div className="flex items-center gap-3">
                <div className="text-2xl font-bold">
                  {productPrice.toLocaleString('ru-RU')} ₽
                </div>
                <Badge variant={inStock ? 'default' : 'secondary'}>
                  {inStock ? 'В наличии' : 'Нет в наличии'}
                </Badge>
              </div>

              {/* Действия */}
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!inStock ? (
                  <span className="text-sm text-muted-foreground">Не в наличии</span>
                ) : !inCart ? (
                  <Button onClick={handleAddToCart}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    В корзину
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => navigate('/cart')}
                      className="min-w-[100px]"
                    >
                      В корзине
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        updateQuantity(productId.toString(), cartItem.quantity - 1)
                      }
                      disabled={cartItem.quantity <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">
                      {cartItem.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        if (isApiProduct && cartItem.quantity >= productStock) {
                          toast.error(`Можно добавить не более ${productStock} шт. товара`);
                          return;
                        }
                        updateQuantity(productId.toString(), cartItem.quantity + 1);
                      }}
                      disabled={isApiProduct && cartItem.quantity >= productStock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {/* Кнопки избранное / сравнение */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleComparison}
                  className={`h-8 w-8 ${isInComparison ? 'text-primary' : ''}`}
                >
                  <GitCompare
                    className={`h-4 w-4 ${isInComparison ? 'fill-current' : ''}`}
                  />
                </Button>
                {!hideFavoriteIcon && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleFavorite}
                    className={`h-8 w-8 ${isFavorite ? 'text-primary' : ''}`}
                  >
                    <Heart
                      className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`}
                    />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    );
  }

  return (
    <Card className="group card-hover h-full flex flex-col">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Image */}
        <Link to={`/product/${productId}`} className="block mb-4">
          <div className="relative aspect-square overflow-hidden rounded-md">
            <img
              src={productImage || '/placeholder.svg'}
              alt={productName}
              className="object-cover w-full h-full"
              loading="lazy"
            />
            {!isApiProduct && product.isNew && (
              <Badge className="absolute top-2 left-2" variant="destructive">
                Новинка
              </Badge>
            )}
            {!isApiProduct && product.isHit && (
              <Badge className="absolute top-2 right-2">
                Хит продаж
              </Badge>
            )}
          </div>
        </Link>

        {/* Price and Icons */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            {productPrice.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleComparison}
              className={`h-8 w-8 ${isInComparison ? 'text-primary' : ''}`}
            >
              <GitCompare className={`h-4 w-4 ${isInComparison ? 'fill-current' : ''}`} />
            </Button>
            {!hideFavoriteIcon && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                className={`h-8 w-8 ${isFavorite ? 'text-primary' : ''}`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Article */}
        {productArticle && (
          <p className="text-xs text-muted-foreground mb-2">Артикул: {productArticle}</p>
        )}

        {/* Name */}
        <Link to={`/product/${productId}`}>
          <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {productName}
          </h3>
        </Link>

        {/* Characteristics */}
        {characteristics.length > 0 && (
          <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {characteristics.map((char, idx) => (
              <span key={idx}>
                {char.name}: {char.value}
                {idx < characteristics.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}

        {/* Brief specs для mock продуктов */}
        {!isApiProduct && product.specs && (
          <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {Object.entries(product.specs).slice(0, 2).map(([key, value], idx) => (
              <span key={key}>
                {key}: {value}
                {idx === 0 && ' • '}
              </span>
            ))}
          </div>
        )}

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({reviewCount} {reviewCount === 1 ? 'отзыв' : reviewCount < 5 ? 'отзыва' : 'отзывов'})
          </span>
        </div>

        {/* Add to Cart Button */}
        <div className="mt-auto">
          {!inStock ? (
            <div className="w-full text-center py-2 text-sm text-muted-foreground">
              Не в наличии
            </div>
          ) : !inCart ? (
            <Button onClick={handleAddToCart} className="w-full group/btn">
              <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
              В корзину
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                onClick={() => navigate('/cart')}
                className="flex-1 min-w-[90px]"
              >
                В корзине
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  try {
                    if (cartItem.quantity <= 1) {
                      removeFromCart(productId.toString());
                    } else {
                      await updateQuantity(productId.toString(), cartItem.quantity - 1);
                    }
                  } catch (error: any) {
                    console.error('Error updating quantity:', error);
                    toast.error('Ошибка при обновлении количества');
                  }
                }}
                disabled={cartItem.quantity <= 0}
                className="min-w-[35px]"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-16 text-center font-medium">
                {cartItem.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={async () => {
                  try {
                    if (isApiProduct && cartItem.quantity >= productStock) {
                      toast.error(`Можно добавить не более ${productStock} шт. товара`);
                      return;
                    }
                    await updateQuantity(productId.toString(), cartItem.quantity + 1);
                  } catch (error: any) {
                    console.error('Error updating quantity:', error);
                    toast.error('Ошибка при обновлении количества');
                  }
                }}
                disabled={isApiProduct && cartItem.quantity >= productStock}
                className="min-w-[35px]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
