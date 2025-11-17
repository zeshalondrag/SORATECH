import { DollarSign, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/stores/useStore';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const CurrencySelector = () => {
  const { currency, setCurrency, isAuthenticated, loadCurrency } = useStore();

  // Загружаем валюту при монтировании, если пользователь авторизован
  useEffect(() => {
    if (isAuthenticated) {
      loadCurrency();
    }
  }, [isAuthenticated, loadCurrency]);

  const handleCurrencyChange = async (newCurrency: 'RUB' | 'USD') => {
    if (newCurrency === currency) return;

    try {
      await setCurrency(newCurrency);
      toast.success(`Валюта изменена на ${newCurrency === 'USD' ? 'USD ($)' : 'RUB (₽)'}`);
    } catch (error: any) {
      console.error('Error changing currency:', error);
      toast.error('Не удалось изменить валюту');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Выбрать валюту">
          {currency === 'USD' ? (
            <DollarSign className="h-5 w-5" />
          ) : (
            <Coins className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleCurrencyChange('RUB')}
          className={currency === 'RUB' ? 'bg-accent' : ''}
        >
          <Coins className="h-4 w-4 mr-2" />
          RUB (₽)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCurrencyChange('USD')}
          className={currency === 'USD' ? 'bg-accent' : ''}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          USD ($)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

