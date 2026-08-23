import { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  History,
  Plus,
  Download,
  Sliders,
  ChevronDown,
  Filter,
  TrendingUp,
} from 'lucide-react';
import type { Tabla, Periodo } from '../../types/contabilidad';
import { PeriodBadge } from '../common/PeriodBadge';

interface TableFilterToolbarProps {
  // Tesorero mode
  isTesorero: boolean;
  tablas: Tabla[];
  periodos: Periodo[];
  selectedTablaId: string;
  selectedPeriodoId: string;
  onTablaChange: (id: string) => void;
  onPeriodoChange: (id: string) => void;
  onOpenTableConfig: () => void;
  onNewTable: () => void;
  onClosePeriod: (id: string) => void;
  onReopenPeriod: (id: string) => void;
  onCreatePeriod: () => void;
  onExportExcel: () => void;
  onToggleDrawer: () => void;
  onOpenAuditDrawer?: () => void;
  onOpenQuickSearch?: () => void;

  // Church display (iglesia mode)
  churchName?: string;
  churchCode?: string;

  // Filter state
  gridSearch: string;
  onGridSearchChange: (v: string) => void;
  showAllColumns: boolean;
  onToggleAllColumns: (v: boolean) => void;
  showAnalytics: boolean;
  onToggleAnalytics: () => void;
  hasChart: boolean;
  onlyOverriddenFilter?: boolean;
  onToggleOnlyOverridden?: (v: boolean) => void;

  // Stats
  filteredCount: number;
  totalCount: number;
}

export function TableFilterToolbar({
  isTesorero,
  tablas,
  periodos,
  selectedTablaId,
  selectedPeriodoId,
  onTablaChange,
  onPeriodoChange,
  onOpenTableConfig,
  onNewTable,
  onClosePeriod,
  onReopenPeriod,
  onCreatePeriod,
  onExportExcel,
  onToggleDrawer,
  onOpenAuditDrawer,
  onOpenQuickSearch,
  churchName,
  churchCode,
  gridSearch,
  onGridSearchChange,
  showAllColumns,
  onToggleAllColumns,
  showAnalytics,
  onToggleAnalytics,
  hasChart,
  onlyOverriddenFilter = false,
  onToggleOnlyOverridden,
  filteredCount,
  totalCount,
}: TableFilterToolbarProps) {
  const selectedPeriod = periodos.find((p) => p.id === selectedPeriodoId);
  const isPeriodOpen = selectedPeriod?.estado === 'abierto';
  const selectedTable = tablas.find((t) => t.id === selectedTablaId);

  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const filtersMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filtersMenuRef.current &&
        !filtersMenuRef.current.contains(event.target as Node)
      ) {
        setShowFiltersDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-[44px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 flex items-center justify-between shrink-0 text-xs gap-2 select-none shadow-2xs">
      {/* ─── LEFT SECTION: TABLE & PERIOD SELECTORS ─── */}
      <div className="flex items-center gap-2 min-w-0">
        {isTesorero ? (
          <>
            {/* Table Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider shrink-0">
                Tabla
              </span>
              <div className="relative">
                <select
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 pr-7 py-1 font-bold text-slate-800 dark:text-slate-100 text-[11px] focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
                  value={selectedTablaId}
                  onChange={(e) => onTablaChange(e.target.value)}
                >
                  <option value="all">🌐 Consolidado General (Todas las Tablas)</option>
                  {tablas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.iglesias?.length ?? 0} ig, {t.campos?.length ?? 0} cols)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-2 text-slate-500 pointer-events-none" />
              </div>

              <button
                onClick={onOpenTableConfig}
                disabled={!selectedTablaId || selectedTablaId === 'all'}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition disabled:opacity-40"
                title={selectedTablaId === 'all' ? 'El consolidado general muestra todas las columnas activas' : 'Configurar columnas de la tabla activa'}
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onNewTable}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded font-semibold flex items-center gap-1 text-[10px] transition"
              >
                <Plus className="w-3 h-3" />
                Nueva
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />
          </>
        ) : (
          /* Church name display for iglesia role */
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              {churchName || 'Mi Iglesia'}
            </span>
            {churchCode && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                ({churchCode})
              </span>
            )}
          </div>
        )}

        {/* Period Selector & Status Badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider shrink-0">
            Periodo
          </span>
          <div className="relative">
            <select
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 pr-7 py-1 font-bold text-slate-800 dark:text-slate-100 text-[11px] focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700"
              value={selectedPeriodoId}
              onChange={(e) => onPeriodoChange(e.target.value)}
            >
              {periodos.map((pe) => (
                <option key={pe.id} value={pe.id}>
                  {pe.nombre}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-2 top-2 text-slate-500 pointer-events-none" />
          </div>

          {/* Period badge (Abierto / Cerrado) */}
          {selectedPeriod && (
            <PeriodBadge status={selectedPeriod.estado} />
          )}

          {isTesorero && selectedPeriodoId && (
            <>
              {isPeriodOpen ? (
                <button
                  onClick={() => onClosePeriod(selectedPeriodoId)}
                  className="px-2 py-1 bg-slate-50 dark:bg-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 hover:text-rose-800 border border-slate-300 dark:border-rose-800/60 rounded font-bold text-[10px] transition"
                  title="Cerrar período y bloquear ediciones"
                >
                  Cerrar
                </button>
              ) : (
                <button
                  onClick={() => onReopenPeriod(selectedPeriodoId)}
                  className="px-2 py-1 bg-slate-50 dark:bg-emerald-950/40 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 border border-slate-300 dark:border-emerald-800/60 rounded font-bold text-[10px] transition"
                  title="Reabrir período contable"
                >
                  Reabrir
                </button>
              )}
              <button
                onClick={onCreatePeriod}
                className="p-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 transition"
                title="Crear nuevo período mensual"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── RIGHT SECTION: SEARCH & ACTIONS ─── */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search with Ctrl+K shortcut indicator */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar iglesia..."
            value={gridSearch}
            onChange={(e) => onGridSearchChange(e.target.value)}
            className="w-36 pl-7 pr-12 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-[11px] placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-800"
          />
          {gridSearch ? (
            <button
              onClick={() => onGridSearchChange('')}
              className="absolute right-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenQuickSearch}
              className="absolute right-1 px-1 py-0.2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px] font-mono text-slate-400 dark:text-slate-300 hover:text-slate-600 shadow-2xs"
              title="Abrir buscador con Ctrl+K"
            >
              ⌘K
            </button>
          )}
        </div>

        {/* Dropdown Filters button */}
        {isTesorero && (
          <div className="relative" ref={filtersMenuRef}>
            <button
              type="button"
              onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
              className={`px-2.5 py-1 rounded font-bold text-[10px] flex items-center gap-1 border transition ${
                onlyOverriddenFilter || showAllColumns
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
              }`}
            >
              <Filter className="w-3 h-3" />
              Filtros
              <ChevronDown className="w-3 h-3" />
            </button>

            {showFiltersDropdown && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl p-2 z-40 space-y-2 text-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                  Opciones de Vista
                </p>

                {/* All vs Consolidated Columns */}
                <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
                  <input
                    type="checkbox"
                    checked={showAllColumns}
                    onChange={(e) => onToggleAllColumns(e.target.checked)}
                    className="accent-indigo-600"
                  />
                  <span>Mostrar todas las columnas (ignorar tabla)</span>
                </label>

                {/* Overridden only filter */}
                {onToggleOnlyOverridden && (
                  <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
                    <input
                      type="checkbox"
                      checked={onlyOverriddenFilter}
                      onChange={(e) => onToggleOnlyOverridden(e.target.checked)}
                      className="accent-indigo-600"
                    />
                    <span>Solo iglesias con sobrescrituras</span>
                  </label>
                )}
              </div>
            )}
          </div>
        )}

        {/* Auditoría lateral button */}
        {isTesorero && onOpenAuditDrawer && (
          <button
            onClick={onOpenAuditDrawer}
            className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded font-bold text-[10px] flex items-center gap-1 transition"
            title="Abrir bitácora de auditoría"
          >
            <History className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Auditoría
          </button>
        )}

        {/* Gestionar Columnas */}
        {isTesorero && (
          <button
            onClick={onToggleDrawer}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold text-[10px] flex items-center gap-1 transition shadow-xs"
            title="Crear o configurar columnas"
          >
            <Plus className="w-3 h-3" />
            Columna
          </button>
        )}

        {/* Analytics Drawer */}
        {hasChart && isTesorero && (
          <button
            onClick={onToggleAnalytics}
            className={`px-2.5 py-1 rounded font-bold border flex items-center gap-1 text-[10px] transition ${
              showAnalytics
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Gráficos
          </button>
        )}

        {/* Export Excel — direct download */}
        {selectedTable && isTesorero && (
          <button
            onClick={onExportExcel}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-xs transition"
            title="Exportar planilla a Excel (ExcelJS)"
          >
            <Download className="w-3.5 h-3.5" />
            Excel
          </button>
        )}

        {/* Row count */}
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0 ml-1">
          {filteredCount}/{totalCount}
        </span>
      </div>
    </div>
  );
}
