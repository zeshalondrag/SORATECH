import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { ManagerSidebar } from '@/components/admin/ManagerSidebar';
import { ManagerHeader } from '@/components/admin/ManagerHeader';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { ManagerTable } from '@/components/admin/ManagerTable';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/admin/KeyboardShortcutsModal';

export default function Manager() {
  const { user, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Проверка прав доступа
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName || '';
  const hasManagerAccess = userRole?.includes('Менеджер');
  if (!isAuthenticated || !hasManagerAccess) {
    navigate('/account');
    return null;
  }

  // Горячие клавиши для навигации по вкладкам
  useKeyboardShortcuts([
    {
      key: '1',
      ctrl: true,
      description: 'Перейти на вкладку "Главная"',
      action: () => setActiveTab('dashboard'),
    },
    {
      key: '2',
      ctrl: true,
      description: 'Перейти на вкладку "Аналитика"',
      action: () => setActiveTab('analytics'),
    },
    {
      key: '3',
      ctrl: true,
      description: 'Перейти на вкладку "Характеристики"',
      action: () => setActiveTab('characteristics'),
    },
    {
      key: '4',
      ctrl: true,
      description: 'Перейти на вкладку "Заказы"',
      action: () => setActiveTab('orders'),
    },
    {
      key: '5',
      ctrl: true,
      description: 'Перейти на вкладку "Характеристики товара"',
      action: () => setActiveTab('product-characteristics'),
    },
    {
      key: '6',
      ctrl: true,
      description: 'Перейти на вкладку "Товары"',
      action: () => setActiveTab('products'),
    },
    {
      key: '7',
      ctrl: true,
      description: 'Перейти на вкладку "Отзывы"',
      action: () => setActiveTab('reviews'),
    },
    {
      key: '8',
      ctrl: true,
      description: 'Перейти на вкладку "Поставщики"',
      action: () => setActiveTab('suppliers'),
    },
  ]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'characteristics':
        return <ManagerTable entity="characteristics" />;
      case 'orders':
        return <ManagerTable entity="orders" />;
      case 'product-characteristics':
        return <ManagerTable entity="product-characteristics" />;
      case 'products':
        return <ManagerTable entity="products" />;
      case 'reviews':
        return <ManagerTable entity="reviews" />;
      case 'suppliers':
        return <ManagerTable entity="suppliers" />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <ManagerSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBackToProfile={() => navigate('/account')}
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ManagerHeader
          onSearch={(query) => console.log('Search:', query)}
        />
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>

      <KeyboardShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />
    </div>
  );
}

