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
        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800 gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar congregación por nombre o código (ej. Central, COD-01)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search results */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-semibold truncate">{item.iglesia_nombre}</span>
                    {item.codigo && (
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                        {item.codigo}
                      </span>
                    )}
                  </div>
                  <ArrowRight
                    className={`w-3.5 h-3.5 transition-opacity shrink-0 ${
                      isSelected ? 'opacity-100 text-indigo-600 dark:text-indigo-400' : 'opacity-0'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>
            Navegar con <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700">↑</kbd>{' '}
            <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700">↓</kbd>
          </span>
          <span>
            Seleccionar con <kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.2 rounded border border-slate-300 dark:border-slate-700">↵ Enter</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
