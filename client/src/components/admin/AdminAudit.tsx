import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Filter, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auditLogsApi, AuditLog, adminUsersApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { AdminAuditDetailsModal } from './AdminAuditDetailsModal';

export const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [enrichedLogs, setEnrichedLogs] = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingLog, setViewingLog] = useState<any | null>(null);
  const itemsPerPage = 10;

  // Filters
  const [tableNameFilter, setTableNameFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [nicknameFilter, setNicknameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [enrichedLogs, tableNameFilter, operationFilter, nicknameFilter, dateFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const [logsData, usersData] = await Promise.all([
        auditLogsApi.getAll(),
        adminUsersApi.getAll(),
      ]);
      
      setLogs(logsData);
      
      // Обогащаем логи никнеймами пользователей
      const enriched = logsData.map(log => {
        const user = usersData.find(u => Number(u.id) === Number(log.userId));
        // Парсим JSONB данные, если они приходят как строки
        let oldData = log.oldData;
        let newData = log.newData;
        
        try {
          if (typeof log.oldData === 'string') {
            oldData = JSON.parse(log.oldData);
          }
        } catch (e) {
          // Если не удалось распарсить, оставляем как есть
        }
        
        try {
          if (typeof log.newData === 'string') {
            newData = JSON.parse(log.newData);
          }
        } catch (e) {
          // Если не удалось распарсить, оставляем как есть
        }
        
        return {
          ...log,
          userNickname: user?.nickname || user?.firstName || '-',
          oldData: oldData || null,
          newData: newData || null,
        };
      });
      
      setEnrichedLogs(enriched);
      setFilteredLogs(enriched);
    } catch (error: any) {
      toast.error('Ошибка загрузки логов аудита');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...enrichedLogs];

    if (tableNameFilter) {
      filtered = filtered.filter((log) =>
        log.tableName.toLowerCase().includes(tableNameFilter.toLowerCase())
      );
    }

    if (operationFilter) {
      filtered = filtered.filter((log) => log.operation === operationFilter);
    }

    if (nicknameFilter) {
      filtered = filtered.filter((log) =>
        (log.userNickname || '').toLowerCase().includes(nicknameFilter.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter((log) => {
        if (!log.changedAt) return false;
        const logDate = new Date(log.changedAt);
        return (
          logDate.getDate() === dateFilter.getDate() &&
          logDate.getMonth() === dateFilter.getMonth() &&
          logDate.getFullYear() === dateFilter.getFullYear()
        );
      });
    }

    // Сортировка по новизне (новые записи первыми)
    filtered.sort((a, b) => {
      const dateA = a.changedAt ? new Date(a.changedAt).getTime() : 0;
      const dateB = b.changedAt ? new Date(b.changedAt).getTime() : 0;
      // Сначала по дате (убывание), затем по ID (убывание) для стабильности сортировки
      if (dateB !== dateA) {
        return dateB - dateA;
      }
      return (b.id || 0) - (a.id || 0);
    });

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const uniqueTableNames = Array.from(new Set(logs.map((log) => log.tableName)));
  const uniqueOperations = Array.from(new Set(logs.map((log) => log.operation)));

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Аудит</h1>
        <p className="text-muted-foreground mt-2">
          Логи всех операций в системе
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <span className="font-semibold">Фильтры</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Название таблицы</Label>
            <Input
              placeholder="Поиск по таблице..."
              value={tableNameFilter}
              onChange={(e) => setTableNameFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Операция</Label>
            <Select value={operationFilter || 'all'} onValueChange={(value) => setOperationFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Все операции" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все операции</SelectItem>
                {uniqueOperations.map((op) => (
                  <SelectItem key={op} value={op}>
                    {op}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Никнейм пользователя</Label>
            <Input
              placeholder="Поиск по никнейму..."
              value={nicknameFilter}
              onChange={(e) => setNicknameFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Дата</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateFilter && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? (
                    format(dateFilter, 'PPP', { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Таблица</TableHead>
              <TableHead>Операция</TableHead>
              <TableHead>ID записи</TableHead>
              <TableHead>Изменено</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.tableName}</TableCell>
                  <TableCell>{log.operation}</TableCell>
                  <TableCell>{log.recordId || '-'}</TableCell>
                  <TableCell>{log.userNickname || '-'}</TableCell>
                  <TableCell>
                    {log.changedAt
                      ? format(new Date(log.changedAt), 'dd.MM.yyyy HH:mm', { locale: ru })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingLog(log)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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

      {/* Модальное окно с подробностями */}
      {viewingLog && (
        <AdminAuditDetailsModal
          log={viewingLog}
          open={!!viewingLog}
          onOpenChange={(open) => !open && setViewingLog(null)}
        />
      )}
    </div>
  );
};

