import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminOrdersApi, OrderItem } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AdminOrderDetailsModalProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminOrderDetailsModal = ({ order, open, onOpenChange }: AdminOrderDetailsModalProps) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && order?.id) {
      loadOrderItems();
    }
  }, [open, order]);

  const loadOrderItems = async () => {
    if (!order?.id) return;
    setIsLoading(true);
    try {
      // Загружаем полный заказ с элементами
      const fullOrder = await adminOrdersApi.getById(order.id);
      setOrderItems(fullOrder.orderItems || []);
    } catch (error) {
      toast.error('Ошибка загрузки деталей заказа');
      console.error('Error loading order items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Детали заказа #{order?.orderNumber || order?.id}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div>Загрузка...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Дата заказа</p>
              <p className="font-semibold">
                {order?.orderDate ? format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru }) : '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-1">Сумма заказа</p>
              <p className="font-semibold text-lg">
                {order?.totalAmount ? `${order.totalAmount.toLocaleString('ru-RU')} ₽` : '-'}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Товары в заказе</p>
              {orderItems.length === 0 ? (
                <p className="text-muted-foreground">Нет товаров в заказе</p>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold">{item.product?.name || `Товар #${item.productId}`}</p>
                            <p className="text-sm text-muted-foreground">
                              Количество: {item.quantity}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Цена за единицу: {item.unitPrice.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(item.unitPrice * item.quantity).toLocaleString('ru-RU')} ₽
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Итого:</p>
                <p className="text-xl font-bold">
                  {order?.totalAmount ? `${order.totalAmount.toLocaleString('ru-RU')} ₽` : '-'}
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

