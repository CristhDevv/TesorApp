import React from "react";
import { X, Coins, CheckCircle2 } from "lucide-react";
import { formatCOP } from "../../utils/formatters";

interface FondoMontoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    fondoId: string;
    fondoNombre: string;
    monto: number;
    observacion?: string;
  };
  setData: React.Dispatch<
    React.SetStateAction<{
      fondoId: string;
      fondoNombre: string;
      monto: number;
      observacion?: string;
    }>
  >;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  periodoNombre: string;
}

export function FondoMontoModal({
  isOpen,
  onClose,
  data,
  setData,
  onSave,
  saving,
  periodoNombre,
}: FondoMontoModalProps) {
  if (!isOpen) return null;

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
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Período Contable: {periodoNombre}</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                El monto ingresado aquí sumará al recaudo de este fondo para este período.
              </p>
            </div>
          </div>

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
                step="1000"
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

          {/* Observación */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Observación / Origen del dinero (Opcional)
            </label>
            <input
              type="text"
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              placeholder="ej. Aporte especial, donación, recaudo convención, etc."
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
