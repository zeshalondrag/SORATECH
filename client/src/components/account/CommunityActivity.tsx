import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Pencil, Trash2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { reviewsApi, adminUsersApi, Review, User } from '@/lib/api';
import { ReviewModal } from '@/components/products/ReviewModal';
import { useStore } from '@/stores/useStore';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
  const [usersMap, setUsersMap] = useState<Map<number, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  useEffect(() => {
    loadReviews();
  }, [user]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      // Загружаем все отзывы и фильтруем по текущему пользователю
      const allReviews = await reviewsApi.getAll();
      // Фильтруем отзывы текущего пользователя (приводим к числу для сравнения)
      let userReviews = user ? allReviews.filter((review) => Number(review.userId) === Number(user.id)) : [];
      
      // Сортируем отзывы по дате (новые сначала) - делаем это сразу после фильтрации
      userReviews.sort((a, b) => {
        // Парсим дату, учитывая что она может быть в формате строки или DateOnly
        let dateA = 0;
        let dateB = 0;
        
        if (a.reviewDate) {
          const parsedA = new Date(a.reviewDate);
          dateA = isNaN(parsedA.getTime()) ? 0 : parsedA.getTime();
        }
        
        if (b.reviewDate) {
          const parsedB = new Date(b.reviewDate);
          dateB = isNaN(parsedB.getTime()) ? 0 : parsedB.getTime();
        }
        
        // Сначала новые (большая дата = новее)
        // Если даты одинаковые, сортируем по ID (больший ID = новее)
        if (dateB === dateA) {
          return b.id - a.id;
        }
        return dateB - dateA;
      });
      
      // Отладочное логирование (можно удалить после проверки)
      if (userReviews.length > 0) {
        console.log('Отсортированные отзывы (до обогащения):', userReviews.map(r => ({
          id: r.id,
          reviewDate: r.reviewDate,
          parsedDate: new Date(r.reviewDate || '').toISOString(),
          timestamp: new Date(r.reviewDate || '').getTime()
        })));
      }
      
      // Загружаем пользователей и товары для отзывов
      try {
        const allUsers = await adminUsersApi.getAll();
        const usersMapData = new Map<number, User>();
        allUsers.forEach(u => usersMapData.set(u.id, u));
        setUsersMap(usersMapData);
        
        // Загружаем товары для отзывов
        const { productsApi } = await import('@/lib/api');
        const allProducts = await productsApi.getAll();
        const productsMap = new Map(allProducts.map(p => [p.id, p]));
        
        // Связываем пользователей и товары с отзывами
        let reviewsWithData = userReviews.map(review => ({
          ...review,
          user: review.user || usersMapData.get(review.userId),
          product: review.product || {
            id: review.productId,
            name: productsMap.get(review.productId)?.nameProduct || 'Товар',
            imageUrl: productsMap.get(review.productId)?.imageUrl
          }
        }));
        
        // Повторно сортируем после обогащения данных (на случай если порядок изменился)
        reviewsWithData.sort((a, b) => {
          let dateA = 0;
          let dateB = 0;
          
          if (a.reviewDate) {
            const parsedA = new Date(a.reviewDate);
            dateA = isNaN(parsedA.getTime()) ? 0 : parsedA.getTime();
          }
          
          if (b.reviewDate) {
            const parsedB = new Date(b.reviewDate);
            dateB = isNaN(parsedB.getTime()) ? 0 : parsedB.getTime();
          }
          
          // Сначала новые (большая дата = новее)
          // Если даты одинаковые, сортируем по ID (больший ID = новее)
          if (dateB === dateA) {
            return b.id - a.id;
          }
          return dateB - dateA;
        });
        
        // Отладочное логирование после финальной сортировки
        if (reviewsWithData.length > 0) {
          console.log('Отсортированные отзывы (после обогащения):', reviewsWithData.map(r => ({
            id: r.id,
            reviewDate: r.reviewDate,
            parsedDate: new Date(r.reviewDate || '').toISOString(),
            timestamp: new Date(r.reviewDate || '').getTime()
          })));
        }
        
        setReviews(reviewsWithData);
      } catch (error) {
        console.warn('Could not load users/products for reviews:', error);
        // Устанавливаем отзывы с сортировкой, даже если не удалось загрузить пользователей/товары
        // userReviews уже отсортированы выше
        setReviews(userReviews);
      }
    } catch (error: any) {
      toast.error('Ошибка загрузки отзывов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!editingReview || !user) {
      return;
    }

    try {
      await reviewsApi.update(editingReview.id, {
        rating,
        commentText: comment
      });
      toast.success('Отзыв успешно обновлен');
      setEditingReview(null);
      loadReviews();
    } catch (error: any) {
      toast.error('Ошибка при обновлении отзыва');
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReview) return;

    try {
      await reviewsApi.delete(deletingReview.id);
      toast.success('Отзыв успешно удален');
      setDeletingReview(null);
      await loadReviews();
      // Если текущая страница стала пустой, переходим на предыдущую
      const newTotalPages = Math.ceil((reviews.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (error: any) {
      toast.error('Ошибка при удалении отзыва');
    }
  };

  // Вычисляем пагинацию
  const paginatedReviews = reviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(reviews.length / itemsPerPage);

  // Сбрасываем страницу при изменении количества отзывов
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

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
        <>
          <div className="space-y-4">
            {paginatedReviews.map((review) => {
            const reviewUser = review.user || usersMap.get(review.userId);
            const userName = reviewUser?.nickname || reviewUser?.firstName || 'Пользователь';
            const userInitials = userName.charAt(0).toUpperCase();
            const productName = review.product?.name || 'Товар';
            
            return (
              <div key={review.id} className="border rounded-lg p-6 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  {/* Аватарка */}
                  <Avatar className="h-12 w-12 border-2">
                    <AvatarImage src={(reviewUser as any)?.avatarUrl} alt={userName} />
                    <AvatarFallback className="font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Основной контент */}
                  <div className="flex-1 min-w-0">
                    {/* Заголовок с никнеймом, датой и действиями */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate">
                            {userName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{format(new Date(review.reviewDate || new Date()), 'dd MMMM yyyy', { locale: ru })}</span>
                        </div>
                      </div>
                      
                      {/* Иконки редактирования и удаления */}
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingReview(review)}
                          title="Редактировать отзыв"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeletingReview(review)}
                          title="Удалить отзыв"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Рейтинг */}
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(Number(review.rating))
                              ? 'fill-primary text-primary'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {/* Товар */}
                    {review.product && (
                      <div className="text-sm text-muted-foreground mb-3 pb-3 border-b">
                        <span className="font-medium">Товар:</span> {productName}
                      </div>
                    )}
                    
                    {/* Комментарий */}
                    {review.commentText && (
                      <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {review.commentText}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Пагинация */}
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
        </>
      )}

      {/* Review Modal */}
      <ReviewModal
        open={!!editingReview}
        onOpenChange={(open) => {
          if (!open) {
            setEditingReview(null);
          }
        }}
        productName={editingReview?.product?.name || 'Товар'}
        onSubmit={handleReviewSubmit}
        review={editingReview}
      />

      {/* Delete Review Dialog */}
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
            <AlertDialogAction onClick={handleDeleteReview} className="bg-destructive text-destructive-foreground">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

