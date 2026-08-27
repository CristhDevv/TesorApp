import React from 'react';
import type { FilaGrid } from '../../types/contabilidad';

interface BalanceHeaderSummaryProps {
  row: FilaGrid;
  columns: { id: string; nombre: string; seccion: string; modo_calculo: string }[];
}

const formatCOP = (val: number) => '$' + Math.round(val).toLocaleString('es-CO');

/**
 * Fixed header showing live totals for Ingresos, Egresos, and Saldo.
 * Uses seccion field from columns to categorize values.
 */
export const BalanceHeaderSummary = React.memo(function BalanceHeaderSummary({
  row,
  columns,
}: BalanceHeaderSummaryProps) {
  const getVal = (colId: string): number => {
    const cell = (Array.isArray(row?.valores) ? row.valores : []).find(v => v.campo_id === colId);
    if (!cell) return 0;
    return Number(cell.modo_calculo === 'calculado' ? cell.valor_calculado : cell.valor_manual) || 0;
  };

  const ingresosCols = columns.filter(c => c.seccion === 'Ingresos');
  const egresosCols = columns.filter(c => c.seccion === 'Egresos');

  const sumIngresos = ingresosCols.reduce((s, c) => s + getVal(c.id), 0);
  const sumEgresos = egresosCols.reduce((s, c) => s + getVal(c.id), 0);
  const saldo = sumIngresos - sumEgresos;

  return (
    <div className="shrink-0 grid grid-cols-3 gap-0 border-b border-slate-800 bg-slate-900">
      {/* Ingresos */}
      <div className="flex flex-col items-center justify-center py-2 border-r border-slate-800">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total Ingresos</span>
        <span className="font-mono tabular-nums text-lg font-bold text-emerald-400">
          {formatCOP(sumIngresos)}
        </span>
        <span className="text-[9px] text-slate-600">{ingresosCols.length} campos</span>
      </div>

      {/* Egresos */}
      <div className="flex flex-col items-center justify-center py-2 border-r border-slate-800">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Total Egresos</span>
        <span className="font-mono tabular-nums text-lg font-bold text-rose-400">
          {formatCOP(sumEgresos)}
        </span>
        <span className="text-[9px] text-slate-600">{egresosCols.length} campos</span>
      </div>

      {/* Saldo */}
      <div className={`flex flex-col items-center justify-center py-2 ${saldo >= 0 ? 'bg-slate-800/50' : 'bg-rose-950/30'}`}>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Saldo a Entregar</span>
        <span className={`font-mono tabular-nums text-xl font-bold ${saldo >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
          {formatCOP(saldo)}
        </span>
        <span className="text-[9px] text-slate-600">{saldo >= 0 ? 'Favorable' : 'Déficit'}</span>
      </div>
    </div>
  );
});
