import emailjs from '@emailjs/browser';
import type { Order, OrderItem, User, DeliveryType, PaymentType, Address } from '@/lib/api';

// 🔧 Конфигурация EmailJS
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_SEND_RESET_CODE_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_SEND_RESET_CODE_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// ✅ Интерфейс данных для письма
export interface ReceiptData {
  order: Order;
  user: User;
  items: OrderItem[];
  deliveryType: DeliveryType;
  paymentType: PaymentType;
  address?: Address;
  paymentCommission?: number;
}

/**
 * 📩 Отправка чека на почту
 */
export const sendReceiptEmail = async (data: ReceiptData): Promise<void> => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS не настроен. Пропускаем отправку чека.');
    return;
  }

  try {
    const { order, user, items, deliveryType, paymentType, address, paymentCommission } = data;

    const receiptText = formatReceiptText(data);
    const receiptHtml = formatReceiptHtml(data);

    const templateParams = {
      to_email: user.email,
      to_name: user.firstName || user.nickname || 'Покупатель',
      order_number: order.orderNumber,
      order_date: new Date(order.orderDate).toLocaleString('ru-RU'),
      receipt_text: receiptText,
      receipt_html: receiptHtml,
      total_amount: order.totalAmount.toLocaleString('ru-RU'),
      delivery_method: deliveryType.deliveryTypeName,
      payment_method: paymentType.paymentTypeName,
      address: address
        ? `${address.city}, ${address.street}`
        : 'Самовывоз',
      payment_commission: paymentCommission
        ? `${paymentCommission.toLocaleString('ru-RU')} ₽`
        : '0 ₽',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status === 200 || response.text === 'OK') {
      console.log('✅ Receipt email sent successfully');
    } else {
      throw new Error(`EmailJS returned status ${response.status}`);
    }
  } catch (error: any) {
    console.error('❌ Error sending receipt email:', error);
    if (error?.text) console.error('EmailJS error text:', error.text);
    throw new Error(error?.text || 'Не удалось отправить чек на почту');
  }
};

/**
 * 🧾 Форматирование текста чека (для EmailJS)
 */
const formatReceiptText = (data: ReceiptData): string => {
  const { order, items, deliveryType, paymentType, address, paymentCommission } = data;

  let text = `ЧЕК\n`;
  text += `Номер заказа: ${order.orderNumber}\n`;
  text += `Дата: ${new Date(order.orderDate).toLocaleString('ru-RU')}\n`;
  text += `\nТовары:\n`;
  text += `─────────────────────────────\n`;

  items.forEach((item) => {
    text += `${item.product?.name || 'Товар'}\n`;
    text += `  Количество: ${item.quantity}\n`;
    text += `  Цена за единицу: ${item.unitPrice.toLocaleString('ru-RU')} ₽\n`;
    text += `  Итого: ${(item.unitPrice * item.quantity).toLocaleString('ru-RU')} ₽\n`;
    text += `─────────────────────────────\n`;
  });

  text += `\nСпособ доставки: ${deliveryType.deliveryTypeName}\n`;
  if (address) text += `Адрес: ${address.city}, ${address.street}\n`;
  text += `Способ оплаты: ${paymentType.paymentTypeName}\n`;
  if (paymentCommission && paymentCommission > 0)
    text += `Комиссия (2%): ${paymentCommission.toLocaleString('ru-RU')} ₽\n`;
  text += `\nИТОГО: ${order.totalAmount.toLocaleString('ru-RU')} ₽\n`;
  text += `\nСпасибо за покупку!\n`;

  return text;
};

/**
 * Экранирует HTML-символы для безопасной вставки в HTML
 */
const escapeHtml = (text: string | undefined | null): string => {
  if (!text) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * 💄 Форматирование HTML-письма
 */
const formatReceiptHtml = (data: ReceiptData): string => {
  const { order, items, deliveryType, paymentType, address, paymentCommission } = data;

  // Экранируем все данные перед вставкой в HTML
  const orderNumber = escapeHtml(order.orderNumber);
  const orderDate = escapeHtml(new Date(order.orderDate).toLocaleString('ru-RU'));
  const deliveryName = escapeHtml(deliveryType.deliveryTypeName);
  const paymentName = escapeHtml(paymentType.paymentTypeName);
  const addressText = address ? escapeHtml(`${address.city}, ${address.street}`) : '';
  const totalAmount = order.totalAmount.toLocaleString('ru-RU');
  const commission = paymentCommission ? paymentCommission.toLocaleString('ru-RU') : '0';

  const itemsHtml = items.map((item) => {
    const productName = escapeHtml(item.product?.name || 'Товар');
    const quantity = item.quantity;
    const unitPrice = item.unitPrice.toLocaleString('ru-RU');
    const itemTotal = (item.unitPrice * item.quantity).toLocaleString('ru-RU');
    
    return `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${productName}</td>
      <td style="padding: 8px; text-align: center; border-bottom: 1px solid #eee;">${quantity}</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">${unitPrice} ₽</td>
      <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">${itemTotal} ₽</td>
    </tr>
    `;
  }).join('');

  // Формируем компактный HTML без лишних пробелов и переносов
  return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:Arial,sans-serif;background:#ffffff;color:#111;margin:0;padding:0}.container{max-width:600px;margin:0 auto;padding:25px;border:1px solid #ddd;border-radius:10px}.header{background:#e50914;color:white;padding:15px;text-align:center;border-radius:8px 8px 0 0}.order-info{margin:20px 0;padding:15px;background:#f8f8f8;border-radius:6px}table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#000;color:#fff;padding:10px;text-align:left}td{font-size:14px}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:20px;color:#e50914}.footer{text-align:center;color:#777;font-size:13px;margin-top:30px}</style></head><body><div class="container"><div class="header"><h2>Спасибо за ваш заказ!</h2></div><div class="order-info"><p><strong>Номер заказа:</strong> ${orderNumber}</p><p><strong>Дата:</strong> ${orderDate}</p></div><table><thead><tr><th>Товар</th><th style="text-align:center;">Кол-во</th><th style="text-align:right;">Цена</th><th style="text-align:right;">Сумма</th></tr></thead><tbody>${itemsHtml}</tbody></table><div><p><strong>Доставка:</strong> ${deliveryName}</p>${address ? `<p><strong>Адрес:</strong> ${addressText}</p>` : ''}<p><strong>Оплата:</strong> ${paymentName}</p>${paymentCommission && paymentCommission > 0 ? `<p><strong>Комиссия (2%):</strong> ${commission} ₽</p>` : ''}</div><div class="total">ИТОГО: ${totalAmount} ₽</div><div class="footer"><p>Если у вас есть вопросы, свяжитесь с нашей службой поддержки.</p><p>&copy; ${new Date().getFullYear()} Ваш магазин</p></div></div></body></html>`;
};

/**
 * Отправляет код подтверждения для сброса пароля через EmailJS
 */
export const sendResetCodeEmail = async (email: string, code: string): Promise<void> => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS не настроен. Пропускаем отправку кода.');
    throw new Error('EmailJS не настроен');
  }

  try {
    const templateParams = {
      to_email: email,
      reset_code: code,
      message: `Ваш код подтверждения для сброса пароля: ${code}`,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_SEND_RESET_CODE_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status === 200 || response.text === 'OK') {
      console.log('Reset code email sent successfully');
    } else {
      throw new Error(`EmailJS returned status ${response.status}`);
    }
  } catch (error: any) {
    console.error('Error sending reset code email:', error);
    throw new Error(error?.text || 'Не удалось отправить код на почту');
  }
};
