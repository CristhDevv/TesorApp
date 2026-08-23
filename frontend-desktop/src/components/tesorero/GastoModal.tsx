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
  "w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm";
const LABEL_CLS = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5";

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

  const fondosDisponibles = camposSafe.filter(
    (c) => Boolean(c?.es_fondo) || c?.id === data.campo_fondo_id
  );

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {data.id ? "Editar Gasto" : "Registrar Gasto de Tesorería"}
              </h2>
              <p className="text-xs text-slate-500">Deducir salida de dinero desde un fondo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-5 space-y-4">
          {/* Fondo selection */}
          <div>
            <label className={LABEL_CLS}>Fondo (Columna a deducir)</label>
            {fondosDisponibles.length === 0 ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  No hay columnas configuradas como <strong>Fondos de Tesorería</strong>. Ve a <strong>Columnas &amp; Fórmulas</strong>, edita la columna deseada y activa <em>«Habilitar como Fondo de Tesorería»</em>.
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
                {fondosDisponibles.map((c) => {
                  const r = resumenSafe.find((item) => item.campo_fondo_id === c.id);
                  const isAcum = r?.es_acumulable ?? c.es_acumulable;
                  const saldo = r ? (isAcum ? r.saldo_acumulado : r.saldo_periodo) : null;
                  return (
                    <option key={c.id} value={c.id}>
                      {isAcum ? "🏛️ [Acumulativo] " : "⚡ [Período] "}
                      {c.nombre}
                      {saldo !== null ? ` (Saldo: ${formatCOP(saldo)})` : ""}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Selected Fund Info Card */}
            {(selectedResumen || selectedCampo) && data.campo_fondo_id && (
              <div className={`mt-2.5 p-3 rounded-xl border text-xs ${
                isAcumulable ? "bg-indigo-50/70 border-indigo-200 text-indigo-950" : "bg-slate-50 border-slate-200 text-slate-800"
              }`}>
                <div className="flex items-center justify-between font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {isAcumulable ? (
                      <>
                        <Coins className="w-4 h-4 text-indigo-600" />
                        <span>Fondo Acumulativo (Histórico)</span>
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 text-slate-600" />
                        <span>Fondo Transitorio (Período)</span>
                      </>
                    )}
                  </span>
                  <span className="text-[11px] font-black text-indigo-700">
                    Saldo: {formatCOP(saldoFondo)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {isAcumulable
                    ? `Este fondo acumula saldos a través de todos los períodos. Recaudo histórico total: ${formatCOP(selectedResumen?.fondo_acumulado ?? 0)}.`
                    : `Este fondo opera con el recaudo del período actual: ${formatCOP(selectedResumen?.fondo_periodo ?? 0)}.`}
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                type="number"
                className={`${INPUT_CLS} pl-7 font-bold text-slate-900`}
                placeholder="0"
                min="1"
                step="1"
                value={data.monto}
                onChange={(e) => setData((d) => ({ ...d, monto: e.target.value }))}
                required
              />
            </div>
            {data.monto && Number(data.monto) > 0 && (
              <p className="mt-1 text-xs font-semibold text-slate-600">{formatCOP(Number(data.monto))}</p>
            )}

            {isOverdrawn && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
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
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            {data.id && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 transition cursor-pointer"
              >
                Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
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
                "Registrar Gasto & Generar Voucher"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
