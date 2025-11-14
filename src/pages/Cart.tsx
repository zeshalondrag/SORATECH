import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BackToTopButton } from '@/components/layout/BackToTopButton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Heart,
  Printer,
  Trash2,
  Plus,
  Minus,
  CalendarIcon,
  MapPin,
  Star,
  ShoppingCart,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { cartsApi, productsApi, addressesApi, deliveryTypesApi, paymentTypesApi, ordersApi, statusOrdersApi, orderItemsApi, type Cart, type Product, type Address, type DeliveryType, type PaymentType, type Order, type OrderItem, type CreateOrder } from '@/lib/api';
import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { productCharacteristicsApi, characteristicsApi, reviewsApi } from '@/lib/api';
import { OrderSuccessModal } from '@/components/account/OrderSuccessModal';
import { sendReceiptEmail } from '@/lib/emailService';

const Cart = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, cart: storeCart, removeFromCart, updateQuantity, clearCart, toggleFavorite, favorites } = useStore();
  
  const [carts, setCarts] = useState<Cart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [deliveryTypes, setDeliveryTypes] = useState<DeliveryType[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [productCharacteristics, setProductCharacteristics] = useState<Record<number, Array<{ name: string; value: string }>>>({});
  const [productRatings, setProductRatings] = useState<Record<number, number>>({});
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  
  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [deliveryTime, setDeliveryTime] = useState<string>('');
  
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [confirmByPhone, setConfirmByPhone] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  
  const [agreeToNewsletter, setAgreeToNewsletter] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDeliveryType, setSuccessDeliveryType] = useState<DeliveryType | undefined>(undefined);
  const [successPaymentType, setSuccessPaymentType] = useState<PaymentType | undefined>(undefined);
  const [successAddress, setSuccessAddress] = useState<Address | null>(null);
  const [successPaymentCommission, setSuccessPaymentCommission] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      toast.error('Необходимо войти в систему для просмотра корзины');
      navigate('/');
      return;
    }
    loadCartData();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (user) {
      setContactName(user.firstName || '');
      setContactEmail(user.email || '');
      setContactPhone(user.phone || '');
    }
  }, [user]);

  const loadCartData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [cartsData, productsData, addressesData, deliveryTypesData, paymentTypesData] = await Promise.all([
        cartsApi.getAll(),
        productsApi.getAll(),
        addressesApi.getAll(),
        deliveryTypesApi.getAll(),
        paymentTypesApi.getAll(),
      ]);

      // Фильтруем корзину текущего пользователя
      const userCarts = cartsData.filter(c => Number(c.userId) === Number(user.id));
      setCarts(userCarts);

      // Получаем товары из корзины
      const cartProducts = productsData.filter(p => 
        userCarts.some(c => Number(c.productId) === Number(p.id))
      );
      setProducts(cartProducts);

      // Фильтруем адреса пользователя
      const userAddresses = addressesData.filter(a => Number(a.userId) === Number(user.id));
      setAddresses(userAddresses);
      if (userAddresses.length > 0 && !selectedAddressId) {
        setSelectedAddressId(userAddresses[0].id);
      }

      setDeliveryTypes(deliveryTypesData);
      setPaymentTypes(paymentTypesData);

      // Загружаем характеристики и рейтинги для товаров
      await loadProductDetails(cartProducts);

      // Инициализируем выбранные элементы
      const allProductIds = userCarts.map(c => String(c.productId));
      setSelectedItems(new Set(allProductIds));
      setSelectAll(true);
    } catch (error: any) {
      console.error('Error loading cart:', error);
      toast.error('Ошибка загрузки корзины');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProductDetails = async (products: Product[]) => {
    try {
      const [characteristicsData, reviewsData] = await Promise.all([
        productCharacteristicsApi.getAll(),
        reviewsApi.getAll(),
      ]);

      const characteristicsMap: Record<number, Array<{ name: string; value: string }>> = {};
      const ratingsMap: Record<number, number> = {};

      for (const product of products) {
        // Характеристики
        const productChars = characteristicsData.filter(pc => pc.productId === product.id);
        if (productChars.length > 0) {
          const charDetails = await Promise.all(
            productChars.map(async (pc) => {
              const char = await characteristicsApi.getById(pc.characteristicId);
              return { name: char.nameCharacteristic, value: pc.description };
            })
          );
          characteristicsMap[product.id] = charDetails;
        }

        // Рейтинги
        const productReviews = reviewsData.filter(r => r.productId === product.id);
        if (productReviews.length > 0) {
          ratingsMap[product.id] = productReviews.reduce((sum, r) => sum + Number(r.rating), 0) / productReviews.length;
        } else {
          ratingsMap[product.id] = 0;
        }
      }

      setProductCharacteristics(characteristicsMap);
      setProductRatings(ratingsMap);
    } catch (error) {
      console.error('Error loading product details:', error);
    }
  };

  const getCartItem = (productId: number): Cart | undefined => {
    return carts.find(c => Number(c.productId) === Number(productId) && Number(c.userId) === Number(user?.id));
  };

  const getCartItems = () => {
    return carts
      .filter(c => Number(c.userId) === Number(user?.id))
      .map(cart => {
        const product = products.find(p => Number(p.id) === Number(cart.productId));
        return { cart, product };
      })
      .filter(item => item.product);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(carts
        .filter(c => Number(c.userId) === Number(user?.id))
        .map(c => String(c.productId))
      );
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
      setSelectAll(false);
    }
    setSelectedItems(newSelected);
    if (newSelected.size === carts.filter(c => Number(c.userId) === Number(user?.id)).length) {
      setSelectAll(true);
    }
  };

  const handleRemoveItem = async (productId: number) => {
    if (!user) return;
    try {
      const cartItem = getCartItem(productId);
      if (cartItem && cartItem.id) {
        await cartsApi.delete(cartItem.id);
        removeFromCart(String(productId));
        toast.success('Товар удален из корзины');
        loadCartData();
      }
    } catch (error: any) {
      console.error('Error removing item:', error);
      toast.error('Ошибка при удалении товара');
    }
  };

  const handleAddAllToFavorites = async () => {
    if (!isAuthenticated || !user) {
      toast.error('Необходимо войти в систему');
      return;
    }

    try {
      const selectedCarts = getCartItems().filter(item => 
        selectedItems.has(String(item.product?.id)) && item.product
      );
      
      for (const item of selectedCarts) {
        if (item.product && !favorites.some(f => String(f.id) === String(item.product?.id))) {
          const productForFavorite = {
            id: String(item.product.id),
            name: item.product.nameProduct,
            price: item.product.price,
            image: item.product.imageUrl || '/placeholder.svg',
            category: '',
            categoryId: String(item.product.categoryId),
            images: [item.product.imageUrl || '/placeholder.svg'],
            rating: productRatings[item.product.id] || 0,
            reviewCount: 0,
            inStock: (item.product.stockQuantity || 0) > 0,
            specs: {},
            description: item.product.description,
          };
          await toggleFavorite(productForFavorite);
        }
      }
      toast.success('Товары добавлены в избранное');
    } catch (error: any) {
      console.error('Error adding to favorites:', error);
    }
  };

  const handleUpdateQuantity = async (productId: number, newQuantity: number) => {
    if (!user) return;
    
    const product = products.find(p => Number(p.id) === Number(productId));
    const maxQuantity = product?.stockQuantity || 0;
    const cartItem = getCartItem(productId);
    
    // Если количество становится 0 или меньше, удаляем товар
    if (newQuantity <= 0) {
      if (cartItem && cartItem.id) {
        await handleRemoveItem(productId);
      }
      return;
    }
    
    if (newQuantity > maxQuantity) {
      toast.error(`Можно добавить не более ${maxQuantity} шт. товара`);
      return;
    }

    try {
      if (cartItem && cartItem.id) {
        // Получаем текущий элемент корзины для получения всех данных
        const currentCart = await cartsApi.getById(cartItem.id);
        // Передаем все поля, включая id и другие обязательные
        await cartsApi.update(cartItem.id, {
          id: currentCart.id,
          userId: currentCart.userId,
          productId: currentCart.productId,
          quantity: newQuantity,
        });
        await updateQuantity(String(productId), newQuantity);
        // Обновляем локальное состояние
        setCarts(prevCarts => 
          prevCarts.map(c => 
            c.id === cartItem.id 
              ? { ...c, quantity: newQuantity }
              : c
          )
        );
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      const errorMessage = error.message || error.title || 'Ошибка при обновлении количества';
      toast.error(errorMessage);
      // Перезагружаем данные для синхронизации
      loadCartData();
    }
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const handlePrintPage = () => {
    window.print();
  };

  const handleClearCart = async () => {
    if (!user) return;
    try {
      const userCarts = carts.filter(c => Number(c.userId) === Number(user.id));
      await Promise.all(userCarts.map(cart => {
        if (cart.id) {
          return cartsApi.delete(cart.id);
        }
      }));
      clearCart();
      toast.success('Корзина очищена');
      setShowClearDialog(false);
      loadCartData();
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      toast.error('Ошибка при очистке корзины');
    }
  };

  const isWeekday = (date: Date) => {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  };

  const getMinDate = () => {
    const today = new Date();
    if (deliveryMethod === 'pickup') {
      return today;
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isWeekday(tomorrow)) {
      return tomorrow;
    }
    const nextMonday = new Date(tomorrow);
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
    return nextMonday;
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 14);
    return maxDate;
  };

  const calculateTotal = () => {
    const selectedCarts = getCartItems().filter(item => 
      selectedItems.has(String(item.cart.productId))
    );
    
    const productsTotal = selectedCarts.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.cart.quantity;
    }, 0);

    const deliveryCost = deliveryMethod === 'courier' ? 590 : 0;
    
    // Комиссия 2% при оплате картой
    const paymentCommission = paymentMethod === 'card' ? productsTotal * 0.02 : 0;
    
    const total = productsTotal + deliveryCost + paymentCommission;

    return { productsTotal, deliveryCost, paymentCommission, total, selectedCount: selectedCarts.reduce((sum, item) => sum + item.cart.quantity, 0) };
  };

  const handleSubmitOrder = async () => {
    if (!user) return;
    
    // Валидация выбранных товаров
    if (selectedItems.size === 0) {
      toast.error('Выберите хотя бы один товар для оформления заказа');
      return;
    }
    
    // Валидация способа получения
    if (!deliveryMethod) {
      toast.error('Выберите способ получения');
      return;
    }
    
    if (!selectedAddressId && deliveryMethod === 'courier') {
      toast.error('Выберите адрес доставки');
      return;
    }
    
    if (!deliveryDate) {
      toast.error('Выберите дату доставки');
      return;
    }
    
    if (deliveryMethod === 'courier' && !deliveryTime) {
      toast.error('Выберите время доставки');
      return;
    }
    
    // Валидация способа оплаты
    if (!paymentMethod) {
      toast.error('Выберите способ оплаты');
      return;
    }
    
    if (!agreeToTerms) {
      toast.error('Необходимо согласиться с условиями');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCarts = getCartItems().filter(item => 
        selectedItems.has(String(item.cart.productId))
      );

      // Проверяем достаточность товаров на складе
      for (const item of selectedCarts) {
        if (item.product) {
          const currentStock = item.product.stockQuantity || 0;
          const orderedQuantity = item.cart.quantity;
          
          if (currentStock < orderedQuantity) {
            toast.error(`Недостаточно товара "${item.product.nameProduct}". Доступно: ${currentStock}, запрошено: ${orderedQuantity}`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Находим ID способа доставки и оплаты
      const deliveryType = deliveryTypes.find(dt => 
        deliveryMethod === 'courier' ? dt.deliveryTypeName.toLowerCase().includes('курьер') : dt.deliveryTypeName.toLowerCase().includes('самовывоз')
      );
      const paymentType = paymentTypes.find(pt => 
        paymentMethod === 'card' ? pt.paymentTypeName.toLowerCase().includes('карт') : pt.paymentTypeName.toLowerCase().includes('налич')
      );

      if (!deliveryType || !paymentType) {
        toast.error('Ошибка: не найден способ доставки или оплаты');
        setIsSubmitting(false);
        return;
      }

      // Находим статус заказа
      const statusOrders = await statusOrdersApi.getAll();
      const newStatus = statusOrders.find(s => s.statusName.toLowerCase().includes('новый')) || statusOrders[0];
      const statusOrderId = newStatus?.id || 1;

      // Создаем заказ
      const orderDate = new Date();
      const totalAmount = calculateTotal().total;

      // Подготавливаем данные для создания заказа
      const orderData: CreateOrder = {
        orderNumber: 'TEMP', // Временное значение, триггер в БД заменит его на сгенерированный номер
        userId: user.id,
        orderDate: orderDate.toISOString().slice(0, 19), // Полная дата-время в ISO формате для timestamp
        totalAmount: Number(totalAmount.toFixed(2)), // Округляем до 2 знаков после запятой
        statusOrderId,
        addressId: deliveryMethod === 'courier' && selectedAddressId ? selectedAddressId : undefined,
        deliveryTypesId: deliveryType.id!,
        paymentTypesId: paymentType.id!,
        orderItems: selectedCarts.map(item => ({
          productId: item.product.id,
          quantity: item.cart.quantity,
          unitPrice: item.product.price,
        })),
      };

      console.log('Creating order with data:', orderData);

      // Создаем заказ (orderNumber будет сгенерирован триггером в БД)
      const order = await ordersApi.create(orderData);

      // Проверяем, что заказ был создан и имеет ID
      if (!order.id) {
        throw new Error('Заказ не был создан (отсутствует ID)');
      }

      console.log('Order created successfully:', order);

      // Загружаем полный заказ
      const fullOrder = await ordersApi.getById(order.id);
      
      // Загружаем элементы заказа отдельно, так как они могут не приходить в ответе
      let orderItemsWithProducts: OrderItem[] = [];
      try {
        const allOrderItems = await orderItemsApi.getAll();
        const orderItems = allOrderItems.filter(item => item.orderId === order.id);
        
        // Загружаем информацию о продуктах для каждого элемента заказа
        orderItemsWithProducts = await Promise.all(orderItems.map(async (item) => {
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
        }));
      } catch (error) {
        console.error('Error loading order items:', error);
      }
      
      // Добавляем элементы заказа к заказу
      const fullOrderWithItems = {
        ...fullOrder,
        orderItems: orderItemsWithProducts,
      };

      // Загружаем адрес, если есть
      let orderAddress: Address | null = null;
      if (fullOrderWithItems.addressId) {
        try {
          orderAddress = await addressesApi.getById(fullOrderWithItems.addressId);
        } catch (error) {
          console.error('Error loading address:', error);
        }
      }

      // Отправляем чек на почту через EmailJS (опционально)
      try {
        console.log('📨 Подготовка данных для чека...');

        // Проверяем, есть ли все нужные данные
        if (!fullOrderWithItems || !user || !deliveryType || !paymentType) {
          console.warn('❗ Пропущены обязательные данные для формирования чека. Пропускаем отправку.');
          return;
        }

        const receiptData = {
          order: fullOrderWithItems,
          user: user,
          items: fullOrderWithItems.orderItems || [],
          deliveryType: deliveryType,
          paymentType: paymentType,
          address: orderAddress,
          paymentCommission: calculateTotal().paymentCommission,
        };

        console.log('📦 Сформирован чек для отправки:', receiptData);

        await sendReceiptEmail(receiptData);

        console.log('✅ Чек успешно отправлен пользователю на почту:', user.email);

      } catch (receiptError: any) {
        console.error('❌ Ошибка при отправке чека через EmailJS:', receiptError);
        if (receiptError?.message) {
          console.error('Сообщение ошибки:', receiptError.message);
        }
        // Не прерываем процесс оформления заказа
        console.warn('⚠️ Отправка чека не удалась, но заказ оформлен успешно.');
      }


      // Удаляем товары из корзины после создания заказа
      await Promise.all(selectedCarts.map(async (item) => {
        if (item.cart.id) {
          try {
            await cartsApi.delete(item.cart.id);
          } catch (error: any) {
            // Если корзина не найдена (404), это нормально - возможно уже удалена
            if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
              console.log(`Cart ${item.cart.id} already deleted or not found`);
            } else {
              console.error(`Error deleting cart ${item.cart.id}:`, error);
            }
          }
        }
      }));

      selectedCarts.forEach(item => {
        removeFromCart(String(item.cart.productId));
      });

      await loadCartData();

      // Сохраняем данные для модального окна
      setSuccessOrder(fullOrderWithItems);
      setSuccessDeliveryType(deliveryType);
      setSuccessPaymentType(paymentType);
      setSuccessAddress(orderAddress);
      setSuccessPaymentCommission(calculateTotal().paymentCommission);
      setShowSuccessModal(true);

      // Отправляем событие для обновления истории заказов
      window.dispatchEvent(new Event('orderCreated'));
    } catch (error: any) {
      console.error('Error submitting order:', error);
      
      // Выводим более детальную информацию об ошибке
      let errorMessage = 'Ошибка при оформлении заказа';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.title) {
        errorMessage = error.title;
      } else if (error?.detail) {
        errorMessage = error.detail;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Если это ошибка БД, показываем более понятное сообщение
      if (errorMessage.includes('DbUpdateException') || errorMessage.includes('entity changes')) {
        errorMessage = 'Ошибка при сохранении заказа в базу данных. Проверьте корректность данных.';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartItems = getCartItems();
  const { productsTotal, deliveryCost, paymentCommission, total, selectedCount } = calculateTotal();
  const selectedProductsCount = selectedItems.size;

  // Функция для обрезки характеристик
  const truncateCharacteristics = (characteristics: Array<{ name: string; value: string }>, maxLength: number = 80) => {
    const text = characteristics.map(char => `${char.name}: ${char.value}`).join(', ');
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
          <div>Загрузка...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 md:px-12 py-8">
      {cartItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
                {/* Header with Icons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold">Корзина</h1>
                    <span className="text-muted-foreground text-3xl">
                      {cartItems.length} {cartItems.length === 1 ? 'товар' : cartItems.length < 5 ? 'товара' : 'товаров'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddAllToFavorites}
                      title="Добавить выбранные в избранное"
                    >
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePrint}
                      title="Печать"
                    >
                      <Printer className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowClearDialog(true)}
                      title="Очистить корзину"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Select All */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <label
                    htmlFor="select-all"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Выбрать все
                  </label>
                </div>

                {/* Cart Items */}
                <div className="space-y-4">
                  {cartItems.map(({ cart, product }) => {
                    if (!product) return null;
                    const isSelected = selectedItems.has(String(product.id));
                    const cartQuantity = cart.quantity;
                    const maxQuantity = product.stockQuantity || 0;
                    const characteristics = productCharacteristics[product.id] || [];
                    const rating = productRatings[product.id] || 0;
                    const isFavorite = favorites.some(f => String(f.id) === String(product.id));
                    const totalPrice = product.price * cartQuantity;

                    return (
                      <Card key={cart.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-center">
                            {/* Checkbox - по центру */}
                            <div className="flex-shrink-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectItem(String(product.id), checked === true)}
                              />
                            </div>

                            {/* Image */}
                            <Link to={`/product/${product.id}`} className="flex-shrink-0">
                              <div className="relative w-32 h-32 overflow-hidden rounded-md">
                                <img
                                  src={product.imageUrl || '/placeholder.svg'}
                                  alt={product.nameProduct}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            </Link>

                            {/* Content - Article, Name, Characteristics */}
                            <div className="flex-1 min-w-0">
                              {/* Article */}
                              {product.article && (
                                <p className="text-xs text-muted-foreground mb-1">
                                  Артикул: {product.article}
                                </p>
                              )}

                              {/* Name */}
                              <Link to={`/product/${product.id}`}>
                                <h3 className="font-medium text-base mb-1 hover:text-primary transition-colors line-clamp-1">
                                  {product.nameProduct}
                                </h3>
                              </Link>

                              {/* Characteristics with ellipsis */}
                              {characteristics.length > 0 && (
                                <p className="text-sm text-muted-foreground line-clamp-2" title={characteristics.map(char => `${char.name}: ${char.value}`).join(', ')}>
                                  {truncateCharacteristics(characteristics, 100)}
                                </p>
                              )}
                            </div>

                            {/* Right side - Quantity Controls, Price, Icons */}
                            <div className="flex items-center gap-4 flex-shrink-0">
                              {/* Quantity Controls */}
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUpdateQuantity(product.id, cartQuantity - 1)}
                                  className="h-8 w-8"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-10 text-center font-medium">
                                  {cartQuantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUpdateQuantity(product.id, cartQuantity + 1)}
                                  disabled={cartQuantity >= maxQuantity}
                                  className="h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Price */}
                              <div className="text-right min-w-[100px]">
                                <div className="text-lg font-bold">
                                  {totalPrice.toLocaleString('ru-RU')} ₽
                                </div>
                                {cartQuantity > 1 && (
                                  <div className="text-xs text-muted-foreground">
                                    {product.price.toLocaleString('ru-RU')} ₽ × {cartQuantity}
                                  </div>
                                )}
                              </div>

                              {/* Favorite and Delete Icons */}
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={async () => {
                                    const productForFavorite = {
                                      id: String(product.id),
                                      name: product.nameProduct,
                                      price: product.price,
                                      image: product.imageUrl || '/placeholder.svg',
                                      category: '',
                                      categoryId: String(product.categoryId),
                                      images: [product.imageUrl || '/placeholder.svg'],
                                      rating: rating,
                                      reviewCount: 0,
                                      inStock: maxQuantity > 0,
                                      specs: {},
                                      description: product.description,
                                    };
                                    await toggleFavorite(productForFavorite);
                                  }}
                                  className={cn(
                                    "h-8 w-8",
                                    isFavorite && "text-primary"
                                  )}
                                >
                                  <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveItem(product.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Delivery Method */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Способ получения</h3>
                    <RadioGroup value={deliveryMethod} onValueChange={(value) => setDeliveryMethod(value as 'courier' | 'pickup')}>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="courier" id="courier" />
                        <Label htmlFor="courier" className="cursor-pointer flex-1">
                          Доставка курьером — стоимость +590 руб.
                        </Label>
                      </div>
                      {deliveryMethod === 'courier' && (
                        <div className="ml-6 space-y-4 mt-4">
                          <div>
                            <Label>Адрес доставки</Label>
                            <Select
                              value={selectedAddressId?.toString() || ''}
                              onValueChange={(value) => setSelectedAddressId(Number(value))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите адрес" />
                              </SelectTrigger>
                              <SelectContent>
                                {addresses.map((address) => (
                                  <SelectItem key={address.id} value={address.id!.toString()}>
                                    {address.street}, {address.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Дата доставки</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deliveryDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {deliveryDate ? (
                                    format(deliveryDate, "PPP", { locale: ru })
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={deliveryDate}
                                  onSelect={setDeliveryDate}
                                  disabled={(date) => !isWeekday(date) || date < getMinDate() || date > getMaxDate()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <Label>Время доставки</Label>
                            <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите время" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10:00-17:00">10:00-17:00</SelectItem>
                                <SelectItem value="20:00-24:00">20:00-24:00</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mb-2 mt-4">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="cursor-pointer flex-1">
                          Самовывоз — бесплатно
                        </Label>
                      </div>
                      {deliveryMethod === 'pickup' && (
                        <div className="ml-6 space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-1">
                              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                                <MapPin className="h-8 w-8 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="col-span-1 space-y-2">
                              <div>
                                <p className="font-semibold">Адрес пункта</p>
                                <p className="text-sm text-muted-foreground">
                                  ул. Примерная, д. 1
                                </p>
                              </div>
                              <div>
                                <p className="font-semibold text-green-600">Бесплатно</p>
                                <p className="text-sm text-muted-foreground">
                                  Доставка сегодня
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-semibold">Режим работы:</p>
                                <p className="text-xs text-muted-foreground">
                                  Пн-Пт: 10:00-20:00
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Сб: 10:00-17:00
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Вс: выходной
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label>Дата самовывоза</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !deliveryDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {deliveryDate ? (
                                    format(deliveryDate, "PPP", { locale: ru })
                                  ) : (
                                    <span>Выберите дату</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={deliveryDate}
                                  onSelect={setDeliveryDate}
                                  disabled={(date) => !isWeekday(date) || date < getMinDate() || date > getMaxDate()}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Способ оплаты</h3>
                    <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'card' | 'cash')}>
                      <div className="flex items-start space-x-2 mb-2">
                        <RadioGroupItem value="card" id="card" className="mt-1" />
                        <Label htmlFor="card" className="cursor-pointer flex-1">
                          <div>
                            <div className="font-medium">Картой</div>
                            <div className="text-sm text-muted-foreground">
                              Оплата картой при получении (комиссия 2%)
                            </div>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-start space-x-2">
                        <RadioGroupItem value="cash" id="cash" className="mt-1" />
                        <Label htmlFor="cash" className="cursor-pointer flex-1">
                          <div>
                            <div className="font-medium">Наличные</div>
                            <div className="text-sm text-muted-foreground">
                              Оплата наличными при получении
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Contact Info */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Контактные данные</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="contact-name">Имя</Label>
                        <Input
                          id="contact-name"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Телефон</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="confirm-phone"
                          checked={confirmByPhone}
                          onCheckedChange={(checked) => setConfirmByPhone(checked === true)}
                        />
                        <Label htmlFor="confirm-phone" className="text-sm cursor-pointer">
                          Подтверждение заказа по телефону
                        </Label>
                      </div>
                      <div>
                        <Label htmlFor="additional-info">Дополнительная информация</Label>
                        <Textarea
                          id="additional-info"
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          placeholder="Комментарий к заказу"
                          rows={3}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
          </div>

          {/* Right Column - Sticky Summary */}            <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="p-6 space-y-6">
            {/* Summary */}
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Ваши товары ({selectedCount})</span>
                  <span>{productsTotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span>Способ получения</span>
                  <span className="text-sm">
                    {deliveryMethod === 'courier' ? 'Доставка курьером' : 'Самовывоз'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Стоимость доставки</span>
                  <span>{deliveryCost === 0 ? 'Бесплатно' : `${deliveryCost.toLocaleString('ru-RU')} ₽`}</span>
                </div>
                {paymentCommission > 0 && (
                  <div className="flex justify-between">
                    <span>Комиссия (2%)</span>
                    <span>{paymentCommission.toLocaleString('ru-RU')} ₽</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Итого к оплате:</span>
                  <span>{total.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Agreements */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="newsletter"
                  checked={agreeToNewsletter}
                  onCheckedChange={(checked) => setAgreeToNewsletter(checked === true)}
                />
                <Label htmlFor="newsletter" className="text-sm cursor-pointer">
                  Подтверждаю согласие на получение рекламных и информационных материалов
                </Label>
              </div>

                {/* Submit Button */}
                <Button
                className="w-full"
                onClick={handleSubmitOrder}
                disabled={
                    !agreeToTerms ||
                    selectedItems.size === 0 ||
                    (deliveryMethod === 'courier' && !selectedAddressId) ||
                    !deliveryDate ||
                    (deliveryMethod === 'courier' && !deliveryTime) ||
                    isSubmitting
                }
                >
                {isSubmitting ? 'Оформление...' : 'Оформить заказ'}
                </Button>


              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
                />
                <Label htmlFor="terms" className="text-sm cursor-pointer">
                  Принимаю условия оферты, а также даю согласие на обработку персональных данных на условиях политики конфиденциальности *
                </Label>
              </div>
            </div>
            </CardContent>
          </Card>
        </div>
        </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold mb-2">
                    В корзине пока ничего нет
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Нажмите на иконку корзины для добавления в корзину
                  </p>
                </div>
                <Button onClick={() => navigate('/categories')} variant="outline">
                  Перейти в каталог
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />
      <BackToTopButton />

      {/* Clear Cart Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить корзину?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить все товары из корзины? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart} className="bg-destructive text-destructive-foreground">
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto print:max-w-full print:max-h-full">
          <DialogHeader>
            <DialogTitle>Печать корзины</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 border">Фото</th>
                    <th className="text-left p-2 border">Артикул</th>
                    <th className="text-left p-2 border">Название</th>
                    <th className="text-left p-2 border">Характеристики</th>
                    <th className="text-left p-2 border">Цена</th>
                    <th className="text-left p-2 border">Кол-во</th>
                    <th className="text-left p-2 border">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {getCartItems()
                    .filter(item => selectedItems.has(String(item.cart.productId)))
                    .map(({ cart, product }) => {
                      if (!product) return null;
                      const characteristics = productCharacteristics[product.id] || [];
                      const totalPrice = product.price * cart.quantity;
                      return (
                        <tr key={cart.id} className="border-b">
                          <td className="p-2 border">
                            <img
                              src={product.imageUrl || '/placeholder.svg'}
                              alt={product.nameProduct}
                              className="w-16 h-16 object-cover"
                            />
                          </td>
                          <td className="p-2 border">{product.article}</td>
                          <td className="p-2 border">{product.nameProduct}</td>
                          <td className="p-2 border text-sm">
                            {truncateCharacteristics(characteristics, 60)}
                          </td>
                          <td className="p-2 border">{product.price.toLocaleString('ru-RU')} ₽</td>
                          <td className="p-2 border">{cart.quantity}</td>
                          <td className="p-2 border">{totalPrice.toLocaleString('ru-RU')} ₽</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Способ получения:</span>
                <span>{deliveryMethod === 'courier' ? 'Доставка курьером' : 'Самовывоз'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Способ оплаты:</span>
                <span>{paymentMethod === 'card' ? 'Картой' : 'Наличные'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Итого:</span>
                <span>{total.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Дата: {deliveryDate ? format(deliveryDate, "PPP", { locale: ru }) : 'Не выбрана'}
                {deliveryTime && `, Время: ${deliveryTime}`}
              </div>
              <div className="text-sm text-muted-foreground">
                Дата и время печати: {format(new Date(), "PPP 'в' HH:mm", { locale: ru })}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => setShowPrintDialog(false)}>
                Закрыть
              </Button>
              <Button onClick={handlePrintPage}>
                <Printer className="h-4 w-4 mr-2" />
                Печать
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Success Modal */}
      {successOrder && (
        <OrderSuccessModal
          order={successOrder}
          deliveryType={successDeliveryType}
          paymentType={successPaymentType}
          address={successAddress}
          paymentCommission={successPaymentCommission}
          open={showSuccessModal}
          onOpenChange={setShowSuccessModal}
        />
      )}
    </div>
  );
};

export default Cart;
