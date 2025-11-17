import { Home, BarChart3, FileSearch, MapPin, FolderTree, Tag, Package, ShoppingCart, Layers, Star, Shield, Truck, Users, LogOut, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToProfile: () => void;
  onShowShortcuts?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Главная', icon: Home },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'audit', label: 'Аудит', icon: FileSearch },
];

const managementItems = [
  { id: 'categories', label: 'Категории', icon: FolderTree },
  { id: 'characteristics', label: 'Характеристики', icon: Tag },
  { id: 'orders', label: 'Заказы', icon: ShoppingCart },
  { id: 'product-characteristics', label: 'Характеристики товара', icon: Layers },
  { id: 'products', label: 'Товары', icon: Package },
  { id: 'reviews', label: 'Отзывы', icon: Star },
  { id: 'suppliers', label: 'Поставщики', icon: Truck },
  { id: 'users', label: 'Пользователи', icon: Users },
];

export const AdminSidebar = ({ activeTab, onTabChange, onBackToProfile, onShowShortcuts }: AdminSidebarProps) => {
  return (
    <div className="bg-card border-r flex flex-col w-64">
      {/* Logo */}
      <div className="p-4 border-b flex items-center justify-center">
        <div className="text-xl font-bold">
          SORA<span className="text-primary">TECH</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Раздел 1: Аналитика */}
        <div className="px-2 mb-4">
          <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
            Аналитика
          </div>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Раздел 2: Управление */}
        <div className="px-2">
          <div className="text-xs font-semibold text-muted-foreground px-2 mb-2">
            Управление
          </div>
          <div className="space-y-1">
            {managementItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t space-y-2">
        {onShowShortcuts && (
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onShowShortcuts}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Горячие клавиши
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={onBackToProfile}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Вернуться в профиль
        </Button>
      </div>
    </div>
  );
};

