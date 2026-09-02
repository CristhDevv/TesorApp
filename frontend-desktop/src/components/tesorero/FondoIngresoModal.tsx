import React, { useState, useEffect } from 'react';
import { X, ArrowUpRight, Calendar, FileText, Check } from 'lucide-react';
import { ResumenFondo } from './GastosPanel';

interface FondoIngresoModalProps {
  isOpen: boolean;
  onClose: () => void;
  fondo: ResumenFondo | null;
  onSave: (data: { monto: number; fecha: string; descripcion: string; observacion?: string }) => Promise<void>;
  loading?: boolean;
}

export const FondoIngresoModal: React.FC<FondoIngresoModalProps> = ({
  isOpen,
  onClose,
  fondo,
  onSave,
  loading = false,
}) => {
  const [monto, setMonto] = useState<number | ''>('');
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState<string>('');
  const [observacion, setObservacion] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMonto('');
      setFecha(new Date().toISOString().split('T')[0]);
      setDescripcion('');
      setObservacion('');
    }
  }, [isOpen]);

  if (!isOpen || !fondo) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) return;
    await onSave({
      monto: Number(monto),
      fecha,
      descripcion: descripcion.trim() || 'Aporte / Ingreso al fondo',
      observacion: observacion.trim() || undefined,
    });
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Registrar Ingreso / Aporte
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fondo: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fondo.campo_fondo_nombre}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Monto */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Monto del Ingreso ($ COP) *
              </label>
              {typeof monto === 'number' && monto > 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCOP(monto)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
              <input
                type="number"
                step="any"
                min="1"
                required
                value={monto}
                onChange={(e) => setMonto(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                autoFocus
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Fecha del Ingreso *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Concepto / Motivo */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Concepto / Motivo del Ingreso *
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: Aporte extraordinario, Donación pro-templo, Excedente..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Observaciones opcionales */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Observaciones / Donante (Opcional)
            </label>
            <textarea
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Detalles adicionales, número de recibo o consignación..."
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !monto || Number(monto) <= 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Registrar Ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
