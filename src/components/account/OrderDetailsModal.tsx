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

  // Вычисляем общее количество товаров
  const totalItemsCount = orderItemsWithProducts.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4 border-b">
          <DialogTitle className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100">
            Подробности заказа {order.orderNumber || `#${order.id}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 dark:border-gray-400 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Загрузка данных...</p>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Информация о заказе */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
                <p className="text-xs text-muted-foreground mb-1">Дата оформления</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  {format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                </p>
              </div>
              <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
                <p className="text-xs text-muted-foreground mb-1">Способ доставки</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{deliveryType?.deliveryTypeName || 'Не указан'}</p>
              </div>
            </div>

            <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
              <p className="text-xs text-muted-foreground mb-1">Адрес доставки</p>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {address ? (
                  `${address.street}, ${address.city}, ${address.postalCode}`
                ) : (
                  'ул. Примерная, д. 1 (самовывоз)'
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
                <p className="text-xs text-muted-foreground mb-1">Способ оплаты</p>
                <p className="font-semibold text-sm text-gray-900 dark:text-white">{paymentType?.paymentTypeName || 'Не указан'}</p>
              </div>
              {paymentCommission > 0 && (
                <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
                  <p className="text-xs text-muted-foreground mb-1">Комиссия (2%)</p>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white">{paymentCommission.toLocaleString('ru-RU')} ₽</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Товары */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-semibold">Купленные товары</p>
                <p className="text-sm text-muted-foreground">
                  Всего: {totalItemsCount} {totalItemsCount === 1 ? 'товар' : totalItemsCount < 5 ? 'товара' : 'товаров'}
                </p>
              </div>
              <div className="space-y-3">
                {orderItemsWithProducts.length > 0 ? (
                  orderItemsWithProducts.map((item) => {
                    const product = item.product;
                    const itemTotal = item.unitPrice * item.quantity;
                    
                    return (
                      <Card key={item.id} className="hover:shadow-md border-gray-200 dark:border-[#262626]">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Картинка товара */}
                            <Avatar className="h-16 w-16 rounded-lg border-2 border-gray-200 dark:border-[#262626]">
                              <AvatarImage 
                                src={product?.imageUrl} 
                                alt={product?.nameProduct || 'Товар'}
                                className="object-cover"
                              />
                              <AvatarFallback className="rounded-lg bg-gray-100 dark:bg-gray-800">
                                {product?.nameProduct?.charAt(0) || 'Т'}
                              </AvatarFallback>
                            </Avatar>
                            
                            {/* Информация о товаре */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm mb-1 truncate">
                                    {product?.nameProduct || 'Товар'}
                                  </p>
                                  {product?.article && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                      Артикул: {product.article}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">
                                      Цена: <span className="font-medium text-gray-900 dark:text-gray-100">{item.unitPrice.toLocaleString('ru-RU')} ₽</span>
                                    </span>
                                    <span className="text-muted-foreground">
                                      Кол-во: <span className="font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">
                                    {itemTotal.toLocaleString('ru-RU')} ₽
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Товары загружаются...</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Итого */}
            <div className="rounded-lg p-4 bg-gray-100 dark:bg-[#262626]">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">Итоговая сумма:</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {order.totalAmount.toLocaleString('ru-RU')} ₽
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
