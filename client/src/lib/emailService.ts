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
  const { order, user, items, deliveryType, paymentType, address, paymentCommission } = data;

  // Экранируем все данные перед вставкой в HTML
  const orderNumber = escapeHtml(order.orderNumber || `#${order.id}`);
  const orderDate = escapeHtml(new Date(order.orderDate).toLocaleString('ru-RU', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }));
  const deliveryName = escapeHtml(deliveryType.deliveryTypeName);
  const paymentName = escapeHtml(paymentType.paymentTypeName);
  const addressText = address ? escapeHtml(`${address.street}, ${address.city}, ${address.postalCode}`) : '';
  const totalAmount = order.totalAmount.toLocaleString('ru-RU');
  const commission = paymentCommission ? paymentCommission.toLocaleString('ru-RU') : '0';
  
  // Данные покупателя
  const customerName = escapeHtml(user.firstName || user.nickname || 'Покупатель');
  const customerEmail = escapeHtml(user.email || '');
  const customerPhone = escapeHtml(user.phone || 'Не указан');
  
  // Проверяем, курьерская ли доставка
  const isCourierDelivery = deliveryName.toLowerCase().includes('курьер') || deliveryName.toLowerCase().includes('доставка');

  const itemsHtml = items.map((item, index) => {
    const product = item.product as any; // Используем any, так как в реальности product может содержать больше полей
    const productName = escapeHtml(product?.name || product?.nameProduct || 'Товар');
    const productArticle = escapeHtml(product?.article || '');
    const productImage = product?.imageUrl || '';
    const quantity = item.quantity;
    const unitPrice = item.unitPrice.toLocaleString('ru-RU');
    const itemTotal = (item.unitPrice * item.quantity).toLocaleString('ru-RU');
    const isEven = index % 2 === 0;
    const rowBg = isEven ? '#ffffff' : '#f9fafb';
    
    return `
    <tr style="background: ${rowBg}; transition: background 0.2s;">
      <td style="padding: 18px; border-bottom: 1px solid #ececec; vertical-align: middle;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${productImage
            ? `<img src="${productImage}" alt="${productName}"
                style="width: 64px; height: 64px; object-fit: cover;
                border-radius: 10px; border: 1px solid #e5e7eb;" />`
            : ''
          }
          <div>
            <div style="font-weight: 600; color: #1f2937; font-size: 15px; margin-bottom: 4px;">
              ${productName}
            </div>
            ${productArticle
              ? `<div style="font-size: 12px; color: #6b7280;">Артикул: ${productArticle}</div>`
              : ''
            }
          </div>
        </div>
      </td>

      <td style="
        padding: 18px;
        text-align: center;
        font-weight: 600;
        border-bottom: 1px solid #ececec;
        color: #374151;
      ">${quantity}</td>

      <td style="
        padding: 18px;
        text-align: right;
        border-bottom: 1px solid #ececec;
        color: #6b7280;
      ">${unitPrice} ₽</td>

      <td style="
        padding: 18px;
        text-align: right;
        font-weight: 700;
        color: #111827;
        border-bottom: 1px solid #ececec;
      ">${itemTotal} ₽</td>
    </tr>
    `;
  }).join('');

  // Формируем компактный HTML без лишних пробелов и переносов
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f7fa;
      color: #111827;
      margin: 0;
      padding: 24px;
    }
    .container {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      margin: auto;
    }
    .header {
      background: #f21c2b;
      color: white;
      padding: 32px;
      text-align: center;
    }
    .header h2 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
    }
    .header .order-number {
      margin-top: 15px;
      font-size: 20px;
      opacity: 0.95;
    }

    .section {
      margin: 26px;
      padding: 22px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
    }
    .section h3 {
      margin: 0 0 14px 0;
      font-size: 17px;
      font-weight: 700;
      color: #111827;
    }
    .section p {
      margin: 6px 0;
      font-size: 14px;
      color: #374151;
    }
    .section strong {
      color: #111827;
    }

    .products-section {
      margin: 26px;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
    }
    .products-section h3 {
      margin: 0;
      padding: 18px;
      background: #f3f4f6;
      border-bottom: 1px solid #e5e7eb;
      font-size: 18px;
      font-weight: 700;
      color: #000;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #000;
    }
    th {
      color: #fff;
      padding: 14px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3),
    th:nth-child(4) { text-align: right; }

    .total-section {
      margin: 26px;
      padding: 22px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
    }
    .total {
      font-size: 30px;
      font-weight: 800;
      color: #000;
      text-align: right;
      margin: 0;
    }

    .footer {
      background: #000;
      text-align: center;
      color: #c2c2c2;
      font-size: 13px;
      padding: 30px 24px 26px;
      border-top: 1px solid #e5e7eb;
      margin-top: 16px;
    }
  </style>
  </head>

  <body>
  <div class="container">

    <div class="header">
      <h2>Ваш заказ успешно оформлен — спасибо, что выбрали нас!</h2>
      <div class="order-number">Заказ №${orderNumber}</div>
    </div>

    <div class="section">
      <h3>Информация о покупателе</h3>
      <p><strong>Имя:</strong> ${customerName}</p>
      <p><strong>Email:</strong> ${customerEmail}</p>
      <p><strong>Телефон:</strong> ${customerPhone}</p>
    </div>

    <div class="section">
      <h3>Детали заказа</h3>
      <p><strong>Дата оформления:</strong> ${orderDate}</p>
      <p><strong>Тип доставки:</strong> ${deliveryName}</p>
      ${isCourierDelivery && address ? `<p><strong>Адрес доставки:</strong> ${addressText}</p>` : ''}
      <p><strong>Тип оплаты:</strong> ${paymentName}</p>
      ${paymentName.toLowerCase().includes('карт') && paymentCommission > 0
        ? `<p><strong>Комиссия (2%):</strong> ${commission} ₽</p>` : ''
      }
    </div>

    <div class="products-section">
      <h3>Товары в заказе</h3>
      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th>Кол-во</th>
            <th>Цена</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="total-section">
      <div class="total">ИТОГО: ${totalAmount} ₽</div>
    </div>

    <div class="footer">
      <p>Если у вас есть вопросы, свяжитесь с нашей поддержкой.</p>
      <p>&copy; ${new Date().getFullYear()} SORATECH</p>
    </div>

  </div>
  </body>
  </html>
  `;
};

/**
 * 💄 Форматирование HTML-письма для сброса пароля
 */
const formatResetCodeHtml = (code: string): string => {
  const escapedCode = escapeHtml(code);
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f7fa;
      color: #111827;
      margin: 0;
      padding: 24px;
    }
    .container {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.08);
      overflow: hidden;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, #f21c2b 0%, #dc2626 100%);
      color: white;
      padding: 40px 32px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 12px 0 0 0;
      font-size: 16px;
      opacity: 0.95;
    }

    .content {
      padding: 40px 32px;
    }

    .code-section {
      background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
      border: 2px solid #fecaca;
      border-radius: 16px;
      padding: 32px;
      text-align: center;
      margin: 32px 0;
    }

    .code-label {
      font-size: 14px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }

    .code {
      font-size: 48px;
      font-weight: 800;
      color: #dc2626;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .info-section {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 24px;
      margin: 32px 0;
    }

    .info-section h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .info-section p {
      margin: 8px 0;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
    }

    .info-section ul {
      margin: 12px 0;
      padding-left: 24px;
      color: #374151;
      font-size: 14px;
      line-height: 1.8;
    }

    .info-section li {
      margin: 8px 0;
    }

    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
    }

    .warning p {
      margin: 0;
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
    }

    .footer {
      background: #000;
      text-align: center;
      color: #c2c2c2;
      font-size: 13px;
      padding: 30px 24px;
      margin-top: 32px;
    }

    .footer p {
      margin: 4px 0;
    }
  </style>
  </head>

  <body>
  <div class="container">

    <div class="header">
      <h1>Сброс пароля</h1>
      <p>Запрос на восстановление доступа к аккаунту</p>
    </div>

    <div class="content">
      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 24px 0;">
        Вы запросили сброс пароля для вашего аккаунта. Используйте код подтверждения ниже для завершения процесса восстановления доступа.
      </p>

      <div class="code-section">
        <div class="code-label">Код подтверждения</div>
        <div class="code">${escapedCode}</div>
      </div>

      <div class="info-section">
        <h3>Инструкции</h3>
        <ul>
          <li>Введите этот код в поле подтверждения на странице сброса пароля</li>
          <li>Код действителен в течение 10 минут</li>
          <li>Если вы не запрашивали сброс пароля, проигнорируйте это письмо</li>
        </ul>
      </div>

      <div class="warning">
        <p>
          <strong>Важно:</strong> Никому не сообщайте этот код. Сотрудники SORATECH никогда не будут запрашивать ваш код подтверждения.
        </p>
      </div>

      <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin: 24px 0 0 0;">
        Если у вас возникли проблемы или вопросы, свяжитесь с нашей службой поддержки.
      </p>
    </div>

    <div class="footer">
      <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
      <p>&copy; ${new Date().getFullYear()} SORATECH. Все права защищены.</p>
    </div>

  </div>
  </body>
  </html>
  `;
};

/**
 * Отправляет код подтверждения для сброса пароля через EmailJS
 */
export const sendResetCodeEmail = async (email: string, code: string): Promise<void> => {
  if (!EMAILJS_SERVICE_ID || !EMAILJS_SEND_RESET_CODE_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.warn('⚠️ EmailJS не настроен. Пропускаем отправку кода.');
    throw new Error('EmailJS не настроен');
  }

  try {
    const resetCodeHtml = formatResetCodeHtml(code);
    const resetCodeText = `Ваш код подтверждения для сброса пароля: ${code}\n\nКод действителен в течение 10 минут.\n\nЕсли вы не запрашивали сброс пароля, проигнорируйте это письмо.`;

    const templateParams = {
      to_email: email,
      reset_code: code,
      message: resetCodeText,
      reset_code_html: resetCodeHtml,
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_SEND_RESET_CODE_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    if (response.status === 200 || response.text === 'OK') {
      console.log('✅ Reset code email sent successfully');
    } else {
      throw new Error(`EmailJS returned status ${response.status}`);
    }
  } catch (error: any) {
    console.error('❌ Error sending reset code email:', error);
    if (error?.text) console.error('EmailJS error text:', error.text);
    throw new Error(error?.text || 'Не удалось отправить код на почту');
  }
};
