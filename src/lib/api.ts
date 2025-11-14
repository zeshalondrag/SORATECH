// API Base URL - можно настроить через переменные окружения
// В режиме разработки используем proxy из vite.config.ts (пустая строка)
// В продакшене можно указать полный URL через переменную окружения
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Типы для API
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  phone?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    firstName: string;
    nickname?: string;
    phone?: string;
    role?: string;
  };
}

export interface User {
  id: number;
  roleId: number;
  email: string;
  passwordHash?: string;
  firstName: string;
  nickname: string;
  phone: string;
  registrationDate?: string;
  role?: {
    id: number;
    roleName: string;
  };
}

export interface Address {
  id: number;
  userId: number;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  orderDate: string;
  totalAmount: number;
  statusOrderId: number;
  addressId?: number;
  deliveryTypesId: number;
  paymentTypesId: number;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  product?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
}

export interface CreateOrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrder {
  orderNumber: string;
  userId: number;
  orderDate: string;
  totalAmount: number;
  statusOrderId: number;
  addressId?: number;
  deliveryTypesId: number;
  paymentTypesId: number;
  orderItems: CreateOrderItem[];
}

export interface Review {
  id: number;
  productId: number;
  userId: number;
  rating: number;
  commentText?: string;
  reviewDate: string;
  product?: {
    id: number;
    name: string;
    imageUrl?: string;
  };
  user?: {
    id: number;
    firstName: string;
    nickname?: string;
  };
}

export interface ResetPasswordRequest {
  email: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface SetNewPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

// Утилита для работы с токенами
const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

const setToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Базовая функция для запросов
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      // Клонируем response для чтения, так как response можно прочитать только один раз
      const responseClone = response.clone();
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const error = await response.json();
        // Обработка ошибок валидации ASP.NET (ProblemDetails)
        if (error.errors) {
          // Если есть ошибки валидации, собираем их в одну строку
          const validationErrors = Object.entries(error.errors)
            .map(([key, value]: [string, any]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`;
              }
              return `${key}: ${value}`;
            })
            .join('; ');
          errorMessage = validationErrors || error.title || errorMessage;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.title) {
          errorMessage = error.title;
        } else if (error.detail) {
          errorMessage = error.detail;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
      } else {
        // Если не JSON, пытаемся прочитать как текст
        const text = await responseClone.text();
        if (text && text.trim()) {
          // Извлекаем основное сообщение об ошибке из текста
          const lines = text.split('\n');
          const mainError = lines.find(line => 
            line.includes('не существует') || 
            line.includes('does not exist') ||
            line.includes('Exception') ||
            line.includes('ОШИБКА') ||
            line.includes('ERROR')
          ) || lines[0] || text;
          errorMessage = mainError.trim().substring(0, 200); // Ограничиваем длину
        }
      }
    } catch (parseError) {
      // Если не удалось распарсить, используем стандартное сообщение
      console.error('Error parsing error response:', parseError);
    }
    throw new Error(errorMessage);
  }

  // Если ответ пустой (например, DELETE), возвращаем пустой объект
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return {} as T;
}

// Auth API
export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.token) {
      setToken(response.token);
    }
    return response;
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse>('/api/Auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.token) {
      setToken(response.token);
    }
    return response;
  },

  validate: async (): Promise<User> => {
    return apiRequest<User>('/api/Auth/validate');
  },

  logout: (): void => {
    removeToken();
  },


  verifyCode: async (data: VerifyCodeRequest): Promise<{ valid: boolean }> => {
    // Если API не имеет отдельного endpoint для проверки кода,
    // можно использовать тот же endpoint что и для установки пароля
    // или создать временную проверку
    return apiRequest<{ valid: boolean }>('/api/Auth/verify-code', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  setNewPassword: async (data: SetNewPasswordRequest): Promise<void> => {
    return apiRequest<void>('/api/Auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Users API
export const usersApi = {
  getCurrentUser: async (): Promise<User> => {
    // Используем validate endpoint для получения текущего пользователя
    return apiRequest<User>('/api/Auth/validate');
  },

  updateUser: async (id: number, data: Partial<User>): Promise<User> => {
    return apiRequest<User>(`/api/Auth/updateProfile/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Addresses API
export const addressesApi = {
  getAll: async (): Promise<Address[]> => {
    return apiRequest<Address[]>('/api/Addresses');
  },

  getById: async (id: number): Promise<Address> => {
    return apiRequest<Address>(`/api/Addresses/${id}`);
  },

  create: async (data: Omit<Address, 'id'>): Promise<Address> => {
    return apiRequest<Address>('/api/Addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Address>): Promise<Address> => {
    return apiRequest<Address>(`/api/Addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Addresses/${id}`, {
      method: 'DELETE',
    });
  },
};

// Orders API
export const ordersApi = {
  getAll: async (): Promise<Order[]> => {
    return apiRequest<Order[]>('/api/Orders');
  },

  getById: async (id: number): Promise<Order> => {
    return apiRequest<Order>(`/api/Orders/${id}`);
  },

  create: async (data: CreateOrder): Promise<Order> => {
    console.log('Sending order creation request:', data);
    try {
      const result = await apiRequest<Order>('/api/Orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('Order created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error in ordersApi.create:', error);
      throw error;
    }
  },

};

// Carts API
export const cartsApi = {
  getAll: async (): Promise<Cart[]> => {
    return apiRequest<Cart[]>('/api/Carts');
  },
  getById: async (id: number): Promise<Cart> => {
    return apiRequest<Cart>(`/api/Carts/${id}`);
  },
  create: async (data: Omit<Cart, 'id' | 'addedAt'>): Promise<Cart> => {
    return apiRequest<Cart>('/api/Carts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Cart>): Promise<Cart> => {
    return apiRequest<Cart>(`/api/Carts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Carts/${id}`, {
      method: 'DELETE',
    });
  },
};

// OrderItems API
export const orderItemsApi = {
  getAll: async (): Promise<OrderItem[]> => {
    return apiRequest<OrderItem[]>('/api/OrderItems');
  },
  getById: async (id: number): Promise<OrderItem> => {
    return apiRequest<OrderItem>(`/api/OrderItems/${id}`);
  },
  create: async (data: Omit<OrderItem, 'id'>): Promise<OrderItem> => {
    return apiRequest<OrderItem>('/api/OrderItems', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<OrderItem>): Promise<OrderItem> => {
    return apiRequest<OrderItem>(`/api/OrderItems/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/OrderItems/${id}`, {
      method: 'DELETE',
    });
  },
};

// Reviews API
export const reviewsApi = {
  getAll: async (): Promise<Review[]> => {
    return apiRequest<Review[]>('/api/Reviews');
  },

  getById: async (id: number): Promise<Review> => {
    return apiRequest<Review>(`/api/Reviews/${id}`);
  },

  create: async (data: Omit<Review, 'id' | 'reviewDate'>): Promise<Review> => {
    return apiRequest<Review>('/api/Reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Review>): Promise<Review> => {
    return apiRequest<Review>(`/api/Reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Reviews/${id}`, {
      method: 'DELETE',
    });
  },
};

// Admin Panel Types
export interface AuditLog {
  id: number;
  tableName: string;
  operation: string;
  recordId?: string;
  oldData?: string;
  newData?: string;
  changedBy?: string;
  changedAt?: string;
}

export interface Category {
  id: number;
  nameCategory: string;
  description: string;
}

export interface Characteristic {
  id: number;
  nameCharacteristic: string;
  description: string;
}

export interface DeliveryType {
  id: number;
  deliveryTypeName: string;
  description: string;
}

export interface PaymentType {
  id: number;
  paymentTypeName: string;
  description: string;
}

export interface Product {
  id: number;
  nameProduct: string;
  article: string;
  description: string;
  price: number;
  stockQuantity?: number;
  categoryId: number;
  supplierId: number;
  imageUrl?: string;
  salesCount: number;
}

export interface ProductCharacteristic {
  id: number;
  productId: number;
  characteristicId: number;
  description: string;
}

export interface Role {
  id: number;
  roleName: string;
}

export interface StatusOrder {
  id: number;
  statusName: string;
}

export interface Supplier {
  id: number;
  nameSupplier: string;
  contactEmail: string;
  phone: string;
}

export interface Cart {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  addedAt?: string;
}

export interface Favorite {
  id: number;
  userId: number;
  productId: number;
  addedAt?: string;
}

// Admin API
export const auditLogsApi = {
  getAll: async (): Promise<AuditLog[]> => {
    return apiRequest<AuditLog[]>('/api/AuditLogs');
  },
  getById: async (id: number): Promise<AuditLog> => {
    return apiRequest<AuditLog>(`/api/AuditLogs/${id}`);
  },
};

export const categoriesApi = {
  getAll: async (): Promise<Category[]> => {
    return apiRequest<Category[]>('/api/Categories');
  },
  getById: async (id: number): Promise<Category> => {
    return apiRequest<Category>(`/api/Categories/${id}`);
  },
  create: async (data: Omit<Category, 'id'>): Promise<Category> => {
    return apiRequest<Category>('/api/Categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Category>): Promise<Category> => {
    return apiRequest<Category>(`/api/Categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Categories/${id}`, {
      method: 'DELETE',
    });
  },
};

export const characteristicsApi = {
  getAll: async (): Promise<Characteristic[]> => {
    return apiRequest<Characteristic[]>('/api/Characteristics');
  },
  getById: async (id: number): Promise<Characteristic> => {
    return apiRequest<Characteristic>(`/api/Characteristics/${id}`);
  },
  create: async (data: Omit<Characteristic, 'id'>): Promise<Characteristic> => {
    return apiRequest<Characteristic>('/api/Characteristics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Characteristic>): Promise<Characteristic> => {
    return apiRequest<Characteristic>(`/api/Characteristics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Characteristics/${id}`, {
      method: 'DELETE',
    });
  },
};

export const deliveryTypesApi = {
  getAll: async (): Promise<DeliveryType[]> => {
    return apiRequest<DeliveryType[]>('/api/DeliveryTypes');
  },
  getById: async (id: number): Promise<DeliveryType> => {
    return apiRequest<DeliveryType>(`/api/DeliveryTypes/${id}`);
  },
  create: async (data: Omit<DeliveryType, 'id'>): Promise<DeliveryType> => {
    return apiRequest<DeliveryType>('/api/DeliveryTypes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<DeliveryType>): Promise<DeliveryType> => {
    return apiRequest<DeliveryType>(`/api/DeliveryTypes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/DeliveryTypes/${id}`, {
      method: 'DELETE',
    });
  },
};

export const paymentTypesApi = {
  getAll: async (): Promise<PaymentType[]> => {
    return apiRequest<PaymentType[]>('/api/PaymentTypes');
  },
  getById: async (id: number): Promise<PaymentType> => {
    return apiRequest<PaymentType>(`/api/PaymentTypes/${id}`);
  },
  create: async (data: Omit<PaymentType, 'id'>): Promise<PaymentType> => {
    return apiRequest<PaymentType>('/api/PaymentTypes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<PaymentType>): Promise<PaymentType> => {
    return apiRequest<PaymentType>(`/api/PaymentTypes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/PaymentTypes/${id}`, {
      method: 'DELETE',
    });
  },
};

export const productsApi = {
  getAll: async (): Promise<Product[]> => {
    return apiRequest<Product[]>('/api/Products');
  },
  getById: async (id: number): Promise<Product> => {
    return apiRequest<Product>(`/api/Products/${id}`);
  },
  create: async (data: Omit<Product, 'id'>): Promise<Product> => {
    return apiRequest<Product>('/api/Products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Product>): Promise<Product> => {
    return apiRequest<Product>(`/api/Products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Products/${id}`, {
      method: 'DELETE',
    });
  },
};

export const productCharacteristicsApi = {
  getAll: async (): Promise<ProductCharacteristic[]> => {
    return apiRequest<ProductCharacteristic[]>('/api/ProductCharacteristics');
  },
  getById: async (id: number): Promise<ProductCharacteristic> => {
    return apiRequest<ProductCharacteristic>(`/api/ProductCharacteristics/${id}`);
  },
  create: async (data: Omit<ProductCharacteristic, 'id'>): Promise<ProductCharacteristic> => {
    return apiRequest<ProductCharacteristic>('/api/ProductCharacteristics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<ProductCharacteristic>): Promise<ProductCharacteristic> => {
    return apiRequest<ProductCharacteristic>(`/api/ProductCharacteristics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/ProductCharacteristics/${id}`, {
      method: 'DELETE',
    });
  },
};

export const rolesApi = {
  getAll: async (): Promise<Role[]> => {
    return apiRequest<Role[]>('/api/Roles');
  },
  getById: async (id: number): Promise<Role> => {
    return apiRequest<Role>(`/api/Roles/${id}`);
  },
  create: async (data: Omit<Role, 'id'>): Promise<Role> => {
    return apiRequest<Role>('/api/Roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Role>): Promise<Role> => {
    return apiRequest<Role>(`/api/Roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Roles/${id}`, {
      method: 'DELETE',
    });
  },
};

export const statusOrdersApi = {
  getAll: async (): Promise<StatusOrder[]> => {
    return apiRequest<StatusOrder[]>('/api/StatusOrders');
  },
  getById: async (id: number): Promise<StatusOrder> => {
    return apiRequest<StatusOrder>(`/api/StatusOrders/${id}`);
  },
  create: async (data: Omit<StatusOrder, 'id'>): Promise<StatusOrder> => {
    return apiRequest<StatusOrder>('/api/StatusOrders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<StatusOrder>): Promise<StatusOrder> => {
    return apiRequest<StatusOrder>(`/api/StatusOrders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/StatusOrders/${id}`, {
      method: 'DELETE',
    });
  },
};

export const suppliersApi = {
  getAll: async (): Promise<Supplier[]> => {
    return apiRequest<Supplier[]>('/api/Suppliers');
  },
  getById: async (id: number): Promise<Supplier> => {
    return apiRequest<Supplier>(`/api/Suppliers/${id}`);
  },
  create: async (data: Omit<Supplier, 'id'>): Promise<Supplier> => {
    return apiRequest<Supplier>('/api/Suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
    return apiRequest<Supplier>(`/api/Suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Suppliers/${id}`, {
      method: 'DELETE',
    });
  },
};

export const adminUsersApi = {
  getAll: async (): Promise<User[]> => {
    return apiRequest<User[]>('/api/Users');
  },
  getById: async (id: number): Promise<User> => {
    return apiRequest<User>(`/api/Users/${id}`);
  },
  create: async (data: Omit<User, 'id'>): Promise<User> => {
    return apiRequest<User>('/api/Users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<User>): Promise<User> => {
    return apiRequest<User>(`/api/Users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Users/${id}`, {
      method: 'DELETE',
    });
  },
};

export const adminOrdersApi = {
  getAll: async (): Promise<Order[]> => {
    return apiRequest<Order[]>('/api/Orders');
  },
  getById: async (id: number): Promise<Order> => {
    return apiRequest<Order>(`/api/Orders/${id}`);
  },
  create: async (data: Omit<Order, 'id'>): Promise<Order> => {
    return apiRequest<Order>('/api/Orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Order>): Promise<Order> => {
    return apiRequest<Order>(`/api/Orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Orders/${id}`, {
      method: 'DELETE',
    });
  },
};

// Backup API
export interface BackupResponse {
  message: string;
  sqlFile: string;
  jsonFile: string;
}

export const backupApi = {
  create: async (): Promise<BackupResponse> => {
    return apiRequest<BackupResponse>('/api/Backup/create', {
      method: 'POST',
    });
  },
};

// Favorites API
export const favoritesApi = {
  getAll: async (): Promise<Favorite[]> => {
    return apiRequest<Favorite[]>('/api/Favorites');
  },
  getById: async (id: number): Promise<Favorite> => {
    return apiRequest<Favorite>(`/api/Favorites/${id}`);
  },
  create: async (data: Omit<Favorite, 'id' | 'addedAt'>): Promise<Favorite> => {
    return apiRequest<Favorite>('/api/Favorites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: async (id: number, data: Partial<Favorite>): Promise<Favorite> => {
    return apiRequest<Favorite>(`/api/Favorites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: async (id: number): Promise<void> => {
    return apiRequest<void>(`/api/Favorites/${id}`, {
      method: 'DELETE',
    });
  },
};

// Экспорт утилит для работы с токенами
export { getToken, setToken, removeToken };

