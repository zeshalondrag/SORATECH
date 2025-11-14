import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutGrid, List, SlidersHorizontal } from 'lucide-react';
import { categoriesApi, productsApi, Category, Product } from '@/lib/api';
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
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
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
      
      const [categoryData, productsData] = await Promise.all([
        categoriesApi.getById(categoryIdNum),
        productsApi.getAll(),
      ]);

      setCategory(categoryData);
      const filtered = productsData.filter((p) => p.categoryId === categoryIdNum);
      setCategoryProducts(filtered);
    } catch (error: any) {
      console.error('Error loading catalog:', error);
      toast.error('Ошибка загрузки каталога');
    } finally {
      setIsLoading(false);
    }
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
              Найдено товаров: {categoryProducts.length}
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
                  <input
                    type="number"
                    placeholder="От"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="До"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Производитель</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">Intel</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">AMD</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" />
                    <span className="text-sm">NVIDIA</span>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">В наличии</h3>
                <label className="flex items-center gap-2">
                  <input type="checkbox" />
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
            {categoryProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Товары в этой категории не найдены
              </div>
            ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            >
              {categoryProducts.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode={viewMode} />
              ))}
            </div>
            )}

            {/* Pagination */}
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
                <Button variant="outline" size="sm">
                  Предыдущая
                </Button>
                <Button variant="outline" size="sm">
                  1
                </Button>
                <Button size="sm">2</Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Следующая
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
};

export default Catalog;
