import React, { useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { TooltipCell } from './TooltipCell';

interface EditableCellProps {
  churchId: string;
  fieldId: string;
  fieldName?: string;
  formula?: string | null;
  displayValue: number | string | null | undefined;
  isCalculated: boolean;
  isOverridden: boolean;
  overrideAuthor?: string;
  overrideDate?: string;
  isPeriodOpen: boolean;
  canEdit: boolean;
  isEditing: boolean;
  isActive: boolean;
  editValue: string;
  onStartEdit: () => void;
  onChangeEdit: (val: string) => void;
  onCommit: (val: string) => void;
  onCancel: () => void;
  onClick: () => void;
  onNavigate?: (direction: 'next' | 'prev' | 'down' | 'up', currentVal: string) => void;
  esAcumulable?: boolean;
}

const formatCOP = (val: number | string | null | undefined): string => {
  const num = Number(val ?? 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO');
};

export const EditableCell = React.memo(function EditableCell({
  fieldName,
  formula,
  displayValue,
  isCalculated,
  isOverridden,
  overrideAuthor,
  overrideDate,
  isPeriodOpen,
  canEdit,
  isEditing,
  isActive,
  editValue,
  onStartEdit,
  onChangeEdit,
  onCommit,
  onCancel,
  onClick,
  onNavigate,
  esAcumulable,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isActive && !isEditing && tdRef.current) {
      tdRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [isActive, isEditing]);

  // Semantic color styling (Light Theme):
  // - Calculated: Soft blue background (bg-blue-50/70 text-blue-900)
  // - Overridden: Soft amber/yellow background (bg-amber-50 text-amber-900) + pencil icon
  // - Readonly / Closed period: Light gray background (bg-slate-50 text-slate-400)
  // - Normal editable manual: bg-white text-slate-900
  let stateClasses = 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800';

  if (isOverridden) {
    stateClasses = 'bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold hover:bg-amber-100/80 dark:hover:bg-amber-900/50';
  } else if (isCalculated) {
    stateClasses = 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-semibold hover:bg-blue-100/70 dark:hover:bg-blue-900/50';
  }

  if (!isPeriodOpen || (!canEdit && !isCalculated)) {
    stateClasses += ' cursor-not-allowed bg-slate-50 dark:bg-slate-950/80 text-slate-400 dark:text-slate-600 opacity-70';
  } else {
    stateClasses += ' cursor-pointer';
  }

  if (isEditing) {
    stateClasses = 'bg-white dark:bg-slate-800 ring-2 ring-indigo-500 ring-inset z-10 text-slate-900 dark:text-white';
  } else if (isActive) {
    stateClasses += ' ring-2 ring-indigo-600 ring-inset bg-indigo-50/60 dark:bg-indigo-950/40';
  }

  const tooltipOverrideText = isOverridden
    ? `Sobrescrito manualmente${overrideDate ? ` el ${new Date(overrideDate).toLocaleDateString('es-CO')}` : ''}${overrideAuthor ? ` por ${overrideAuthor}` : ''}`
    : undefined;

  return (
    <td
      ref={tdRef}
      onClick={() => {
        onClick();
        if (canEdit && !isEditing && isPeriodOpen) {
          onStartEdit();
        }
      }}
      className={`border-r border-b border-slate-200 dark:border-slate-800 h-8 px-2 tabular-nums text-[12px] font-mono text-right select-none transition-colors relative ${stateClasses}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          step="any"
          className="w-full h-full bg-transparent text-right font-mono text-[12px] text-slate-900 dark:text-white focus:outline-none"
          value={editValue}
          onChange={(e) => onChangeEdit(e.target.value)}
          onBlur={() => onCommit(editValue)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (onNavigate) {
                onNavigate(e.shiftKey ? 'up' : 'down', editValue);
              } else {
                onCommit(editValue);
              }
            } else if (e.key === 'Tab') {
              e.preventDefault();
              if (onNavigate) {
                onNavigate(e.shiftKey ? 'prev' : 'next', editValue);
              } else {
                onCommit(editValue);
              }
            }
          }}
        />
      ) : (
        <TooltipCell
          formula={isCalculated ? formula : undefined}
          fieldName={fieldName}
          lastEditor={tooltipOverrideText || overrideAuthor}
          lastEditedAt={overrideDate}
        >
          <div className="flex items-center justify-end gap-1 w-full h-full">
            {esAcumulable && (
              <span className="text-[8px] text-indigo-600 shrink-0" title="Campo acumulable mes a mes">
                ▲
              </span>
            )}

            <span>{formatCOP(displayValue)}</span>

            {/* Pencil icon for overridden calculated cells */}
            {isOverridden && (
              <span title={tooltipOverrideText || 'Sobrescrito manualmente'}>
                <Pencil className="w-3 h-3 text-amber-600 shrink-0 ml-0.5 opacity-90" />
              </span>
            )}
          </div>
        </TooltipCell>
      )}
    </td>
  );
});
