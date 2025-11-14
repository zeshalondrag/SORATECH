import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ordersApi, Order, statusOrdersApi, StatusOrder, orderItemsApi, OrderItem, productsApi } from '@/lib/api';
import { OrderDetailsModal } from '@/components/account/OrderDetailsModal';
import { useStore } from '@/stores/useStore';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const OrderHistory = () => {
  const { user } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusOrders, setStatusOrders] = useState<StatusOrder[]>([]);
  const itemsPerPage = 3;

  // Функция загрузки заказов
  const loadOrders = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setOrders([]);
      setFilteredOrders([]);
      return;
    }

    setIsLoading(true);
    try {
      const [data, statusData, allOrderItems] = await Promise.all([
        ordersApi.getAll(),
        statusOrdersApi.getAll(),
        orderItemsApi.getAll()
      ]);
      
      setStatusOrders(statusData);
      console.log('Все заказы из API:', data);
      console.log('Текущий пользователь ID:', user.id, 'тип:', typeof user.id);
      
      // Фильтруем заказы текущего пользователя (сравниваем как числа для надежности)
      let userOrders = data.filter((order) => {
        const orderUserId = Number(order.userId);
        const currentUserId = Number(user.id);
        const match = orderUserId === currentUserId;
        console.log(`Заказ ${order.id}: userId=${orderUserId}, текущий=${currentUserId}, совпадение=${match}`);
        return match;
      });
      
      // Загружаем информацию о продуктах для orderItems и добавляем их к заказам
      const orderItemsMap = new Map<number, OrderItem[]>();
      allOrderItems.forEach(item => {
        if (!orderItemsMap.has(item.orderId)) {
          orderItemsMap.set(item.orderId, []);
        }
        orderItemsMap.get(item.orderId)!.push(item);
      });
      
      // Загружаем информацию о продуктах для каждого элемента заказа
      userOrders = await Promise.all(userOrders.map(async (order) => {
        const orderItems = orderItemsMap.get(order.id) || [];
        
        // Загружаем информацию о продуктах
        const itemsWithProducts = await Promise.all(
          orderItems.map(async (item) => {
            try {
              const product = await productsApi.getById(item.productId);
              return {
                ...item,
                product: {
                  id: product.id,
                  name: product.nameProduct,
                  imageUrl: product.imageUrl,
                },
              };
            } catch (error) {
              console.error(`Error loading product ${item.productId}:`, error);
              return {
                ...item,
                product: {
                  id: item.productId,
                  name: 'Товар',
                  imageUrl: undefined,
                },
              };
            }
          })
        );
        
        return {
          ...order,
          orderItems: itemsWithProducts,
        };
      }));
      
      // Сортируем заказы по дате (новые сначала)
      userOrders.sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime();
        const dateB = new Date(b.orderDate).getTime();
        return dateB - dateA; // Сначала новые
      });
      
      console.log('Отфильтрованные заказы пользователя с товарами:', userOrders);
      setOrders(userOrders);
      setFilteredOrders(userOrders);
    } catch (error: any) {
      console.error('Ошибка загрузки заказов:', error);
      toast.error('Ошибка загрузки заказов');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Загружаем заказы при изменении пользователя
  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setOrders([]);
      setFilteredOrders([]);
      setIsLoading(false);
    }
  }, [user, loadOrders]); // Зависимость от user и loadOrders

  useEffect(() => {
    filterOrders();
  }, [searchQuery, orders]);

  // Слушаем событие обновления заказов
  useEffect(() => {
    if (!user) return;

    const handleOrderCreated = () => {
      console.log('Получено событие orderCreated, перезагружаем заказы...');
      loadOrders();
    };

    window.addEventListener('orderCreated', handleOrderCreated);
    return () => {
      window.removeEventListener('orderCreated', handleOrderCreated);
    };
  }, [user, loadOrders]); // Добавляем user и loadOrders в зависимости

  const filterOrders = () => {
    if (!searchQuery.trim()) {
      // При отсутствии поиска сохраняем сортировку по дате
      const sorted = [...orders].sort((a, b) => {
        const dateA = new Date(a.orderDate).getTime();
        const dateB = new Date(b.orderDate).getTime();
        return dateB - dateA; // Сначала новые
      });
      setFilteredOrders(sorted);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = orders.filter((order) => {
      const orderIdMatch = order.id.toString().toLowerCase().includes(query);
      const productMatch = order.orderItems?.some((item) =>
        item.product?.name.toLowerCase().includes(query) ||
        item.productId.toString().toLowerCase().includes(query)
      );
      return orderIdMatch || productMatch;
    });

    // Сортируем отфильтрованные заказы по дате (новые сначала)
    filtered.sort((a, b) => {
      const dateA = new Date(a.orderDate).getTime();
      const dateB = new Date(b.orderDate).getTime();
      return dateB - dateA; // Сначала новые
    });

    setFilteredOrders(filtered);
    setCurrentPage(1);
  };

  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">История заказов</h2>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Номер заказа / название или ID товара"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {paginatedOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            К сожалению, ничего не найдено.
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedOrders.map((order) => {
                const status = statusOrders.find(s => s.id === order.statusOrderId);
                // Считаем общее количество товаров (сумма quantity всех позиций)
                const totalItemsCount = order.orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                const itemsCount = order.orderItems?.length || 0;
                
                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg font-semibold mb-1">
                            Заказ {order.orderNumber || `#${order.id}`}
                          </CardTitle>
                          <CardDescription className="text-xs mb-2">
                            {format(new Date(order.orderDate), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                          </CardDescription>
                          {status && (
                            <Badge variant="default" className="text-xs">
                              {status.statusName}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1.5" />
                          Подробнее
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">                        
                        <Separator />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Всего товаров: <span className="font-medium">{totalItemsCount}</span>
                            </p>
                            <p className="text-base font-semibold mt-1">
                              {order.totalAmount.toLocaleString('ru-RU')} ₽
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

