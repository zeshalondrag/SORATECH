import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface AdminAuditDetailsModalProps {
  log: {
    id: number;
    oldData?: any;
    newData?: any;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdminAuditDetailsModal = ({
  log,
  open,
  onOpenChange,
}: AdminAuditDetailsModalProps) => {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Подробности изменения</DialogTitle>
          <DialogDescription>
            Просмотр старых и новых данных записи
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Старые данные */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Старые данные</Badge>
            </div>
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              {log.oldData ? (
                <pre className="text-sm whitespace-pre-wrap break-words">
                  {JSON.stringify(log.oldData, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </ScrollArea>
          </div>

          {/* Новые данные */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">Новые данные</Badge>
            </div>
            <ScrollArea className="h-96 w-full border rounded-md p-4">
              {log.newData ? (
                <pre className="text-sm whitespace-pre-wrap break-words">
                  {JSON.stringify(log.newData, null, 2)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-sm">Нет данных</p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

