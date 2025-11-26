import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd на Mac
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      for (const shortcut of shortcuts) {
        // Проверка клавиши (учитываем Escape и Delete)
        const normalizedEventKey = event.key === 'Escape' ? 'Escape' : event.key.toLowerCase();
        const normalizedShortcutKey = shortcut.key === 'Escape' ? 'Escape' : shortcut.key.toLowerCase();
        const normalizedEventKeyAlt = event.key === 'Delete' ? 'Delete' : normalizedEventKey;
        const normalizedShortcutKeyAlt = shortcut.key === 'Delete' ? 'Delete' : normalizedShortcutKey;
        
        const keyMatch = normalizedEventKey === normalizedShortcutKey || 
                        normalizedEventKeyAlt === normalizedShortcutKeyAlt ||
                        event.key === shortcut.key;
        if (!keyMatch) continue;

        // Проверка модификаторов
        const needsCtrl = shortcut.ctrl === true;
        const needsMeta = shortcut.meta === true;
        const needsShift = shortcut.shift === true;
        const needsAlt = shortcut.alt === true;

        // Для Mac: если указан ctrl, проверяем metaKey (Cmd), иначе ctrlKey
        // Для Windows/Linux: если указан ctrl, проверяем ctrlKey
        let ctrlMatch = true;
        if (needsCtrl) {
          if (isMac) {
            // На Mac Ctrl+N обычно означает Cmd+N
            ctrlMatch = event.metaKey;
          } else {
            ctrlMatch = event.ctrlKey;
          }
        } else if (needsMeta) {
          // Если явно указан meta, проверяем metaKey
          ctrlMatch = event.metaKey;
        } else {
          // Если не требуется ctrl/meta, проверяем что они не нажаты
          ctrlMatch = !event.ctrlKey && !event.metaKey;
        }
        
        const shiftMatch = needsShift ? event.shiftKey : !event.shiftKey;
        const altMatch = needsAlt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Проверяем, что не в поле ввода
          const target = event.target as HTMLElement;
          const isInput =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

          // Некоторые горячие клавиши работают даже в полях ввода
          const allowInInput = shortcut.key === 'f' || shortcut.key === 'k' || shortcut.key === '/';

          if (!isInput || allowInInput) {
            if (shortcut.preventDefault !== false) {
              event.preventDefault();
            }
            shortcut.action();
            break;
          }
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

// Утилита для получения текстового представления горячей клавиши
export const getShortcutText = (shortcut: Omit<KeyboardShortcut, 'action'>): string => {
  const parts: string[] = [];
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (shortcut.ctrl && !isMac) {
    parts.push('Ctrl');
  }
  if (shortcut.meta || (shortcut.ctrl && isMac)) {
    parts.push(isMac ? 'Cmd' : 'Ctrl');
  }
  if (shortcut.alt) {
    parts.push('Alt');
  }
  if (shortcut.shift) {
    parts.push('Shift');
  }

  // Преобразуем ключ в читаемый формат
  let keyText = shortcut.key;
  if (keyText === ' ') {
    keyText = 'Space';
  } else if (keyText === '/') {
    keyText = '/';
  } else {
    keyText = keyText.toUpperCase();
  }

  parts.push(keyText);
  return parts.join(' + ');
};

