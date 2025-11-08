import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { reviewsApi, Review } from '@/lib/api';
import { ReviewModal } from '@/components/account/ReviewModal';
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
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export const CommunityActivity = () => {
  const { user } = useStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);

  useEffect(() => {
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      // Загружаем все отзывы и фильтруем по текущему пользователю
      const allReviews = await reviewsApi.getAll();
      // Фильтруем отзывы текущего пользователя
      const userReviews = user ? allReviews.filter((review) => review.userId === user.id) : [];
      setReviews(userReviews);
    } catch (error: any) {
      toast.error('Ошибка загрузки отзывов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReview) return;

    try {
      await reviewsApi.delete(deletingReview.id);
      toast.success('Отзыв удален');
      loadReviews();
      setDeletingReview(null);
    } catch (error: any) {
      toast.error('Ошибка удаления отзыва');
    }
  };

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Активность в сообществе</h2>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <MessageSquare className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg font-semibold">Отзывов пока нет</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {review.product?.name || 'Товар'}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(review.createdAt), 'dd MMMM yyyy', { locale: ru })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      {review.user?.nickname || review.user?.firstName || 'Пользователь'}
                    </p>
                    <p>{review.comment}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingReview(review)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingReview(review)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingReview && (
        <ReviewModal
          open={!!editingReview}
          onOpenChange={(open) => !open && setEditingReview(null)}
          review={editingReview}
          onSuccess={() => {
            loadReviews();
            setEditingReview(null);
          }}
        />
      )}

      <AlertDialog open={!!deletingReview} onOpenChange={(open) => !open && setDeletingReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить отзыв?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.
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

