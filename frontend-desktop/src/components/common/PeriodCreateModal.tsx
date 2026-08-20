import React, { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';

interface PeriodCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { nombre: string; fecha_inicio: string; fecha_fin: string }) => Promise<void>;
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function PeriodCreateModal({ isOpen, onClose, onSubmit }: PeriodCreateModalProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [mesIdx, setMesIdx] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMesIdx(new Date().getMonth());
      setYear(new Date().getFullYear());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const nombre = `${MESES[mesIdx]} ${year}`;
      const startDate = new Date(Date.UTC(year, mesIdx, 1));
      const endDate = new Date(Date.UTC(year, mesIdx + 1, 0));

      await onSubmit({
        nombre,
        fecha_inicio: startDate.toISOString().split('T')[0],
        fecha_fin: endDate.toISOString().split('T')[0],
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Nuevo Periodo Contable</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Mes
            </label>
            <select
              value={mesIdx}
              onChange={(e) => setMesIdx(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              {MESES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Año
            </label>
            <input
              type="number"
              min={2020}
              max={2035}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-center">
            <span className="text-[10px] text-slate-500 block uppercase font-medium">Nombre Resultante</span>
            <span className="text-xs font-bold text-indigo-700 font-mono">
              {MESES[mesIdx]} {year}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creando...' : 'Crear Periodo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
