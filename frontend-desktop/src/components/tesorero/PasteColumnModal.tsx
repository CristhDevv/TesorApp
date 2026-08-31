import { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  Info,
  Trash2,
  CornerDownRight,
  ShieldAlert,
} from 'lucide-react';
import type { ColumnaGrid, FilaGrid } from '../../types/contabilidad';
import { parseExcelClipboard, ParsedPasteResult } from '../../utils/excelPasteParser';

interface PasteColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnaGrid[];
  rows: FilaGrid[];
  initialColumnId?: string;
  initialStartChurchId?: string;
  onApplyPaste: (
    updates: { iglesia_id: string; campo_id: string; valor_manual: number }[],
    summary: { columnName: string; count: number; totalAmount: number }
  ) => Promise<void>;
  isPeriodOpen?: boolean;
}

const formatCOP = (val: number | string | null | undefined): string => {
  const num = Number(val ?? 0);
  if (isNaN(num)) return '$0';
  return '$' + Math.round(num).toLocaleString('es-CO');
};

export function PasteColumnModal({
  isOpen,
  onClose,
  columns,
  rows,
  initialColumnId,
  initialStartChurchId,
  onApplyPaste,
  isPeriodOpen = true,
}: PasteColumnModalProps) {
  const [selectedColId, setSelectedColId] = useState<string>('');
  const [startChurchId, setStartChurchId] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  const [emptyAsZero, setEmptyAsZero] = useState<boolean>(true);
  const [ignoreHeader, setIgnoreHeader] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);

  // Set initial selected column & starting church whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultCol = initialColumnId || columns[0]?.id || '';
      setSelectedColId(defaultCol);
      const defaultChurch = initialStartChurchId || rows[0]?.iglesia_id || '';
      setStartChurchId(defaultChurch);
      setPastedText('');
      setClipboardError(null);
    }
  }, [isOpen, initialColumnId, initialStartChurchId, columns, rows]);

  // Selected column definition
  const targetCol = useMemo(() => {
    return columns.find((c) => c.id === selectedColId);
  }, [columns, selectedColId]);

  // Parse clipboard text
  const parseResult: ParsedPasteResult = useMemo(() => {
    return parseExcelClipboard(pastedText, {
      emptyAsZero,
      ignoreHeader,
    });
  }, [pastedText, emptyAsZero, ignoreHeader]);

  // Auto-set ignoreHeader if a text header candidate was detected
  useEffect(() => {
    if (parseResult.hasHeaderRow) {
      setIgnoreHeader(true);
    }
  }, [parseResult.hasHeaderRow]);

  // Determine starting row index in grid
  const startRowIdx = useMemo(() => {
    if (!startChurchId) return 0;
    const idx = rows.findIndex((r) => r.iglesia_id === startChurchId);
    return idx >= 0 ? idx : 0;
  }, [rows, startChurchId]);

  // Map parsed values to churches starting from startRowIdx
  const previewMappings = useMemo(() => {
    if (parseResult.rows.length === 0) return [];

    const mappings: Array<{
      index: number;
      church: FilaGrid;
      currentValue: number;
      newValue: number;
      diff: number;
      isOverwriting: boolean;
      isValid: boolean;
      isEmptyCell: boolean;
    }> = [];

    parseResult.rows.forEach((pasteRow, i) => {
      const churchIdx = startRowIdx + i;
      if (churchIdx < rows.length) {
        const church = rows[churchIdx];
        const valObj = (church.valores || []).find((v) => v.campo_id === selectedColId);
        const isCalc = targetCol?.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
        const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
        const currentNum = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual ?? 0));

        const newNum = pasteRow.parsedNumber ?? 0;
        mappings.push({
          index: churchIdx + 1,
          church,
          currentValue: isNaN(currentNum) ? 0 : currentNum,
          newValue: newNum,
          diff: newNum - (isNaN(currentNum) ? 0 : currentNum),
          isOverwriting: newNum !== (isNaN(currentNum) ? 0 : currentNum),
          isValid: pasteRow.isValidNumber,
          isEmptyCell: pasteRow.isEmpty,
        });
      }
    });

    return mappings;
  }, [parseResult.rows, startRowIdx, rows, selectedColId, targetCol]);

  // Handle direct clipboard reading via navigator.clipboard
  const handleReadClipboard = async () => {
    setClipboardError(null);
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('La API de portapapeles no está disponible. Usa Ctrl+V en el campo de texto.');
      }
      const text = await navigator.clipboard.readText();
      if (!text || text.trim() === '') {
        setClipboardError('El portapapeles está vacío. Copia primero una columna en Excel y vuelve a intentar.');
        return;
      }
      setPastedText(text);
    } catch (err: any) {
      setClipboardError(err.message || 'No se pudo leer el portapapeles. Pega con Ctrl+V directamente en la caja de texto.');
    }
  };

  // Submit and apply batch paste
  const handleConfirm = async () => {
    if (previewMappings.length === 0 || !selectedColId) return;

    const updates = previewMappings.map((m) => ({
      iglesia_id: m.church.iglesia_id,
      campo_id: selectedColId,
      valor_manual: m.newValue,
    }));

    const totalAmount = previewMappings.reduce((sum, m) => sum + m.newValue, 0);

    setIsApplying(true);
    try {
      await onApplyPaste(updates, {
        columnName: targetCol?.nombre || 'Columna',
        count: updates.length,
        totalAmount,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  const excessPasteCount = Math.max(0, parseResult.rows.length - (rows.length - startRowIdx));
  const isTargetCalculated = targetCol?.modo_calculo === 'calculado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* ─── Header ─── */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Pegar Columna desde Excel
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Importación Rápida
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Copia valores de una columna en Excel o Google Sheets y pégalos para distribuirlos secuencialmente en la planilla.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {/* Closed period alert */}
          {!isPeriodOpen && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700/60 rounded-xl flex items-center gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Atención:</strong> El período actual está cerrado. Solo un usuario con rol de Tesorero puede realizar modificaciones.
              </span>
            </div>
          )}

          {/* Config Selectors: Column & Start Church */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target Column Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Columna de Destino en la Planilla:
              </label>
              <select
                value={selectedColId}
                onChange={(e) => setSelectedColId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.nombre} {col.modo_calculo === 'calculado' ? '⚙️ (Calculado / Sobrescritura)' : '✍️ (Manual)'}
                  </option>
                ))}
              </select>
              {isTargetCalculated && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 shrink-0" />
                  Esta columna es calculada por fórmula. Los valores pegados actuarán como sobrescrituras manuales de tesorería.
                </p>
              )}
            </div>

            {/* Starting Row / Church Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Iniciar Pegado desde Congregación:
              </label>
              <select
                value={startChurchId}
                onChange={(e) => setStartChurchId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                {rows.map((row, idx) => (
                  <option key={row.iglesia_id} value={row.iglesia_id}>
                    #{idx + 1} - {row.iglesia_nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paste Input Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ClipboardPaste className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>3. Pega aquí los datos copiados de Excel:</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Pegar desde Portapapeles</span>
                </button>

                {pastedText && (
                  <button
                    type="button"
                    onClick={() => setPastedText('')}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Limpiar datos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Pega aquí los valores copiados de la columna de Excel (Ctrl + V)\nEjemplo:\n150000\n$ 230.000\n1.450.000,50\n0`}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition resize-y"
              />
            </div>

            {clipboardError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {clipboardError}
              </p>
            )}

            {/* Paste Options */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={emptyAsZero}
                  onChange={(e) => setEmptyAsZero(e.target.checked)}
                  className="accent-indigo-600 rounded"
                />
                <span>Tratar celdas vacías o con guion '-' como $0</span>
              </label>

              {parseResult.hasHeaderRow && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-indigo-700 dark:text-indigo-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={ignoreHeader}
                    onChange={(e) => setIgnoreHeader(e.target.checked)}
                    className="accent-indigo-600 rounded"
                  />
                  <span>Omitir 1ª fila (encabezado: "{parseResult.headerCandidate}")</span>
                </label>
              )}
            </div>
          </div>

          {/* Live Preview Section */}
          {previewMappings.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Previsualización de Asignación ({previewMappings.length} iglesias)
                  </span>
                  {excessPasteCount > 0 && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {excessPasteCount} valores adicionales no caben en la tabla
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  Total a Asignar: {formatCOP(previewMappings.reduce((sum, m) => sum + m.newValue, 0))}
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 w-10 text-center">#</th>
                      <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700">Congregación</th>
                      <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-right">Valor Actual</th>
                      <th className="p-2 border-b border-r border-slate-200 dark:border-slate-700 text-right">Nuevo Valor (Excel)</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {previewMappings.map((m) => (
                      <tr
                        key={m.church.iglesia_id}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                          m.isOverwriting ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-center text-slate-400 font-bold">
                          {m.index}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-sans font-semibold text-slate-900 dark:text-slate-100">
                          {m.church.iglesia_nombre}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right text-slate-500 dark:text-slate-400">
                          {formatCOP(m.currentValue)}
                        </td>
                        <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-black text-indigo-700 dark:text-indigo-300">
                          {formatCOP(m.newValue)}
                        </td>
                        <td className="p-2 text-center font-sans">
                          {m.isOverwriting ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              Actualizar
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Sin cambio</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {previewMappings.length > 0
                ? `Se actualizarán ${previewMappings.length} celdas en la columna "${targetCol?.nombre || 'seleccionada'}"`
                : 'Pega los datos de Excel para ver la previsualización'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={previewMappings.length === 0 || isApplying}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <span>Aplicando cambios...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar a la Planilla ({previewMappings.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
