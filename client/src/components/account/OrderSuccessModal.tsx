import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Order, DeliveryType, PaymentType, Address } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CheckCircle2, Mail, Package, MapPin, CreditCard, Calendar, Home, ShoppingBag } from 'lucide-react';
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Заголовок с градиентом */}
        <div className="p-6 border-b">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <CheckCircle2 className="relative h-12 w-12 text-green-500 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-3xl font-bold mb-1">
                  Заказ успешно оформлен!
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Ваш заказ принят в обработку. Мы свяжемся с вами в ближайшее время.
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Номер заказа - выделенный блок */}
          <div className="border-2 rounded-xl p-6 text-center">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Номер заказа</p>
            <p className="text-3xl font-bold">{order.orderNumber}</p>
          </div>

          {/* Детали заказа */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Информация о заказе */}
            <Card className="border-2">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Информация о заказе
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Дата заказа</p>
                      <p className="font-medium text-sm">
                        {format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Способ доставки</p>
                      <p className="font-medium text-sm">
                        {deliveryType?.deliveryTypeName || 'Не указан'}
                      </p>
                      {address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {address.street}, {address.city}, {address.postalCode}
                        </p>
                      )}
                      {!address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ул. Примерная, д. 1
                        </p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground mb-1">Способ оплаты</p>
                      <p className="font-medium text-sm">
                        {paymentType?.paymentTypeName || 'Не указан'}
                      </p>
                      {paymentCommission > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Комиссия (2%): {paymentCommission.toLocaleString('ru-RU')} ₽
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Товары */}
            <Card className="border-2">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Товары в заказе
                </h3>

                {order.orderItems && order.orderItems.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {order.orderItems.map((item) => (
                      <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <Avatar className="h-12 w-12 rounded-md border">
                          <AvatarImage src={item.product?.imageUrl} alt={item.product?.name} />
                          <AvatarFallback className="rounded-md">
                            {item.product?.name?.charAt(0) || 'Т'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {item.product?.name || 'Товар'}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              {item.unitPrice.toLocaleString('ru-RU')} ₽ × {item.quantity}
                            </p>
                            <p className="font-semibold text-sm">
                              {(item.unitPrice * item.quantity).toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Товары загружаются...</p>
                )}

                <Separator />

                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-semibold">Итого к оплате:</span>
                  <Badge variant="default" className="text-lg font-bold px-3 py-1">
                    {order.totalAmount.toLocaleString('ru-RU')} ₽
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Уведомление о чеке */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="bg-blue-500 dark:bg-blue-600 rounded-full p-2 flex-shrink-0">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Чек отправлен на почту
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Мы отправили чек на вашу электронную почту. Пожалуйста, проверьте входящие сообщения.
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="flex-1 h-12 text-base"
            >
              <Home className="h-4 w-4 mr-2" />
              На главную
            </Button>
            <Button
              onClick={handleGoToOrders}
              className="flex-1 h-12 text-base bg-primary hover:bg-primary/90"
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Мои заказы
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

