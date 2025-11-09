import { Link } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, GitCompare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/stores/useStore';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useEffect, useState } from 'react';

export const Header = () => {
  const { cart, favorites, comparison, isAuthenticated, openAuthModal } = useStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background border-b transition-all duration-300">
      {/* Top bar */}
      <div className={`border-b transition-all duration-300 ${isScrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-auto opacity-100'}`}>
        <div className="container mx-auto px-6 md:px-12 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="text-2xl font-bold">
              SORA<span className="text-primary">TECH</span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-sm">
              <Link to="/about" className="hover:text-primary transition-colors">
                О компании
              </Link>
              <Link to="/delivery" className="hover:text-primary transition-colors">
                Доставка и оплата
              </Link>
              <Link to="/pickup" className="hover:text-primary transition-colors">
                Самовывоз
              </Link>
              <Link to="/warranty" className="hover:text-primary transition-colors">
                Гарантия и возврат
              </Link>
              <Link to="/faq" className="hover:text-primary transition-colors">
                FAQ
              </Link>
              <Link to="/contacts" className="hover:text-primary transition-colors">
                Контакты
              </Link>
            </nav>

            {/* Theme Toggle and Configurator Button */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" asChild>
                <Link to="/configurator" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Конфигуратор ПК
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <div className="container mx-auto px-6 md:px-12 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Catalog Button */}
          <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
            <Link to="/categories" className="flex items-center gap-2">
              <Menu className="h-4 w-4" />
              Каталог
            </Link>
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Input
                type="search"
                placeholder="Поиск по названию или ID товара..."
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated ? (
              <Button variant="ghost" size="icon" asChild>
                <Link to="/account">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" onClick={() => openAuthModal()}>
                <User className="h-5 w-5" />
              </Button>
            )}

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/comparison">
                <GitCompare className="h-5 w-5" />
                {comparison.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {comparison.length}
                  </Badge>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/favorites">
                <Heart className="h-5 w-5" />
                {favorites.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {favorites.length}
                  </Badge>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/cart">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
