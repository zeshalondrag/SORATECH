import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSubmit: (rating: number, comment: string) => void;
}

export const ReviewModal = ({ open, onOpenChange, productName, onSubmit }: ReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      toast.error('Пожалуйста, поставьте оценку');
      return;
    }
    if (comment.trim().length < 20) {
      toast.error('Комментарий должен содержать минимум 20 символов');
      return;
    }

    onSubmit(rating, comment);
    setRating(0);
    setComment('');
    onOpenChange(false);
    toast.success('Отзыв успешно добавлен');
  };

  const isValid = rating > 0 && comment.trim().length >= 20;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ваш отзыв о товаре</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{productName}</p>

          {/* Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Оценка</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-primary text-primary'
                        : 'text-muted'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Комментарий (минимум 20 символов)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Расскажите о своём опыте использования товара..."
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length} / 20 символов
            </p>
          </div>

          {/* Submit */}
          <div className="space-y-2">
            <Button
              onClick={handleSubmit}
              disabled={!isValid}
              className="w-full"
            >
              Отправить отзыв
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Нажимая "Отправить отзыв", вы соглашаетесь с правилами публикации пользовательского контента
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
