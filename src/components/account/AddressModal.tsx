import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { addressesApi, Address } from '@/lib/api';
import { useStore } from '@/stores/useStore';

interface AddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: Address | null;
  onSuccess: () => void;
}

export const AddressModal = ({ open, onOpenChange, address, onSuccess }: AddressModalProps) => {
  const { user } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Россия'
  });

  useEffect(() => {
    if (address) {
      setFormData({
        street: address.street || '',
        city: address.city || '',
        postalCode: address.postalCode || '',
        country: address.country || 'Россия'
      });
    } else {
      setFormData({
        street: '',
        city: '',
        postalCode: '',
        country: 'Россия'
      });
    }
  }, [address, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Необходимо авторизоваться');
      return;
    }

    setIsLoading(true);

    try {
      if (address) {
        // При обновлении отправляем полный объект с idAddress и userId
        await addressesApi.update(address.id, {
          id: address.id,
          userId: address.userId,
          street: formData.street,
          city: formData.city,
          postalCode: formData.postalCode,
          country: formData.country,
        });
        toast.success('Адрес обновлен');
      } else {
        await addressesApi.create({
          ...formData,
          userId: user.id,
        });
        toast.success('Адрес добавлен');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения адреса');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{address ? 'Редактировать адрес' : 'Добавить адрес'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Улица и дом</Label>
            <Input
              id="street"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              required
              placeholder="ул. Примерная, д. 1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
              placeholder="Москва"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postalCode">Почтовый индекс</Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              required
              placeholder="123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Страна</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

