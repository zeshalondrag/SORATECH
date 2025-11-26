import { useState, useEffect, useRef } from 'react';
import { Search, Download, Bell, Loader2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useStore } from '@/stores/useStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { adminOrdersApi, backupApi } from '@/lib/api';
import { toast } from 'sonner';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface AdminHeaderProps {
  onSearch: (query: string) => void;
  onBackup: () => void;
}

export const AdminHeader = ({ onSearch, onBackup }: AdminHeaderProps) => {
  const { user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const orders = await adminOrdersApi.getAll();
      // Фильтруем новые заказы (можно добавить логику определения новых)
      setNotifications(orders.slice(0, 5));
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await backupApi.create();
      toast.success('Резервная копия успешно создана', {
        description: `SQL файл: ${response.sqlFile}\nJSON файл: ${response.jsonFile}`,
        duration: 5000,
      });
      onBackup();
    } catch (error: any) {
      toast.error('Ошибка создания резервной копии', {
        description: error.message || 'Не удалось создать резервную копию',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'f',
      ctrl: true,
      description: 'Фокус на поле поиска',
      action: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Быстрый поиск',
      action: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: '/',
      ctrl: true,
      description: 'Показать справку по горячим клавишам',
      action: () => {
        setIsShortcutsModalOpen(true);
      },
    },
  ]);

  return (
    <div className="bg-card border-b p-4">
      <div className="flex items-center gap-4">
        {/* Search - максимально широкий */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Поиск записей... (Ctrl+F или Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>

        {/* Элементы справа */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Backup Button */}
          <Button 
            variant="outline" 
            onClick={handleBackup}
            disabled={isBackingUp}
          >
            {isBackingUp ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Резервное копирование
          </Button>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <div className="font-semibold mb-2">Уведомления</div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет новых уведомлений</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.map((order) => (
                      <div key={order.id} className="p-2 border rounded text-sm">
                        <div className="font-medium">Новый заказ #{order.orderNumber}</div>
                        <div className="text-muted-foreground text-xs">
                          {new Date(order.orderDate).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {(user?.nickname || user?.firstName || 'A').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-sm font-medium">{user?.nickname || user?.firstName}</div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
              <div className="text-xs text-muted-foreground">
                {typeof user?.role === 'string' ? user.role : user?.role?.roleName || ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <KeyboardShortcutsModal
        open={isShortcutsModalOpen}
        onOpenChange={setIsShortcutsModalOpen}
      />
    </div>
  );
};

