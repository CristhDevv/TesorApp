import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Loader2 } from 'lucide-react';
import type { FilaGrid, ColumnaGrid } from '../../types/contabilidad';
import { BalanceHeaderSummary } from './BalanceHeaderSummary';
import { TooltipCell } from '../common/TooltipCell';

const formatCOP = (val: number | null | undefined) =>
  '$' + Math.round(Number(val ?? 0)).toLocaleString('es-CO');

interface SpeedEntryFormProps {
  row: FilaGrid;
  columns: ColumnaGrid[];
  isPeriodOpen: boolean;
  isTesorero: boolean;
  onBatchSave: (churchId: string, values: Record<string, number>) => Promise<void>;
}

/**
 * 2-column speed entry form for iglesia role:
 * - Ingresos (left) | Egresos/Other (right)
 * - Keyboard-first: Enter → next field
 * - COP format on blur
 * - Batch save with recalculation
 */
export const SpeedEntryForm = React.memo(function SpeedEntryForm({
  row,
  columns,
  isPeriodOpen,
  isTesorero,
  onBatchSave,
}: SpeedEntryFormProps) {
  const getServerVal = useCallback((colId: string) => {
    const cell = row.valores.find(v => v.campo_id === colId);
    if (!cell) return 0;
    return Number(cell.modo_calculo === 'calculado' ? cell.valor_calculado : cell.valor_manual) || 0;
  }, [row.valores]);

  const [localValues, setLocalValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const col of columns) {
      if (col.modo_calculo === 'manual') {
        init[col.id] = getServerVal(col.id);
      }
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Sync local values when server data changes
  useEffect(() => {
    setLocalValues(prev => {
      const next = { ...prev };
      for (const col of columns) {
        if (col.modo_calculo === 'manual') {
          next[col.id] = getServerVal(col.id);
        }
      }
      return next;
    });
    setDirty(false);
  }, [row.iglesia_id, row.valores.length, getServerVal, columns]);

  const handleChange = useCallback((colId: string, val: number) => {
    setLocalValues(prev => ({ ...prev, [colId]: val }));
    setDirty(true);
  }, []);

  const localValuesRef = useRef(localValues);
  localValuesRef.current = localValues;

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      await onBatchSave(row.iglesia_id, localValuesRef.current);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [row.iglesia_id, onBatchSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, colId: string, allManualIds: string[]) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const idx = allManualIds.indexOf(colId);
      const next = allManualIds[idx + 1];
      if (next && inputRefs.current[next]) {
        inputRefs.current[next]?.focus();
        inputRefs.current[next]?.select();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveAll();
    }
  }, [handleSaveAll]);

  const ingresosCols = columns.filter(c => c.seccion === 'Ingresos');
  const egresosCols = columns.filter(c => c.seccion === 'Egresos');
  const infoCols = columns.filter(c => c.seccion !== 'Ingresos' && c.seccion !== 'Egresos');

  const allManualIds = columns
    .filter(c => c.modo_calculo === 'manual')
    .map(c => c.id);

  const renderField = (col: ColumnaGrid) => {
    const cell = row.valores.find(v => v.campo_id === col.id);
    const isCalc = col.modo_calculo === 'calculado';
    const canEdit = isPeriodOpen && !isCalc && (isTesorero || cell?.editable !== false);
    const displayCalcVal = formatCOP(cell?.valor_calculado ?? 0);

    return (
      <div key={col.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded hover:bg-slate-800/50 border-b border-slate-800/50 last:border-0 transition-colors">
        <TooltipCell
          formula={isCalc ? col.formula : undefined}
          fieldName={col.nombre}
        >
          <div className="min-w-0">
            <span className="text-[11px] font-semibold text-slate-200 block truncate">{col.nombre}</span>
            {isCalc && (
              <span className="text-[9px] text-slate-600 font-mono">= {col.formula}</span>
            )}
          </div>
        </TooltipCell>

        <div className="w-36 shrink-0">
          {canEdit ? (
            <input
              ref={(el) => { inputRefs.current[col.id] = el; }}
              type="number"
              value={localValues[col.id] ?? 0}
              onChange={(e) => handleChange(col.id, parseFloat(e.target.value) || 0)}
              onFocus={(e) => { e.target.select(); }}
              onKeyDown={(e) => handleKeyDown(e, col.id, allManualIds)}
              disabled={!isPeriodOpen}
              className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded font-mono tabular-nums font-bold text-slate-100 text-xs text-right focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50"
            />
          ) : isCalc ? (
            <span className="block text-right font-mono tabular-nums font-bold text-xs text-emerald-400 px-2 py-1 bg-slate-900/50 rounded border border-slate-800">
              {displayCalcVal}
            </span>
          ) : (
            <span className="block text-right font-mono tabular-nums font-bold text-xs text-slate-400 px-2 py-1 bg-slate-900/30 rounded border border-slate-800">
              {formatCOP(getServerVal(col.id))}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-950">
      {/* Live balance summary */}
      <BalanceHeaderSummary row={row} columns={columns} />

      {/* 2-column layout */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* LEFT — Ingresos */}
          <div className="border-r border-slate-800 flex flex-col">
            <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-[10px] uppercase tracking-wider text-emerald-400">
                1. Ingresos
              </h3>
              <span className="font-mono text-emerald-400 text-xs font-bold">
                {formatCOP(ingresosCols.reduce((s, c) => s + (localValues[c.id] ?? getServerVal(c.id)), 0))}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {ingresosCols.map(renderField)}
            </div>
          </div>

          {/* RIGHT — Egresos + Informativo */}
          <div className="flex flex-col">
            {egresosCols.length > 0 && (
              <>
                <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-rose-400">
                    2. Egresos / Gastos
                  </h3>
                  <span className="font-mono text-rose-400 text-xs font-bold">
                    {formatCOP(egresosCols.reduce((s, c) => s + (localValues[c.id] ?? getServerVal(c.id)), 0))}
                  </span>
                </div>
                <div className="overflow-y-auto p-2 space-y-0.5 max-h-[40vh]">
                  {egresosCols.map(renderField)}
                </div>
              </>
            )}
            {infoCols.length > 0 && (
              <>
                <div className="px-3 py-2 bg-slate-900 border-b border-t border-slate-800 flex items-center justify-between shrink-0">
                  <h3 className="font-bold text-[10px] uppercase tracking-wider text-slate-400">
                    3. Informativo y Cálculos
                  </h3>
                </div>
                <div className="overflow-y-auto p-2 space-y-0.5">
                  {infoCols.map(renderField)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Save bar */}
      {isPeriodOpen && (
        <div className="h-[46px] border-t border-slate-800 px-4 flex items-center justify-between bg-slate-900 shrink-0">
          <span className="text-[11px] text-slate-500">
            {dirty ? (
              <span className="text-amber-400 font-semibold">● Cambios sin guardar — presiona Ctrl+S o el botón →</span>
            ) : (
              'Todos los cambios guardados'
            )}
          </span>
          <button
            onClick={handleSaveAll}
            disabled={saving || !dirty}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded text-xs flex items-center gap-1.5 transition shadow-xs"
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Guardando…</>
            ) : (
              <><Save className="w-3.5 h-3.5" />Guardar Todo</>
            )}
          </button>
        </div>
      )}
    </div>
  );
});
