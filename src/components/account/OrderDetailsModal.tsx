import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Order, DeliveryType, PaymentType, Address, OrderItem, Product } from '@/lib/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { deliveryTypesApi, paymentTypesApi, addressesApi, productsApi, orderItemsApi } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MapPin, CreditCard, Calendar, ShoppingBag } from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type OrderItemWithProduct = OrderItem & { product?: Product };

export const OrderDetailsModal = ({ order, open, onOpenChange }: OrderDetailsModalProps) => {
  const [deliveryType, setDeliveryType] = useState<DeliveryType | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [orderItemsWithProducts, setOrderItemsWithProducts] = useState<OrderItemWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && order) {
      // Загружаем данные о доставке, оплате, адресе и продуктах
      const loadOrderDetails = async () => {
        setIsLoading(true);
        try {
          const promises: Promise<any>[] = [];
          
          if (order.deliveryTypesId) {
            promises.push(deliveryTypesApi.getById(order.deliveryTypesId).then(dt => setDeliveryType(dt)));
          }
          if (order.paymentTypesId) {
            promises.push(paymentTypesApi.getById(order.paymentTypesId).then(pt => setPaymentType(pt)));
          }
          if (order.addressId) {
            promises.push(addressesApi.getById(order.addressId).then(addr => setAddress(addr)));
          }
          
          // Загружаем элементы заказа отдельно, так как они могут не приходить в ответе
          let orderItems: OrderItem[] = [];
          try {
            const allOrderItems = await orderItemsApi.getAll();
            orderItems = allOrderItems.filter(item => item.orderId === order.id);
          } catch (error) {
            console.error('Error loading order items:', error);
            // Если не удалось загрузить через API, используем те что есть в order
            orderItems = order.orderItems || [];
          }
          
          // Загружаем полную информацию о продуктах для каждого элемента заказа
          if (orderItems.length > 0) {
            const itemsWithProducts: OrderItemWithProduct[] = await Promise.all(
              orderItems.map(async (item) => {
                try {
                  const product = await productsApi.getById(item.productId);
                  return {
                    ...item,
                    product: product,
                  } as OrderItemWithProduct;
                } catch (error) {
                  console.error(`Error loading product ${item.productId}:`, error);
                  return {
                    ...item,
                    product: undefined,
                  } as OrderItemWithProduct;
                }
              })
            );
            setOrderItemsWithProducts(itemsWithProducts);
          } else {
            setOrderItemsWithProducts([]);
          }
          
          await Promise.all(promises);
        } catch (error) {
          console.error('Error loading order details:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadOrderDetails();
    }
  }, [open, order]);

  // Вычисляем комиссию (2% если оплата картой)
  const paymentCommission = paymentType?.paymentTypeName.toLowerCase().includes('карт') 
    ? order.totalAmount * 0.02 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Заголовок */}
        <div className="p-6 border-b">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">
              Подробности заказа {order.orderNumber || `#${order.id}`}
            </DialogTitle>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Загрузка данных...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Номер заказа - выделенный блок */}
            <div className="border-2 rounded-xl p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2 uppercase tracking-wide">Номер заказа</p>
              <p className="text-3xl font-bold">{order.orderNumber || `#${order.id}`}</p>
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {address ? (
                            `${address.street}, ${address.city}, ${address.postalCode}`
                          ) : (
                            'ул. Примерная, д. 1 (самовывоз)'
                          )}
                        </p>
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

                  {orderItemsWithProducts.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {orderItemsWithProducts.map((item) => {
                        const product = item.product;
                        const itemTotal = item.unitPrice * item.quantity;
                        
                        return (
                          <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <Avatar className="h-12 w-12 rounded-md border">
                              <AvatarImage 
                                src={product?.imageUrl} 
                                alt={product?.nameProduct || 'Товар'}
                              />
                              <AvatarFallback className="rounded-md">
                                {product?.nameProduct?.charAt(0) || 'Т'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {product?.nameProduct || 'Товар'}
                              </p>
                              {product?.article && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Артикул: {product.article}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {item.unitPrice.toLocaleString('ru-RU')} ₽ × {item.quantity}
                                </p>
                                <p className="font-semibold text-sm">
                                  {itemTotal.toLocaleString('ru-RU')} ₽
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
