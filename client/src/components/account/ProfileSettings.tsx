import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usersApi, User } from '@/lib/api';
import { useStore } from '@/stores/useStore';
import { ResetPasswordModal } from '@/components/auth/ResetPasswordModal';

interface ProfileSettingsProps {
  user: User | null;
}

export const ProfileSettings = ({ user }: ProfileSettingsProps) => {
  const { setUser } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    nickname: user?.nickname || '',
    phone: user?.phone || '',
  });

  // Обновляем форму при изменении user
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        nickname: user.nickname || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updatedUser = await usersApi.updateUser(user.id, {
        firstName: formData.firstName,
        nickname: formData.nickname,
        phone: formData.phone,
      });
      setUser(updatedUser);
      toast.success('Профиль обновлен');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Настройки профиля</h2>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="firstName">Ваше имя</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="Введите ваше имя"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">Никнейм</Label>
          <Input
            id="nickname"
            value={formData.nickname}
            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
            placeholder="Введите никнейм"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Номер телефона</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Введите номер телефона"
          />
        </div>

        <div className="space-y-2">
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <Button
            variant="link"
            className="p-0 text-primary"
            onClick={() => setIsResetPasswordOpen(true)}
          >
            Сбросить пароль
          </Button>
        </div>
      </div>

      <ResetPasswordModal
        open={isResetPasswordOpen}
        onOpenChange={setIsResetPasswordOpen}
        email={user?.email || ''}
      />
    </div>
  );
};
