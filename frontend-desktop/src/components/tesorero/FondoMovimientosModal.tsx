import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ResumenFondo } from './GastosPanel';

export interface MovimientoItem {
  id: string;
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  monto: number;
  descripcion: string;
  observacion?: string | null;
  periodo_nombre?: string | null;
  creado_por_nombre?: string | null;
  creado_en: string;
  saldo_resultante: number;
  es_manual?: boolean;
}

export interface FondoMovimientosData {
  campo_fondo: {
    id: string;
    nombre: string;
    slug: string;
    es_acumulable: boolean;
    es_transito: boolean;
    ente_superior_nombre?: string | null;
  };
  total_ingresos: number;
  total_egresos: number;
  saldo_actual: number;
  movimientos: MovimientoItem[];
}

interface FondoMovimientosModalProps {
  isOpen: boolean;
  onClose: () => void;
  fondo: ResumenFondo | null;
  apiBase: string;
  token: string;
  onOpenNewIngreso: (fondo: ResumenFondo) => void;
  onDeleteIngreso: (ingresoId: string) => Promise<void>;
  onDeleteGasto?: (gastoId: string) => Promise<void>;
}

export const FondoMovimientosModal: React.FC<FondoMovimientosModalProps> = ({
  isOpen,
  onClose,
  fondo,
  apiBase,
  token,
  onOpenNewIngreso,
  onDeleteIngreso,
}) => {
  const [data, setData] = useState<FondoMovimientosData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMovimientos = async () => {
    if (!fondo) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/gastos/fondos/${fondo.campo_fondo_id}/movimientos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el historial de movimientos.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error al obtener movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fondo) {
      fetchMovimientos();
    } else {
      setData(null);
    }
  }, [isOpen, fondo]);

  if (!isOpen || !fondo) return null;

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  const handleDeleteItem = async (mov: MovimientoItem) => {
    if (mov.tipo !== 'ingreso') return;
    const ok = window.confirm(
      `¿Estás seguro de eliminar este ingreso de ${formatCOP(mov.monto)} ("${mov.descripcion}")?`
    );
    if (!ok) return;

    setDeletingId(mov.id);
    try {
      await onDeleteIngreso(mov.id);
      await fetchMovimientos();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Libro de Movimientos del Fondo
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {fondo.campo_fondo_nombre}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Historial cronológico de ingresos (entradas) y egresos (salidas)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenNewIngreso(fondo)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              + Ingreso / Aporte
            </button>
            <button
              onClick={fetchMovimientos}
              disabled={loading}
              title="Refrescar"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Totals Summary Banner */}
        <div className="p-4 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span>Total Ingresos (+)</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
              {formatCOP(data?.total_ingresos ?? fondo.fondo_acumulado)}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
              <span>Total Egresos (−)</span>
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="text-base font-black text-rose-600 dark:text-rose-400">
              −{formatCOP(data?.total_egresos ?? fondo.gastos_acumulados)}
            </div>
          </div>

          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
            <div className="flex items-center justify-between text-xs text-indigo-800 dark:text-indigo-300 font-bold mb-1">
              <span>Saldo Real en Caja</span>
              <Wallet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-base font-black text-indigo-700 dark:text-indigo-300">
              {formatCOP(data?.saldo_actual ?? fondo.saldo_acumulado)}
            </div>
          </div>
        </div>

        {/* Movements Timeline Table */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
          {loading && !data ? (
            <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
              Cargando movimientos del fondo...
            </div>
          ) : error ? (
            <div className="p-4 my-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : !data?.movimientos || data.movimientos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No hay movimientos registrados para este fondo todavía.
            </div>
          ) : (
            <div className="space-y-2">
              {data.movimientos.map((mov) => {
                const isIngreso = mov.tipo === 'ingreso';
                return (
                  <div
                    key={mov.id}
                    className="p-3.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/50 transition-all flex items-start justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isIngreso
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400'
                            : 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIngreso ? (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                              isIngreso
                                ? 'bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-100/80 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isIngreso ? 'Ingreso / Aporte' : 'Egreso / Gasto'}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {mov.fecha}
                          </span>
                          {mov.periodo_nombre && (
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                              {mov.periodo_nombre}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">
                          {mov.descripcion}
                        </p>

                        {mov.observacion && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">
                            Nota: {mov.observacion}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-3">
                      <div>
                        <div
                          className={`text-sm font-black ${
                            isIngreso
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIngreso ? '+' : '−'}
                          {formatCOP(mov.monto)}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                          Saldo: {formatCOP(mov.saldo_resultante)}
                        </div>
                      </div>

                      {isIngreso && mov.es_manual !== false && (
                        <button
                          onClick={() => handleDeleteItem(mov)}
                          disabled={deletingId === mov.id}
                          title="Eliminar ingreso"
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {data?.movimientos.length || 0} movimiento(s) registrado(s)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
