import { useState, useMemo } from 'react';
import { Search, X, Building2, Check } from 'lucide-react';

interface ChurchSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  iglesias: Array<{ id: string; nombre: string; identificador_interno?: string }>;
  selectedIglesiaId: string;
  onSelect: (id: string) => void;
}

export function ChurchSearchModal({
  isOpen,
  onClose,
  iglesias,
  selectedIglesiaId,
  onSelect,
}: ChurchSearchModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return iglesias;
    const q = query.toLowerCase();
    return iglesias.filter(
      (ig) =>
        ig.nombre.toLowerCase().includes(q) ||
        (ig.identificador_interno && ig.identificador_interno.toLowerCase().includes(q)),
    );
  }, [iglesias, query]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto bg-white mt-12 rounded-t-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Seleccionar Congregación</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Buscar por nombre o código (ej. IG-001)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No se encontraron congregaciones que coincidan.
            </div>
          ) : (
            filtered.map((ig) => {
              const isSelected = ig.id === selectedIglesiaId;
              return (
                <button
                  key={ig.id}
                  type="button"
                  onClick={() => {
                    onSelect(ig.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-xl flex items-center justify-between transition text-left cursor-pointer ${
                    isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {ig.identificador_interno && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-slate-800 text-slate-200 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {ig.identificador_interno}
                      </span>
                    )}
                    <span className="text-xs font-bold">{ig.nombre}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
