import React from "react";
import { X, DollarSign, AlertTriangle, Coins, Wallet, AlertCircle } from "lucide-react";
import { formatCOP } from "../../utils/formatters";
import type { ResumenFondo } from "./GastosPanel";

interface Campo {
  id: string;
  nombre: string;
  tipo: string;
  es_acumulable?: boolean;
  es_fondo?: boolean;
}

interface GastoModalData {
  id: string;
  descripcion: string;
  monto: string;
  fecha: string;
  campo_fondo_id: string;
  periodo_id: string;
}

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GastoModalData;
  setData: React.Dispatch<React.SetStateAction<GastoModalData>>;
  onSave: (e: React.FormEvent) => void;
  onDelete?: () => void;
  saving: boolean;
  campos: Campo[];
  resumen?: ResumenFondo[];
  periodos: { id: string; nombre: string; estado: string }[];
  selectedPeriodoId?: string;
}

const INPUT_CLS =
  "w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 text-xs font-medium";
const LABEL_CLS = "block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5";

export function GastoModal({
  isOpen,
  onClose,
  data,
  setData,
  onSave,
  onDelete,
  saving,
  campos = [],
  resumen = [],
  periodos = [],
}: GastoModalProps) {
  if (!isOpen) return null;

  const camposSafe = Array.isArray(campos) ? campos : [];
  const resumenSafe = Array.isArray(resumen) ? resumen : [];

  // Combine all funds from resumen (which includes manual funds) + any fund in campos
  const allFondosMap = new Map<
    string,
    {
      id: string;
      nombre: string;
      es_acumulable?: boolean;
      es_transito?: boolean;
      es_manual?: boolean;
      saldo: number;
    }
  >();

  for (const r of resumenSafe) {
    allFondosMap.set(r.campo_fondo_id, {
      id: r.campo_fondo_id,
      nombre: r.campo_fondo_nombre,
      es_acumulable: r.es_acumulable,
      es_transito: r.es_transito,
      es_manual: r.es_manual,
      saldo: r.saldo_disponible ?? r.saldo_acumulado ?? r.saldo_periodo ?? 0,
    });
  }

  for (const c of camposSafe) {
    if ((c.es_fondo || c.id === data.campo_fondo_id) && !allFondosMap.has(c.id)) {
      allFondosMap.set(c.id, {
        id: c.id,
        nombre: c.nombre,
        es_acumulable: c.es_acumulable,
        es_transito: false,
        es_manual: false,
        saldo: 0,
      });
    }
  }

  const fondosDisponibles = Array.from(allFondosMap.values());

  // Find info about the currently selected fund
  const selectedResumen = resumenSafe.find((r) => r.campo_fondo_id === data.campo_fondo_id);
  const selectedCampo = camposSafe.find((c) => c.id === data.campo_fondo_id);
  const isAcumulable = Boolean(selectedResumen?.es_acumulable ?? selectedCampo?.es_acumulable ?? false);

  const numMonto = Number(data.monto || 0);
  const saldoFondo = selectedResumen
    ? (isAcumulable ? Number(selectedResumen.saldo_acumulado ?? 0) : Number(selectedResumen.saldo_periodo ?? 0))
    : 0;

  const isOverdrawn = selectedResumen && numMonto > 0 && numMonto > saldoFondo;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md my-auto max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header (Never pushed offscreen) */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {data.id ? "Editar Gasto" : "Registrar Gasto de Tesorería"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Deducir salida de dinero desde un fondo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={onSave} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Fondo selection */}
          <div>
            <label className={LABEL_CLS}>Fondo (Columna a deducir)</label>
            {fondosDisponibles.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  No hay columnas o fondos manuales registrados en Tesorería.
                </p>
              </div>
            ) : (
              <select
                className={INPUT_CLS}
                value={data.campo_fondo_id}
                onChange={(e) => setData((d) => ({ ...d, campo_fondo_id: e.target.value }))}
                required
              >
                <option value="">— Seleccionar fondo de tesorería —</option>
                {fondosDisponibles.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.es_manual ? "✍️ [Manual] " : f.es_acumulable ? "🏛️ [Acumulativo] " : "⚡ [Período] "}
                    {f.nombre} (Saldo: {formatCOP(f.saldo)})
                  </option>
                ))}
              </select>
            )}

            {/* Selected Fund Info Card */}
            {(selectedResumen || selectedCampo) && data.campo_fondo_id && (
              <div className={`mt-2.5 p-3 rounded-xl border text-xs ${
                isAcumulable 
                  ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200" 
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              }`}>
                <div className="flex items-center justify-between font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {isAcumulable ? (
                      <>
                        <Coins className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Fondo Acumulativo (Histórico)</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <span>Fondo Transitorio (Período)</span>
                      </>
                    )}
                  </span>
                  <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">
                    Saldo: {formatCOP(saldoFondo)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isAcumulable
                    ? `Este fondo acumula saldos a través de todos los períodos. Recaudo histórico total: ${formatCOP(selectedResumen?.fondo_acumulado ?? selectedResumen?.total_fondo ?? saldoFondo)}.`
                    : `Este fondo opera con el recaudo del período actual: ${formatCOP(selectedResumen?.fondo_periodo ?? selectedResumen?.total_fondo ?? saldoFondo)}.`}
                </p>
              </div>
            )}
          </div>

          {/* Descripcion */}
          <div>
            <label className={LABEL_CLS}>Descripción del Gasto</label>
            <input
              type="text"
              className={INPUT_CLS}
              placeholder="Ej: Aporte Misionero, Compra de Instrumentos..."
              value={data.descripcion}
              onChange={(e) => setData((d) => ({ ...d, descripcion: e.target.value }))}
              required
            />
          </div>

          {/* Monto */}
          <div>
            <label className={LABEL_CLS}>Monto a Deducir</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                className={`${INPUT_CLS} pl-8 font-bold text-slate-900 dark:text-white`}
                placeholder="0"
                min="1"
                step="1"
                value={data.monto}
                onChange={(e) => setData((d) => ({ ...d, monto: e.target.value }))}
                required
              />
            </div>
            {data.monto && Number(data.monto) > 0 ? (
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">{formatCOP(Number(data.monto))}</p>
            ) : null}

            {isOverdrawn && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-2 rounded-lg border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Advertencia: El monto supera el saldo disponible ({formatCOP(saldoFondo)}).</span>
              </div>
            )}
          </div>

          {/* Fecha */}
          <div>
            <label className={LABEL_CLS}>Fecha del Gasto</label>
            <input
              type="date"
              className={INPUT_CLS}
              value={data.fecha}
              onChange={(e) => setData((d) => ({ ...d, fecha: e.target.value }))}
              required
            />
          </div>

          {/* Periodo */}
          <div>
            <label className={LABEL_CLS}>Período Contable</label>
            <select
              className={INPUT_CLS}
              value={data.periodo_id}
              onChange={(e) => setData((d) => ({ ...d, periodo_id: e.target.value }))}
              required
            >
              <option value="">— Seleccionar período —</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id} disabled={p.estado === "cerrado"}>
                  {p.nombre} {p.estado === "cerrado" ? "(cerrado)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {data.id && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
              >
                Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || fondosDisponibles.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition shadow-sm flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : data.id ? (
                "Guardar Cambios"
              ) : (
                "Registrar Gasto"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
