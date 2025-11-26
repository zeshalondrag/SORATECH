import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getEntityConfig, EntityType } from '@/lib/adminConfig';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

interface AdminEntityModalProps {
  entity: EntityType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any | null;
  onSuccess: () => void;
}

export const AdminEntityModal = ({
  entity,
  open,
  onOpenChange,
  item,
  onSuccess,
}: AdminEntityModalProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [foreignKeyData, setForeignKeyData] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingForeignKeys, setIsLoadingForeignKeys] = useState(false);
  
  const config = getEntityConfig(entity);

  const loadForeignKeys = useCallback(async () => {
    setIsLoadingForeignKeys(true);
    const fkData: Record<string, any[]> = {};
    const currentConfig = getEntityConfig(entity);
    
    for (const field of currentConfig.fields) {
      if (field.foreignKey) {
        try {
          const data = await field.foreignKey.api();
          fkData[field.name] = data;
        } catch (error) {
          console.error(`Error loading foreign key data for ${field.name}:`, error);
        }
      }
    }
    
    setForeignKeyData(fkData);
    setIsLoadingForeignKeys(false);
  }, [entity]);

  useEffect(() => {
    if (open) {
      loadForeignKeys();
      const currentConfig = getEntityConfig(entity);
      if (item) {
        // Преобразуем даты в формат для input[type="datetime-local"]
        const itemData = { ...item };
        if (itemData.orderDate) {
          const date = new Date(itemData.orderDate);
          itemData.orderDate = date.toISOString().slice(0, 16);
        }
        if (itemData.reviewDate) {
          const date = new Date(itemData.reviewDate);
          itemData.reviewDate = date.toISOString().slice(0, 10);
        }
        if (itemData.registrationDate) {
          const date = new Date(itemData.registrationDate);
          itemData.registrationDate = date.toISOString().slice(0, 10);
        }
        setFormData(itemData);
      } else {
        const initialData: Record<string, any> = {};
        currentConfig.fields.forEach((field) => {
          if (field.name === 'orderDate') {
            initialData[field.name] = new Date().toISOString().slice(0, 16);
          } else if (field.name === 'reviewDate' || field.name === 'registrationDate') {
            initialData[field.name] = new Date().toISOString().slice(0, 10);
          } else {
            initialData[field.name] = '';
          }
        });
        setFormData(initialData);
      }
    }
  }, [open, item, entity, loadForeignKeys]);


  // Горячие клавиши для модального окна
  useKeyboardShortcuts([
    {
      key: 'Enter',
      ctrl: true,
      description: 'Сохранить изменения',
      action: () => {
        if (open && !isLoading) {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      },
    },
    {
      key: 'Escape',
      description: 'Закрыть модальное окно',
      action: () => {
        if (open) {
          onOpenChange(false);
        }
      },
      preventDefault: true,
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const currentConfig = getEntityConfig(entity);
      // Преобразуем данные перед отправкой
      const submitData: Record<string, any> = {};
      
      // Копируем все поля из конфигурации
      currentConfig.fields.forEach((field) => {
        const value = formData[field.name];
        // Для обязательных полей проверяем наличие значения
        if (field.required && (value === undefined || value === null || value === '')) {
          // Обязательное поле не заполнено - будет ошибка валидации на сервере
          submitData[field.name] = value || '';
        } else {
          // Для необязательных полей отправляем значение или пустую строку
          submitData[field.name] = value !== undefined && value !== null ? value : '';
        }
      });
      
      // Преобразуем даты в нужный формат
      if (submitData.orderDate) {
        submitData.orderDate = new Date(submitData.orderDate).toISOString();
      }
      if (submitData.reviewDate) {
        // ReviewDate должен быть в формате DateOnly (YYYY-MM-DD)
        const date = new Date(submitData.reviewDate);
        submitData.reviewDate = date.toISOString().split('T')[0];
      }
      if (submitData.registrationDate) {
        // RegistrationDate должен быть в формате DateOnly (YYYY-MM-DD)
        const date = new Date(submitData.registrationDate);
        submitData.registrationDate = date.toISOString().split('T')[0];
      }

      if (item) {
        // Специальная обработка для пользователей - изменение роли через отдельный endpoint
        if (entity === 'users' && submitData.roleId !== undefined) {
          const { adminUsersApi } = await import('@/lib/api');
          await adminUsersApi.updateRole(item.id, submitData.roleId);
          toast.success('Роль пользователя обновлена');
        } else {
          // Для обновления формируем объект только с нужными полями
          // Берем поля из формы и добавляем обязательные поля из исходного объекта
          const updateData: Record<string, any> = {
            id: item.id,  // Требование API
          };
          
          // Для некоторых сущностей нужно добавить обязательные поля, которых может не быть в форме
          // но которые нужны для обновления
          if (entity === 'categories') {
            // Категории: nameCategory, description, deleted
            updateData.nameCategory = (submitData.nameCategory !== undefined && submitData.nameCategory !== null && submitData.nameCategory !== '') 
              ? submitData.nameCategory 
              : item.nameCategory;
            updateData.description = (submitData.description !== undefined && submitData.description !== null && submitData.description !== '') 
              ? submitData.description 
              : item.description;
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'characteristics') {
            // Характеристики: nameCharacteristic, description, deleted
            updateData.nameCharacteristic = (submitData.nameCharacteristic !== undefined && submitData.nameCharacteristic !== null && submitData.nameCharacteristic !== '') 
              ? submitData.nameCharacteristic 
              : item.nameCharacteristic;
            updateData.description = (submitData.description !== undefined && submitData.description !== null && submitData.description !== '') 
              ? submitData.description 
              : item.description;
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'products') {
            // Товары: все обязательные поля
            updateData.nameProduct = (submitData.nameProduct !== undefined && submitData.nameProduct !== null && submitData.nameProduct !== '') 
              ? submitData.nameProduct 
              : item.nameProduct;
            updateData.article = (submitData.article !== undefined && submitData.article !== null && submitData.article !== '') 
              ? submitData.article 
              : (item.article || '');
            updateData.description = (submitData.description !== undefined && submitData.description !== null && submitData.description !== '') 
              ? submitData.description 
              : item.description;
            updateData.price = submitData.price !== undefined && submitData.price !== null 
              ? Number(submitData.price) 
              : Number(item.price);
            updateData.stockQuantity = submitData.stockQuantity !== undefined && submitData.stockQuantity !== null 
              ? Number(submitData.stockQuantity) 
              : (item.stockQuantity !== undefined && item.stockQuantity !== null ? Number(item.stockQuantity) : null);
            updateData.salesCount = submitData.salesCount !== undefined && submitData.salesCount !== null 
              ? Number(submitData.salesCount) 
              : (item.salesCount !== undefined && item.salesCount !== null ? Number(item.salesCount) : 0);
            updateData.categoryId = submitData.categoryId !== undefined && submitData.categoryId !== null 
              ? Number(submitData.categoryId) 
              : Number(item.categoryId);
            updateData.supplierId = submitData.supplierId !== undefined && submitData.supplierId !== null 
              ? Number(submitData.supplierId) 
              : Number(item.supplierId);
            updateData.imageUrl = (submitData.imageUrl !== undefined && submitData.imageUrl !== null && submitData.imageUrl !== '') 
              ? submitData.imageUrl 
              : (item.imageUrl || null);
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'suppliers') {
            // Поставщики: nameSupplier, contactEmail, phone, deleted
            updateData.nameSupplier = (submitData.nameSupplier !== undefined && submitData.nameSupplier !== null && submitData.nameSupplier !== '') 
              ? submitData.nameSupplier 
              : item.nameSupplier;
            updateData.contactEmail = (submitData.contactEmail !== undefined && submitData.contactEmail !== null && submitData.contactEmail !== '') 
              ? submitData.contactEmail 
              : item.contactEmail;
            updateData.phone = (submitData.phone !== undefined && submitData.phone !== null && submitData.phone !== '') 
              ? submitData.phone 
              : item.phone;
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'reviews') {
            // Отзывы: productId, userId, rating, commentText, reviewDate, deleted
            updateData.productId = submitData.productId !== undefined && submitData.productId !== null 
              ? Number(submitData.productId) 
              : Number(item.productId);
            updateData.userId = submitData.userId !== undefined && submitData.userId !== null 
              ? Number(submitData.userId) 
              : Number(item.userId);
            updateData.rating = submitData.rating !== undefined && submitData.rating !== null 
              ? Number(submitData.rating) 
              : Number(item.rating);
            updateData.commentText = (submitData.commentText !== undefined && submitData.commentText !== null && submitData.commentText !== '') 
              ? submitData.commentText 
              : (item.commentText || null);
            updateData.reviewDate = (submitData.reviewDate !== undefined && submitData.reviewDate !== null && submitData.reviewDate !== '') 
              ? submitData.reviewDate 
              : item.reviewDate;
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'product-characteristics') {
            // Характеристики товара: productId, characteristicId, description, deleted
            updateData.productId = submitData.productId !== undefined && submitData.productId !== null 
              ? Number(submitData.productId) 
              : Number(item.productId);
            updateData.characteristicId = submitData.characteristicId !== undefined && submitData.characteristicId !== null 
              ? Number(submitData.characteristicId) 
              : Number(item.characteristicId);
            updateData.description = (submitData.description !== undefined && submitData.description !== null && submitData.description !== '') 
              ? submitData.description 
              : item.description;
            updateData.deleted = item.deleted !== undefined ? item.deleted : false;
          } else if (entity === 'orders') {
            // Заказы: только statusOrderId можно изменять
            updateData.orderNumber = item.orderNumber;
            updateData.userId = Number(item.userId);
            updateData.orderDate = item.orderDate;
            updateData.totalAmount = Number(item.totalAmount);
            updateData.statusOrderId = submitData.statusOrderId !== undefined && submitData.statusOrderId !== null 
              ? Number(submitData.statusOrderId) 
              : Number(item.statusOrderId);
            updateData.addressId = item.addressId !== undefined && item.addressId !== null ? Number(item.addressId) : null;
            updateData.deliveryTypesId = Number(item.deliveryTypesId);
            updateData.paymentTypesId = Number(item.paymentTypesId);
          } else {
            // Для остальных сущностей используем исходный объект + изменения из формы
            // Но исключаем навигационные свойства (они обычно объекты)
            Object.keys(item).forEach(key => {
              // Пропускаем навигационные свойства (они обычно объекты или массивы)
              if (typeof item[key] === 'object' && item[key] !== null && !Array.isArray(item[key]) && !(item[key] instanceof Date)) {
                return; // Пропускаем объекты (навигационные свойства)
              }
              // Если поле не в submitData, берем из item
              if (submitData[key] === undefined && key !== 'id') {
                updateData[key] = item[key];
              }
            });
            // Добавляем изменения из формы
            Object.keys(submitData).forEach(key => {
              if (submitData[key] !== undefined && submitData[key] !== null) {
                updateData[key] = submitData[key];
              }
            });
          }
          
          await currentConfig.api.update(item.id, updateData);
          toast.success('Запись обновлена');
        }
      } else {
        await currentConfig.api.create(submitData);
        toast.success('Запись создана');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения');
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'textarea') {
      return (
        <Textarea
          value={formData[field.name] || ''}
          onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          required={field.required}
          rows={4}
        />
      );
    }

    if (field.type === 'select') {
      if (field.foreignKey) {
        const options = foreignKeyData[field.name] || [];
        return (
            <Select
              value={formData[field.name]?.toString() || (field.required ? '' : '__none__')}
              onValueChange={(value) => {
                if (value === '__none__') {
                  setFormData({ ...formData, [field.name]: null });
                } else {
                  setFormData({ ...formData, [field.name]: parseInt(value) || value });
                }
              }}
              required={field.required}
              disabled={isLoadingForeignKeys}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Выберите ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {!field.required && (
                  <SelectItem value="__none__">Не выбрано</SelectItem>
                )}
                {options.map((option) => (
                  <SelectItem
                    key={option[field.foreignKey!.valueField]}
                    value={option[field.foreignKey!.valueField].toString()}
                  >
                    {option[field.foreignKey!.labelField]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        );
      }
    }

    // Определяем тип input для дат
    let inputType = field.type;
    if (field.name === 'orderDate') {
      inputType = 'datetime-local' as any;
    } else if (field.name === 'reviewDate' || field.name === 'registrationDate') {
      inputType = 'date' as any;
    }

    return (
      <Input
        type={inputType}
        value={formData[field.name] || ''}
        onChange={(e) =>
          setFormData({
            ...formData,
            [field.name]: field.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
          })
        }
        required={field.required}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? `Редактировать ${config.title.toLowerCase()}` : `Добавить ${config.title.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {getEntityConfig(entity).fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
            </div>
          ))}

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isLoading || isLoadingForeignKeys}>
              {isLoading ? 'Сохранение...' : item ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

