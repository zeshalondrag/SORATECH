import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Download, Upload, ArrowUpDown, Eye } from 'lucide-react';
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

interface AdminTableProps {
  entity: EntityType;
}

export const AdminTable = ({ entity }: AdminTableProps) => {
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
  const itemsPerPage = 10;
  
  const isOrdersEntity = entity === 'orders';

  useEffect(() => {
    loadData();
  }, [entity]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [data, searchQuery, sortField, sortDirection]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await config.api.getAll();
      setData(result);
      setFilteredData(result);
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
    let filtered = [...data];

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

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await config.api.delete(deletingItem.id);
      toast.success('Запись удалена');
      loadData();
      setDeletingItem(null);
    } catch (error: any) {
      toast.error('Ошибка удаления');
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

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground mt-2">
            Управление {config.title.toLowerCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleImportCSV}>
            <Upload className="h-4 w-4 mr-2" />
            Импорт CSV
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт CSV
          </Button>
          {!isOrdersEntity && (
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
          placeholder="Поиск..."
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
                <TableRow key={item.id}>
                  {config.columns.map((col) => (
                    <TableCell key={col.field}>
                      {col.render ? col.render(item) : item[col.field]?.toString() || '-'}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-2">
                      {isOrdersEntity ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingOrder(item)}
                        >
                          <Eye className="h-4 w-4" />
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

      {isOrdersEntity && (
        <AdminOrderDetailsModal
          order={viewingOrder}
          open={!!viewingOrder}
          onOpenChange={(open) => !open && setViewingOrder(null)}
        />
      )}
    </div>
  );
};

