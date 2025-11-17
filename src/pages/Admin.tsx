import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminAudit } from '@/components/admin/AdminAudit';
import { AdminTable } from '@/components/admin/AdminTable';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/admin/KeyboardShortcutsModal';

export default function Admin() {
  const { user, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Проверка прав доступа
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName || '';
  const hasAdminAccess = userRole?.includes('Админ') || userRole?.includes('Администратор');
  if (!isAuthenticated || !hasAdminAccess) {
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
      description: 'Перейти на вкладку "Аудит"',
      action: () => setActiveTab('audit'),
    },
    {
      key: '4',
      ctrl: true,
      description: 'Перейти на вкладку "Категории"',
      action: () => setActiveTab('categories'),
    },
    {
      key: '5',
      ctrl: true,
      description: 'Перейти на вкладку "Характеристики"',
      action: () => setActiveTab('characteristics'),
    },
    {
      key: '6',
      ctrl: true,
      description: 'Перейти на вкладку "Заказы"',
      action: () => setActiveTab('orders'),
    },
    {
      key: '7',
      ctrl: true,
      description: 'Перейти на вкладку "Характеристики товара"',
      action: () => setActiveTab('product-characteristics'),
    },
    {
      key: '8',
      ctrl: true,
      description: 'Перейти на вкладку "Товары"',
      action: () => setActiveTab('products'),
    },
    {
      key: '9',
      ctrl: true,
      description: 'Перейти на вкладку "Отзывы"',
      action: () => setActiveTab('reviews'),
    },
    {
      key: '0',
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
      case 'audit':
        return <AdminAudit />;
      case 'categories':
        return <AdminTable entity="categories" />;
      case 'characteristics':
        return <AdminTable entity="characteristics" />;
      case 'orders':
        return <AdminTable entity="orders" />;
      case 'product-characteristics':
        return <AdminTable entity="product-characteristics" />;
      case 'products':
        return <AdminTable entity="products" />;
      case 'reviews':
        return <AdminTable entity="reviews" />;
      case 'suppliers':
        return <AdminTable entity="suppliers" />;
      case 'users':
        return <AdminTable entity="users" />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBackToProfile={() => navigate('/account')}
        onShowShortcuts={() => setIsShortcutsModalOpen(true)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader
          onSearch={(query) => console.log('Search:', query)}
          onBackup={() => console.log('Backup')}
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

