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

// Маппинг названий категорий на URL изображений
const categoryImageMap: Record<string, string> = {
  'Процессоры': 'https://storage.yandexcloud.net/soratech/%D0%9F%D1%80%D0%BE%D1%86%D0%B5%D1%81%D1%81%D0%BE%D1%80%D1%8B/AMD%20Ryzen%207%207800X3D%20OEM.png',
  'Видеокарты': 'https://storage.yandexcloud.net/soratech/%D0%92%D0%B8%D0%B4%D0%B5%D0%BE%D0%BA%D0%B0%D1%80%D1%82%D1%8B/NVIDIA%20GeForce%20RTX%205080%20Gigabyte%20GAMING%20OC%2016Gb%20(GV-N5080GAMING%20OC-16GD).png',
  'Материнские платы': 'https://storage.yandexcloud.net/soratech/%D0%9C%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D1%81%D0%BA%D0%B8%D0%B5%20%D0%BF%D0%BB%D0%B0%D1%82%D1%8B/ASUS%20ROG%20STRIX%20X870E-H%20GAMING%20WIFI7.png',
  'Оперативная память': 'https://storage.yandexcloud.net/soratech/%D0%9E%D0%BF%D0%B5%D1%80%D0%B0%D1%82%D0%B8%D0%B2%D0%BD%D0%B0%D1%8F%20%D0%BF%D0%B0%D0%BC%D1%8F%D1%82%D1%8C/32Gb%20DDR5%206000MHz%20ADATA%20XPG%20Lancer%20Blade%20RGB%20Black%20AX5U6000C3016G-DTLABRBK%202x16Gb%20KIT.png',
  'Накопители SSD': 'https://storage.yandexcloud.net/soratech/SSD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/SSD%201Tb%20Samsung%20990%20PRO%20(MZ-V9P1T0BW).png',
  'Жёсткие диски (HDD)': 'https://storage.yandexcloud.net/soratech/HDD%20%D0%BD%D0%B0%D0%BA%D0%BE%D0%BF%D0%B8%D1%82%D0%B5%D0%BB%D0%B8/2Tb%20SATA-III%20Seagate%20Barracuda%20(ST2000DM008).png',
  'Система охлаждения': 'https://storage.yandexcloud.net/soratech/%D0%9E%D1%85%D0%BB%D0%B0%D0%B6%D0%B4%D0%B5%D0%BD%D0%B8%D0%B5/ID-COOLING%20SE-226-XT%20BLACK.png',
  'Блок питания': 'https://storage.yandexcloud.net/soratech/%D0%91%D0%BB%D0%BE%D0%BA%D0%B8%20%D0%BF%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D1%8F/1000W%20GamerStorm%20(DeepCool)%20PN1000M.png',
  'Корпуса': 'https://storage.yandexcloud.net/soratech/%D0%9A%D0%BE%D1%80%D0%BF%D1%83%D1%81%D0%B0/Lian%20Li%20O11%20Dynamic%20Mini%20V2%20Black.png',
};


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

      // Подсчитываем количество товаров для каждой категории
      const categoriesWithCount: CategoryWithCount[] = categoriesData.map((category) => {
        const productCount = productsData.filter((p) => p.categoryId === category.id).length;
        const imageUrl = categoryImageMap[category.nameCategory] || '';
        const slug = categorySlugMap[category.nameCategory] || category.id.toString();
        
        return {
          ...category,
          productCount,
          imageUrl,
          slug,
        };
      });

      setCategories(categoriesWithCount);
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

