import { useCallback, useEffect, useRef } from 'react';

export interface GridNavOptions {
  /** IDs of all editable cells in order: `${churchId}__${fieldId}` */
  editableOrder: string[];
  editingCell: { churchId: string; fieldId: string } | null;
  setEditingCell: (cell: { churchId: string; fieldId: string } | null) => void;
  setEditValue: (v: string) => void;
  onSave: (churchId: string, fieldId: string, value: string) => void;
  editValue: string;
  isPeriodOpen: boolean;
}

/**
 * Global keyboard navigation hook for the spreadsheet grid.
 * - Enter / Tab: save current cell → move to next editable cell
 * - Shift+Enter / Shift+Tab: save → move to previous editable cell
 * - Escape: cancel editing, restore previous value
 * - Ctrl+S / Cmd+S: save immediately without moving
 */
export function useGridKeyboardNav(opts: GridNavOptions) {
  const {
    editableOrder,
    editingCell,
    setEditingCell,
    setEditValue,
    onSave,
    editValue,
    isPeriodOpen,
  } = opts;

  const prevValueRef = useRef<string>('');

  // Track the value before edit begins so Escape can restore it
  const beginEdit = useCallback(
    (churchId: string, fieldId: string, currentValue: string) => {
      prevValueRef.current = currentValue;
      setEditingCell({ churchId, fieldId });
      setEditValue(currentValue === '0' ? '' : currentValue);
    },
    [setEditingCell, setEditValue]
  );

  // Navigate to adjacent cell
  const navigate = useCallback(
    (direction: 'next' | 'prev') => {
      if (!editingCell) return;
      const key = `${editingCell.churchId}__${editingCell.fieldId}`;
      const idx = editableOrder.indexOf(key);
      if (idx === -1) {
        setEditingCell(null);
        return;
      }
      const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < editableOrder.length) {
        const [nextChurchId, nextFieldId] = editableOrder[nextIdx].split('__');
        setEditingCell({ churchId: nextChurchId, fieldId: nextFieldId });
        setEditValue('');
      } else {
        setEditingCell(null);
      }
    },
    [editingCell, editableOrder, setEditingCell, setEditValue]
  );

  useEffect(() => {
    if (!isPeriodOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S — save current cell
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (editingCell) {
          onSave(editingCell.churchId, editingCell.fieldId, editValue);
          setEditingCell(null);
        }
        return;
      }

      if (!editingCell) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setEditValue(prevValueRef.current);
        setEditingCell(null);
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSave(editingCell.churchId, editingCell.fieldId, editValue);
        navigate('next');
        return;
      }

      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        onSave(editingCell.churchId, editingCell.fieldId, editValue);
        navigate('prev');
        return;
      }

      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        onSave(editingCell.churchId, editingCell.fieldId, editValue);
        navigate('next');
        return;
      }

      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        onSave(editingCell.churchId, editingCell.fieldId, editValue);
        navigate('prev');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [editingCell, editValue, navigate, onSave, isPeriodOpen, setEditingCell, setEditValue]);

  return { beginEdit };
}
