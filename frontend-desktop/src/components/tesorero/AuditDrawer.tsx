import { useState, useMemo, useEffect } from 'react';
import { History, X, Search, ArrowRight, User } from 'lucide-react';
import type { HistorialEntry, Iglesia } from '../../types/contabilidad';
import { formatCOP } from '../../utils/formatters';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditorias: HistorialEntry[];
  iglesias: Iglesia[];
}

export function AuditDrawer({
  isOpen,
  onClose,
  auditorias,
  iglesias,
}: AuditDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChurchId, setSelectedChurchId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredLogs = useMemo(() => {
    return auditorias.filter((log) => {
      if (selectedChurchId) {
        const valAnt = log.valor_anterior as any;
        const valNue = log.valor_nuevo as any;
        const matchChurch =
          valAnt?.iglesia_id === selectedChurchId ||
          valNue?.iglesia_id === selectedChurchId ||
          (log.entidad === 'iglesia' && log.entidad_id === selectedChurchId);
        if (!matchChurch) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const userMatch = log.usuario?.nombre_completo?.toLowerCase().includes(term);
        const entityMatch = log.entidad?.toLowerCase().includes(term);
        const actionMatch = log.accion?.toLowerCase().includes(term);
        if (!userMatch && !entityMatch && !actionMatch) return false;
      }

      return true;
    });
  }, [auditorias, selectedChurchId, searchTerm]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[460px] max-w-full bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-[46px] px-4 flex items-center justify-between border-b border-slate-200 shrink-0 bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Bitácora de Auditoría ({filteredLogs.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filtrar por usuario, acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <select
            value={selectedChurchId}
            onChange={(e) => setSelectedChurchId(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="">-- Todas las iglesias --</option>
            {iglesias.map((ig) => (
              <option key={ig.id} value={ig.id}>
                {ig.nombre} {ig.codigo ? `(${ig.codigo})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No hay eventos de auditoría registrados para este filtro.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs shadow-2xs hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-900 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {log.usuario?.nombre_completo || 'Sistema'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {new Date(log.realizado_en).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[9px] uppercase border border-slate-200 font-bold">
                    {log.accion}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 capitalize">
                    {log.entidad}
                  </span>
                </div>

                {log.accion === 'actualizacion' &&
                log.valor_anterior &&
                log.valor_nuevo ? (
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] font-mono">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                      {formatCOP(
                        (log.valor_anterior as any).valor_manual ||
                          (log.valor_anterior as any).valor_calculado
                      )}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300 font-bold">
                      {formatCOP(
                        (log.valor_nuevo as any).valor_manual ||
                          (log.valor_nuevo as any).valor_calculado
                      )}
                    </span>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
