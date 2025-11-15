import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { adminOrdersApi, productsApi, adminUsersApi, orderItemsApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type PeriodType = '3' | '6' | '12' | 'all';

export const AdminAnalytics = () => {
  const [period, setPeriod] = useState<PeriodType>('12');
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordersData, productsData, usersData, orderItemsData] = await Promise.all([
        adminOrdersApi.getAll(),
        productsApi.getAll(),
        adminUsersApi.getAll(),
        orderItemsApi.getAll(),
      ]);
      
      // Обогащаем заказы элементами заказа
      const ordersWithItems = ordersData.map(order => ({
        ...order,
        orderItems: orderItemsData.filter(item => item.orderId === order.id),
      }));
      
      setOrders(ordersWithItems);
      setProducts(productsData.filter(p => !p.deleted));
      setUsers(usersData.filter(u => !u.deleted));
    } catch (error) {
      console.error('Error loading analytics data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Данные для графика продаж по месяцам
  const salesByMonth = useMemo(() => {
    const now = new Date();
    const monthsCount = period === 'all' ? 12 : parseInt(period);
    const months: { month: string; sales: number; orders: number }[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= date && orderDate < nextMonth;
      });

      const sales = monthOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        sales: Math.round(sales),
        orders: monthOrders.length,
      });
    }

    return months;
  }, [orders, period]);

  // Топ-10 товаров по продажам
  const topProducts = useMemo(() => {
    // Собираем информацию о продажах товаров из заказов
    const productSales: Record<number, { name: string; sales: number; quantity: number }> = {};

    orders.forEach(order => {
      if (order.orderItems) {
        order.orderItems.forEach((item: any) => {
          const productId = item.productId;
          if (!productSales[productId]) {
            const product = products.find(p => p.id === productId);
            productSales[productId] = {
              name: product?.nameProduct || `Товар #${productId}`,
              sales: 0,
              quantity: 0,
            };
          }
          productSales[productId].sales += Number(item.unitPrice || 0) * Number(item.quantity || 0);
          productSales[productId].quantity += Number(item.quantity || 0);
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [orders, products]);

  // Статистика пользователей (регистрации по месяцам)
  const userRegistrations = useMemo(() => {
    const now = new Date();
    const monthsCount = period === 'all' ? 12 : parseInt(period);
    const months: { month: string; registrations: number }[] = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

      const monthUsers = users.filter(user => {
        const regDate = new Date(user.registrationDate);
        return regDate >= date && regDate < nextMonth;
      });

      months.push({
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        registrations: monthUsers.length,
      });
    }

    return months;
  }, [users, period]);

  // Сводная статистика
  const summaryStats = useMemo(() => {
    const now = new Date();
    const monthsCount = period === 'all' ? 12 : parseInt(period);
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);

    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate;
    });

    const totalRevenue = periodOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const averageOrderValue = periodOrders.length > 0 ? totalRevenue / periodOrders.length : 0;
    const totalProductsSold = periodOrders.reduce((sum, order) => {
      if (order.orderItems) {
        return sum + order.orderItems.reduce((itemSum: number, item: any) => itemSum + Number(item.quantity || 0), 0);
      }
      return sum;
    }, 0);

    return {
      totalOrders: periodOrders.length,
      totalRevenue: Math.round(totalRevenue),
      averageOrderValue: Math.round(averageOrderValue),
      totalProductsSold,
      totalUsers: users.length,
      newUsers: users.filter(u => new Date(u.registrationDate) >= startDate).length,
    };
  }, [orders, users, period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Функция для создания изображения текста с кириллицей
  const createTextImage = (text: string, fontSize: number, isBold: boolean = false, maxWidth?: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px Arial`;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fontSize * 1.2;

      // Если указана максимальная ширина, разбиваем текст на строки
      if (maxWidth && textWidth > maxWidth) {
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = ctx.measureText(testLine).width;
          if (testWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) {
          lines.push(currentLine);
        }

        // Создаем canvas для многострочного текста
        const multiLineCanvas = document.createElement('canvas');
        const multiLineCtx = multiLineCanvas.getContext('2d');
        if (!multiLineCtx) {
          resolve('');
          return;
        }

        multiLineCtx.font = `${isBold ? 'bold ' : ''}${fontSize}px Arial`;
        const lineHeight = fontSize * 1.3;
        const totalHeight = lines.length * lineHeight;
        const maxLineWidth = Math.max(...lines.map(line => multiLineCtx.measureText(line).width));
        
        multiLineCanvas.width = maxLineWidth + 20;
        multiLineCanvas.height = totalHeight + 10;

        multiLineCtx.fillStyle = '#ffffff';
        multiLineCtx.fillRect(0, 0, multiLineCanvas.width, multiLineCanvas.height);
        multiLineCtx.fillStyle = '#000000';
        multiLineCtx.font = `${isBold ? 'bold ' : ''}${fontSize}px Arial`;
        multiLineCtx.textBaseline = 'top';

        lines.forEach((line, index) => {
          multiLineCtx.fillText(line, 10, index * lineHeight + 5);
        });

        resolve(multiLineCanvas.toDataURL('image/png'));
        return;
      }

      canvas.width = textWidth + 20;
      canvas.height = textHeight + 10;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px Arial`;
      ctx.textBaseline = 'top';
      ctx.fillText(text, 10, 5);

      resolve(canvas.toDataURL('image/png'));
    });
  };

  // Функция для добавления текста как изображения в PDF
  const addTextAsImage = async (pdf: jsPDF, text: string, x: number, y: number, fontSize: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left', maxWidth?: number): Promise<number> => {
    const imgData = await createTextImage(text, fontSize, isBold, maxWidth);
    if (!imgData) return 0;

    return new Promise((resolve) => {
      const img = new Image();
      img.src = imgData;
      img.onload = () => {
        const mmToPx = 3.779527559; // Коэффициент преобразования мм в пиксели для 96 DPI
        const imgWidthMm = img.width / mmToPx;
        const imgHeightMm = img.height / mmToPx;

        let xPos = x;
        if (align === 'center') {
          xPos = x - imgWidthMm / 2;
        } else if (align === 'right') {
          xPos = x - imgWidthMm;
        }

        pdf.addImage(imgData, 'PNG', xPos, y, imgWidthMm, imgHeightMm);
        resolve(imgHeightMm);
      };
      img.onerror = () => resolve(0);
    });
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Генерация PDF отчета...', { id: 'pdf-export' });
      
      // Создаем PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Заголовок
      const titleHeight = await addTextAsImage(pdf, 'Отчет SORATECH', pdfWidth / 2, yPosition, 24, true, 'center');
      yPosition += titleHeight + 8;

      // Дата и время
      const now = new Date();
      const dateStr = now.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      });
      
      const dateHeight = await addTextAsImage(pdf, `Дата: ${dateStr}`, pdfWidth / 2, yPosition, 12, false, 'center');
      yPosition += dateHeight + 4;
      
      const timeHeight = await addTextAsImage(pdf, `Время: ${timeStr}`, pdfWidth / 2, yPosition, 12, false, 'center');
      yPosition += timeHeight + 6;

      // Период
      const periodText = period === 'all' 
        ? 'Все время' 
        : `Последние ${period} ${period === '3' ? 'месяца' : period === '6' ? 'месяцев' : 'месяцев'}`;
      const periodHeight = await addTextAsImage(pdf, `Период: ${periodText}`, pdfWidth / 2, yPosition, 11, false, 'center');
      yPosition += periodHeight + 12;

      // Функция для добавления графика с описанием
      const addChartToPDF = async (elementId: string, title: string, description: string) => {
        const element = document.getElementById(elementId);
        if (!element) return false;

        // Проверяем, нужна ли новая страница
        if (yPosition > pdfHeight - 80) {
          pdf.addPage();
          yPosition = 20;
        }

        // Заголовок графика
        const titleHeight = await addTextAsImage(pdf, title, 15, yPosition, 14, true, 'left');
        yPosition += titleHeight + 5;

        // Описание графика
        const descriptionHeight = await addTextAsImage(pdf, description, 15, yPosition, 10, false, 'left', (pdfWidth - 30) * 3.779527559);
        yPosition += descriptionHeight + 5;

        // Создаем скриншот графика
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const maxWidth = pdfWidth - 30;
        const maxHeight = pdfHeight - yPosition - 20;
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;

        // Проверяем, помещается ли график на текущей странице
        if (yPosition + finalHeight > pdfHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.addImage(imgData, 'PNG', 15, yPosition, finalWidth, finalHeight);
        yPosition += finalHeight + 10;

        return true;
      };

      // Добавляем сводную статистику
      if (yPosition > pdfHeight - 60) {
        pdf.addPage();
        yPosition = 20;
      }
      
      const statsTitleHeight = await addTextAsImage(pdf, 'Сводная статистика', 15, yPosition, 14, true, 'left');
      yPosition += statsTitleHeight + 8;

      const statsTexts = [
        `Всего заказов: ${summaryStats.totalOrders.toLocaleString('ru-RU')}`,
        `Общий доход: ${formatCurrency(summaryStats.totalRevenue)}`,
        `Средний чек: ${formatCurrency(summaryStats.averageOrderValue)}`,
        `Товаров продано: ${summaryStats.totalProductsSold.toLocaleString('ru-RU')}`,
        `Всего пользователей: ${summaryStats.totalUsers.toLocaleString('ru-RU')}`,
        `Новых пользователей: ${summaryStats.newUsers.toLocaleString('ru-RU')}`,
      ];

      for (const statText of statsTexts) {
        const statHeight = await addTextAsImage(pdf, statText, 15, yPosition, 10, false, 'left');
        yPosition += statHeight + 4;
      }
      yPosition += 8;

      // Добавляем графики по одному
      await addChartToPDF(
        'sales-by-month-chart',
        'Продажи по месяцам',
        'График показывает динамику продаж и количество заказов по месяцам за выбранный период. Синяя линия отображает общий доход в рублях, зеленая линия - количество заказов.'
      );

      await addChartToPDF(
        'top-products-chart',
        'Популярные товары',
        'График отображает топ-10 товаров по объему продаж за выбранный период. Товары отсортированы по общему доходу от продаж.'
      );

      await addChartToPDF(
        'user-registrations-chart',
        'Регистрации пользователей',
        'График показывает количество новых регистраций пользователей по месяцам за выбранный период. Позволяет отслеживать динамику роста пользовательской базы.'
      );

      // Сохраняем PDF
      const fileName = `soratech-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF отчет успешно создан', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Ошибка при создании PDF отчета', { id: 'pdf-export' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div id="analytics-content" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground mt-2">
            Графики и отчеты по работе системы
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodType)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Выберите период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Последние 3 месяца</SelectItem>
              <SelectItem value="6">Последние 6 месяцев</SelectItem>
              <SelectItem value="12">Последние 12 месяцев</SelectItem>
              <SelectItem value="all">Все время</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт в PDF
          </Button>
        </div>
      </div>

      {/* Сводная статистика */}
      <div data-stats-section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Всего заказов</CardTitle>
            <CardDescription>Общее количество заказов за выбранный период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.totalOrders.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Общий доход</CardTitle>
            <CardDescription>Сумма всех заказов за выбранный период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Средний чек</CardTitle>
            <CardDescription>Средняя стоимость одного заказа</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(summaryStats.averageOrderValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Товаров продано</CardTitle>
            <CardDescription>Общее количество проданных единиц товара</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.totalProductsSold.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Всего пользователей</CardTitle>
            <CardDescription>Общее количество зарегистрированных пользователей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summaryStats.totalUsers.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Новых пользователей</CardTitle>
            <CardDescription>Количество регистраций за выбранный период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">+ {summaryStats.newUsers.toLocaleString('ru-RU')}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* График продаж по месяцам */}
        <Card id="sales-by-month-chart">
          <CardHeader>
            <CardTitle>Продажи по месяцам</CardTitle>
            <CardDescription>График продаж и количества заказов</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: any) => {
                    if (typeof value === 'number') {
                      return value.toLocaleString('ru-RU');
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sales"
                  stroke="#8884d8"
                  name="Доход (₽)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#82ca9d"
                  name="Заказы"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Популярные товары */}
        <Card id="top-products-chart">
          <CardHeader>
            <CardTitle>Популярные товары</CardTitle>
            <CardDescription>Топ-10 товаров по продажам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={150}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend />
                <Bar dataKey="sales" fill="#8884d8" name="Доход (₽)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Статистика пользователей */}
        <Card id="user-registrations-chart">
          <CardHeader>
            <CardTitle>Регистрации пользователей</CardTitle>
            <CardDescription>Количество новых регистраций по месяцам</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userRegistrations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="registrations" fill="#82ca9d" name="Регистрации" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Сводная таблица */}
        <Card>
          <CardHeader>
            <CardTitle>Сводная таблица</CardTitle>
            <CardDescription>Общая статистика за выбранный период</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Всего заказов</div>
                  <div className="text-2xl font-bold">{summaryStats.totalOrders.toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Общий доход</div>
                  <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Средний чек</div>
                  <div className="text-2xl font-bold">{formatCurrency(summaryStats.averageOrderValue)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Товаров продано</div>
                  <div className="text-2xl font-bold">{summaryStats.totalProductsSold.toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Всего пользователей</div>
                  <div className="text-2xl font-bold">{summaryStats.totalUsers.toLocaleString('ru-RU')}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Новых пользователей</div>
                  <div className="text-2xl font-bold">+ {summaryStats.newUsers.toLocaleString('ru-RU')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
