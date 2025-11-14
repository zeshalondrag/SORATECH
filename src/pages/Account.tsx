import { useState, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Bell, Settings, Package, MapPin, MessageSquare, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';
import { ProfileSettings } from '@/components/account/ProfileSettings';
import { OrderHistory } from '@/components/account/OrderHistory';
import { DeliveryAddresses } from '@/components/account/DeliveryAddresses';
import { CommunityActivity } from '@/components/account/CommunityActivity';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function Account() {
  const { user, isAuthenticated, logout, setUser } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'settings');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Загружаем актуальные данные пользователя
    const loadUserData = async () => {
      try {
        const userData = await usersApi.getCurrentUser();
        setUser(userData);
      } catch (error: any) {
        toast.error('Ошибка загрузки данных пользователя');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [isAuthenticated, navigate, setUser]);

  useEffect(() => {
    // Обновляем активный таб при изменении параметра URL
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Вы вышли из аккаунта');
  };

  if (!isAuthenticated || loading) {
    return null;
  }

  const getUserInitials = () => {
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getRoleLink = () => {
    const roleName =
      typeof user?.role === 'string'
        ? user.role
        : user?.role?.roleName;
  
    if (roleName === 'Администратор') {
      return { label: 'Панель администратора', path: '/admin' };
    }
    if (roleName === 'Менеджер') {
      return { label: 'Панель менеджера', path: '/manager' };
    }
    return null;
  };

  const roleLink = getRoleLink();

  return (
    <>
      <Header />
      <div className="container mx-auto px-6 md:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Левый блок */}
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-lg p-6 space-y-6">
            {/* Верхняя часть с выходом, аватаркой и уведомлениями */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="flex-shrink-0"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <Avatar className="h-12 w-12">
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Bell className="h-5 w-5" />
              </Button>
            </div>

            {/* Информация о пользователе */}
            <div className="space-y-1 text-center">
              <p className="font-semibold">{user?.nickname || user?.firstName || 'Пользователь'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            {/* Навигация */}
            <div className="space-y-2">
              <Button
                variant={activeTab === 'settings' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleTabChange('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Настройки профиля
              </Button>
              <Button
                variant={activeTab === 'orders' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleTabChange('orders')}
              >
                <Package className="h-4 w-4 mr-2" />
                История заказов
              </Button>
              <Button
                variant={activeTab === 'addresses' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleTabChange('addresses')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Адрес доставки
              </Button>
              <Button
                variant={activeTab === 'activity' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleTabChange('activity')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Активность в сообществе
              </Button>
              {roleLink && (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate(roleLink.path)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {roleLink.label}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Правый блок */}
        <div className="lg:col-span-3">
          <div className="bg-card border rounded-lg p-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsContent value="settings" className="mt-0">
                <ProfileSettings user={user} />
              </TabsContent>
              <TabsContent value="orders" className="mt-0">
                <OrderHistory />
              </TabsContent>
              <TabsContent value="addresses" className="mt-0">
                <DeliveryAddresses />
              </TabsContent>
              <TabsContent value="activity" className="mt-0">
                <CommunityActivity />
              </TabsContent>
            </Tabs>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

