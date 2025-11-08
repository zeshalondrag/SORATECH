import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Star, Heart, ShoppingCart, GitCompare, Minus, Plus } from 'lucide-react';
import { products } from '@/lib/mockData';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ReviewModal } from '@/components/products/ReviewModal';
import { ProductCard } from '@/components/products/ProductCard';

const Product = () => {
  const { id } = useParams();
  const product = products.find((p) => p.id === id);
  const { addToCart, toggleFavorite, toggleComparison, favorites, comparison, cart, updateQuantity, addToRecentlyViewed, recentlyViewed } = useStore();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product);
    }
  }, [product, addToRecentlyViewed]);

  if (!product) {
    return <div>Товар не найден</div>;
  }

  const isFavorite = favorites.some((p) => p.id === product.id);
  const isInComparison = comparison.some((p) => p.id === product.id);
  const cartItem = cart.find((item) => item.id === product.id);
  const inCart = !!cartItem;

  const handleAddToCart = () => {
    addToCart(product);
    toast.success('Товар добавлен в корзину');
  };

  const handleToggleFavorite = () => {
    toggleFavorite(product);
    toast.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное');
  };

  const handleToggleComparison = () => {
    toggleComparison(product);
    toast.success(isInComparison ? 'Удалено из сравнения' : 'Добавлено в сравнение');
  };

  const handleReviewSubmit = (rating: number, comment: string) => {
    // Mock review submission
    console.log('Review submitted:', { rating, comment, productId: product.id });
  };

  const similarProducts = products.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id
  ).slice(0, 4);

  const breadcrumbItems = [
    { label: 'Категории', href: '/categories' },
    { label: product.category, href: `/catalog/${product.categoryId}` },
    { label: product.name, href: '' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Gallery */}
          <div>
            <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, idx) => (
                <div
                  key={idx}
                  className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:ring-2 ring-primary transition-all"
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">ID: {product.id}</p>
              <h1 className="text-3xl font-bold mb-4">{product.name}</h1>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating)
                          ? 'fill-primary text-primary'
                          : 'text-muted'
                      }`}
                    />
                  ))}
                  <span className="ml-2 font-medium">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">
                  {product.reviewCount} отзывов
                </span>
              </div>

              <div className="flex items-center gap-2 mb-6">
                {Object.entries(product.specs).slice(0, 2).map(([key, value]) => (
                  <Badge key={key} variant="secondary">
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="text-4xl font-bold mb-4">
                {product.price.toLocaleString('ru-RU')} ₽
              </div>

              {product.inStock ? (
                <Badge className="mb-6" variant="default">В наличии</Badge>
              ) : (
                <Badge className="mb-6" variant="secondary">Под заказ</Badge>
              )}

              <div className="space-y-3">
                {!inCart ? (
                  <>
                    <Button onClick={handleAddToCart} size="lg" className="w-full">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      В корзину
                    </Button>
                    <Button variant="secondary" size="lg" className="w-full">
                      Быстрый заказ
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="flex-1 text-center font-medium">
                      В корзине: {cartItem.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleToggleFavorite}
                  >
                    <Heart className={`h-5 w-5 mr-2 ${isFavorite ? 'fill-current text-primary' : ''}`} />
                    {isFavorite ? 'В избранном' : 'В избранное'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={handleToggleComparison}
                  >
                    <GitCompare className={`h-5 w-5 mr-2 ${isInComparison ? 'fill-current text-primary' : ''}`} />
                    {isInComparison ? 'В сравнении' : 'Сравнение'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="specs" className="mb-12">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="specs">Характеристики</TabsTrigger>
            <TabsTrigger value="description">Описание</TabsTrigger>
            <TabsTrigger value="reviews">Отзывы ({product.reviewCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  {Object.entries(product.specs).map(([key, value], idx) => (
                    <tr key={key} className={idx % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-4 font-medium w-1/3">{key}</td>
                      <td className="p-4">{value}</td>
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
              <div className="lg:col-span-2">
                <div className="text-center py-12 text-muted-foreground">
                  Отзывы скоро появятся
                </div>
              </div>

              {/* Rating Summary */}
              <div className="space-y-4">
                <div className="border rounded-lg p-6">
                  <div className="text-center mb-4">
                    <div className="text-5xl font-bold mb-2">{product.rating}</div>
                    <div className="flex justify-center mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-5 w-5 ${
                            i < Math.floor(product.rating)
                              ? 'fill-primary text-primary'
                              : 'text-muted'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      На основе {product.reviewCount} отзывов
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-2">
                        <span className="text-sm w-3">{stars}</span>
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.random() * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={() => setIsReviewModalOpen(true)}
                    className="w-full"
                  >
                    Написать отзыв
                  </Button>
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
                <ProductCard key={p.id} product={p} />
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
                .filter((p) => p.id !== product.id)
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
        productName={product.name}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
};

export default Product;
