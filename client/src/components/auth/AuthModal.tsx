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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Валидация email
  const validateEmail = (email: string): string | null => {
    if (!email) {
      return 'Email обязателен для заполнения';
    }
    if (!email.includes('@')) {
      return 'Email должен содержать символ @';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Введите корректный email адрес';
    }
    return null;
  };

  // Валидация пароля
  const validatePassword = (password: string, isLogin: boolean = false): string | null => {
    if (!password) {
      return 'Пароль обязателен для заполнения';
    }
    if (!isLogin) {
      if (password.length < 8) {
        return 'Пароль должен содержать минимум 8 символов';
      }
      if (!/[A-ZА-Я]/.test(password)) {
        return 'Пароль должен содержать хотя бы одну заглавную букву';
      }
      if (!/[a-zа-я]/.test(password)) {
        return 'Пароль должен содержать хотя бы одну строчную букву';
      }
      if (!/\d/.test(password)) {
        return 'Пароль должен содержать хотя бы одну цифру';
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return 'Пароль должен содержать хотя бы один специальный символ (!@#$%^&*()_+-=[]{}|;:,.<>?)';
      }
    }
    return null;
  };

  // Валидация имени
  const validateFirstName = (firstName: string): string | null => {
    if (!firstName) {
      return 'Имя обязательно для заполнения';
    }
    if (firstName.length < 2) {
      return 'Имя должно содержать минимум 2 символа';
    }
    return null;
  };

  // Валидация телефона
  const validatePhone = (phone: string): string | null => {
    if (phone && phone.length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(phone)) {
        return 'Некорректный формат телефона';
      }
      if (phone.replace(/[\s\-\+\(\)]/g, '').length < 10) {
        return 'Телефон должен содержать минимум 10 цифр';
      }
    }
    return null;
  };

  // Валидация подтверждения пароля
  const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword) {
      return 'Подтвердите пароль';
    }
    if (password !== confirmPassword) {
      return 'Пароли не совпадают';
    }
    return null;
  };

  // Валидация всех полей для логина
  const validateLoginForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
      toast.error(emailError);
    }
    
    const passwordError = validatePassword(formData.password, true);
    if (passwordError) {
      newErrors.password = passwordError;
      toast.error(passwordError);
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Валидация всех полей для регистрации
  const validateRegisterForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const emailError = validateEmail(formData.email);
    if (emailError) {
      newErrors.email = emailError;
      toast.error(emailError);
    }
    
    const firstNameError = validateFirstName(formData.firstName);
    if (firstNameError) {
      newErrors.firstName = firstNameError;
      toast.error(firstNameError);
    }
    
    if (formData.phone) {
      const phoneError = validatePhone(formData.phone);
      if (phoneError) {
        newErrors.phone = phoneError;
        toast.error(phoneError);
      }
    }
    
    const passwordError = validatePassword(formData.password, false);
    if (passwordError) {
      newErrors.password = passwordError;
      toast.error(passwordError);
    }
    
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (confirmPasswordError) {
      newErrors.confirmPassword = confirmPasswordError;
      toast.error(confirmPasswordError);
    }
    
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Необходимо принять условия пользовательского соглашения';
      toast.error('Необходимо принять условия пользовательского соглашения');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!validateLoginForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: formData.email.trim(),
        password: formData.password,
      });
      
      // Дополнительная проверка ответа
      if (!response || !response.token) {
        throw new Error('Неверный email или пароль');
      }
      
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
      setErrors({});
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Ошибка входа';
      toast.error(errorMessage.includes('401') || errorMessage.includes('Unauthorized') 
        ? 'Неверный email или пароль' 
        : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Валидация
    if (!validateRegisterForm()) {
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
      
      // Проверяем, что есть токен
      if (!response || !response.token) {
        throw new Error('Ошибка регистрации: не получен токен');
      }
      
      // Загружаем полные данные пользователя после регистрации
      try {
        const fullUser = await usersApi.getCurrentUser();
        login(fullUser, response.token);
      } catch {
        // Если не удалось загрузить полные данные, используем упрощенную версию
        if (!response.user) {
          throw new Error('Ошибка регистрации: не получены данные пользователя');
        }
        
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
      setErrors({});
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(error.message || 'Ошибка регистрации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenResetPassword = () => {
    setResetEmail(formData.email);
    setIsResetPasswordModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (authModalView === 'login') {
      handleLogin(e);
    } else if (authModalView === 'register') {
      handleRegister(e);
    }
  };

  return (
    <Dialog open={isAuthModalOpen} onOpenChange={closeAuthModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {authModalView === 'login' && 'Личный кабинет'}
            {authModalView === 'register' && 'Регистрация'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authModalView === 'register' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  onBlur={() => {
                    const error = validateEmail(formData.email);
                    if (error) {
                      setErrors({ ...errors, email: error });
                      toast.error(error);
                    } else {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  className={errors.email ? 'border-destructive' : ''}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">Имя</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName) {
                      setErrors({ ...errors, firstName: '' });
                    }
                  }}
                  onBlur={() => {
                    const error = validateFirstName(formData.firstName);
                    if (error) {
                      setErrors({ ...errors, firstName: error });
                      toast.error(error);
                    } else {
                      setErrors({ ...errors, firstName: '' });
                    }
                  }}
                  className={errors.firstName ? 'border-destructive' : ''}
                  required
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errors.phone) {
                      setErrors({ ...errors, phone: '' });
                    }
                  }}
                  onBlur={() => {
                    if (formData.phone) {
                      const error = validatePhone(formData.phone);
                      if (error) {
                        setErrors({ ...errors, phone: error });
                        toast.error(error);
                      } else {
                        setErrors({ ...errors, phone: '' });
                      }
                    }
                  }}
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) {
                        setErrors({ ...errors, password: '' });
                      }
                      // Также проверяем confirmPassword, если он уже заполнен
                      if (formData.confirmPassword && errors.confirmPassword) {
                        const confirmError = validateConfirmPassword(e.target.value, formData.confirmPassword);
                        if (confirmError) {
                          setErrors({ ...errors, confirmPassword: confirmError });
                        } else {
                          setErrors({ ...errors, confirmPassword: '' });
                        }
                      }
                    }}
                    onBlur={() => {
                      const error = validatePassword(formData.password, false);
                      if (error) {
                        setErrors({ ...errors, password: error });
                        toast.error(error);
                      } else {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    className={errors.password ? 'border-destructive' : ''}
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
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Повтор пароля</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: '' });
                      }
                    }}
                    onBlur={() => {
                      const error = validateConfirmPassword(formData.password, formData.confirmPassword);
                      if (error) {
                        setErrors({ ...errors, confirmPassword: error });
                        toast.error(error);
                      } else {
                        setErrors({ ...errors, confirmPassword: '' });
                      }
                    }}
                    className={errors.confirmPassword ? 'border-destructive' : ''}
                    required
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, agreeTerms: checked as boolean });
                    if (errors.agreeTerms) {
                      setErrors({ ...errors, agreeTerms: '' });
                    }
                  }}
                  className={errors.agreeTerms ? 'border-destructive' : ''}
                />
                <label htmlFor="terms" className="text-sm">
                  Я принимаю условия пользовательского соглашения
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="text-sm text-destructive">{errors.agreeTerms}</p>
              )}

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
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  onBlur={() => {
                    const error = validateEmail(formData.email);
                    if (error) {
                      setErrors({ ...errors, email: error });
                      toast.error(error);
                    } else {
                      setErrors({ ...errors, email: '' });
                    }
                  }}
                  className={errors.email ? 'border-destructive' : ''}
                  required
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errors.password) {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    onBlur={() => {
                      const error = validatePassword(formData.password, true);
                      if (error) {
                        setErrors({ ...errors, password: error });
                        toast.error(error);
                      } else {
                        setErrors({ ...errors, password: '' });
                      }
                    }}
                    className={errors.password ? 'border-destructive' : ''}
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
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>

              <div className="flex flex-col items-center gap-2 text-sm">
                <Button
                  type="button"
                  variant="link"
                  className="p-0"
                  onClick={handleOpenResetPassword}
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
