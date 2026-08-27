import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  Loader2,
  Lock,
  Send,
  Building2,
  Calendar,
  Layers,
  AlertCircle,
  Clock,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import type { FilaGrid, ColumnaGrid, Periodo } from '../../types/contabilidad';

interface ChurchReportFormProps {
  row: FilaGrid;
  columns: ColumnaGrid[];
  periodo?: Periodo;
  isPeriodOpen: boolean;
  onSaveCell: (churchId: string, fieldId: string, value: string) => Promise<void> | void;
  onBatchSave: (churchId: string, values: Record<string, number>) => Promise<void>;
  onSendMonthlyReport?: (churchId: string, periodoId: string) => Promise<void> | void;
}

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

const formatCOP = (val: number | string | null | undefined): string => {
  const num = Number(val ?? 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO');
};

export const ChurchReportForm = React.memo(function ChurchReportForm({
  row,
  columns,
  periodo,
  isPeriodOpen,
  onBatchSave,
  onSendMonthlyReport,
}: ChurchReportFormProps) {
  const getServerVal = useCallback(
    (colId: string) => {
      const vals = Array.isArray(row?.valores) ? row.valores : [];
      const cell = vals.find((v) => v.campo_id === colId);
      if (!cell) return 0;
      return (
        Number(
          cell.modo_calculo === 'calculado'
            ? cell.valor_calculado
            : cell.valor_manual
        ) || 0
      );
    },
    [row?.valores]
  );

  const [localValues, setLocalValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const col of columns) {
      if (col.modo_calculo === 'manual') {
        init[col.id] = getServerVal(col.id);
      }
    }
    return init;
  });

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [sendingReport, setSendingReport] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValuesRef = useRef<Record<string, number>>(localValues);
  latestValuesRef.current = localValues;

  const currentEstado = row.estado_informe || 'borrador';
  const isReportLocked = currentEstado !== 'borrador';
  const isFormBlocked = !isPeriodOpen || isReportLocked;

  // Sync with incoming server state when church, period or row values update
  useEffect(() => {
    const next: Record<string, number> = {};
    for (const col of columns) {
      if (col.modo_calculo === 'manual') {
        next[col.id] = getServerVal(col.id);
      }
    }
    setLocalValues(next);
    setSaveStatus('saved');
  }, [row?.iglesia_id, periodo?.id, row?.valores?.length, getServerVal, columns]);

  // Debounced auto-save function (800ms)
  const triggerAutoSave = useCallback(
    (newValues: Record<string, number>) => {
      if (isFormBlocked) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setSaveStatus('dirty');

      debounceTimerRef.current = setTimeout(async () => {
        setSaveStatus('saving');
        try {
          await onBatchSave(row.iglesia_id, newValues);
          setSaveStatus('saved');
        } catch {
          setSaveStatus('error');
        }
      }, 800);
    },
    [isFormBlocked, onBatchSave, row.iglesia_id]
  );

  const handleInputChange = (colId: string, valStr: string) => {
    if (isFormBlocked) return;
    const num = parseFloat(valStr) || 0;
    const updated = { ...localValues, [colId]: num };
    setLocalValues(updated);
    triggerAutoSave(updated);
  };

  const handleSendReport = async () => {
    if (!periodo || isFormBlocked || sendingReport) return;
    setSendingReport(true);
    try {
      if (onSendMonthlyReport) {
        await onSendMonthlyReport(row.iglesia_id, periodo.id);
      }
    } catch (err) {
      console.error('Error enviando informe', err);
    } finally {
      setSendingReport(false);
    }
  };

  // Group columns into categories:
  // 1. Ingresos manuales
  const ingresosCols = columns.filter(
    (c) => (c.seccion_iglesia || c.seccion) === 'Ingresos' && c.modo_calculo === 'manual'
  );

  // DEBUG: log what we received
  const debugInfo = `Total cols: ${columns.length} | Ingresos: ${ingresosCols.length} | Secciones: ${[...new Set(columns.map(c => c.seccion_iglesia || c.seccion))].join(', ')}`;


  // 2. Egresos manuales
  const egresosCols = columns.filter(
    (c) => (c.seccion_iglesia || c.seccion) === 'Egresos' && c.modo_calculo === 'manual'
  );

  // 3. Otros campos manuales (Informativos, Aportes, Pastorales como Diezmo Personal, Ofrenda Misionera)
  const informativosManualCols = columns.filter(
    (c) =>
      c.modo_calculo === 'manual' &&
      (c.seccion_iglesia || c.seccion) !== 'Ingresos' &&
      (c.seccion_iglesia || c.seccion) !== 'Egresos'
  );

  // 4. Cálculos automáticos (estrictamente modo_calculo === 'calculado')
  const calculosCols = columns.filter((c) => c.modo_calculo === 'calculado');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-3 sm:p-6 flex flex-col items-center">
      {/* 400-480px centered mobile-first container */}
      <div className="w-full max-w-[480px] space-y-4 pb-12">
        {/* HEADER SIMPLE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold text-base">
                <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <h1 className="truncate">{row.iglesia_nombre}</h1>
              </div>
              {row.codigo && (
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  Código: {row.codigo}
                </p>
              )}
            </div>

            {/* Auto-save badge */}
            <div className="shrink-0">
              {saveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[10px] font-bold shadow-xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Guardado
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-[10px] font-bold shadow-xs">
                  <Loader2 className="w-3 h-3 text-blue-600 dark:text-blue-400 animate-spin" />
                  Guardando...
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold shadow-xs">
                  ● Editando...
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-bold shadow-xs">
                  Error al guardar
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {periodo?.nombre || 'Período Contable'}
            </span>
          </div>
        </div>

        {/* WORKFLOW STATUS BANNERS */}
        {currentEstado === 'enviado' && (
          <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5 shadow-2xs">
            <Send className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informe Enviado a Tesorería</p>
              <p className="text-indigo-800/80 dark:text-indigo-300/80 mt-0.5 text-[11px]">
                Tu informe mensual fue recibido por tesorería y se encuentra en cola de revisión. La edición ha sido bloqueada automáticamente para proteger los datos.
              </p>
              {row.informe_meta?.enviado_en && (
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                  Enviado el {new Date(row.informe_meta.enviado_en).toLocaleString('es-CO')}
                </p>
              )}
            </div>
          </div>
        )}

        {currentEstado === 'en_revision' && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-2xs">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informe en Revisión por Tesorería</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-[11px]">
                El tesorero está verificando los soportes y cálculos de este informe.
              </p>
              {row.informe_meta?.observaciones && (
                <div className="mt-2 p-2 bg-white/80 dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-950 dark:text-amber-200 font-medium">
                  <span className="font-bold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-amber-700 dark:text-amber-400" /> Nota del tesorero:
                  </span>
                  <p className="mt-0.5">{row.informe_meta.observaciones}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentEstado === 'aprobado' && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2.5 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informe Aprobado Formalmente</p>
              <p className="text-emerald-800 dark:text-emerald-300 mt-0.5 text-[11px]">
                ¡Excelente! Las cifras de tu congregación han sido aprobadas por tesorería y quedan registradas oficialmente.
              </p>
              {row.informe_meta?.aprobado_en && (
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                  Aprobado el {new Date(row.informe_meta.aprobado_en).toLocaleString('es-CO')}
                </p>
              )}
            </div>
          </div>
        )}

        {currentEstado === 'consolidado' && (
          <div className="bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informe Consolidado</p>
              <p className="text-purple-800 dark:text-purple-300 mt-0.5 text-[11px]">
                Este informe forma parte del balance contable consolidado del período.
              </p>
            </div>
          </div>
        )}

        {currentEstado === 'borrador' && row.informe_meta?.observaciones && (
          <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informe Devuelto para Corrección</p>
              <p className="text-rose-800 dark:text-rose-300 mt-0.5 text-[11px]">
                El tesorero ha desbloqueado tu informe para que realices los ajustes necesarios:
              </p>
              <div className="mt-2 p-2 bg-white/80 dark:bg-slate-800/80 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-950 dark:text-rose-200 font-medium">
                <span className="font-bold">Observación:</span>
                <p className="mt-0.5">{row.informe_meta.observaciones}</p>
              </div>
            </div>
          </div>
        )}

        {/* PERIOD CLOSED BANNER */}
        {!isPeriodOpen && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 shadow-xs">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Período Cerrado por Tesorería</p>
              <p className="text-amber-800 dark:text-amber-300 mt-0.5 text-[11px]">
                Este período mensual se encuentra cerrado. Los valores mostrados son definitivos y en modo solo lectura.
              </p>
            </div>
          </div>
        )}

        {/* TARJETA 1: INGRESOS */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              1. Ingresos
            </h2>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              {formatCOP(
                ingresosCols.reduce(
                  (acc, c) => acc + (localValues[c.id] ?? getServerVal(c.id)),
                  0
                )
              )}
            </span>
          </div>

          <div className="space-y-3">
            {ingresosCols.length === 0 ? (
              <>
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay campos de ingresos configurados.</p>
                <p className="text-[10px] font-mono text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded">[DEBUG] {debugInfo}</p>
              </>
            ) : (
              ingresosCols.map((col) => {
                const vals = Array.isArray(row?.valores) ? row.valores : [];
                const cell = vals.find((v) => v.campo_id === col.id);
                const isBlocked = isFormBlocked || cell?.editable === false;

                return (
                  <div key={col.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={`input-${col.id}`}
                        className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        <span>{col.nombre}</span>
                        {isBlocked && (
                          <span title="Campo bloqueado para edición">
                            <Lock className="w-3 h-3 text-slate-400 inline" />
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">COP</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 pointer-events-none">
                        $
                      </span>
                      <input
                        id={`input-${col.id}`}
                        type="number"
                        inputMode="numeric"
                        disabled={isBlocked}
                        value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        className={`w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-right font-mono font-bold text-sm text-slate-900 dark:text-white transition-colors focus:outline-none ${
                          isBlocked
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TARJETA 2: EGRESOS / RETENCIONES */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              2. Egresos y Retenciones
            </h2>
            <span className="font-mono text-rose-700 dark:text-rose-400 text-xs font-bold">
              {formatCOP(
                egresosCols.reduce(
                  (acc, c) => acc + (localValues[c.id] ?? getServerVal(c.id)),
                  0
                )
              )}
            </span>
          </div>

          <div className="space-y-3">
            {egresosCols.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">No hay campos de egresos configurados.</p>
            ) : (
              egresosCols.map((col) => {
                const vals = Array.isArray(row?.valores) ? row.valores : [];
                const cell = vals.find((v) => v.campo_id === col.id);
                const isBlocked = isFormBlocked || cell?.editable === false;

                return (
                  <div key={col.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={`input-${col.id}`}
                        className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        <span>{col.nombre}</span>
                        {isBlocked && (
                          <span title="Campo bloqueado para edición">
                            <Lock className="w-3 h-3 text-slate-400 inline" />
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">COP</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 pointer-events-none">
                        $
                      </span>
                      <input
                        id={`input-${col.id}`}
                        type="number"
                        inputMode="numeric"
                        disabled={isBlocked}
                        value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        className={`w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-right font-mono font-bold text-sm text-slate-900 dark:text-white transition-colors focus:outline-none ${
                          isBlocked
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* TARJETA 3: APORTES & DATOS INFORMATIVOS (MANUALES) */}
        {informativosManualCols.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                3. Aportes & Datos Informativos
              </h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Ingreso manual</span>
            </div>

            <div className="space-y-3">
              {informativosManualCols.map((col) => {
                const vals = Array.isArray(row?.valores) ? row.valores : [];
                const cell = vals.find((v) => v.campo_id === col.id);
                const isBlocked = isFormBlocked || cell?.editable === false;

                return (
                  <div key={col.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={`input-${col.id}`}
                        className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                      >
                        <span>{col.nombre}</span>
                        {isBlocked && (
                          <span title="Campo bloqueado para edición">
                            <Lock className="w-3 h-3 text-slate-400 inline" />
                          </span>
                        )}
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">COP</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2 font-mono text-xs text-slate-400 pointer-events-none">
                        $
                      </span>
                      <input
                        id={`input-${col.id}`}
                        type="number"
                        inputMode="numeric"
                        disabled={isBlocked}
                        value={localValues[col.id] === 0 ? '' : localValues[col.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => handleInputChange(col.id, e.target.value)}
                        className={`w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-right font-mono font-bold text-sm text-slate-900 dark:text-white transition-colors focus:outline-none ${
                          isBlocked
                            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            : 'border-slate-300 dark:border-slate-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TARJETA 4: CÁLCULOS (SOLO LECTURA) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              4. Cálculos y Saldo
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Automático</span>
          </div>

          <div className="space-y-2">
            {calculosCols.map((col) => {
              const vals = Array.isArray(row?.valores) ? row.valores : [];
              const cell = vals.find((v) => v.campo_id === col.id);
              const isCalc = col.modo_calculo === 'calculado';
              const val = isCalc ? cell?.valor_calculado : cell?.valor_manual;

              return (
                <div
                  key={col.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {col.nombre}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-sm font-extrabold text-blue-700 dark:text-blue-300 shrink-0">
                    {formatCOP(val ?? 0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTÓN ENVIAR REPORTE DEL MES */}
        {isPeriodOpen && currentEstado === 'borrador' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSendReport}
              disabled={sendingReport}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white cursor-pointer disabled:opacity-50"
            >
              {sendingReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando a Tesorería...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Informe a Tesorería
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center mt-1.5">
              Al enviar tu informe, se notificará a tesorería para su revisión formal y el formulario quedará protegido.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
