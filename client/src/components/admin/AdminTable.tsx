import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Download, Upload, ArrowUpDown, Eye, RotateCcw, Archive } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { AdminDeleteModal } from './AdminDeleteModal';
import { AdminEntityModal } from './AdminEntityModal';
import { AdminOrderDetailsModal } from './AdminOrderDetailsModal';
import { getEntityConfig, EntityType } from '@/lib/adminConfig';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { MaskedPhone } from '@/components/ui/MaskedPhone';

interface AdminTableProps {
  entity: EntityType;
  hideImportExport?: boolean;
}

export const AdminTable = ({ entity, hideImportExport = false }: AdminTableProps) => {
  const config = getEntityConfig(entity);
  const [data, setData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [enrichedData, setEnrichedData] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [allEnrichedData, setAllEnrichedData] = useState<any[]>([]);
  const itemsPerPage = 10;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  
  const isOrdersEntity = entity === 'orders';
  const isReviewsEntity = entity === 'reviews';
  const isUsersEntity = entity === 'users';
  
  // Проверяем, поддерживает ли сущность логическое удаление
  const supportsSoftDelete = config.api.hardDelete !== undefined && config.api.restore !== undefined;

  useEffect(() => {
    loadData();
    setShowDeleted(false);
    setCurrentPage(1);
  }, [entity]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [enrichedData, data, searchQuery, sortField, sortDirection, showDeleted]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загружаем активные данные
      // Для users используем параметр includeDeleted=false
      const result = entity === 'users' 
        ? await (config.api as any).getAll(false)
        : await config.api.getAll();
      setData(result);
      
      // Загружаем удаленные записи через прямой запрос к API
      let deletedData: any[] = [];
      if (supportsSoftDelete) {
        try {
          const { getToken } = await import('@/lib/api');
          const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
          const token = getToken();
          
          // Определяем endpoint в зависимости от сущности
          const endpoints: Record<string, string> = {
            'categories': '/api/Categories',
            'characteristics': '/api/Characteristics',
            'products': '/api/Products',
            'suppliers': '/api/Suppliers',
            'reviews': '/api/Reviews',
            'product-characteristics': '/api/ProductCharacteristics',
            'users': '/api/Users',
          };
          
          const endpoint = endpoints[entity];
          if (endpoint) {
            // Делаем прямой запрос к API для получения всех записей
            // Примечание: API может фильтровать удаленные на сервере,
            // поэтому нужно добавить параметр includeDeleted или отдельный endpoint
            // Пробуем загрузить с параметром, если не работает - без параметра
            try {
              const response = await fetch(`${API_BASE_URL}${endpoint}?includeDeleted=true`, {
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json',
                },
              });
              
              if (response.ok) {
                const allItems = await response.json();
                // Фильтруем удаленные на клиенте (если API их вернул)
                deletedData = allItems.filter((item: any) => item.deleted === true);
              }
            } catch {
              // Если запрос с параметром не работает, пробуем без параметра
              // Но API все равно может фильтровать удаленные на сервере
              try {
                const response2 = await fetch(`${API_BASE_URL}${endpoint}`, {
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                  },
                });
                if (response2.ok) {
                  const allItems = await response2.json();
                  deletedData = allItems.filter((item: any) => item.deleted === true);
                }
              } catch (err) {
                console.warn('Could not load deleted items:', err);
              }
            }
          }
        } catch (error) {
          console.warn('Could not load deleted items:', error);
        }
      }
      
      const allItems = [...result, ...deletedData];
      setAllData(allItems);
      
      // Обогащаем данные для колонок с async render
      const enrichData = async (items: any[]) => {
        if (entity === 'orders') {
          // Загружаем всех пользователей один раз для оптимизации
          try {
            const { adminUsersApi } = await import('@/lib/api');
            const allUsers = await adminUsersApi.getAll();
            const usersMap = new Map(allUsers.map(user => [Number(user.id), user]));
            
            return items.map((item) => {
              const userId = item.userId ? Number(item.userId) : null;
              const user = userId ? usersMap.get(userId) : null;
              return { ...item, clientEmail: user?.email || '-' };
            });
          } catch {
            return items.map(item => ({ ...item, clientEmail: '-' }));
          }
        } else if (entity === 'reviews') {
          // Загружаем всех пользователей один раз для оптимизации
          try {
            const { adminUsersApi } = await import('@/lib/api');
            const allUsers = await adminUsersApi.getAll();
            const usersMap = new Map(allUsers.map(user => [Number(user.id), user]));
            
            return items.map((item) => {
              const userId = item.userId ? Number(item.userId) : null;
              const user = userId ? usersMap.get(userId) : null;
              return { ...item, clientNickname: user?.nickname || user?.firstName || '-' };
            });
          } catch {
            return items.map(item => ({ ...item, clientNickname: '-' }));
          }
        } else if (entity === 'product-characteristics') {
          return await Promise.all(items.map(async (item) => {
            try {
              const { productsApi } = await import('@/lib/api');
              const product = await productsApi.getById(item.productId);
              return { ...item, productName: product.nameProduct || '-' };
            } catch {
              return { ...item, productName: '-' };
            }
          }));
        } else if (entity === 'users') {
          // ✅ ДОБАВИТЬ: Обогащаем пользователей названиями ролей
          try {
            const { rolesApi } = await import('@/lib/api');
            const roles = await rolesApi.getAll();
            const rolesMap = new Map(roles.map(role => [role.id, role.roleName]));
            
            return items.map(item => {
              const roleName = rolesMap.get(item.roleId);
              return { ...item, role: roleName || '-' };
            });
          } catch {
            return items.map(item => ({ ...item, role: '-' }));
          }
        } else {
          return items;
        }
      };
      
      const enriched = await enrichData(result);
      const allEnriched = await enrichData(allItems);
      
      setEnrichedData(enriched);
      setAllEnrichedData(allEnriched);
      setFilteredData(enriched);
    } catch (error: any) {
      console.error(`Error loading ${config.title}:`, error);
      toast.error(`Ошибка загрузки ${config.title}`, {
        description: error.message || 'Проверьте подключение к серверу',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    // Выбираем данные в зависимости от режима (активные/удаленные)
    const sourceData = showDeleted 
      ? (allEnrichedData.length > 0 ? allEnrichedData.filter(item => item.deleted === true) : allData.filter(item => item.deleted === true))
      : (enrichedData.length > 0 ? enrichedData.filter(item => !item.deleted) : data.filter(item => !item.deleted));
    
    let filtered = [...sourceData];

    // Search
    if (searchQuery) {
      filtered = filtered.filter((item) => {
        return config.searchFields.some((field) => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }

    // Sort
    if (sortField) {
      filtered.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (entity === 'reviews') {
      // Сортировка по новизне для отзывов по умолчанию (новые первыми)
      filtered.sort((a, b) => {
        const dateA = a.reviewDate ? new Date(a.reviewDate).getTime() : 0;
        const dateB = b.reviewDate ? new Date(b.reviewDate).getTime() : 0;
        // Сначала по дате (убывание), затем по ID (убывание) для стабильности сортировки
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        return (b.id || 0) - (a.id || 0);
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = async (deleteType: 'logical' | 'physical') => {
    if (!deletingItem) return;
    try {
      if (deleteType === 'logical') {
        // Логическое удаление - используем стандартный DELETE endpoint
        await config.api.delete(deletingItem.id);
        toast.success('Запись удалена (логически)');
      } else {
        // Физическое удаление - используем hardDelete endpoint
        if (config.api.hardDelete) {
          await config.api.hardDelete(deletingItem.id);
          toast.success('Запись удалена (физически)');
        } else {
          toast.error('Физическое удаление не поддерживается для этой сущности');
          return;
        }
      }
      loadData();
      setDeletingItem(null);
    } catch (error: any) {
      toast.error('Ошибка удаления');
    }
  };

  const handleRestore = async (item: any) => {
    try {
      if (config.api.restore) {
        await config.api.restore(item.id);
        toast.success('Запись восстановлена');
        // Переключаемся на активные записи после восстановления
        setShowDeleted(false);
        loadData();
      } else {
        toast.error('Восстановление не поддерживается для этой сущности');
      }
    } catch (error: any) {
      toast.error('Ошибка восстановления');
    }
  };

  const handleExportCSV = () => {
    const headers = config.columns.map((col) => col.label).join(',');
    const rows = filteredData.map((item) =>
      config.columns.map((col) => {
        let value = item[col.field];
        if (col.render) {
          // Для полей с render нужно получить исходное значение
          value = item[col.field];
        }
        // Обработка вложенных объектов
        if (typeof value === 'object' && value !== null) {
          value = JSON.stringify(value);
        }
        // Экранирование кавычек и переносов строк
        const stringValue = value !== null && value !== undefined ? String(value) : '';
        const escapedValue = stringValue.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
        return `"${escapedValue}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    // Добавляем BOM для правильной кодировки UTF-8 в Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${config.title}.csv`;
    link.click();
    toast.success('Данные экспортированы');
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        // Убираем BOM если есть
        const csvText = text.replace(/^\uFEFF/, '');
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          toast.error('CSV файл должен содержать заголовки и данные');
          return;
        }
        
        // Функция для правильного парсинга CSV строки с учетом кавычек
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Экранированная кавычка
                current += '"';
                i++; // Пропускаем следующую кавычку
              } else {
                // Начало или конец кавычек
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              // Запятая вне кавычек - разделитель полей
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim()); // Добавляем последнее поле
          return result;
        };
        
        // Парсим заголовки
        const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
        
        // Парсим данные
        const importedData: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]).map(v => {
            // Убираем кавычки и восстанавливаем экранированные кавычки
            let val = v.replace(/^"|"$/g, '').replace(/""/g, '"');
            return val.trim();
          });
          
          const item: any = {};
          config.columns.forEach((col, index) => {
            const csvHeader = headers[index];
            if (csvHeader && values[index] !== undefined && values[index] !== '') {
              const fieldName = col.field;
              // Преобразуем значение в правильный тип
              let value: any = values[index];
              
              // Проверяем тип поля из конфигурации
              const fieldConfig = config.fields.find(f => f.name === fieldName);
              if (fieldConfig) {
                if (fieldConfig.type === 'number') {
                  value = parseFloat(value) || 0;
                }
              }
              
              item[fieldName] = value;
            }
          });
          
          if (Object.keys(item).length > 0) {
            importedData.push(item);
          }
        }
        
        // Создаем записи через API
        let successCount = 0;
        let errorCount = 0;
        
        for (const item of importedData) {
          try {
            await config.api.create(item);
            successCount++;
          } catch (error) {
            errorCount++;
            console.error('Error importing item:', error);
          }
        }
        
        if (successCount > 0) {
          toast.success(`Импортировано ${successCount} записей`);
          loadData();
        }
        if (errorCount > 0) {
          toast.error(`Ошибка при импорте ${errorCount} записей`);
        }
      } catch (error) {
        toast.error('Ошибка чтения CSV файла');
        console.error('Import error:', error);
      }
    };
    input.click();
  };

  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Горячие клавиши
  useKeyboardShortcuts([
    {
      key: 'n',
      ctrl: true,
      description: 'Создать новую запись',
      action: () => {
        if (!isOrdersEntity && !isReviewsEntity && !isUsersEntity && !showDeleted) {
          setIsAddModalOpen(true);
        }
      },
      preventDefault: true,
    },
    {
      key: 'f',
      ctrl: true,
      description: 'Фокус на поле поиска',
      action: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      key: 'e',
      ctrl: true,
      description: 'Редактировать выбранную запись',
      action: () => {
        if (selectedItem && !isOrdersEntity && !isReviewsEntity && !isUsersEntity) {
          setEditingItem(selectedItem);
        } else if (paginatedData.length > 0 && !isOrdersEntity && !isReviewsEntity && !isUsersEntity) {
          setEditingItem(paginatedData[0]);
        }
      },
    },
    {
      key: 'Delete',
      description: 'Удалить выбранную запись',
      action: () => {
        if (selectedItem && !showDeleted) {
          setDeletingItem(selectedItem);
        } else if (paginatedData.length > 0 && !showDeleted) {
          setDeletingItem(paginatedData[0]);
        }
      },
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      description: 'Переключить удаленные записи',
      action: () => {
        if (supportsSoftDelete) {
          setShowDeleted(!showDeleted);
          setCurrentPage(1);
          loadData();
        }
      },
      preventDefault: true,
    },
    {
      key: 'd',
      ctrl: true,
      shift: true,
      description: 'Переключить удаленные записи',
      action: () => {
        if (supportsSoftDelete) {
          setShowDeleted(!showDeleted);
          setCurrentPage(1);
          loadData();
        }
      },
      preventDefault: true,
    },
  ]);

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {showDeleted ? `Удаленные ${config.title.toLowerCase()}` : config.title}
          </h1>
          <p className="text-muted-foreground mt-2">
            {showDeleted ? `Просмотр удаленных записей` : `Управление ${config.title.toLowerCase()}`}
          </p>
        </div>
        <div className="flex gap-2">
          {supportsSoftDelete && (
            <Button 
              variant={showDeleted ? "default" : "outline"} 
              onClick={() => {
                setShowDeleted(!showDeleted);
                setCurrentPage(1);
                loadData(); // Перезагружаем данные при переключении
              }}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showDeleted ? 'Активные записи' : 'Удаленные записи'}
            </Button>
          )}
          {!hideImportExport && (
            <>
              <Button variant="outline" onClick={handleImportCSV}>
                <Upload className="h-4 w-4 mr-2" />
                Импорт CSV
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Экспорт CSV
              </Button>
            </>
          )}
          {!isOrdersEntity && !isReviewsEntity && !isUsersEntity && !showDeleted && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          ref={searchInputRef}
          placeholder="Поиск... (Ctrl+F)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {config.columns.map((col) => (
                <TableHead key={col.field}>
                  <Button
                    variant="ghost"
                    className="h-8 p-0 hover:bg-muted hover:text-foreground"
                    onClick={() => handleSort(col.field)}
                  >
                    {col.label}
                    {sortField === col.field && (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
              ))}
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={config.columns.length + 1} className="text-center text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={item.id}
                  className={selectedItem?.id === item.id ? 'bg-muted/50' : 'cursor-pointer hover:bg-muted/30'}
                  onClick={() => setSelectedItem(item)}
                >
                  {config.columns.map((col) => {
                    // Специальная обработка для телефона пользователей
                    if (entity === 'users' && col.field === 'phone' && item.phone) {
                      return (
                        <TableCell key={col.field}>
                          <MaskedPhone phone={item.phone} showToggle={true} />
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell key={col.field}>
                        {col.render ? col.render(item) : item[col.field]?.toString() || '-'}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <div className="flex gap-2">
                      {isOrdersEntity ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingOrder(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </>
                      ) : item.deleted ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRestore(item)}
                          title="Восстановить"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  onClick={() => setCurrentPage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Modals */}
      <AdminEntityModal
        entity={entity}
        open={isAddModalOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }
        }}
        item={editingItem}
        onSuccess={loadData}
      />

      <AdminDeleteModal
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        onConfirm={handleDelete}
        itemName={deletingItem ? config.getItemName(deletingItem) : ''}
      />

      {isOrdersEntity && viewingOrder && (
        <AdminOrderDetailsModal
          order={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
        />
      )}
    </div>
  );
};

