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
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { sendResetCodeEmail } from '@/lib/emailService';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email?: string; // Опциональный, если передан из профиля
}

export const ResetPasswordModal = ({ open, onOpenChange, email: initialEmail }: ResetPasswordModalProps) => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string>(''); // Сохраняем отправленный код

  // Сброс состояния при открытии/закрытии модального окна
  useEffect(() => {
    if (open) {
      setStep(initialEmail ? 'code' : 'email');
      setEmail(initialEmail || '');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
    } else {
      // Сброс при закрытии
      setStep('email');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
    }
  }, [open, initialEmail]);

  // Генерация 6-значного кода
  const generateCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Отправка кода на email
  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Введите корректный email');
      return;
    }

    setIsLoading(true);
    try {
      // Генерируем код
      const generatedCode = generateCode();
      setVerificationCode(generatedCode);

      // Отправляем код через EmailJS
      await sendResetCodeEmail(email, generatedCode);

      setStep('code');
      toast.success('Код подтверждения отправлен на почту');
    } catch (error: any) {
      console.error('Error sending reset code:', error);
      toast.error(error.message || 'Ошибка отправки кода');
    } finally {
      setIsLoading(false);
    }
  };

  // Проверка кода
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    setIsLoading(true);
    try {
      // Проверяем код локально (так как мы его сгенерировали)
      if (code === verificationCode) {
        setStep('password');
        toast.success('Код подтвержден');
      } else {
        // Также пробуем проверить через API
        try {
          const response = await authApi.verifyCode({ email, code });
          if (response.valid) {
            setStep('password');
            toast.success('Код подтвержден');
          } else {
            toast.error('Неверный код');
          }
        } catch (apiError) {
          // Если API не работает, используем локальную проверку
          toast.error('Неверный код');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка проверки кода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.setNewPassword({ email, code, newPassword });
      toast.success('Пароль успешно изменен');
      // Сброс формы
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setVerificationCode('');
      setStep('email');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка изменения пароля');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' && 'Восстановление пароля'}
            {step === 'code' && 'Введите код подтверждения'}
            {step === 'password' && 'Введите новый пароль'}
          </DialogTitle>
        </DialogHeader>

        {step === 'email' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Введите ваш email"
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              На указанный email будет отправлен код подтверждения для сброса пароля
            </p>
            <Button
              onClick={handleSendCode}
              className="w-full"
              disabled={!email || !email.includes('@') || isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </Button>
          </div>
        ) : step === 'code' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Код из письма</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Код отправлен на {email}
              </p>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              onClick={handleVerifyCode}
              className="w-full"
              disabled={code.length !== 6 || isLoading}
            >
              {isLoading ? 'Проверка...' : 'Подтвердить'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep('email')}
            >
              Изменить email
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Новый пароль</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Введите новый пароль"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Подтвердите пароль</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  required
                />
              </div>
            </div>

            <Button
              onClick={handleSetNewPassword}
              className="w-full"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? 'Сохранение...' : 'Подтвердить'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

