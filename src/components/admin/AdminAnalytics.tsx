import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export const AdminAnalytics = () => {
  const handleExportPDF = () => {
    // В браузере нельзя выбрать путь сохранения напрямую
    // Используем download атрибут для скачивания
    toast.info('Экспорт в PDF будет реализован');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground mt-2">
            Графики и отчеты по работе системы
          </p>
        </div>
        <Button onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт в PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Продажи по месяцам</CardTitle>
          <CardDescription>График продаж за последние 12 месяцев</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              График будет здесь
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Популярные товары</CardTitle>
            <CardDescription>Топ-10 товаров по продажам</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              График будет здесь
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Статистика пользователей</CardTitle>
            <CardDescription>Активность пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              График будет здесь
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Сводная таблица</CardTitle>
            <CardDescription>Общая статистика</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Таблица будет здесь
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

