import { useState } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  Send,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Building2,
  Calendar,
  MessageSquare,
  FileCheck,
} from "lucide-react";
import type { FilaGrid, EstadoInforme, Periodo } from "../../types/contabilidad";

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: FilaGrid | null;
  periodo?: Periodo;
  onChangeStatus: (
    iglesiaId: string,
    periodoId: string,
    estado: EstadoInforme,
    observaciones?: string,
  ) => Promise<void>;
}

export function WorkflowModal({
  isOpen,
  onClose,
  row,
  periodo,
  onChangeStatus,
}: WorkflowModalProps) {
  const [observaciones, setObservaciones] = useState(row?.informe_meta?.observaciones || "");
  const [saving, setSaving] = useState(false);

  if (!isOpen || !row || !periodo) return null;

  const currentEstado = row.estado_informe || "borrador";

  const handleAction = async (nuevoEstado: EstadoInforme) => {
    setSaving(true);
    try {
      await onChangeStatus(row.iglesia_id, periodo.id, nuevoEstado, observaciones);
      onClose();
    } catch (err) {
      console.error("Error cambiando estado del informe", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Flujo de Aprobación de Informe
              </h3>
              <p className="text-xs text-slate-500">
                Revisión y control formal de informe contable
              </p>
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Church & Period Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-900">{row.iglesia_nombre}</p>
                <p className="text-[11px] text-slate-500">
                  Pastor: {row.nombre_pastor || "No asignado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{periodo.nombre}</span>
            </div>
          </div>

          {/* Current Status Tracker */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
              Estado Actual del Informe
            </label>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {/* Step 1: Borrador */}
              <div
                className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 ${
                  currentEstado === "borrador"
                    ? "bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-400/20"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Borrador</span>
              </div>

              {/* Step 2: Enviado */}
              <div
                className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 ${
                  currentEstado === "enviado"
                    ? "bg-indigo-50 border-indigo-400 text-indigo-800 ring-2 ring-indigo-400/20"
                    : currentEstado === "en_revision" ||
                      currentEstado === "aprobado" ||
                      currentEstado === "consolidado"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviado</span>
              </div>

              {/* Step 3: En Revisión */}
              <div
                className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 ${
                  currentEstado === "en_revision"
                    ? "bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-400/20"
                    : currentEstado === "aprobado" || currentEstado === "consolidado"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>En Revisión</span>
              </div>

              {/* Step 4: Aprobado */}
              <div
                className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 ${
                  currentEstado === "aprobado"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20"
                    : currentEstado === "consolidado"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprobado</span>
              </div>

              {/* Step 5: Consolidado */}
              <div
                className={`p-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 ${
                  currentEstado === "consolidado"
                    ? "bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-500/20"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Consolidado</span>
              </div>
            </div>
          </div>

          {/* Audit Metadata */}
          {row.informe_meta && (
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600">
              {row.informe_meta.enviado_en && (
                <p>
                  • <strong>Enviado:</strong>{" "}
                  {new Date(row.informe_meta.enviado_en).toLocaleString("es-CO")}{" "}
                  {row.informe_meta.enviado_por && `por ${row.informe_meta.enviado_por}`}
                </p>
              )}
              {row.informe_meta.revisado_en && (
                <p>
                  • <strong>En Revisión:</strong>{" "}
                  {new Date(row.informe_meta.revisado_en).toLocaleString("es-CO")}{" "}
                  {row.informe_meta.revisado_por && `por ${row.informe_meta.revisado_por}`}
                </p>
              )}
              {row.informe_meta.aprobado_en && (
                <p>
                  • <strong>Aprobado:</strong>{" "}
                  {new Date(row.informe_meta.aprobado_en).toLocaleString("es-CO")}{" "}
                  {row.informe_meta.aprobado_por && `por ${row.informe_meta.aprobado_por}`}
                </p>
              )}
            </div>
          )}

          {/* Observaciones Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-slate-400" />
              Observaciones / Retroalimentación para el Pastor
            </label>
            <textarea
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escribe notas, observaciones o motivos de devolución para la iglesia..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
              Acciones de Tesorería
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* Aprobar */}
              <button
                type="button"
                onClick={() => handleAction("aprobado")}
                disabled={saving || currentEstado === "aprobado" || currentEstado === "consolidado"}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprobar Informe</span>
              </button>

              {/* Poner en revisión */}
              <button
                type="button"
                onClick={() => handleAction("en_revision")}
                disabled={saving || currentEstado === "en_revision"}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Poner en Revisión</span>
              </button>

              {/* Devolver a Borrador */}
              <button
                type="button"
                onClick={() => handleAction("borrador")}
                disabled={saving || currentEstado === "borrador"}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                <span>Devolver a Borrador</span>
              </button>

              {/* Consolidar */}
              <button
                type="button"
                onClick={() => handleAction("consolidado")}
                disabled={saving || currentEstado === "consolidado"}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Consolidar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
