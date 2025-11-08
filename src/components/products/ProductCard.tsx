import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, GitCompare, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/mockData';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart, toggleFavorite, toggleComparison, favorites, comparison, cart, updateQuantity } = useStore();
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

  return (
    <Card className="group card-hover h-full flex flex-col">
      <CardContent className="p-4 flex flex-col h-full">
        {/* Image */}
        <Link to={`/product/${product.id}`} className="block mb-4">
          <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
            <img
              src={product.image}
              alt={product.name}
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {product.isNew && (
              <Badge className="absolute top-2 left-2" variant="destructive">
                Новинка
              </Badge>
            )}
            {product.isHit && (
              <Badge className="absolute top-2 right-2">
                Хит продаж
              </Badge>
            )}
          </div>
        </Link>

        {/* Price and Icons */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">
            {product.price.toLocaleString('ru-RU')} ₽
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
              className={`h-8 w-8 ${isFavorite ? 'text-primary' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ID */}
        <p className="text-xs text-muted-foreground mb-2">ID: {product.id}</p>

        {/* Name */}
        <Link to={`/product/${product.id}`}>
          <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Brief specs */}
        <div className="text-sm text-muted-foreground mb-2 line-clamp-2">
          {Object.entries(product.specs).slice(0, 2).map(([key, value], idx) => (
            <span key={key}>
              {key}: {value}
              {idx === 0 && ' • '}
            </span>
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <span className="ml-1 text-sm font-medium">{product.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount})
          </span>
        </div>

        {/* Add to Cart Button */}
        <div className="mt-auto">
          {!inCart ? (
            <Button onClick={handleAddToCart} className="w-full group/btn">
              <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
              В корзину
            </Button>
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
        </div>
      </CardContent>
    </Card>
  );
};
