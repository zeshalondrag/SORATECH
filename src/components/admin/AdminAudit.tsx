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
import { CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auditLogsApi, AuditLog } from '@/lib/api';
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

export const AdminAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [tableNameFilter, setTableNameFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, tableNameFilter, operationFilter, dateFilter]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditLogsApi.getAll();
      setLogs(data);
      setFilteredLogs(data);
    } catch (error: any) {
      toast.error('Ошибка загрузки логов аудита');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (tableNameFilter) {
      filtered = filtered.filter((log) =>
        log.tableName.toLowerCase().includes(tableNameFilter.toLowerCase())
      );
    }

    if (operationFilter) {
      filtered = filtered.filter((log) => log.operation === operationFilter);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Нет данных
                </TableCell>
              </TableRow>
            ) : (
              paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.tableName}</TableCell>
                  <TableCell>{log.operation}</TableCell>
                  <TableCell>{log.recordId || '-'}</TableCell>
                  <TableCell>{log.changedBy || '-'}</TableCell>
                  <TableCell>
                    {log.changedAt
                      ? format(new Date(log.changedAt), 'dd.MM.yyyy HH:mm', { locale: ru })
                      : '-'}
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
    </div>
  );
};

