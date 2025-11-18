import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { Card, CardContent } from '@/components/ui/card';
import { categoriesApi, productsApi, Category, Product } from '@/lib/api';
import { toast } from 'sonner';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

// Маппинг названий категорий на slug
const categorySlugMap: Record<string, string> = {
  'Процессоры': 'cpu',
  'Видеокарты': 'gpu',
  'Материнские платы': 'motherboard',
  'Оперативная память': 'ram',
  'Накопители SSD': 'ssd',
  'Жёсткие диски (HDD)': 'hdd',
  'Система охлаждения': 'cooling',
  'Блок питания': 'psu',
  'Корпуса': 'case',
};

// Порядок отображения категорий с возможными вариантами названий
const categoryOrderMap: Map<string, number> = new Map([
  ['Процессоры', 1],
  ['Видеокарты', 2],
  ['Видеокарта', 2], // альтернативное название
  ['Материнские платы', 3],
  ['Материнская плата', 3], // альтернативное название
  ['Оперативная память', 4],
  ['Накопители SSD', 5],
  ['SSD накопители', 5], // альтернативное название
  ['Жёсткие диски (HDD)', 6],
  ['Жёсткие диски HDD', 6], // альтернативное название
  ['HDD накопители', 6], // альтернативное название
  ['Система охлаждения', 7],
  ['Охлаждение', 7], // альтернативное название
  ['Блок питания', 8],
  ['Блоки питания', 8], // альтернативное название
  ['Корпуса', 9],
  ['Корпус', 9], // альтернативное название
]);


interface CategoryWithCount extends Category {
  productCount: number;
  imageUrl: string;
  slug: string;
}


const Categories = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const [categoriesData, productsData] = await Promise.all([
        categoriesApi.getAll(),
        productsApi.getAll(),
      ]);

      // Подсчитываем количество товаров для каждой категории и выбираем случайное изображение
      const categoriesWithCount: CategoryWithCount[] = categoriesData.map((category) => {
        const categoryProducts = productsData.filter((p) => p.categoryId === category.id && !p.deleted);
        const productCount = categoryProducts.length;
        const slug = categorySlugMap[category.nameCategory] || category.id.toString();
        
        // Выбираем случайное изображение из продуктов категории
        let imageUrl = '';
        if (categoryProducts.length > 0) {
          const randomProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
          imageUrl = randomProduct.imageUrl || '';
        }
        
        return {
          ...category,
          productCount,
          imageUrl,
          slug,
        };
      });

      // Отладочный вывод для проверки названий категорий
      console.log('Категории из API:', categoriesWithCount.map(c => c.nameCategory));

      // Сортируем категории по заданному порядку
      const sortedCategories = categoriesWithCount.sort((a, b) => {
        const orderA = categoryOrderMap.get(a.nameCategory) ?? 999;
        const orderB = categoryOrderMap.get(b.nameCategory) ?? 999;
        
        // Если категория не найдена в маппинге, выводим предупреждение
        if (orderA === 999) {
          console.warn(`Категория "${a.nameCategory}" не найдена в маппинге порядка`);
        }
        if (orderB === 999) {
          console.warn(`Категория "${b.nameCategory}" не найдена в маппинге порядка`);
        }
        
        return orderA - orderB;
      });

      setCategories(sortedCategories);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast.error('Ошибка загрузки категорий');
    } finally {
      setIsLoading(false);
    }
  };

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

  const breadcrumbItems = [
    { label: 'Комплектующие для ПК', href: '' }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        <h1 className="text-3xl font-bold mb-8">Комплектующие для ПК</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={`/catalog/${category.slug}`} className="block">
            <Card className="relative overflow-hidden h-56 group">

              {/* Картинка справа */}
              <div className="absolute right-4 bottom-4 w-28 h-28 sm:w-48 sm:h-48 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.nameCategory}
                      className="object-contain w-full h-full"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                      Нет изображения
                    </div>
                  )}
                </div>
                
              <CardContent className="relative h-full flex flex-col justify-between p-6">
                
                {/* Верхний текст */}
                <p className="text-sm text-muted-foreground">Комплектующие для ПК</p>
                
                {/* Нижний текст */}
                <div>
                  <h3 className="text-1xl font-bold group-hover:text-primary transition-colors">
                    {category.nameCategory}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {category.productCount}{" "}
                    {category.productCount === 1
                      ? "товар"
                      : category.productCount < 5
                      ? "товара"
                      : "товаров"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          ))}
        </div>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
};

export default Categories;

