import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { maskPhone } from '@/lib/maskPhone';
import { cn } from '@/lib/utils';

interface MaskedPhoneProps {
  phone: string | null | undefined;
  className?: string;
  showToggle?: boolean;
  variant?: 'default' | 'muted' | 'bold';
}

/**
 * Компонент для отображения номера телефона с маскированием
 * Позволяет показать/скрыть полный номер по клику
 */
export const MaskedPhone = ({ 
  phone, 
  className,
  showToggle = true,
  variant = 'default'
}: MaskedPhoneProps) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!phone) {
    return <span className={cn('text-muted-foreground', className)}>Не указан</span>;
  }

  const masked = maskPhone(phone);
  const displayPhone = isVisible ? phone : masked;

  const variantClasses = {
    default: '',
    muted: 'text-muted-foreground',
    bold: 'font-semibold',
  };

  if (!showToggle) {
    return (
      <span className={cn(variantClasses[variant], className)}>
        {masked}
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className={cn(variantClasses[variant])}>
        {displayPhone}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setIsVisible(!isVisible)}
        aria-label={isVisible ? 'Скрыть номер' : 'Показать номер'}
        title={isVisible ? 'Скрыть номер' : 'Показать номер'}
      >
        {isVisible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

