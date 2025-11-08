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
  email: string;
  firstName: string;
  nickname?: string;
  phone?: string;
  role?: string;
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
  userId: number;
  orderDate: string;
  totalAmount: number;
  status: string;
  orderItems?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  user?: {
    id: string;
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
      }
    } catch {
      // Если не удалось распарсить JSON, используем стандартное сообщение
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

  requestPasswordReset: async (data: ResetPasswordRequest): Promise<void> => {
    // Предполагаем, что API отправляет код на почту
    // Если endpoint отличается, нужно будет обновить
    return apiRequest<void>('/api/Auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  create: async (data: Omit<Order, 'idOrder' | 'orderDate'>): Promise<Order> => {
    return apiRequest<Order>('/api/Orders', {
      method: 'POST',
      body: JSON.stringify(data),
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

  create: async (data: Omit<Review, 'idReview' | 'createdAt'>): Promise<Review> => {
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

// Экспорт утилит для работы с токенами
export { getToken, setToken, removeToken };

