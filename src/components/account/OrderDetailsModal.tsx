import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface OrderDetailsModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OrderDetailsModal = ({ order, open, onOpenChange }: OrderDetailsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали заказа #{order.id.toString().slice(0, 8)}</DialogTitle> // toString() для преобразования числа в строку
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Дата заказа</p>
            <p className="font-semibold">
              {format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Статус</p>
            <Badge variant="outline">{order.status}</Badge>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Товары в заказе</p>
            <div className="space-y-2">
              {order.orderItems?.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">{item.product?.name || 'Товар'}</p>
                        <p className="text-sm text-muted-foreground">
                          Количество: {item.quantity}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Цена за единицу: {item.price.toLocaleString('ru-RU')} ₽
                        </p>
                      </div>
                      <p className="font-semibold">
                        {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">Итого:</p>
              <p className="text-xl font-bold">
                {order.totalAmount.toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
