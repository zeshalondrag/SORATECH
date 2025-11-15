import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { ManagerSidebar } from '@/components/admin/ManagerSidebar';
import { ManagerHeader } from '@/components/admin/ManagerHeader';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { ManagerTable } from '@/components/admin/ManagerTable';

export default function Manager() {
  const { user, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Проверка прав доступа
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName || '';
  const hasManagerAccess = userRole?.includes('Менеджер');
  if (!isAuthenticated || !hasManagerAccess) {
    navigate('/account');
    return null;
  }

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
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ManagerHeader
          onSearch={(query) => console.log('Search:', query)}
        />
        <div className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

