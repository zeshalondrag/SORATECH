import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { adminUsersApi } from '@/lib/api';
import { toast } from 'sonner';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated } = useStore();

  // Загружаем тему пользователя при монтировании
  useEffect(() => {
    setMounted(true);
    
    // Загружаем тему пользователя из API, если авторизован
    if (isAuthenticated) {
      adminUsersApi.getTheme()
        .then((response) => {
          if (response.isDarkTheme !== undefined) {
            setTheme(response.isDarkTheme ? 'dark' : 'light');
          }
        })
        .catch((error) => {
          console.warn('Could not load user theme:', error);
        });
    }
  }, [isAuthenticated, setTheme]);

  // Сохраняем тему в API при изменении
  useEffect(() => {
    if (mounted && isAuthenticated && theme) {
      const isDarkTheme = theme === 'dark';
      
      // Небольшая задержка, чтобы избежать множественных запросов
      const timeoutId = setTimeout(() => {
        adminUsersApi.updateTheme(isDarkTheme)
          .then(() => {
            // Тема успешно сохранена
          })
          .catch((error) => {
            console.warn('Could not save user theme:', error);
            // Не показываем ошибку пользователю, так как тема все равно переключилась локально
          });
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [theme, mounted, isAuthenticated]);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Сохраняем тему в API, если пользователь авторизован
    if (isAuthenticated) {
      adminUsersApi.updateTheme(newTheme === 'dark')
        .then(() => {
          // Тема успешно сохранена
        })
        .catch((error) => {
          console.warn('Could not save user theme:', error);
          toast.error('Не удалось сохранить тему');
        });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={handleThemeToggle}
      aria-label="Переключить тему"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
};
