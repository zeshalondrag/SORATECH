import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { 
  categoriesApi, 
  productsApi, 
  productCharacteristicsApi, 
  characteristicsApi,
  reviewsApi,
  Category, 
  Product,
  ProductCharacteristic,
  Characteristic,
  Review
} from '@/lib/api';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { toast } from 'sonner';

// Маппинг slug -> ID категорий
const categorySlugToIdMap: Record<string, number> = {
  'cpu': 1,
  'gpu': 2,
  'motherboard': 3,
  'ram': 4,
  'ssd': 5,
  'hdd': 6,
  'cooling': 7,
  'psu': 8,
  'case': 9,
};

const Catalog = () => {
  const { categoryId } = useParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('popular');
  const [perPage, setPerPage] = useState('24');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filters
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  
  // Data
  const [category, setCategory] = useState<Category | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productCharacteristics, setProductCharacteristics] = useState<ProductCharacteristic[]>([]);
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadData();
    }
  }, [categoryId]);

  const loadData = async () => {
    if (!categoryId) return;
    setIsLoading(true);
    try {
      // Преобразуем slug в ID
      const categoryIdNum = categorySlugToIdMap[categoryId] || parseInt(categoryId);
      
      const [categoryData, productsData, productCharsData, charsData, reviewsData] = await Promise.all([
        categoriesApi.getById(categoryIdNum),
        productsApi.getAll(),
        productCharacteristicsApi.getAll(),
        characteristicsApi.getAll(),
        reviewsApi.getAll(),
      ]);

      setCategory(categoryData);
      const filtered = productsData.filter((p) => p.categoryId === categoryIdNum && !p.deleted);
      setAllProducts(filtered);
      setProductCharacteristics(productCharsData);
      setCharacteristics(charsData);
      setReviews(reviewsData);
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      toast.error('Ошибка загрузки каталога');
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем список производителей из характеристик
  const manufacturers = useMemo(() => {
    const manufacturerChar = characteristics.find(c => 
      c.nameCharacteristic.toLowerCase().includes('производитель') || 
      c.nameCharacteristic.toLowerCase().includes('manufacturer') ||
      c.nameCharacteristic.toLowerCase().includes('бренд') ||
      c.nameCharacteristic.toLowerCase().includes('brand')
    );
    
    if (!manufacturerChar) return [];
    
    const manufacturerValues = new Set<string>();
    allProducts.forEach(product => {
      const productChar = productCharacteristics.find(
        pc => pc.productId === product.id && pc.characteristicId === manufacturerChar.id
      );
      if (productChar?.description) {
        manufacturerValues.add(productChar.description);
      }
    });
    
    return Array.from(manufacturerValues).sort();
  }, [allProducts, productCharacteristics, characteristics]);

  // Вычисляем рейтинг для каждого товара
  const productRatings = useMemo(() => {
    const ratingsMap = new Map<number, { sum: number; count: number }>();
    
    reviews.forEach(review => {
      if (!review.deleted && review.productId) {
        const productId = review.productId;
        const current = ratingsMap.get(productId) || { sum: 0, count: 0 };
        ratingsMap.set(productId, {
          sum: current.sum + (review.rating || 0),
          count: current.count + 1,
        });
      }
    });
    
    const result = new Map<number, number>();
    ratingsMap.forEach((value, productId) => {
      result.set(productId, value.count > 0 ? value.sum / value.count : 0);
    });
    
    return result;
  }, [reviews]);

  // Фильтрация и сортировка товаров
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...allProducts];

    // Фильтр по цене
    if (priceFrom) {
      const from = parseFloat(priceFrom);
      if (!isNaN(from)) {
        filtered = filtered.filter(p => p.price >= from);
      }
    }
    if (priceTo) {
      const to = parseFloat(priceTo);
      if (!isNaN(to)) {
        filtered = filtered.filter(p => p.price <= to);
      }
    }

    // Фильтр по производителю
    if (selectedManufacturers.length > 0) {
      const manufacturerChar = characteristics.find(c => 
        c.nameCharacteristic.toLowerCase().includes('производитель') || 
        c.nameCharacteristic.toLowerCase().includes('manufacturer') ||
        c.nameCharacteristic.toLowerCase().includes('бренд') ||
        c.nameCharacteristic.toLowerCase().includes('brand')
      );
      
      if (manufacturerChar) {
        filtered = filtered.filter(product => {
          const productChar = productCharacteristics.find(
            pc => pc.productId === product.id && pc.characteristicId === manufacturerChar.id
          );
          return productChar && selectedManufacturers.includes(productChar.description);
        });
      }
    }

    // Фильтр по наличию
    if (onlyInStock) {
      filtered = filtered.filter(p => (p.stockQuantity || 0) > 0);
    }

    // Сортировка
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'rating':
          const ratingA = productRatings.get(a.id) || 0;
          const ratingB = productRatings.get(b.id) || 0;
          return ratingB - ratingA;
        case 'popular':
        default:
          return (b.salesCount || 0) - (a.salesCount || 0);
      }
    });

    return filtered;
  }, [allProducts, priceFrom, priceTo, selectedManufacturers, onlyInStock, sortBy, productCharacteristics, characteristics, productRatings]);

  // Пагинация
  const itemsPerPageNum = parseInt(perPage) || 24;
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPageNum);
  const paginatedProducts = filteredAndSortedProducts.slice(
    (currentPage - 1) * itemsPerPageNum,
    currentPage * itemsPerPageNum
  );

  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1);
  }, [priceFrom, priceTo, selectedManufacturers, onlyInStock, sortBy, perPage]);

  const handleManufacturerToggle = (manufacturer: string) => {
    setSelectedManufacturers(prev =>
      prev.includes(manufacturer)
        ? prev.filter(m => m !== manufacturer)
        : [...prev, manufacturer]
    );
  };

  const breadcrumbItems = [
    { label: 'Комплектующие для ПК', href: '/categories' },
    { label: category?.nameCategory || '', href: '' }
  ];

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{category?.nameCategory}</h1>
            <p className="text-muted-foreground mt-1">
              Найдено товаров: {filteredAndSortedProducts.length}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 space-y-6">
            <div>
              <Button variant="outline" className="w-full justify-start">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Фильтры
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Цена</h3>
                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="От"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                    min="0"
                  />
                  <Input
                    type="number"
                    placeholder="До"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {manufacturers.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Производитель</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {manufacturers.map((manufacturer) => (
                      <label key={manufacturer} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedManufacturers.includes(manufacturer)}
                          onCheckedChange={() => handleManufacturerToggle(manufacturer)}
                        />
                        <span className="text-sm">{manufacturer}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-3">В наличии</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={onlyInStock}
                    onCheckedChange={(checked) => setOnlyInStock(checked === true)}
                  />
                  <span className="text-sm">Только в наличии</span>
                </label>
              </div>
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            {/* Sort */}
            <div className="flex items-center justify-between mb-6">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Сначала популярные</SelectItem>
                  <SelectItem value="price-asc">Сначала дешёвые</SelectItem>
                  <SelectItem value="price-desc">Сначала дорогие</SelectItem>
                  <SelectItem value="rating">По рейтингу</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            {paginatedProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {filteredAndSortedProducts.length === 0 
                  ? 'Товары в этой категории не найдены'
                  : 'Товары не найдены по выбранным фильтрам'}
              </div>
            ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            >
              {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
            )}

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="mt-8 flex items-center justify-between">
                <Select value={perPage} onValueChange={setPerPage}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Товаров на странице" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24">24 товара</SelectItem>
                    <SelectItem value="36">36 товаров</SelectItem>
                    <SelectItem value="48">48 товаров</SelectItem>
                    <SelectItem value="100">100 товаров</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Предыдущая
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Следующая
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
};

export default Catalog;
