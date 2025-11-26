import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, LayoutGrid, GitCompare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/stores/useStore';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { CurrencySelector } from '@/components/currency/CurrencySelector';
import { useEffect, useState, useRef } from 'react';
import { productsApi, type Product } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { formatPrice } from '@/lib/currency';

export const Header = () => {
  const { cart, favorites, comparison, isAuthenticated, openAuthModal, currency } = useStore();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Поиск товаров
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const allProducts = await productsApi.getAll();
        const query = searchQuery.toLowerCase().trim();
        const filtered = allProducts.filter((product) => {
          const nameMatch = product.nameProduct.toLowerCase().includes(query);
          const articleMatch = product.article.toLowerCase().includes(query);
          return nameMatch || articleMatch;
        });
        setSearchResults(filtered.slice(0, 5));
        setShowResults(filtered.length > 0);
      } catch (error) {
        console.error('Error searching products:', error);
        setSearchResults([]);
        setShowResults(false);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Закрытие результатов при клике вне области поиска
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
    setSearchQuery('');
    setShowResults(false);
  };

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

            {/* Theme Toggle, Currency Selector and Configurator Button */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <CurrencySelector />
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
          <Button variant="default" size="sm" asChild className="flex-shrink-0 w-full max-w-32">
            <Link to="/categories" className="flex items-center gap-2 text-white">
              <LayoutGrid className="h-4 w-4" />
              Каталог
            </Link>
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-2xl" ref={searchRef}>
            <div className="relative">
              <Input
                type="search"
                placeholder="Поиск по названию или артикулу товара..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && searchResults.length > 0 && setShowResults(true)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              
              {/* Выпадающий список результатов */}
              {showResults && searchResults.length > 0 && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
                  <div className="p-2 space-y-1">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.id)}
                        className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        <img
                          src={product.imageUrl || '/placeholder.svg'}
                          alt={product.nameProduct}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.nameProduct}</p>
                          <p className="text-xs text-muted-foreground">Артикул: {product.article}</p>
                          <p className="text-sm font-semibold text-primary mt-1">
                            {formatPrice(product.price, currency)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
              
              {/* Сообщение, если ничего не найдено */}
              {showResults && searchResults.length === 0 && !isSearching && searchQuery.trim().length >= 2 && (
                <Card className="absolute top-full left-0 right-0 mt-2 z-50">
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Товары не найдены
                  </div>
                </Card>
              )}
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
