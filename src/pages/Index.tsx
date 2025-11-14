import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { HeroSlider } from '@/components/home/HeroSlider';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useStore } from '@/stores/useStore';
import { Separator } from '@/components/ui/separator';
import { productsApi, type Product } from '@/lib/api';
import { toast } from 'sonner';

const Index = () => {
  const { recentlyViewed, isAuthenticated } = useStore();
  const [hitProducts, setHitProducts] = useState<any[]>([]);
  const [newProducts, setNewProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const allProducts = await productsApi.getAll();
      
      // Хиты продаж - товары с наибольшим salesCount
      const hits = [...allProducts]
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 5)
        .map(convertProductToCardFormat);
      setHitProducts(hits);
      
      // Новинки - товары с наибольшим id (последние добавленные)
      const news = [...allProducts]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5)
        .map(convertProductToCardFormat);
      setNewProducts(news);
    } catch (error: any) {
      console.error('Error loading products:', error);
      toast.error('Ошибка загрузки товаров');
    } finally {
      setIsLoading(false);
    }
  };

  // Функция для преобразования Product из API в формат для ProductCard
  const convertProductToCardFormat = (product: Product) => {
    return {
      ...product,
      id: String(product.id),
      name: product.nameProduct,
      category: '',
      categoryId: String(product.categoryId),
      image: product.imageUrl || '/placeholder.svg',
      images: [product.imageUrl || '/placeholder.svg'],
      specs: {},
      rating: 0,
      reviewCount: 0,
      inStock: (product.stockQuantity || 0) > 0,
    };
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-6 md:px-12 py-8">
          <HeroSlider />
        </section>

        {/* Hit Products */}
        {!isLoading && hitProducts.length > 0 && (
          <section className="container mx-auto px-6 md:px-12 py-8">
            <h2 className="text-3xl font-bold mb-4">Хиты продаж</h2>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {hitProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {/* Useful Links */}
        <section className="container mx-auto px-6 md:px-12 py-8">
          <h2 className="text-3xl font-bold mb-4">Полезные ссылки</h2>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Конфигуратор</h3>
              <p className="text-muted-foreground mb-4">
                Создайте свой идеальный компьютер в умном конфигураторе уже сегодня
              </p>
              <Button variant="link" className="p-0">
                Подробнее
              </Button>
            </div>
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Скидки и акции</h3>
              <p className="text-muted-foreground mb-4">
                Упейте купить товары по самым выгодным ценам или на специальных условиях!
              </p>
              <Button variant="link" className="p-0">
                Подробнее
              </Button>
            </div>
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">FAQ</h3>
              <p className="text-muted-foreground mb-4">
                Ответы на самые популярны е вопросы
              </p>
              <Button variant="link" className="p-0">
                Подробнее
              </Button>
            </div>
          </div>
        </section>

        {/* New Products */}
        <section className="py-8">
          <div className="container mx-auto px-6 md:px-12">
            <h2 className="text-3xl font-bold mb-4">Новинки</h2>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Recently Viewed */}
        {isAuthenticated && recentlyViewed.length > 0 && (
          <section className="container mx-auto px-6 md:px-12 py-8">
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
    </div>
  );
};

export default Index;
