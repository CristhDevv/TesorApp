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
  esAcumulable,
}: EditableCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Semantic color styling (Light Theme):
  // - Calculated: Soft blue background (bg-blue-50/70 text-blue-900)
  // - Overridden: Soft amber/yellow background (bg-amber-50 text-amber-900) + pencil icon
  // - Readonly / Closed period: Light gray background (bg-slate-50 text-slate-400)
  // - Normal editable manual: bg-white text-slate-900
  let stateClasses = 'bg-white text-slate-900 hover:bg-slate-50';

  if (isOverridden) {
    stateClasses = 'bg-amber-50/90 text-amber-900 font-semibold hover:bg-amber-100/80';
  } else if (isCalculated) {
    stateClasses = 'bg-blue-50/70 text-blue-900 font-semibold hover:bg-blue-100/70';
  }

  if (!isPeriodOpen || (!canEdit && !isCalculated)) {
    stateClasses += ' cursor-not-allowed bg-slate-50 text-slate-400 opacity-70';
  } else {
    stateClasses += ' cursor-pointer';
  }

  if (isEditing) {
    stateClasses = 'bg-white ring-2 ring-indigo-500 ring-inset z-10 text-slate-900';
  } else if (isActive) {
    stateClasses += ' ring-1 ring-indigo-500 ring-inset';
  }

  const tooltipOverrideText = isOverridden
    ? `Sobrescrito manualmente${overrideDate ? ` el ${new Date(overrideDate).toLocaleDateString('es-CO')}` : ''}${overrideAuthor ? ` por ${overrideAuthor}` : ''}`
    : undefined;

  return (
    <td
      onClick={() => {
        onClick();
        if (canEdit && !isEditing && isPeriodOpen) {
          onStartEdit();
        }
      }}
      className={`border-r border-b border-slate-200 h-8 px-2 tabular-nums text-[12px] font-mono text-right select-none transition-colors relative ${stateClasses}`}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="number"
          step="any"
          className="w-full h-full bg-transparent text-right font-mono text-[12px] text-slate-900 focus:outline-none"
          value={editValue}
          onChange={(e) => onChangeEdit(e.target.value)}
          onBlur={() => onCommit(editValue)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              onCommit(editValue);
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
