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
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
}

export const ResetPasswordModal = ({ open, onOpenChange, email }: ResetPasswordModalProps) => {
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Введите 6-значный код');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.verifyCode({ email, code });
      if (response.valid) {
        setStep('password');
        toast.success('Код подтвержден');
      } else {
        toast.error('Неверный код');
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
      onOpenChange(false);
      // Сброс формы
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('code');
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
            {step === 'code' ? 'Введите код подтверждения' : 'Введите новый пароль'}
          </DialogTitle>
        </DialogHeader>

        {step === 'code' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Код из письма</Label>
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
              <Label htmlFor="confirm-new-password">Подтвердите пароль</Label>
              <div className="relative">
                <Input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              onClick={handleSetNewPassword}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить пароль'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

