import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Sigma } from 'lucide-react';
import type { ColumnaGrid, Campo } from '../../types/contabilidad';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: ColumnaGrid | null;
  allCampos: Campo[];
  onSaveFormula: (fieldId: string, formula: string) => Promise<void>;
}

export function FormulaModal({
  isOpen,
  onClose,
  column,
  allCampos,
  onSaveFormula,
}: FormulaModalProps) {
  const [formula, setFormula] = useState('');
  const [activeTab, setActiveTab] = useState<'porcentaje' | 'suma' | 'resta' | 'teclado'>('porcentaje');
  const [percentRate, setPercentRate] = useState(3);
  const [selectedCols, setSelectedCols] = useState<string[]>([]);
  const [diffBase, setDiffBase] = useState('');
  const [diffMinus, setDiffMinus] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (column) {
      setFormula(column.formula || '');
      const otherManuals = allCampos
        .filter((c) => c.id !== column.id && c.modo_calculo === 'manual')
        .map((c) => c.slug);

      const f = (column.formula || '').trim();
      const pctMatch = f.match(/^(?:\(([^)]+)\)|([a-zA-Z0-9_]+))\s*\*\s*([0-9.]+)/);
      if (pctMatch) {
        setActiveTab('porcentaje');
        setPercentRate(parseFloat(pctMatch[3]) * 100);
        setSelectedCols((pctMatch[1] || pctMatch[2]).split('+').map((s) => s.trim()));
      } else if (f.includes('+') && !f.includes('*') && !f.includes('-')) {
        setActiveTab('suma');
        setSelectedCols(f.split('+').map((s) => s.trim()));
      } else if (f.includes('-') && !f.includes('*') && !f.includes('+')) {
        setActiveTab('resta');
        const [b, m] = f.split('-').map((s) => s.trim());
        setDiffBase(b);
        setDiffMinus(m);
      } else {
        setActiveTab(column.formula ? 'teclado' : 'porcentaje');
        setSelectedCols(otherManuals.slice(0, 2));
      }
    }
  }, [column, allCampos]);

  const buildPercentFormula = (rate: number, cols: string[]) => {
    if (cols.length === 0) return '';
    const decimal = rate / 100;
    return cols.length === 1 ? `${cols[0]} * ${decimal}` : `(${cols.join(' + ')}) * ${decimal}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!column) return;
    setSaving(true);
    try {
      await onSaveFormula(column.id, formula);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !column) return null;

  const availableCampos = allCampos.filter((c) => c.id !== column.id);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sigma className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Editar Fórmula: <span className="text-indigo-600">{column.nombre}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(['porcentaje', 'suma', 'resta', 'teclado'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'porcentaje') {
                    setFormula(buildPercentFormula(percentRate, selectedCols));
                  } else if (tab === 'suma') {
                    setFormula(selectedCols.join(' + '));
                  } else if (tab === 'resta') {
                    setFormula(diffBase && diffMinus ? `${diffBase} - ${diffMinus}` : '');
                  }
                }}
                className={`flex-1 py-1.5 rounded-md font-semibold text-xs transition ${
                  activeTab === tab
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'porcentaje' ? '% Porcentaje' : tab === 'suma' ? '∑ Suma' : tab === 'resta' ? 'A - B Resta' : '✎ Libre'}
              </button>
            ))}
          </div>

          {/* Porcentaje */}
          {activeTab === 'porcentaje' && (
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-slate-700 font-bold">Porcentaje:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  value={percentRate}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value) || 0;
                    setPercentRate(r);
                    setFormula(buildPercentFormula(r, selectedCols));
                  }}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded text-center text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                />
                <span className="font-bold text-slate-600">%</span>
                <div className="flex gap-1 ml-auto">
                  {[1, 3, 5, 10, 15].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setPercentRate(p);
                        setFormula(buildPercentFormula(p, selectedCols));
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                        percentRate === p
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-600 font-semibold block mb-1">Aplicar sobre las columnas:</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded border border-slate-200">
                  {availableCampos.map((c) => {
                    const checked = selectedCols.includes(c.slug);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-1.5 cursor-pointer p-1 rounded hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = checked
                              ? selectedCols.filter((s) => s !== c.slug)
                              : [...selectedCols, c.slug];
                            setSelectedCols(next);
                            setFormula(buildPercentFormula(percentRate, next));
                          }}
                          className="accent-indigo-600"
                        />
                        <span className="text-slate-800 truncate text-[11px] font-medium">{c.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Suma */}
          {activeTab === 'suma' && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-semibold block mb-1">Selecciona columnas a sumar:</span>
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-white rounded border border-slate-200">
                {availableCampos.map((c) => {
                  const checked = selectedCols.includes(c.slug);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-1.5 cursor-pointer p-1 rounded hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? selectedCols.filter((s) => s !== c.slug)
                            : [...selectedCols, c.slug];
                          setSelectedCols(next);
                          setFormula(next.join(' + '));
                        }}
                        className="accent-indigo-600"
                      />
                      <span className="text-slate-800 truncate text-[11px] font-medium">{c.nombre}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resta */}
          {activeTab === 'resta' && (
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-600 font-semibold block mb-1">Columna Base (A):</span>
                <select
                  value={diffBase}
                  onChange={(e) => {
                    setDiffBase(e.target.value);
                    setFormula(e.target.value && diffMinus ? `${e.target.value} - ${diffMinus}` : '');
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-indigo-600"
                >
                  <option value="">-- Seleccionar --</option>
                  {availableCampos.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-slate-600 font-semibold block mb-1">Menos Deducción (B):</span>
                <select
                  value={diffMinus}
                  onChange={(e) => {
                    setDiffMinus(e.target.value);
                    setFormula(diffBase && e.target.value ? `${diffBase} - ${e.target.value}` : '');
                  }}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:outline-none focus:border-indigo-600"
                >
                  <option value="">-- Seleccionar --</option>
                  {availableCampos.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Teclado libre */}
          {activeTab === 'teclado' && (
            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {availableCampos.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFormula((prev) => (prev ? `${prev} ${c.slug}` : c.slug))}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded text-[10px] font-medium shadow-2xs"
                  >
                    + {c.nombre}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {['+', '-', '*', '/', '(', ')', '0.03', '0.05', '0.10'].map((op) => (
                  <button
                    key={op}
                    type="button"
                    onClick={() => setFormula((prev) => (prev ? `${prev} ${op}` : op))}
                    className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-900 font-mono font-bold border border-slate-300 rounded text-xs shadow-2xs"
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Formula preview */}
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-600 font-bold">Expresión:</span>
              <span className="font-mono text-blue-700 text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300 truncate max-w-[280px]">
                = {formula || '(sin fórmula)'}
              </span>
            </div>
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600"
              placeholder="diezmos + ofrendas"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !formula.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {saving ? 'Guardando...' : 'Guardar y Recalcular'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
