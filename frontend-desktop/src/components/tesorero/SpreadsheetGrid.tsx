import React from 'react';
import { FileText, ArrowUp, ArrowDown, ArrowUpDown, Paperclip } from 'lucide-react';
import type { FilaGrid, ColumnaGrid, EditingCell, SortState } from '../../types/contabilidad';
import { EditableCell } from '../common/EditableCell';

const formatCOP = (val: number | string | null | undefined): string => {
  const num = Number(val ?? 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO');
};

interface SpreadsheetGridProps {
  rows: FilaGrid[];
  columns: ColumnaGrid[];
  columnTotals: Record<string, number>;
  editingCell: EditingCell | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onBeginEdit: (churchId: string, fieldId: string, currentValue: string) => void;
  onSaveCell: (churchId: string, fieldId: string, value: string) => void;
  onCancelEdit: () => void;
  onOpenPaperModal: (row: FilaGrid) => void;
  onOpenFormulaModal?: (col: ColumnaGrid) => void;
  onOpenReceipts?: (churchId: string, churchName: string) => void;
  isTesorero: boolean;
  isPeriodOpen: boolean;
  gridSort: SortState | null;
  onSortChange: (colKey: string) => void;
  activeCell: EditingCell | null;
  setActiveCell: (cell: EditingCell | null) => void;
}

interface GridRowProps {
  fila: FilaGrid;
  columns: ColumnaGrid[];
  rowIdx: number;
  editingCell: EditingCell | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onBeginEdit: (churchId: string, fieldId: string, currentValue: string) => void;
  onSaveCell: (churchId: string, fieldId: string, value: string) => void;
  onCancelEdit: () => void;
  onOpenPaperModal: (row: FilaGrid) => void;
  onOpenReceipts?: (churchId: string, churchName: string) => void;
  isTesorero: boolean;
  isPeriodOpen: boolean;
  activeCell: EditingCell | null;
  setActiveCell: (cell: EditingCell | null) => void;
}

const GridRow = React.memo(function GridRow({
  fila,
  columns,
  rowIdx,
  editingCell,
  editValue,
  setEditValue,
  onBeginEdit,
  onSaveCell,
  onCancelEdit,
  onOpenPaperModal,
  onOpenReceipts,
  isTesorero,
  isPeriodOpen,
  activeCell,
  setActiveCell,
}: GridRowProps) {
  const columnsMap = React.useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  return (
    <tr className="group hover:bg-indigo-50/30 transition-colors duration-75">
      {/* Row number */}
      <td className="sticky left-0 z-10 bg-slate-50 border-r border-b border-slate-200 px-2 py-0 h-8 text-center font-mono text-[9px] text-slate-500 w-8">
        {rowIdx + 1}
      </td>

      {/* Church name — sticky */}
      <td className="sticky left-8 z-10 bg-white border-r-2 border-b border-slate-300 px-2 h-8 text-slate-900 font-bold text-[11px] min-w-[200px] shadow-[2px_0_6px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-1.5 h-full">
          <span className="truncate" title={fila.iglesia_nombre}>
            {fila.iglesia_nombre}
          </span>
          {fila.codigo && (
            <span className="text-[9px] font-mono text-slate-500 shrink-0">
              {fila.codigo}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenReceipts && (
              <button
                type="button"
                onClick={() => onOpenReceipts(fila.iglesia_id, fila.iglesia_nombre)}
                className="shrink-0 p-0.5 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Ver/Adjuntar Comprobantes Bancarios"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            )}
            {isTesorero && (
              <button
                type="button"
                onClick={() => onOpenPaperModal(fila)}
                className="shrink-0 p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Digitar informe en papel"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Data cells with semantic colors & inline editing */}
      {fila.valores.map((val) => {
        const col = columnsMap.get(val.campo_id);
        const isEditing =
          editingCell?.churchId === fila.iglesia_id &&
          editingCell?.fieldId === val.campo_id;
        const isActive =
          activeCell?.churchId === fila.iglesia_id &&
          activeCell?.fieldId === val.campo_id;
        const isCalc = val.modo_calculo === 'calculado';
        const canEdit = isPeriodOpen && (isTesorero || (!isCalc && val.editable !== false));
        const displayVal = isCalc ? val.valor_calculado : val.valor_manual;
        const isOverridden = isCalc && val.valor_manual != null && val.valor_manual !== 0;

        return (
          <EditableCell
            key={val.campo_id}
            churchId={fila.iglesia_id}
            fieldId={val.campo_id}
            fieldName={col?.nombre}
            formula={isCalc ? (col?.formula ?? val.formula) : undefined}
            displayValue={displayVal}
            isCalculated={isCalc}
            isOverridden={isOverridden}
            overrideAuthor={val.actualizado_por}
            overrideDate={val.actualizado_en}
            isPeriodOpen={isPeriodOpen}
            canEdit={canEdit}
            isEditing={isEditing}
            isActive={isActive}
            editValue={editValue}
            onStartEdit={() => {
              const current = String(Number(displayVal ?? 0) || '');
              onBeginEdit(fila.iglesia_id, val.campo_id, current);
            }}
            onChangeEdit={setEditValue}
            onCommit={(v) => onSaveCell(fila.iglesia_id, val.campo_id, v)}
            onCancel={onCancelEdit}
            onClick={() =>
              setActiveCell({ churchId: fila.iglesia_id, fieldId: val.campo_id })
            }
            esAcumulable={val.es_acumulable}
          />
        );
      })}
    </tr>
  );
});

function SortIcon({ colKey, sort }: { colKey: string; sort: SortState | null }) {
  if (sort?.colKey === colKey) {
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-600 shrink-0" />
    );
  }
  return (
    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
  );
}

export const SpreadsheetGrid = React.memo(function SpreadsheetGrid({
  rows,
  columns,
  columnTotals,
  editingCell,
  editValue,
  setEditValue,
  onBeginEdit,
  onSaveCell,
  onCancelEdit,
  onOpenPaperModal,
  onOpenReceipts,
  isTesorero,
  isPeriodOpen,
  gridSort,
  onSortChange,
  activeCell,
  setActiveCell,
}: SpreadsheetGridProps) {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-xs bg-white">
        No hay iglesias asignadas o la tabla está vacía.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="flex-1 min-h-0 overflow-auto border-b border-slate-200">
        <table className="w-full border-separate border-spacing-0 text-left">
          {/* ── STICKY HEADER (Light Theme) ── */}
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Row number col */}
              <th className="sticky left-0 z-30 bg-slate-100 border-b border-r border-slate-300 w-8 h-8 text-center text-[9px] font-bold text-slate-600 uppercase">
                #
              </th>

              {/* Church col */}
              <th
                onClick={() => onSortChange('iglesia_nombre')}
                className="sticky left-8 z-30 bg-slate-100 border-b border-r-2 border-slate-300 px-3 h-8 min-w-[200px] cursor-pointer hover:bg-slate-200 transition select-none group shadow-[2px_0_6px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Congregación
                  </span>
                  <SortIcon colKey="iglesia_nombre" sort={gridSort} />
                </div>
              </th>

              {/* Dynamic columns - clean header with name only */}
              {columns.map((col) => {
                const isCalc = col.modo_calculo === 'calculado';

                return (
                  <th
                    key={col.id}
                    onClick={() => onSortChange(col.id)}
                    className="border-b border-r border-slate-300 px-3 h-8 min-w-[120px] bg-slate-100 select-none group text-right cursor-pointer hover:bg-slate-200 transition"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isCalc ? 'text-blue-700' : 'text-slate-800'
                        }`}
                      >
                        {col.nombre}
                      </span>
                      <SortIcon colKey={col.id} sort={gridSort} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── ROWS ── */}
          <tbody className="divide-y divide-slate-200">
            {rows.map((fila, rowIdx) => (
              <GridRow
                key={fila.iglesia_id}
                fila={fila}
                columns={columns}
                rowIdx={rowIdx}
                editingCell={editingCell}
                editValue={editValue}
                setEditValue={setEditValue}
                onBeginEdit={onBeginEdit}
                onSaveCell={onSaveCell}
                onCancelEdit={onCancelEdit}
                onOpenPaperModal={onOpenPaperModal}
                onOpenReceipts={onOpenReceipts}
                isTesorero={isTesorero}
                isPeriodOpen={isPeriodOpen}
                activeCell={activeCell}
                setActiveCell={setActiveCell}
              />
            ))}
          </tbody>

          {/* ── STICKY TOTALS FOOTER ── */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="border-t-2 border-slate-300">
              <td className="sticky left-0 z-30 bg-slate-100 border-r border-slate-300 px-2 h-8 text-center text-[11px] font-extrabold text-slate-700">
                Σ
              </td>
              <td className="sticky left-8 z-30 bg-slate-100 border-r-2 border-slate-300 px-3 h-8 text-[10px] font-extrabold text-slate-800 uppercase tracking-wider shadow-[2px_0_6px_rgba(0,0,0,0.05)]">
                TOTAL ({rows.length} iglesias)
              </td>
              {columns.map((col) => {
                const isCalc = col.modo_calculo === 'calculado';
                return (
                  <td
                    key={col.id}
                    className={`border-r border-slate-300 px-2 h-8 text-right font-mono text-[11px] font-extrabold tabular-nums ${
                      isCalc
                        ? 'text-blue-800 bg-blue-50/80'
                        : 'text-slate-900 bg-slate-100'
                    }`}
                  >
                    {formatCOP(columnTotals[col.id] ?? 0)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── FIXED COLOR LEGEND AT BOTTOM (Light Theme) ── */}
      <div className="h-6 bg-slate-50 border-t border-slate-200 px-3 flex items-center justify-between text-[10px] text-slate-600 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 border border-blue-400" />
            <span className="text-blue-900 font-semibold">Calculado por fórmula</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 border border-amber-400" />
            <span className="text-amber-900 font-semibold">Sobrescrito manualmente</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-mono text-[9px]">
          <span>Atajo buscar: <kbd className="text-slate-700 font-bold bg-white px-1 py-0.2 rounded border border-slate-300 shadow-2xs">Ctrl+K</kbd></span>
        </div>
      </div>
    </div>
  );
});
