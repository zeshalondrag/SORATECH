import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { AdminAudit } from '@/components/admin/AdminAudit';
import { AdminTable } from '@/components/admin/AdminTable';

export default function Admin() {
  const { user, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Проверка прав доступа
  const userRole = typeof user?.role === 'string' ? user.role : user?.role?.roleName || '';
  const hasAdminAccess = userRole?.includes('Админ') || userRole?.includes('Администратор');
  if (!isAuthenticated || !hasAdminAccess) {
    navigate('/account');
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'audit':
        return <AdminAudit />;
      case 'addresses':
        return <AdminTable entity="addresses" />;
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
      case 'roles':
        return <AdminTable entity="roles" />;
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
    </div>
  );
}

