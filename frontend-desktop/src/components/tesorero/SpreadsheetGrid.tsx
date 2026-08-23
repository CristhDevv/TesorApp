import React from 'react';
import { FileText, ArrowUp, ArrowDown, ArrowUpDown, Paperclip, CheckCircle2, Clock, Send, ShieldCheck } from 'lucide-react';
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
  totalIngresosPeriodo?: number;
  editingCell: EditingCell | null;
  editValue: string;
  setEditValue: (v: string) => void;
  onBeginEdit: (churchId: string, fieldId: string, currentValue: string) => void;
  onSaveCell: (churchId: string, fieldId: string, value: string) => void;
  onCancelEdit: () => void;
  onOpenPaperModal: (row: FilaGrid) => void;
  onOpenFormulaModal?: (col: ColumnaGrid) => void;
  onOpenReceipts?: (churchId: string, churchName: string) => void;
  onOpenWorkflow?: (row: FilaGrid) => void;
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
  onOpenWorkflow?: (row: FilaGrid) => void;
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
  onOpenWorkflow,
  isTesorero,
  isPeriodOpen,
  activeCell,
  setActiveCell,
}: GridRowProps) {
  const rowGrandTotal = React.useMemo(() => {
    let sum = 0;
    const valMap = new Map((fila.valores || []).map((v) => [v.campo_id, v]));
    columns.forEach((col) => {
      const val = valMap.get(col.id);
      if (val) {
        const isCalc = col.modo_calculo === 'calculado' || val.modo_calculo === 'calculado';
        const num = Number(isCalc ? (val.valor_calculado || 0) : (val.valor_manual || 0));
        if (!isNaN(num)) sum += num;
      }
    });
    return sum;
  }, [fila.valores, columns]);

  const valoresMap = React.useMemo(() => {
    return new Map((fila.valores || []).map((v) => [v.campo_id, v]));
  }, [fila.valores]);

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors group">
      {/* Row Index */}
      <td className="sticky left-0 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/60 border-b border-r border-slate-200 dark:border-slate-800 w-8 h-8 text-center text-[10px] font-mono text-slate-400 select-none">
        {rowIdx + 1}
      </td>

      {/* Church Name and Status Controls */}
      <td className="sticky left-8 z-10 bg-white dark:bg-slate-950 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/60 border-b border-r-2 border-slate-300 dark:border-slate-700 px-3 h-8 text-xs select-none shadow-[2px_0_6px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
            {fila.iglesia_nombre}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenWorkflow && onOpenWorkflow(fila)}
              className="cursor-pointer transition hover:opacity-80"
              title="Ver/Modificar estado de aprobación del informe"
            >
              {fila.estado_informe === 'enviado' ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Send className="w-2.5 h-2.5" /> Enviado
                </span>
              ) : fila.estado_informe === 'en_revision' ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-2.5 h-2.5" /> En Revisión
                </span>
              ) : fila.estado_informe === 'aprobado' ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Aprobado
                </span>
              ) : fila.estado_informe === 'consolidado' ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <ShieldCheck className="w-2.5 h-2.5" /> Consolidado
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  Borrador
                </span>
              )}
            </button>

            {onOpenReceipts && (
              <button
                type="button"
                onClick={() => onOpenReceipts(fila.iglesia_id, fila.iglesia_nombre)}
                className="shrink-0 p-0.5 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Ver/Adjuntar Comprobantes Bancarios"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            )}
            {isTesorero && (
              <button
                type="button"
                onClick={() => onOpenPaperModal(fila)}
                className="shrink-0 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition opacity-0 group-hover:opacity-100 cursor-pointer"
                title="Digitar informe en papel"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </td>

      {/* Data cells strictly mapped by column definition with semantic colors & inline editing */}
      {columns.map((col) => {
        const val = valoresMap.get(col.id) || {
          campo_id: col.id,
          valor_manual: 0,
          valor_calculado: 0,
          modo_calculo: col.modo_calculo,
          formula: col.formula,
          es_acumulable: (col as any).es_acumulable,
          actualizado_por: null,
          actualizado_en: null,
          editable: true,
        };
        const isEditing =
          editingCell?.churchId === fila.iglesia_id &&
          editingCell?.fieldId === col.id;
        const isActive =
          activeCell?.churchId === fila.iglesia_id &&
          activeCell?.fieldId === col.id;
        const isCalc = col.modo_calculo === 'calculado' || val.modo_calculo === 'calculado';
        const canEdit = isPeriodOpen && (isTesorero || (!isCalc && val.editable !== false));
        const displayVal = isCalc ? val.valor_calculado : val.valor_manual;
        const isOverridden = isCalc && val.valor_manual != null && val.valor_manual !== 0;

        return (
          <EditableCell
            key={col.id}
            churchId={fila.iglesia_id}
            fieldId={col.id}
            fieldName={col.nombre}
            formula={isCalc ? (col.formula ?? val.formula) : undefined}
            displayValue={displayVal}
            isCalculated={isCalc}
            isOverridden={isOverridden}
            overrideAuthor={val.actualizado_por || undefined}
            overrideDate={val.actualizado_en ? String(val.actualizado_en) : undefined}
            isPeriodOpen={isPeriodOpen}
            canEdit={canEdit}
            isEditing={isEditing}
            isActive={isActive}
            editValue={editValue}
            onStartEdit={() => {
              const current = String(Number(displayVal ?? 0) || '');
              onBeginEdit(fila.iglesia_id, col.id, current);
            }}
            onChangeEdit={setEditValue}
            onCommit={(v) => onSaveCell(fila.iglesia_id, col.id, v)}
            onCancel={onCancelEdit}
            onClick={() =>
              setActiveCell({ churchId: fila.iglesia_id, fieldId: col.id })
            }
            esAcumulable={val.es_acumulable || (col as any).es_acumulable}
          />
        );
      })}

      {/* ── Total General por Fila ── */}
      <td
        className="border-b border-r border-l-2 border-slate-300 dark:border-slate-700 px-2.5 h-8 text-right font-mono text-[11px] font-black tabular-nums bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 select-none min-w-[130px]"
        title={`Total general de ${fila.iglesia_nombre}: ${formatCOP(rowGrandTotal)}`}
      >
        {formatCOP(rowGrandTotal)}
      </td>
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
  totalIngresosPeriodo,
  editingCell,
  editValue,
  setEditValue,
  onBeginEdit,
  onSaveCell,
  onCancelEdit,
  onOpenPaperModal,
  onOpenReceipts,
  onOpenWorkflow,
  isTesorero,
  isPeriodOpen,
  gridSort,
  onSortChange,
  activeCell,
  setActiveCell,
}: SpreadsheetGridProps) {
  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs bg-white dark:bg-slate-950">
        No hay iglesias asignadas o la tabla está vacía.
      </div>
    );
  }

  const grandTotalAllRows = React.useMemo(() => {
    let grandSum = 0;
    columns.forEach((col) => {
      grandSum += Number(columnTotals[col.id] || 0);
    });
    return grandSum;
  }, [columns, columnTotals]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-950">
      <div className="flex-1 min-h-0 overflow-auto border-b border-slate-200 dark:border-slate-800">
        <table className="w-full border-separate border-spacing-0 text-left">
          {/* ── STICKY HEADER (Light/Dark Theme) ── */}
          <thead className="sticky top-0 z-20">
            <tr>
              {/* Row number col */}
              <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-700 w-8 min-w-[32px] max-w-[32px] h-8 text-center text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                #
              </th>

              {/* Church col */}
              <th
                onClick={() => onSortChange('iglesia_nombre')}
                className="sticky left-8 z-30 bg-slate-100 dark:bg-slate-800 border-b border-r-2 border-slate-300 dark:border-slate-700 px-3 h-8 w-64 min-w-[250px] max-w-[250px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/80 transition select-none group shadow-[2px_0_6px_rgba(0,0,0,0.05)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
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
                    className="border-b border-r border-slate-300 dark:border-slate-700 px-3 h-8 min-w-[120px] bg-slate-100 dark:bg-slate-800 select-none group text-right cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/80 transition"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isCalc ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {col.nombre}
                      </span>
                      <SortIcon colKey={col.id} sort={gridSort} />
                    </div>
                  </th>
                );
              })}

              {/* ── Total General Column Header ── */}
              <th
                onClick={() => onSortChange('total_general')}
                className="border-b border-r border-l-2 border-slate-300 dark:border-slate-700 px-3 h-8 min-w-[130px] bg-emerald-50 dark:bg-emerald-950/60 select-none group text-right cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                title="Suma total de todas las columnas de la fila"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Total General
                  </span>
                  <SortIcon colKey="total_general" sort={gridSort} />
                </div>
              </th>
            </tr>
          </thead>

          {/* ── ROWS ── */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
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
                onOpenWorkflow={onOpenWorkflow}
                isTesorero={isTesorero}
                isPeriodOpen={isPeriodOpen}
                activeCell={activeCell}
                setActiveCell={setActiveCell}
              />
            ))}
          </tbody>

          {/* ── STICKY TOTALS FOOTER ── */}
          <tfoot className="sticky bottom-0 z-20">
            <tr className="border-t-2 border-slate-300 dark:border-slate-700">
              <td className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800 border-r border-slate-300 dark:border-slate-700 px-2 h-8 text-center text-[11px] font-extrabold text-slate-700 dark:text-slate-300 w-8 min-w-[32px] max-w-[32px]">
                Σ
              </td>
              <td className="sticky left-8 z-30 bg-slate-100 dark:bg-slate-800 border-r-2 border-slate-300 dark:border-slate-700 px-3 h-8 text-[10px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider shadow-[2px_0_6px_rgba(0,0,0,0.05)] w-64 min-w-[250px] max-w-[250px]">
                TOTAL ({rows.length} iglesias)
              </td>
              {columns.map((col) => {
                const isCalc = col.modo_calculo === 'calculado';
                return (
                  <td
                    key={col.id}
                    className={`border-r border-slate-300 dark:border-slate-700 px-2 h-8 text-right font-mono text-[11px] font-extrabold tabular-nums ${
                      isCalc
                        ? 'text-blue-800 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40'
                        : 'text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {formatCOP(columnTotals[col.id] ?? 0)}
                  </td>
                );
              })}

              {/* ── Gran Total Consolidado Footer ── */}
              <td className="border-t-2 border-r border-l-2 border-slate-300 dark:border-slate-700 px-2.5 h-8 text-right font-mono text-[11px] font-black tabular-nums bg-emerald-100 dark:bg-emerald-900/80 text-emerald-950 dark:text-emerald-100 min-w-[130px]">
                {formatCOP(grandTotalAllRows)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── FIXED SUMMARY & COLOR LEGEND AT BOTTOM ── */}
      <div className="h-7 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between text-[10px] text-slate-600 dark:text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          {totalIngresosPeriodo != null && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-100/80 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-200 font-bold">
              <span className="uppercase text-[9px] tracking-wider text-emerald-700 dark:text-emerald-400">Total Ingresos Período:</span>
              <span className="font-mono font-black text-emerald-900 dark:text-emerald-100">{formatCOP(totalIngresosPeriodo)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-blue-100 dark:bg-blue-950 border border-blue-400" />
            <span className="text-blue-900 dark:text-blue-300 font-semibold">Calculado por fórmula</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-100 dark:bg-amber-950 border border-amber-400" />
            <span className="text-amber-900 dark:text-amber-300 font-semibold">Sobrescrito manualmente</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono text-[9px]">
          <span>Atajo buscar: <kbd className="text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700 shadow-2xs">Ctrl+K</kbd></span>
        </div>
      </div>
    </div>
  );
});
