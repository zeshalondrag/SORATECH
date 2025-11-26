// Mock data for the store
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  categoryId: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  inStock: boolean;
  specs: Record<string, string>;
  description: string;
  isNew?: boolean;
  isHit?: boolean;
}

export interface Category {
  id: string;
  name: string;
  count: number;
  image: string;
}

export const categories: Category[] = [
  { id: 'cpu', name: 'Процессоры', count: 156, image: '/placeholder.svg' },
  { id: 'gpu', name: 'Видеокарты', count: 243, image: '/placeholder.svg' },
  { id: 'motherboard', name: 'Материнские платы', count: 198, image: '/placeholder.svg' },
  { id: 'ram', name: 'Оперативная память', count: 312, image: '/placeholder.svg' },
  { id: 'ssd', name: 'SSD накопители', count: 287, image: '/placeholder.svg' },
  { id: 'hdd', name: 'HDD накопители', count: 164, image: '/placeholder.svg' },
  { id: 'cooling', name: 'Охлаждение', count: 221, image: '/placeholder.svg' },
  { id: 'psu', name: 'Блоки питания', count: 178, image: '/placeholder.svg' },
  { id: 'case', name: 'Корпуса', count: 195, image: '/placeholder.svg' },
];

export const products: Product[] = [
  {
    id: '1',
    name: 'Intel Core i9-13900K',
    price: 54990,
    category: 'Процессоры',
    categoryId: 'cpu',
    image: '/placeholder.svg',
    images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
    rating: 4.8,
    reviewCount: 127,
    inStock: true,
    isHit: true,
    specs: {
      'Сокет': 'LGA1700',
      'Ядра/Потоки': '24/32',
      'Базовая частота': '3.0 GHz',
      'Turbo частота': '5.8 GHz',
      'TDP': '125W',
    },
    description: 'Топовый процессор Intel 13-го поколения для максимальной производительности',
  },
  {
    id: '2',
    name: 'AMD Ryzen 9 7950X',
    price: 52990,
    category: 'Процессоры',
    categoryId: 'cpu',
    image: '/placeholder.svg',
    images: ['/placeholder.svg', '/placeholder.svg'],
    rating: 4.9,
    reviewCount: 98,
    inStock: true,
    isHit: true,
    isNew: true,
    specs: {
      'Сокет': 'AM5',
      'Ядра/Потоки': '16/32',
      'Базовая частота': '4.5 GHz',
      'Turbo частота': '5.7 GHz',
      'TDP': '170W',
    },
    description: 'Флагманский процессор AMD на новой архитектуре Zen 4',
  },
  {
    id: '3',
    name: 'NVIDIA GeForce RTX 4090',
    price: 149990,
    category: 'Видеокарты',
    categoryId: 'gpu',
    image: '/placeholder.svg',
    images: ['/placeholder.svg', '/placeholder.svg', '/placeholder.svg', '/placeholder.svg'],
    rating: 5.0,
    reviewCount: 215,
    inStock: true,
    isHit: true,
    specs: {
      'Чип': 'AD102',
      'Память': '24GB GDDR6X',
      'Частота': '2520 MHz',
      'TDP': '450W',
    },
    description: 'Самая мощная игровая видеокарта на данный момент',
  },
  {
    id: '4',
    name: 'ASUS ROG STRIX Z790-E',
    price: 38990,
    category: 'Материнские платы',
    categoryId: 'motherboard',
    image: '/placeholder.svg',
    images: ['/placeholder.svg', '/placeholder.svg'],
    rating: 4.7,
    reviewCount: 84,
    inStock: true,
    isNew: true,
    specs: {
      'Сокет': 'LGA1700',
      'Чипсет': 'Intel Z790',
      'Форм-фактор': 'ATX',
      'Память': 'DDR5',
    },
    description: 'Топовая материнская плата для процессоров Intel 13-го поколения',
  },
  {
    id: '5',
    name: 'Corsair Vengeance DDR5 32GB',
    price: 12990,
    category: 'Оперативная память',
    categoryId: 'ram',
    image: '/placeholder.svg',
    images: ['/placeholder.svg'],
    rating: 4.6,
    reviewCount: 156,
    inStock: true,
    specs: {
      'Объем': '32GB (2x16GB)',
      'Тип': 'DDR5',
      'Частота': '6000 MHz',
      'Тайминги': 'CL36',
    },
    description: 'Высокопроизводительная оперативная память DDR5',
  },
  {
    id: '6',
    name: 'Samsung 990 PRO 2TB',
    price: 18990,
    category: 'SSD накопители',
    categoryId: 'ssd',
    image: '/placeholder.svg',
    images: ['/placeholder.svg', '/placeholder.svg'],
    rating: 4.9,
    reviewCount: 201,
    inStock: true,
    isHit: true,
    specs: {
      'Объем': '2TB',
      'Интерфейс': 'PCIe 4.0 x4',
      'Чтение': '7450 MB/s',
      'Запись': '6900 MB/s',
    },
    description: 'Быстрый NVMe SSD с отличной производительностью',
  },
];

export const heroSlides = [
  {
    id: 1,
    title: 'AMD представила Ryzen 5 7500X3D',
    subtitle: 'Доступный игровой процессор с 3D V-Cache ',
    image: '/placeholder.svg',
    cta: 'Купить сейчас',
    link: '/product/1',
  },
  {
    id: 2,
    title: 'RTX 50 Series',
    subtitle: 'Максимальная производительность в играх',
    image: '/placeholder.svg',
    cta: 'Подробнее',
    link: '/catalog/gpu',
  },
  {
    id: 3,
    title: 'Скидки до 30%',
    subtitle: 'На материнские платы ASUS',
    image: '/placeholder.svg',
    cta: 'К акции',
    link: '/categories',
  },
];
