// Курс валют (можно заменить на API в будущем)
const EXCHANGE_RATE = {
  RUB_TO_USD: 0.011, // 1 RUB = 0.011 USD (примерный курс)
  USD_TO_RUB: 90, // 1 USD = 90 RUB (примерный курс)
};

export type Currency = 'RUB' | 'USD';

/**
 * Конвертирует цену из рублей в указанную валюту
 */
export const convertPrice = (priceInRub: number, targetCurrency: Currency): number => {
  if (targetCurrency === 'RUB') {
    return priceInRub;
  }
  // Конвертируем в USD
  return priceInRub * EXCHANGE_RATE.RUB_TO_USD;
};

/**
 * Форматирует цену с учетом валюты
 */
export const formatPrice = (priceInRub: number, currency: Currency = 'RUB'): string => {
  const convertedPrice = convertPrice(priceInRub, currency);
  const formatted = convertedPrice.toLocaleString('ru-RU', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  });
  
  return currency === 'USD' ? `$${formatted}` : `${formatted} ₽`;
};

/**
 * Получает символ валюты
 */
export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'USD' ? '$' : '₽';
};

