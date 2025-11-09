import {
  addressesApi,
  categoriesApi,
  characteristicsApi,
  deliveryTypesApi,
  adminOrdersApi,
  productCharacteristicsApi,
  productsApi,
  reviewsApi,
  rolesApi,
  suppliersApi,
  adminUsersApi,
  Address,
  Category,
  Characteristic,
  DeliveryType,
  Order,
  ProductCharacteristic,
  Product,
  Review,
  Role,
  Supplier,
  User,
} from './api';

export type EntityType =
  | 'addresses'
  | 'categories'
  | 'characteristics'
  | 'orders'
  | 'product-characteristics'
  | 'products'
  | 'reviews'
  | 'roles'
  | 'suppliers'
  | 'users';

interface ColumnConfig {
  field: string;
  label: string;
  render?: (item: any) => React.ReactNode;
}

interface EntityConfig {
  title: string;
  api: {
    getAll: () => Promise<any[]>;
    getById?: (id: number) => Promise<any>;
    create: (data: any) => Promise<any>;
    update: (id: number, data: any) => Promise<any>;
    delete: (id: number) => Promise<void>;
  };
  columns: ColumnConfig[];
  searchFields: string[];
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'textarea' | 'select';
    required?: boolean;
    options?: Array<{ value: any; label: string }>;
    foreignKey?: {
      api: () => Promise<any[]>;
      valueField: string;
      labelField: string;
    };
  }>;
  getItemName: (item: any) => string;
}

export const getEntityConfig = (entity: EntityType): EntityConfig => {
  const configs: Record<EntityType, EntityConfig> = {
    addresses: {
      title: 'Адреса доставки',
      api: addressesApi,
      columns: [
        { field: 'street', label: 'Улица' },
        { field: 'city', label: 'Город' },
        { field: 'postalCode', label: 'Почтовый индекс' },
        { field: 'country', label: 'Страна' },
      ],
      searchFields: ['street', 'city', 'postalCode', 'country'],
      fields: [
        { name: 'userId', label: 'Пользователь', type: 'select', required: true, foreignKey: { api: adminUsersApi.getAll, valueField: 'id', labelField: 'nickname' } },
        { name: 'street', label: 'Улица', type: 'text', required: true },
        { name: 'city', label: 'Город', type: 'text', required: true },
        { name: 'postalCode', label: 'Почтовый индекс', type: 'text', required: true },
        { name: 'country', label: 'Страна', type: 'text', required: true },
      ],
      getItemName: (item) => `${item.street}, ${item.city}`,
    },
    categories: {
      title: 'Категории',
      api: categoriesApi,
      columns: [
        { field: 'nameCategory', label: 'Название' },
        { field: 'description', label: 'Описание' },
      ],
      searchFields: ['nameCategory', 'description'],
      fields: [
        { name: 'nameCategory', label: 'Название категории', type: 'text', required: true },
        { name: 'description', label: 'Описание', type: 'textarea', required: true },
      ],
      getItemName: (item) => item.nameCategory,
    },
    characteristics: {
      title: 'Характеристики',
      api: characteristicsApi,
      columns: [
        { field: 'nameCharacteristic', label: 'Название' },
        { field: 'description', label: 'Описание' },
      ],
      searchFields: ['nameCharacteristic', 'description'],
      fields: [
        { name: 'nameCharacteristic', label: 'Название характеристики', type: 'text', required: true },
        { name: 'description', label: 'Описание', type: 'textarea', required: true },
      ],
      getItemName: (item) => item.nameCharacteristic,
    },
    orders: {
      title: 'Заказы',
      api: adminOrdersApi,
      columns: [
        { field: 'orderNumber', label: 'Номер заказа' },
        { field: 'orderDate', label: 'Дата', render: (item) => item.orderDate ? new Date(item.orderDate).toLocaleDateString('ru-RU') : '-' },
        { field: 'totalAmount', label: 'Сумма', render: (item) => item.totalAmount !== undefined && item.totalAmount !== null ? `${item.totalAmount.toLocaleString('ru-RU')} ₽` : '-' },
      ],
      searchFields: ['orderNumber'],
      fields: [
        { name: 'orderNumber', label: 'Номер заказа', type: 'text', required: true },
        { name: 'userId', label: 'Пользователь', type: 'select', required: true, foreignKey: { api: adminUsersApi.getAll, valueField: 'id', labelField: 'nickname' } },
        { name: 'orderDate', label: 'Дата заказа', type: 'text', required: true },
        { name: 'totalAmount', label: 'Сумма', type: 'number', required: true },
        { name: 'statusOrderId', label: 'Статус', type: 'select', required: true, foreignKey: { api: async () => {
          const { statusOrdersApi } = await import('./api');
          return statusOrdersApi.getAll();
        }, valueField: 'id', labelField: 'statusName' } },
        { name: 'addressId', label: 'Адрес', type: 'select', foreignKey: { api: addressesApi.getAll, valueField: 'id', labelField: 'street' } },
        { name: 'deliveryTypesId', label: 'Тип доставки', type: 'select', required: true, foreignKey: { api: deliveryTypesApi.getAll, valueField: 'id', labelField: 'deliveryTypeName' } },
        { name: 'paymentTypesId', label: 'Тип оплаты', type: 'select', required: true, foreignKey: { api: async () => {
          const { paymentTypesApi } = await import('./api');
          return paymentTypesApi.getAll();
        }, valueField: 'id', labelField: 'paymentTypeName' } },
      ],
      getItemName: (item) => `Заказ #${item.orderNumber}`,
    },
    'product-characteristics': {
      title: 'Характеристики товара',
      api: productCharacteristicsApi,
      columns: [
        { field: 'description', label: 'Описание' },
      ],
      searchFields: ['description'],
      fields: [
        { name: 'productId', label: 'Товар', type: 'select', required: true, foreignKey: { api: productsApi.getAll, valueField: 'id', labelField: 'nameProduct' } },
        { name: 'characteristicId', label: 'Характеристика', type: 'select', required: true, foreignKey: { api: characteristicsApi.getAll, valueField: 'id', labelField: 'nameCharacteristic' } },
        { name: 'description', label: 'Описание', type: 'textarea', required: true },
      ],
      getItemName: (item) => item.description || 'Характеристика товара',
    },
    products: {
      title: 'Товары',
      api: productsApi,
      columns: [
        { field: 'nameProduct', label: 'Название' },
        { field: 'article', label: 'Артикул' },
        { field: 'price', label: 'Цена', render: (item) => 
          item.price !== undefined && item.price !== null 
            ? `${Number(item.price).toLocaleString('ru-RU')} ₽` 
            : '—' },
        { field: 'stockQuantity', label: 'Остаток' },
        { field: 'salesCount', label: 'Количество продаж', render: (item) => item.salesCount !== undefined && item.salesCount !== null ? item.salesCount.toLocaleString('ru-RU') : '0' },
      ],
      searchFields: ['nameProduct', 'article', 'description'],
      fields: [
        { name: 'nameProduct', label: 'Название товара', type: 'text', required: true },
        { name: 'article', label: 'Артикул', type: 'text', required: false },
        { name: 'description', label: 'Описание', type: 'textarea', required: true },
        { name: 'price', label: 'Цена', type: 'number', required: true },
        { name: 'stockQuantity', label: 'Остаток на складе', type: 'number' },
        { name: 'salesCount', label: 'Количество продаж', type: 'number', required: false },
        { name: 'categoryId', label: 'Категория', type: 'select', required: true, foreignKey: { api: categoriesApi.getAll, valueField: 'id', labelField: 'nameCategory' } },
        { name: 'supplierId', label: 'Поставщик', type: 'select', required: true, foreignKey: { api: suppliersApi.getAll, valueField: 'id', labelField: 'nameSupplier' } },
        { name: 'imageUrl', label: 'URL изображения', type: 'text' },
      ],
      getItemName: (item) => item.nameProduct,
    },
    reviews: {
      title: 'Отзывы',
      api: reviewsApi,
      columns: [
        { field: 'rating', label: 'Рейтинг' },
        { field: 'commentText', label: 'Комментарий' },
        { field: 'reviewDate', label: 'Дата', render: (item) => new Date(item.reviewDate).toLocaleDateString('ru-RU') },
      ],
      searchFields: ['commentText'],
      fields: [
        { name: 'productId', label: 'Товар', type: 'select', required: true, foreignKey: { api: productsApi.getAll, valueField: 'id', labelField: 'nameProduct' } },
        { name: 'userId', label: 'Пользователь', type: 'select', required: true, foreignKey: { api: adminUsersApi.getAll, valueField: 'id', labelField: 'nickname' } },
        { name: 'rating', label: 'Рейтинг', type: 'number', required: true },
        { name: 'commentText', label: 'Комментарий', type: 'textarea' },
        { name: 'reviewDate', label: 'Дата отзыва', type: 'text', required: true },
      ],
      getItemName: (item) => `Отзыв #${item.id}`,
    },
    roles: {
      title: 'Роли',
      api: rolesApi,
      columns: [
        { field: 'roleName', label: 'Название роли' },
      ],
      searchFields: ['roleName'],
      fields: [
        { name: 'roleName', label: 'Название роли', type: 'text', required: true },
      ],
      getItemName: (item) => item.roleName,
    },
    suppliers: {
      title: 'Поставщики',
      api: suppliersApi,
      columns: [
        { field: 'nameSupplier', label: 'Название' },
        { field: 'contactEmail', label: 'Email' },
        { field: 'phone', label: 'Телефон' },
      ],
      searchFields: ['nameSupplier', 'contactEmail', 'phone'],
      fields: [
        { name: 'nameSupplier', label: 'Название поставщика', type: 'text', required: true },
        { name: 'contactEmail', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Телефон', type: 'text', required: true },
      ],
      getItemName: (item) => item.nameSupplier,
    },
    users: {
      title: 'Пользователи',
      api: adminUsersApi,
      columns: [
        { field: 'email', label: 'Email' },
        { field: 'firstName', label: 'Имя' },
        { field: 'nickname', label: 'Никнейм' },
        { field: 'phone', label: 'Телефон' },
        { field: 'role', label: 'Роль', render: (item) => typeof item.role === 'string' ? item.role : item.role?.roleName || '-' },
        { field: 'registrationDate', label: 'Дата регистрации', render: (item) => item.registrationDate ? new Date(item.registrationDate).toLocaleDateString('ru-RU') : '-' },
      ],
      searchFields: ['email', 'firstName', 'nickname', 'phone'],
      fields: [
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'passwordHash', label: 'Пароль (хэш)', type: 'text', required: true },
        { name: 'firstName', label: 'Имя', type: 'text', required: true },
        { name: 'nickname', label: 'Никнейм', type: 'text', required: true },
        { name: 'phone', label: 'Телефон', type: 'text', required: true },
        { name: 'roleId', label: 'Роль', type: 'select', required: true, foreignKey: { api: rolesApi.getAll, valueField: 'id', labelField: 'roleName' } },
        { name: 'registrationDate', label: 'Дата регистрации', type: 'text', required: true },
      ],
      getItemName: (item) => item.nickname || item.email,
    },
  };

  return configs[entity];
};

