import { Home, BarChart3, Tag, Package, ShoppingCart, Layers, Star, Truck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ManagerSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToProfile: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Главная', icon: Home },
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
];

const managementItems = [
  { id: 'characteristics', label: 'Характеристики', icon: Tag },
  { id: 'orders', label: 'Заказы', icon: ShoppingCart },
  { id: 'product-characteristics', label: 'Характеристики товара', icon: Layers },
  { id: 'products', label: 'Товары', icon: Package },
  { id: 'reviews', label: 'Отзывы', icon: Star },
  { id: 'suppliers', label: 'Поставщики', icon: Truck },
];

export const ManagerSidebar = ({ activeTab, onTabChange, onBackToProfile }: ManagerSidebarProps) => {
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

      {/* Logout Button */}
      <div className="p-4 border-t">
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

