import React from "react";
import { X, Wallet, Building2, Send, Coins, Trash2, CheckCircle2 } from "lucide-react";
import { formatCOP } from "../../utils/formatters";

interface FondoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fondoData: {
    id?: string;
    nombre: string;
    monto: number;
    es_transito: boolean;
    ente_superior_nombre: string;
    es_acumulable: boolean;
  };
  setFondoData: React.Dispatch<
    React.SetStateAction<{
      id?: string;
      nombre: string;
      monto: number;
      es_transito: boolean;
      ente_superior_nombre: string;
      es_acumulable: boolean;
    }>
  >;
  onSave: (e: React.FormEvent) => void;
  onDelete?: () => void;
  saving: boolean;
  periodoNombre: string;
}

export function FondoModal({
  isOpen,
  onClose,
  fondoData,
  setFondoData,
  onSave,
  onDelete,
  saving,
  periodoNombre,
}: FondoModalProps) {
  if (!isOpen) return null;

  const isEditing = Boolean(fondoData.id);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <Wallet className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                {isEditing ? "Modificar Fondo de Tesorería" : "Nuevo Fondo Manual de Tesorería"}
              </h3>
              <p className="text-xs text-indigo-200">
                {isEditing ? `Editando «${fondoData.nombre}»` : "Fondo independiente administrado directamente por el tesorero"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2 text-xs text-indigo-800 dark:text-indigo-300">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span>
            Este fondo <strong>no será una columna de la planilla</strong>. Es un fondo manual de tesorería cuyo monto y gastos son gestionados aquí.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={onSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre del Fondo *
            </label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="ej. Fondo Pro-Templo, Fondo Emergencia, Fondo Misionero"
              value={fondoData.nombre}
              onChange={(e) => setFondoData({ ...fondoData, nombre: e.target.value })}
            />
          </div>

          {/* Monto / Recaudo para el período */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Monto / Recaudo del Fondo ({periodoNombre})
              </label>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {formatCOP(fondoData.monto || 0)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                className="w-full pl-8 pr-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
                value={fondoData.monto || ""}
                onChange={(e) =>
                  setFondoData({
                    ...fondoData,
                    monto: e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Dinero ingresado o recaudado para este fondo en el período actual. Puedes ajustarlo cuando lo necesites.
            </p>
          </div>

          {/* Tipo de Fondo: Propio vs En Tránsito */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Destino / Naturaleza del Dinero
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFondoData({ ...fondoData, es_transito: false })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  !fondoData.es_transito
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 ring-1 ring-indigo-600"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className={`w-4 h-4 ${!fondoData.es_transito ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Fondo Propio</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Queda en la Caja de la Zona para gastos locales.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFondoData({ ...fondoData, es_transito: true })}
                className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                  fondoData.es_transito
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-500"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className={`w-4 h-4 ${fondoData.es_transito ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">En Tránsito</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Para ser girado a la directiva nacional o ente superior.
                </p>
              </button>
            </div>
          </div>

          {/* Ente Superior (si es en tránsito) */}
          {fondoData.es_transito && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-1">
              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase">
                Nombre del Ente Superior / Destinatario *
              </label>
              <input
                type="text"
                required={fondoData.es_transito}
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-600"
                placeholder="ej. Directiva Nacional, Distrito 3, Misiones Nacionales"
                value={fondoData.ente_superior_nombre}
                onChange={(e) => setFondoData({ ...fondoData, ente_superior_nombre: e.target.value })}
              />
            </div>
          )}

          {/* Acumulativo toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <input
              type="checkbox"
              id="es_acumulable_fondo"
              checked={fondoData.es_acumulable}
              onChange={(e) => setFondoData({ ...fondoData, es_acumulable: e.target.checked })}
              className="mt-0.5 accent-indigo-600 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="es_acumulable_fondo" className="text-xs cursor-pointer">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-indigo-500" />
                Fondo Acumulativo (Recomendado)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                El saldo no gastado se traslada y acumula automáticamente mes tras mes.
              </p>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Fondo
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer"
              >
                {saving ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Fondo"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
