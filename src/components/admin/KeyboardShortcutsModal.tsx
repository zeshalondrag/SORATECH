import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const KeyboardShortcutsModal = ({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? 'Cmd' : 'Ctrl';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Общие',
      shortcuts: [
        {
          keys: `${modifierKey} + /`,
          description: 'Показать справку по горячим клавишам',
        },
        {
          keys: 'Esc',
          description: 'Закрыть модальное окно или отменить действие',
        },
        {
          keys: `${modifierKey} + K`,
          description: 'Быстрый поиск и команды',
        },
      ],
    },
    {
      title: 'Навигация',
      shortcuts: [
        {
          keys: `${modifierKey} + 1`,
          description: 'Перейти на вкладку "Главная"',
        },
        {
          keys: `${modifierKey} + 2`,
          description: 'Перейти на вкладку "Аналитика"',
        },
        {
          keys: `${modifierKey} + 3`,
          description: 'Перейти на вкладку "Аудит" (Админ) / "Характеристики" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 4`,
          description: 'Перейти на вкладку "Категории" (Админ) / "Заказы" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 5`,
          description: 'Перейти на вкладку "Характеристики" (Админ) / "Характеристики товара" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 6`,
          description: 'Перейти на вкладку "Заказы" (Админ) / "Товары" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 7`,
          description: 'Перейти на вкладку "Характеристики товара" (Админ) / "Отзывы" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 8`,
          description: 'Перейти на вкладку "Товары" (Админ) / "Поставщики" (Менеджер)',
        },
        {
          keys: `${modifierKey} + 9`,
          description: 'Перейти на вкладку "Отзывы" (Админ)',
        },
        {
          keys: `${modifierKey} + 0`,
          description: 'Перейти на вкладку "Поставщики" (Админ)',
        },
      ],
    },
    {
      title: 'Работа с записями',
      shortcuts: [
        {
          keys: `${modifierKey} + N`,
          description: 'Создать новую запись',
        },
        {
          keys: `${modifierKey} + E`,
          description: 'Редактировать выбранную запись',
        },
        {
          keys: 'Delete',
          description: 'Удалить выбранную запись',
        },
        {
          keys: `${modifierKey} + Shift + D`,
          description: 'Переключить удаленные записи',
        },
        {
          keys: `${modifierKey} + F`,
          description: 'Фокус на поле поиска',
        },
      ],
    },
    {
      title: 'В модальных окнах',
      shortcuts: [
        {
          keys: `${modifierKey} + Enter`,
          description: 'Сохранить изменения',
        },
        {
          keys: 'Esc',
          description: 'Отменить и закрыть',
        },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Горячие клавиши</DialogTitle>
          <DialogDescription>
            Используйте эти комбинации клавиш для быстрой работы с панелью управления
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {shortcutGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {shortcut.keys}
                      </Badge>
                    </div>
                  ))}
                </div>
                {groupIndex < shortcutGroups.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Совет: Нажмите {modifierKey} + / в любое время, чтобы открыть эту справку
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

