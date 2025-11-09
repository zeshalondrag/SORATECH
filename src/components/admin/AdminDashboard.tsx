import { useStore } from '@/stores/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AdminDashboard = () => {
  const { user } = useStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Добро пожаловать, {user?.nickname || user?.firstName || 'Администратор'}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Панель администратора для управления системой SORA TECH
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Пользователи</CardTitle>
            <CardDescription>Общее количество</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Заказы</CardTitle>
            <CardDescription>Всего заказов</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Товары</CardTitle>
            <CardDescription>В каталоге</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Доходы</CardTitle>
            <CardDescription>За период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Краткая информация</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Используйте меню слева для навигации по разделам панели администратора.
            Здесь вы можете управлять всеми аспектами системы: пользователями, заказами,
            товарами, категориями и другими данными.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

