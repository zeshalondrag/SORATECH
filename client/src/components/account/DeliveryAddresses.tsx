import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { addressesApi, Address } from '@/lib/api';
import { AddressModal } from '@/components/account/AddressModal';
import { useStore } from '@/stores/useStore';
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

export const DeliveryAddresses = () => {
  const { user } = useStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const data = await addressesApi.getAll();
      setAddresses(data);
    } catch (error: any) {
      toast.error('Ошибка загрузки адресов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAddress) return;

    try {
      await addressesApi.delete(deletingAddress.id);
      toast.success('Адрес удален');
      loadAddresses();
      setDeletingAddress(null);
    } catch (error: any) {
      toast.error('Ошибка удаления адреса');
    }
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Адрес доставки</h2>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <MapPin className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg font-semibold">Адресов пока нет</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Сохраните один адрес для быстрого выбора при оформлении заказа
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить адрес
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-semibold">{address.street}</span>
                  <span className="text-muted-foreground">,</span>
                  <span>{address.city}</span>
                  <span className="text-muted-foreground">,</span>
                  <span>{address.postalCode}</span>
                  <span className="text-muted-foreground">,</span>
                  <span>{address.country}</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setEditingAddress(address)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingAddress(address)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddressModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={loadAddresses}
      />

      {editingAddress && (
        <AddressModal
          open={!!editingAddress}
          onOpenChange={(open) => !open && setEditingAddress(null)}
          address={editingAddress}
          onSuccess={() => {
            loadAddresses();
            setEditingAddress(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingAddress} onOpenChange={(open) => !open && setDeletingAddress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить адрес?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот адрес? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

