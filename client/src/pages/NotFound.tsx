import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Home, AlertCircle } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center bg-background">
        <div className="container mx-auto px-6 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Иконка 404 слева */}
            <div className="flex justify-center md:justify-start">
              <div className="w-full max-w-md flex items-center justify-center">
                <div className="relative">
                  <h1 className="text-9xl font-bold text-primary">404</h1>
                </div>
              </div>
            </div>

            {/* Текст справа */}
            <div className="text-center md:text-left space-y-6">
              <h1 className="text-4xl font-semibold">Увы, страница не найдена</h1>
              <p className="text-lg text-muted-foreground">
                К сожалению, вы зашли на несуществующую страницу. Возможно, вы перешли по старой ссылке или ввели неправильный адрес.
              </p>
              <p className="text-lg text-muted-foreground">
                Попробуйте проверить ссылку или вернитесь на главную страницу.
              </p>
              <div className="pt-4">
                <Button asChild size="lg" className="w-full md:w-auto">
                  <Link to="/" className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Перейти на главную
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
