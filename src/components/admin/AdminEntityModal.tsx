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
        await currentConfig.api.update(item.id, submitData);
        toast.success('Запись обновлена');
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

