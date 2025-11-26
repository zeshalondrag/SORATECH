/**
 * Маскирует номер телефона, оставляя видимыми только последние 2-4 цифры
 * @param phone - Номер телефона в любом формате
 * @returns Замаскированный номер телефона
 * 
 * Примеры:
 * +7 (123) 456-78-90 -> +7 (***) ***-**90
 * +71234567890 -> +7 *** *** **90
 * 81234567890 -> +7 *** *** **90
 */
export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return 'Не указан';
  
  // Удаляем все пробелы, скобки, дефисы и плюсы для обработки
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  
  // Если номер начинается с 8, заменяем на +7
  let normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
  
  // Если номер не начинается с 7, добавляем 7
  if (!normalized.startsWith('7')) {
    normalized = '7' + normalized;
  }
  
  // Проверяем, что номер имеет правильную длину (11 цифр: 7 + 10)
  if (normalized.length < 11) {
    return phone; // Возвращаем исходный, если формат не распознан
  }
  
  // Извлекаем последние 2 цифры
  const lastTwo = normalized.slice(-2);
  const lastFour = normalized.slice(-4);
  
  // Форматируем в красивый вид: +7 (***) ***-**XX
  // Или если номер длиннее: +7 (***) ***-XXXX
  if (normalized.length === 11) {
    return `+7 (***) ***-**${lastTwo}`;
  } else {
    return `+7 (***) ***-${lastFour.slice(0, 2)}${lastFour.slice(2)}`;
  }
};

/**
 * Проверяет, является ли строка валидным номером телефона
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
  return /^7\d{10}$/.test(normalized);
};

