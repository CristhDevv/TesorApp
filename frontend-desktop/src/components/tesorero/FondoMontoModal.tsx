import React from "react";
import { X, Coins, Calendar, Info } from "lucide-react";
import { formatCOP } from "../../utils/formatters";

interface FondoMontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    fondoId: string;
    fondoNombre: string;
    monto: number;
    fecha: string;
    periodo_id: string;
    observacion?: string;
  };
  setData: React.Dispatch<
    React.SetStateAction<{
      fondoId: string;
      fondoNombre: string;
      monto: number;
      fecha: string;
      periodo_id: string;
      observacion?: string;
    }>
  >;
  periodos?: Array<{ id: string; nombre: string; fecha_inicio?: string; fecha_fin?: string }>;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
}

export function FondoMontoModal({
  isOpen,
  onClose,
  data,
  setData,
  periodos = [],
  onSave,
  saving,
}: FondoMontoModalProps) {
  if (!isOpen) return null;

  const isPastYear = Boolean(
    data.fecha &&
      new Date(data.fecha).getFullYear() < new Date().getFullYear()
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Coins className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Ingresar / Modificar Valor del Fondo</h3>
              <p className="text-[11px] text-emerald-200 truncate max-w-[260px]">
                {data.fondoNombre}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-5 space-y-4">
          {/* Monto Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Monto Recaudado / Ingresado *
              </label>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCOP(data.monto || 0)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="any"
                required
                autoFocus
                className="w-full pl-8 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0"
                value={data.monto || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    monto: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Fecha y Período */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Fecha y Período del Ingreso
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Fecha Exacta:</label>
                <input
                  type="date"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  value={data.fecha}
                  onChange={(e) => {
                    const newFecha = e.target.value;
                    let matchedPeriodoId = data.periodo_id;
                    if (newFecha && periodos.length > 0) {
                      const match = periodos.find((p) => {
                        if (!p.fecha_inicio || !p.fecha_fin) return false;
                        return newFecha >= p.fecha_inicio && newFecha <= p.fecha_fin;
                      });
                      if (match) matchedPeriodoId = match.id;
                      else if (new Date(newFecha) < new Date(periodos[0].fecha_inicio || '2026-01-01')) {
                        matchedPeriodoId = periodos[0].id;
                      }
                    }
                    setData({ ...data, fecha: newFecha, periodo_id: matchedPeriodoId });
                  }}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Período Destino:</label>
                <select
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  value={data.periodo_id}
                  onChange={(e) => setData({ ...data, periodo_id: e.target.value })}
                >
                  {periodos.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      {idx === 0 ? `🔹 ${p.nombre} (Saldo Inicial)` : p.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isPastYear && (
              <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-md flex items-start gap-1.5 text-[10px] text-amber-900 dark:text-amber-200">
                <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Años Anteriores ({new Date(data.fecha).getFullYear()}):</strong> Se acumulará como saldo inicial a partir del primer período.
                </span>
              </div>
            )}
          </div>

          {/* Observación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Observación / Concepto del Dinero (Opcional)
            </label>
            <input
              type="text"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              placeholder="ej. Saldo inicial años anteriores, donación extraordinaria, etc."
              value={data.observacion || ""}
              onChange={(e) => setData({ ...data, observacion: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              {saving ? "Guardando..." : "Actualizar Valor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

