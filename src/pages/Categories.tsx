import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { categories } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';

const Categories = () => {
  const breadcrumbItems = [{ label: 'Категории', href: '' }];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
        <Breadcrumbs items={breadcrumbItems} />
        
        <h1 className="text-4xl font-bold mb-8">Комплектующие для ПК</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.id} to={`/catalog/${category.id}`}>
              <Card className="group card-hover h-full overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative h-64">
                    <div className="absolute inset-0 p-6 flex flex-col justify-between">
                      <div className="text-sm text-muted-foreground">
                        Комплектующие для ПК
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-1 group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-muted-foreground">
                          {category.count} товаров
                        </p>
                      </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-1/2 h-1/2">
                      <img
                        src={category.image}
                        alt={category.name}
                        className="w-full h-full object-contain opacity-50 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Categories;
