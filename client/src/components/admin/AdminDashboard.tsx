import { useState, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminUsersApi, adminOrdersApi, productsApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useStore();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    monthlyRevenue: 0,
    isLoading: true,
  });

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      // Загружаем все данные параллельно
      const [users, orders, products] = await Promise.all([
        adminUsersApi.getAll(),
        adminOrdersApi.getAll(),
        productsApi.getAll(),
      ]);

      // Подсчитываем статистику (фильтруем удаленные записи)
      const totalUsers = users.filter(u => !u.deleted).length;
      const totalOrders = orders.length;
      const totalProducts = products.filter(p => !p.deleted).length;

      // Подсчитываем доходы за текущий месяц
      const now = new Date();
      const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      const monthlyRevenue = orders
        .filter(order => {
          const orderDate = new Date(order.orderDate);
          return orderDate >= firstDayOfCurrentMonth && orderDate < firstDayOfNextMonth;
        })
        .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

      setStats({
        totalUsers,
        totalOrders,
        totalProducts,
        monthlyRevenue,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Добро пожаловать, {user?.nickname || user?.firstName || 'Администратор'}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Панель администратора для управления системой SORATECH
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Пользователи</CardTitle>
            <CardDescription>Общее количество</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex items-center justify-center h-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString('ru-RU')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Заказы</CardTitle>
            <CardDescription>Всего заказов</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex items-center justify-center h-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{stats.totalOrders.toLocaleString('ru-RU')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Товары</CardTitle>
            <CardDescription>В каталоге</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex items-center justify-center h-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{stats.totalProducts.toLocaleString('ru-RU')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Доходы</CardTitle>
            <CardDescription>За текущий месяц</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="flex items-center justify-center h-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            )}
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

