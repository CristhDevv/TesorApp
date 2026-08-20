import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Building2, ArrowRight } from 'lucide-react';
import type { FilaGrid } from '../../types/contabilidad';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: FilaGrid[];
  onSelectChurch: (churchId: string) => void;
}

export function QuickSearchModal({
  isOpen,
  onClose,
  rows,
  onSelectChurch,
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows.slice(0, 8);
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.iglesia_nombre.toLowerCase().includes(q) ||
        (r.codigo && r.codigo.toLowerCase().includes(q))
    );
  }, [rows, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      onSelectChurch(filtered[selectedIndex].iglesia_id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-start justify-center pt-20 p-4 z-50">
      <div
        className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar congregación por nombre o código (ej. Central, COD-01)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono text-slate-500">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search results */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No se encontraron congregaciones que coincidan con "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.iglesia_id}
                  type="button"
                  onClick={() => {
                    onSelectChurch(item.iglesia_id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition ${
                    isSelected
                      ? 'bg-indigo-50 text-indigo-900 border border-indigo-200'
                      : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-semibold truncate">{item.iglesia_nombre}</span>
                    {item.codigo && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                        {item.codigo}
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                      isSelected ? 'opacity-100 text-indigo-600' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
          <span>
            Navegar con <kbd className="font-mono bg-white px-1 py-0.2 rounded border border-slate-300">↑</kbd>{' '}
            <kbd className="font-mono bg-white px-1 py-0.2 rounded border border-slate-300">↓</kbd>
          </span>
          <span>
            Seleccionar con <kbd className="font-mono bg-white px-1 py-0.2 rounded border border-slate-300">↵ Enter</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
