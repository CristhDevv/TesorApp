import React from 'react';
import { FunctionSquare, ArrowRight } from 'lucide-react';
import type { EditingCell, ColumnaGrid, FilaGrid, Campo } from '../../types/contabilidad';
import { HelpTooltip } from '../common/HelpTooltip';

interface FormulaBarProps {
  activeCell: EditingCell | null;
  columns: ColumnaGrid[];
  rows: FilaGrid[];
  campos: Campo[];
}

const formatCOP = (val: number | string | null | undefined): string => {
  const num = Number(val ?? 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO');
};

export const FormulaBar = React.memo(function FormulaBar({
  activeCell,
  columns,
  rows,
  campos,
}: FormulaBarProps) {
  if (!activeCell) {
    return (
      <div className="h-[28px] bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-400 select-none shrink-0 font-mono">
        <div className="flex items-center gap-2">
          <FunctionSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 font-sans italic text-[10px]">
            Selecciona una celda para inspeccionar su fórmula y dependencias
          </span>
        </div>
        <HelpTooltip
          title="Barra de Fórmulas Contables"
          text="Al hacer clic sobre cualquier celda de la planilla, aquí verás la fórmula matemática que la calcula, su valor resultante y las columnas de las que depende."
        />
      </div>
    );
  }

  const row = rows.find((r) => r.iglesia_id === activeCell.churchId);
  const col = columns.find((c) => c.id === activeCell.fieldId);
  const cellVal = row?.valores?.find((v) => v.campo_id === activeCell.fieldId);

  const isCalc = col?.modo_calculo === 'calculado' || cellVal?.modo_calculo === 'calculado';
  const displayVal = isCalc ? cellVal?.valor_calculado : cellVal?.valor_manual;
  const isOverridden = isCalc && cellVal?.valor_manual != null && cellVal?.valor_manual !== 0;
  const formula = col?.formula ?? cellVal?.formula;

  // Extract variables used in the formula
  const usedSlugs = formula ? formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [] : [];
  const validDeps = usedSlugs
    .map((slug) => campos.find((c) => c.slug === slug || c.id === slug))
    .filter(Boolean) as Campo[];

  return (
    <div className="h-[28px] bg-slate-50 border-b border-slate-200 px-3 flex items-center gap-2 text-[11px] select-none shrink-0 overflow-x-auto text-slate-800">
      {/* Active cell coordinates badge */}
      <div className="flex items-center gap-1 shrink-0 bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-700 shadow-2xs">
        <span className="font-bold truncate max-w-[110px] text-indigo-700">
          {row?.iglesia_nombre ?? 'Iglesia'}
        </span>
        <ArrowRight className="w-2.5 h-2.5 text-slate-400 shrink-0" />
        <span className="font-bold truncate max-w-[100px] text-slate-900">
          {col?.nombre ?? 'Campo'}
        </span>
      </div>

      {/* Mode badge */}
      <span
        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
          isOverridden
            ? 'bg-amber-100 text-amber-900 border-amber-300'
            : isCalc
            ? 'bg-blue-100 text-blue-900 border-blue-300'
            : 'bg-slate-200 text-slate-700 border-slate-300'
        }`}
      >
        {isOverridden ? 'Sobrescrito' : isCalc ? 'Fórmula' : 'Manual'}
      </span>

      {/* Formula icon & formula expression */}
      <div className="flex items-center gap-1.5 font-mono text-[11px] min-w-0 flex-1">
        <FunctionSquare
          className={`w-3.5 h-3.5 shrink-0 ${
            isCalc ? 'text-blue-600' : 'text-slate-400'
          }`}
        />
        {isCalc && formula ? (
          <span className="font-bold text-blue-800 truncate" title={formula}>
            = {formula}
          </span>
        ) : (
          <span className="text-slate-400 font-sans italic text-[10px]">
            (Valor manual directo)
          </span>
        )}
      </div>

      {/* Computed / Actual value */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200 font-mono text-[11px]">
        <span className="text-slate-500 text-[10px]">Valor:</span>
        <span
          className={`font-bold tabular-nums ${
            isOverridden
              ? 'text-amber-800'
              : isCalc
              ? 'text-blue-800'
              : 'text-slate-900'
          }`}
        >
          {formatCOP(displayVal)}
        </span>
      </div>

      {/* Upstream dependencies pills */}
      {validDeps.length > 0 && (
        <div className="hidden lg:flex items-center gap-1 shrink-0 pl-2 border-l border-slate-200 text-[10px]">
          <span className="text-slate-400 text-[9px]">Depende de:</span>
          {validDeps.slice(0, 3).map((dep) => (
            <span
              key={dep.id}
              className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-700"
              title={`Slug: ${dep.slug}`}
            >
              {dep.nombre}
            </span>
          ))}
          {validDeps.length > 3 && (
            <span className="text-slate-400 text-[9px]">
              +{validDeps.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
