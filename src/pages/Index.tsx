import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSlider } from '@/components/home/HeroSlider';
import { ProductCard } from '@/components/products/ProductCard';
import { products } from '@/lib/mockData';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useStore } from '@/stores/useStore';

const Index = () => {
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { recentlyViewed } = useStore();
  const hitProducts = products.filter((p) => p.isHit);
  const newProducts = products.filter((p) => p.isNew);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <section className="container mx-auto px-6 md:px-12 py-12">
          <h2 className="text-3xl font-bold mb-8">Хиты продаж</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hitProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        {/* Useful Links */}
        <section className="container mx-auto px-6 md:px-12 py-12">
          <h2 className="text-3xl font-bold mb-8">Полезные ссылки</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Сборка ПК</h3>
              <p className="text-muted-foreground mb-4">
                Узнайте, как правильно собрать компьютер своими руками
              </p>
              <Button variant="link" className="p-0">
                Подробнее →
              </Button>
            </div>
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Выбор комплектующих</h3>
              <p className="text-muted-foreground mb-4">
                Гайд по выбору совместимых комплектующих для вашего ПК
              </p>
              <Button variant="link" className="p-0">
                Подробнее →
              </Button>
            </div>
            <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">Гарантия и сервис</h3>
              <p className="text-muted-foreground mb-4">
                Условия гарантии и информация о сервисном обслуживании
              </p>
              <Button variant="link" className="p-0">
                Подробнее →
              </Button>
            </div>
          </div>
        </section>

        {/* New Products */}
        <section className="bg-secondary py-12">
          <div className="container mx-auto px-6 md:px-12">
            <h2 className="text-3xl font-bold mb-8">Новинки</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="container mx-auto px-6 md:px-12 py-12">
            <h2 className="text-3xl font-bold mb-8">Вы недавно смотрели</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentlyViewed.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-8 right-8 rounded-full shadow-lg z-40 animate-fade-in"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default Index;
