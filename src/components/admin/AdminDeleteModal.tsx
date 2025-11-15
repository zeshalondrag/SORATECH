import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface AdminDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (deleteType: 'logical' | 'physical') => void;
  itemName: string;
}

export const AdminDeleteModal = ({
  open,
  onOpenChange,
  onConfirm,
  itemName,
}: AdminDeleteModalProps) => {
  const [deleteType, setDeleteType] = React.useState<'logical' | 'physical'>('logical');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить <strong>{itemName}</strong>?
            <br />
            <br />
            <RadioGroup value={deleteType} onValueChange={(value) => setDeleteType(value as 'logical' | 'physical')} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="logical" id="logical" />
                <Label htmlFor="logical" className="font-normal cursor-pointer">
                  Логическое удаление (можно восстановить)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="physical" id="physical" />
                <Label htmlFor="physical" className="font-normal cursor-pointer">
                  Физическое удаление (нельзя восстановить)
                </Label>
              </div>
            </RadioGroup>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deleteType)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

