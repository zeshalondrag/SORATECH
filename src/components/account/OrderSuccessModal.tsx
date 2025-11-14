import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Order, DeliveryType, PaymentType, Address } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OrderSuccessModalProps {
  order: Order;
  deliveryType?: DeliveryType;
  paymentType?: PaymentType;
  address?: Address | null;
  paymentCommission?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderSuccessModal = ({
  order,
  deliveryType,
  paymentType,
  address,
  paymentCommission = 0,
  open,
  onOpenChange,
}: OrderSuccessModalProps) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    onOpenChange(false);
    navigate('/');
  };

  const handleGoToOrders = () => {
    onOpenChange(false);
    navigate('/account?tab=orders');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <DialogTitle className="text-2xl">Заказ успешно оформлен</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Номер заказа */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Номер заказа</p>
            <p className="text-xl font-bold">{order.orderNumber}</p>
          </div>

          {/* Благодарность */}
          <div className="text-center py-4">
            <p className="text-lg font-semibold mb-2">
              Спасибо за покупку!
            </p>
            <p className="text-sm text-muted-foreground">
              Ваш заказ принят в обработку. Мы свяжемся с вами в ближайшее время.
            </p>
          </div>

          {/* Детали заказа */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold mb-4">Детали заказа</h3>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Дата заказа</span>
                  <span className="font-medium">
                    {format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  </span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Способ доставки</span>
                  <span className="font-medium">
                    {deliveryType?.deliveryTypeName || 'Не указан'}
                  </span>
                </div>

                {address && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Адрес доставки</span>
                    <span className="font-medium text-right max-w-[60%]">
                      {address.street}, {address.city}, {address.postalCode}
                    </span>
                  </div>
                )}

                {!address && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Адрес самовывоза</span>
                    <span className="font-medium">
                      ул. Примерная, д. 1
                    </span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Способ оплаты</span>
                  <span className="font-medium">
                    {paymentType?.paymentTypeName || 'Не указан'}
                  </span>
                </div>

                {paymentCommission > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Комиссия (2%)</span>
                    <span className="font-medium">
                      {paymentCommission.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}

                <Separator />

                {/* Товары */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Оформленные товары</p>
                  {order.orderItems && order.orderItems.length > 0 ? (
                    <div className="space-y-2">
                      {order.orderItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {item.product?.name || 'Товар'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.unitPrice.toLocaleString('ru-RU')} ₽ × {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.unitPrice * item.quantity).toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Товары загружаются...</p>
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold">
                  <span>Итого к оплате:</span>
                  <span>{order.totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Уведомление о чеке */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Чек отправлен на почту
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Мы отправили чек на вашу электронную почту. Пожалуйста, проверьте входящие сообщения.
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex-1"
            >
              На главную
            </Button>
            <Button
              onClick={handleGoToOrders}
              className="flex-1"
            >
              Мои заказы
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

