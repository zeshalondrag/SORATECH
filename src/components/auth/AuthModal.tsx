import { useState } from 'react';
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
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { authApi, User, usersApi } from '@/lib/api';
import { ResetPasswordModal } from './ResetPasswordModal';

export const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authModalView, openAuthModal, login } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    phone: '',
    confirmPassword: '',
    agreeTerms: false,
    agreeMarketing: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });
      
      // Загружаем полные данные пользователя после логина
      try {
        const fullUser = await usersApi.getCurrentUser();
        login(fullUser, response.token);
      } catch {
        // Если не удалось загрузить полные данные, используем упрощенную версию
        const user: User = {
          id: response.user.id,
          roleId: 0,
          email: response.user.email,
          firstName: response.user.firstName,
          nickname: response.user.nickname || '',
          phone: response.user.phone || '',
          role: response.user.role ? { id: 0, roleName: response.user.role } : undefined,
        };
        login(user, response.token);
      }
      toast.success('Вход выполнен');
      closeAuthModal();
      setFormData({
        email: '',
        password: '',
        firstName: '',
        phone: '',
        confirmPassword: '',
        agreeTerms: false,
        agreeMarketing: false,
      });
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

      if (formData.password !== formData.confirmPassword) {
        toast.error('Пароли не совпадают');
        return;
      }
      if (!formData.agreeTerms) {
        toast.error('Необходимо принять условия соглашения');
        return;
      }

    setIsLoading(true);

    try {
      const response = await authApi.register({
      email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        phone: formData.phone || undefined,
      });
      
      // Загружаем полные данные пользователя после регистрации
      try {
        const fullUser = await usersApi.getCurrentUser();
        login(fullUser, response.token);
      } catch {
        // Если не удалось загрузить полные данные, используем упрощенную версию
        const user: User = {
          id: response.user.id,
          roleId: 0,
          email: response.user.email,
          firstName: response.user.firstName,
          nickname: response.user.nickname || '',
          phone: response.user.phone || '',
          role: response.user.role ? { id: 0, roleName: response.user.role } : undefined,
        };
        login(user, response.token);
      }
      toast.success('Регистрация успешна');
      closeAuthModal();
      setFormData({
        email: '',
        password: '',
        firstName: '',
        phone: '',
        confirmPassword: '',
        agreeTerms: false,
        agreeMarketing: false,
      });
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.requestPasswordReset({ email: formData.email });
      setResetEmail(formData.email);
    closeAuthModal();
      setIsResetPasswordModalOpen(true);
      toast.success('Код отправлен на вашу почту');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (authModalView === 'login') {
      handleLogin(e);
    } else if (authModalView === 'register') {
      handleRegister(e);
    } else if (authModalView === 'reset') {
      handleResetPassword(e);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {authModalView === 'login' && 'Личный кабинет'}
            {authModalView === 'register' && 'Регистрация'}
            {authModalView === 'reset' && 'Забыли пароль'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalView === 'reset' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Отправить код'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => openAuthModal('login')}
              >
                Вернуться ко входу
              </Button>
            </>
          ) : authModalView === 'register' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повтор пароля</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, agreeTerms: checked as boolean })
                  }
                />
                <label htmlFor="terms" className="text-sm">
                  Я принимаю условия пользовательского соглашения
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketing"
                  checked={formData.agreeMarketing}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, agreeMarketing: checked as boolean })
                  }
                />
                <label htmlFor="marketing" className="text-sm">
                  Согласие на получение рекламных материалов
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={!formData.agreeTerms || isLoading}>
                {isLoading ? 'Регистрация...' : 'Регистрация'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => openAuthModal('login')}
              >
                У вас уже есть аккаунт?
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>

              <div className="flex justify-between text-sm">
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={() => openAuthModal('reset')}
                >
                  Забыли пароль?
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={() => openAuthModal('register')}
                >
                  Регистрация
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
      
      <ResetPasswordModal
        open={isResetPasswordModalOpen}
        onOpenChange={(open) => {
          setIsResetPasswordModalOpen(open);
          if (!open) {
            setResetEmail('');
          }
        }}
        email={resetEmail}
      />
    </Dialog>
  );
};
