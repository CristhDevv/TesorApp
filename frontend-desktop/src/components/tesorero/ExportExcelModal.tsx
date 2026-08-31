import { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  FileSpreadsheet, 
  CheckSquare, 
  Square, 
  Layers, 
  Church, 
  Settings2,
  Sparkles,
  Calculator
} from 'lucide-react';
import { ColumnaGrid, FilaGrid } from '../../types/contabilidad';
import { generateExcelReport } from '../../utils/excelExporter';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: FilaGrid[];
  columns: ColumnaGrid[];
  columnTotals: Record<string, number>;
  periodName?: string;
  tableName?: string;
}

export function ExportExcelModal({
  isOpen,
  onClose,
  rows,
  columns,
  columnTotals,
  periodName = 'Periodo Actual',
  tableName = 'Planilla Contable',
}: ExportExcelModalProps) {
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [selectedChurchIds, setSelectedChurchIds] = useState<string[]>([]);
  const [includeTotalsRow, setIncludeTotalsRow] = useState<boolean>(true);
  const [includeMetadataHeader, setIncludeMetadataHeader] = useState<boolean>(true);
  const [searchColumn, setSearchColumn] = useState<string>('');
  const [searchChurch, setSearchChurch] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'columns' | 'churches' | 'options'>('columns');

  // Initialize selected columns & churches on open
  useEffect(() => {
    if (isOpen) {
      setSelectedColumnIds(columns.map((c) => c.id));
      setSelectedChurchIds(rows.map((r) => r.iglesia_id));
      const cleanTable = tableName.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanPeriod = periodName.replace(/[^a-zA-Z0-9]/g, '_');
      setFileName(`Planilla_${cleanTable}_${cleanPeriod}.xlsx`);
    }
  }, [isOpen, columns, rows, tableName, periodName]);

  // Filtered lists
  const filteredColumns = useMemo(() => {
    if (!searchColumn.trim()) return columns;
    const term = searchColumn.toLowerCase();
    return columns.filter(
      (c) => c.nombre.toLowerCase().includes(term) || (c.seccion && c.seccion.toLowerCase().includes(term))
    );
  }, [columns, searchColumn]);

  const filteredRows = useMemo(() => {
    if (!searchChurch.trim()) return rows;
    const term = searchChurch.toLowerCase();
    return rows.filter(
      (r) => r.iglesia_nombre.toLowerCase().includes(term) || (r.codigo && r.codigo.toLowerCase().includes(term))
    );
  }, [rows, searchChurch]);

  // Column selection helpers
  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(id) ? prev.filter((colId) => colId !== id) : [...prev, id]
    );
  };

  const selectAllColumns = () => setSelectedColumnIds(columns.map((c) => c.id));
  const deselectAllColumns = () => setSelectedColumnIds([]);
  
  const selectFundsOnly = () => {
    const fundCols = columns.filter(
      (c) => c.es_fondo || (c.nombre && /fondo|mision|muser|templo|arriendo|construc|auxilio|ayuda/i.test(c.nombre))
    );
    setSelectedColumnIds(fundCols.map((c) => c.id));
  };

  const selectIncomeOnly = () => {
    const incomeCols = columns.filter(
      (c) => c.seccion === 'Ingresos' || (c.nombre && /diezmo|ofrenda|ingreso|total/i.test(c.nombre))
    );
    setSelectedColumnIds(incomeCols.map((c) => c.id));
  };

  const selectCalculatedOnly = () => {
    const calcCols = columns.filter((c) => c.modo_calculo === 'calculado');
    setSelectedColumnIds(calcCols.map((c) => c.id));
  };

  // Church selection helpers
  const toggleChurch = (id: string) => {
    setSelectedChurchIds((prev) =>
      prev.includes(id) ? prev.filter((churchId) => churchId !== id) : [...prev, id]
    );
  };

  const selectAllChurches = () => setSelectedChurchIds(rows.map((r) => r.iglesia_id));
  const deselectAllChurches = () => setSelectedChurchIds([]);

  // Handle Export
  const handleExport = async () => {
    if (selectedColumnIds.length === 0) {
      alert('Debes seleccionar al menos una columna para exportar.');
      return;
    }
    if (selectedChurchIds.length === 0) {
      alert('Debes seleccionar al menos una congregación para exportar.');
      return;
    }

    setIsExporting(true);
    try {
      await generateExcelReport(rows, columns, {
        fileName: fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`,
        reportTitle: `PLANILLA CONTABLE — ${tableName.toUpperCase()}`,
        periodName,
        tableName,
        selectedColumnIds,
        selectedChurchIds,
        includeTotalsRow,
        includeMetadataHeader,
        columnTotals,
      });
      onClose();
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/80 rounded-xl border border-emerald-400/40 shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Exportación Dinámica a Excel</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full">
                  .XLSX
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                {tableName} • <span className="font-bold text-white">{periodName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-indigo-300 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('columns')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'columns'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Columnas / Campos ({selectedColumnIds.length}/{columns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('churches')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'churches'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Church className="w-4 h-4" />
            <span>Sedes / Filas ({selectedChurchIds.length}/{rows.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('options')}
            className={`pb-2.5 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Formato & Archivo</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* ── TAB 1: COLUMNAS / CAMPOS ── */}
          {activeTab === 'columns' && (
            <div className="space-y-3">
              {/* Filter helpers & Search */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={selectAllColumns}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                  >
                    Todas
                  </button>
                  <button
                    onClick={deselectAllColumns}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
                  >
                    Ninguna
                  </button>
                  <button
                    onClick={selectFundsOnly}
                    className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span>Solo Fondos</span>
                  </button>
                  <button
                    onClick={selectIncomeOnly}
                    className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                  >
                    Solo Ingresos
                  </button>
                  <button
                    onClick={selectCalculatedOnly}
                    className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1"
                  >
                    <Calculator className="w-3 h-3 text-blue-500" />
                    <span>Calculadas</span>
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    value={searchColumn}
                    onChange={(e) => setSearchColumn(e.target.value)}
                    placeholder="Filtrar columnas..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Columns Checkbox Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                {filteredColumns.map((col, idx) => {
                  const isChecked = selectedColumnIds.includes(col.id);
                  const isCalc = col.modo_calculo === 'calculado';
                  return (
                    <div
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {idx + 1}. {col.nombre}
                          </span>
                          {isCalc && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 shrink-0">
                              f(x)
                            </span>
                          )}
                          {col.es_fondo && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 shrink-0">
                              Fondo
                            </span>
                          )}
                        </div>
                        {col.seccion && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Sección: {col.seccion}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 2: SEDES / FILAS ── */}
          {activeTab === 'churches' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={selectAllChurches}
                    className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                  >
                    Todas ({rows.length})
                  </button>
                  <button
                    onClick={deselectAllChurches}
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
                  >
                    Ninguna
                  </button>
                </div>

                <div className="relative w-full sm:w-48">
                  <input
                    type="text"
                    value={searchChurch}
                    onChange={(e) => setSearchChurch(e.target.value)}
                    placeholder="Buscar sede..."
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40">
                {filteredRows.map((r, idx) => {
                  const isChecked = selectedChurchIds.includes(r.iglesia_id);
                  return (
                    <div
                      key={r.iglesia_id}
                      onClick={() => toggleChurch(r.iglesia_id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                          {idx + 1}. {r.iglesia_nombre}
                        </span>
                        {r.codigo && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            Código: {r.codigo}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── TAB 3: OPCIONES & FORMATO ── */}
          {activeTab === 'options' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Configuración del Archivo
                </h4>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre del Archivo Excel
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Elementos a Incluir
                </h4>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeTotalsRow}
                    onChange={(e) => setIncludeTotalsRow(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Fila de Totales Generales (Σ)</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Calcula e inserta automáticamente la fila final con la sumatoria de cada columna en pesos ($ COP).
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                  <input
                    type="checkbox"
                    checked={includeMetadataHeader}
                    onChange={(e) => setIncludeMetadataHeader(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
                  />
                  <div>
                    <strong className="text-slate-800 dark:text-slate-200">Encabezado Institucional & Metadatos</strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Agrega el título oficial, nombre de la tabla, período y fecha de generación al inicio de la hoja.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedColumnIds.length}</span> cols •{' '}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedChurchIds.length}</span> sedes seleccionadas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={handleExport}
              disabled={isExporting || selectedColumnIds.length === 0 || selectedChurchIds.length === 0}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-sm transition transform active:scale-95 cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Generando Excel...' : 'Descargar Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
