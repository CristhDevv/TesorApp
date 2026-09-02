import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Calendar,
  Search,
  RefreshCw,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Receipt,
  Building2,
  FileSpreadsheet,
  Coins,
  AlertCircle,
  X,
  Pencil,
  Lock,
} from 'lucide-react';
import { ResumenFondo } from './GastosPanel';
import { formatCOP } from '../../utils/formatters';

export interface MovimientoItem {
  id: string;
  tipo: 'ingreso' | 'egreso';
  fecha: string;
  monto: number;
  descripcion: string;
  observacion?: string | null;
  periodo_nombre?: string | null;
  creado_por_nombre?: string | null;
  creado_en: string;
  saldo_resultante: number;
  es_manual?: boolean;
}

export interface FondoMovimientosData {
  campo_fondo: {
    id: string;
    nombre: string;
    slug: string;
    es_acumulable: boolean;
    es_transito: boolean;
    ente_superior_nombre?: string | null;
  };
  total_ingresos: number;
  total_egresos: number;
  saldo_actual: number;
  movimientos: MovimientoItem[];
}

interface FondoMovimientosViewProps {
  fondo: ResumenFondo;
  fondosList: ResumenFondo[];
  onSelectFondo: (fondo: ResumenFondo) => void;
  onBack: () => void;
  apiBase: string;
  token: string;
  periodos: { id: string; nombre: string; estado: string }[];
  onOpenNewIngreso: (fondo: ResumenFondo) => void;
  onOpenNewGasto: (fondo: ResumenFondo) => void;
  onOpenVoucher?: (mov: MovimientoItem) => void;
  onDeleteIngreso: (ingresoId: string) => Promise<void>;
  onEditGasto?: (gasto: any) => void;
  onDeleteGasto?: (gasto: any) => void;
}

export const FondoMovimientosView: React.FC<FondoMovimientosViewProps> = ({
  fondo,
  fondosList,
  onSelectFondo,
  onBack,
  apiBase,
  token,
  periodos,
  onOpenNewIngreso,
  onOpenNewGasto,
  onOpenVoucher,
  onDeleteIngreso,
  onEditGasto,
  onDeleteGasto,
}) => {
  const [data, setData] = useState<FondoMovimientosData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'ingreso' | 'egreso'>('all');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const fetchMovimientos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/gastos/fondos/${fondo.campo_fondo_id}/movimientos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('No se pudo cargar el historial de movimientos del fondo.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error al obtener movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimientos();
    setCurrentPage(1);
  }, [fondo.campo_fondo_id]);

  // Keyboard shortcut: ESC to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  // Filtered movements
  const filteredMovimientos = useMemo(() => {
    if (!data?.movimientos) return [];
    return data.movimientos.filter((m) => {
      // Type filter
      if (tipoFilter !== 'all' && m.tipo !== tipoFilter) return false;

      // Period filter
      if (periodoFilter !== 'all' && m.periodo_nombre !== periodoFilter) return false;

      // Date Range
      if (fechaDesde && m.fecha < fechaDesde) return false;
      if (fechaHasta && m.fecha > fechaHasta) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = m.descripcion?.toLowerCase().includes(term);
        const matchObs = m.observacion?.toLowerCase().includes(term);
        const matchPeriod = m.periodo_nombre?.toLowerCase().includes(term);
        const matchCreator = m.creado_por_nombre?.toLowerCase().includes(term);
        const matchMonto = m.monto.toString().includes(term);
        if (!matchDesc && !matchObs && !matchPeriod && !matchCreator && !matchMonto) {
          return false;
        }
      }

      return true;
    });
  }, [data, tipoFilter, periodoFilter, fechaDesde, fechaHasta, searchTerm]);

  // Filtered KPIs summary
  const filteredKPIs = useMemo(() => {
    let ing = 0;
    let egr = 0;
    for (const m of filteredMovimientos) {
      if (m.tipo === 'ingreso') ing += m.monto;
      else egr += m.monto;
    }
    return {
      totalIngresos: ing,
      totalEgresos: egr,
      count: filteredMovimientos.length,
    };
  }, [filteredMovimientos]);

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filteredMovimientos.length / pageSize));
  const paginatedMovimientos = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMovimientos.slice(start, start + pageSize);
  }, [filteredMovimientos, currentPage, pageSize]);

  // Quick Date Presets
  const applyDatePreset = (preset: 'month' | 'quarter' | 'year' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setFechaDesde('');
      setFechaHasta('');
    } else if (preset === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      setFechaDesde(`${y}-${m}-01`);
      setFechaHasta(now.toISOString().split('T')[0]);
    } else if (preset === 'quarter') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      setFechaDesde(d.toISOString().split('T')[0]);
      setFechaHasta(now.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const y = now.getFullYear();
      setFechaDesde(`${y}-01-01`);
      setFechaHasta(`${y}-12-31`);
    }
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTipoFilter('all');
    setPeriodoFilter('all');
    setFechaDesde('');
    setFechaHasta('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    tipoFilter !== 'all' ||
    periodoFilter !== 'all' ||
    fechaDesde !== '' ||
    fechaHasta !== '';

  const handleDeleteItem = async (mov: MovimientoItem) => {
    if (mov.tipo === 'ingreso') {
      if (mov.es_manual === false) return;
      const ok = window.confirm(
        `¿Estás seguro de eliminar este aporte de ${formatCOP(mov.monto)} ("${mov.descripcion}")?`
      );
      if (!ok) return;

      setDeletingId(mov.id);
      try {
        await onDeleteIngreso(mov.id);
        await fetchMovimientos();
      } finally {
        setDeletingId(null);
      }
    } else if (mov.tipo === 'egreso') {
      if (!onDeleteGasto) return;
      onDeleteGasto({
        id: mov.id,
        descripcion: mov.descripcion,
        monto: mov.monto,
      });
    }
  };

  const handleEditGasto = (mov: MovimientoItem) => {
    if (!onEditGasto || mov.tipo !== 'egreso') return;
    const matchedPeriodo = periodos.find((p) => p.nombre === mov.periodo_nombre);
    onEditGasto({
      id: mov.id,
      descripcion: mov.descripcion,
      monto: mov.monto,
      fecha: mov.fecha,
      campo_fondo: { id: fondo.campo_fondo_id },
      periodo: { id: matchedPeriodo?.id },
    });
  };

  // Export CSV
  const exportCSV = () => {
    if (!filteredMovimientos.length) return;
    const headers = ['Fecha', 'Tipo', 'Concepto', 'Observaciones', 'Periodo', 'Monto (COP)', 'Saldo Resultante (COP)', 'Origen'];
    const rows = filteredMovimientos.map((m) => [
      m.fecha,
      m.tipo === 'ingreso' ? 'INGRESO' : 'EGRESO',
      `"${(m.descripcion || '').replace(/"/g, '""')}"`,
      `"${(m.observacion || '').replace(/"/g, '""')}"`,
      `"${m.periodo_nombre || ''}"`,
      m.tipo === 'ingreso' ? m.monto : -m.monto,
      m.saldo_resultante,
      m.es_manual ? 'Manual / Directo' : 'Planilla',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Extracto_Fondo_${fondo.campo_fondo_nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden select-text text-slate-900 dark:text-slate-100">
      {/* ── 1. COMPACT TOP HEADER & NAVIGATION BAR ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
            title="Volver a la vista general de fondos (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Fund Selector Dropdown */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:inline">
              Fondo:
            </span>
            <select
              value={fondo.campo_fondo_id}
              onChange={(e) => {
                const target = fondosList.find((f) => f.campo_fondo_id === e.target.value);
                if (target) onSelectFondo(target);
              }}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-extrabold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[240px] truncate"
            >
              {fondosList.map((f) => (
                <option key={f.campo_fondo_id} value={f.campo_fondo_id}>
                  {f.es_manual ? '✍️ ' : f.es_transito ? '✈️ ' : '🏛️ '}
                  {f.campo_fondo_nombre} ({formatCOP(f.saldo_disponible ?? f.saldo_acumulado)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenNewIngreso(fondo)}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer active:scale-95"
            title="Registrar un aporte monetario a este fondo"
          >
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Ingreso</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenNewGasto(fondo)}
            className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer active:scale-95"
            title="Registrar un gasto contra este fondo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>− Gasto</span>
          </button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <button
            type="button"
            onClick={exportCSV}
            disabled={!filteredMovimientos.length}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
            title="Exportar a CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Imprimir"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={fetchMovimientos}
            disabled={loading}
            className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── 2. ULTRA-COMPACT KPI SUMMARY RIBBON (Takes only ~38px height) ── */}
      <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs font-medium">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Incomes */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Recaudo:</span>
            <span className="font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
              +{formatCOP(hasActiveFilters ? filteredKPIs.totalIngresos : (data?.total_ingresos ?? fondo.fondo_acumulado))}
            </span>
          </div>

          {/* Expenses */}
          <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">Egresos:</span>
            <span className="font-extrabold font-mono text-rose-800 dark:text-rose-300">
              −{formatCOP(hasActiveFilters ? filteredKPIs.totalEgresos : (data?.total_egresos ?? fondo.gastos_acumulados))}
            </span>
          </div>

          {/* Real Balance in Box */}
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80">
            <span className="text-[11px] font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">
              Saldo en Caja:
            </span>
            <span
              className={`font-black font-mono text-xs ${
                (data?.saldo_actual ?? fondo.saldo_acumulado) < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-indigo-700 dark:text-indigo-200'
              }`}
            >
              {formatCOP(data?.saldo_actual ?? fondo.saldo_acumulado)}
            </span>
          </div>
        </div>

        {/* Counter */}
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
          <span>Movimientos:</span>
          <strong className="text-slate-800 dark:text-slate-200 font-mono">{filteredMovimientos.length}</strong>
          {hasActiveFilters && (
            <span className="text-slate-400"> (de {data?.movimientos?.length || 0})</span>
          )}
        </div>
      </div>

      {/* ── 3. COMPACT FILTER TOOLBAR ── */}
      <div className="px-4 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar concepto, motivo, monto..."
              className="w-full pl-7 pr-6 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Tipo Filter */}
          <select
            value={tipoFilter}
            onChange={(e) => {
              setTipoFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Tipo: Todos</option>
            <option value="ingreso">🟢 Ingresos (+)</option>
            <option value="egreso">🔴 Egresos (−)</option>
          </select>

          {/* Periodo Filter */}
          <select
            value={periodoFilter}
            onChange={(e) => {
              setPeriodoFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[140px] truncate"
          >
            <option value="all">Período: Todos</option>
            {periodos.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.nombre}
              </option>
            ))}
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3 h-3 text-slate-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              title="Fecha inicial"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
              title="Fecha final"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => applyDatePreset('month')}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            >
              Este Mes
            </button>
            <button
              onClick={() => applyDatePreset('quarter')}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            >
              3 Meses
            </button>
            <button
              onClick={() => applyDatePreset('year')}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition"
            >
              Este Año
            </button>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-2 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>

        {/* Page size selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-[11px]">Filas:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* ── 4. HIGH DENSITY LEDGER DATA TABLE (Maximized Screen Real Estate) ── */}
      <div className="flex-1 overflow-auto bg-white dark:bg-slate-950">
        {loading && !data ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
            <span>Cargando libro de movimientos...</span>
          </div>
        ) : error ? (
          <div className="p-4 m-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <div>
              <p className="font-bold">Error al cargar movimientos</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        ) : paginatedMovimientos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400 text-xs">
            <Filter className="w-6 h-6 text-slate-300 dark:text-slate-700 mb-1 stroke-[1.5]" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No se encontraron movimientos</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
              {hasActiveFilters
                ? 'Intenta ajustar o limpiar los filtros de búsqueda.'
                : 'Aún no hay transacciones registradas para este fondo.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 rounded-lg hover:bg-indigo-100 transition"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-xs">
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-2 px-3 w-10 text-center">#</th>
                <th className="py-2 px-3 w-24">Fecha</th>
                <th className="py-2 px-3 w-28">Tipo</th>
                <th className="py-2 px-3 w-32">Origen / Fuente</th>
                <th className="py-2 px-3">Concepto & Observaciones</th>
                <th className="py-2 px-3 w-28">Período</th>
                <th className="py-2 px-3 w-32 text-right">Monto</th>
                <th className="py-2 px-3 w-32 text-right">Saldo en Caja</th>
                <th className="py-2 px-3 w-28 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
              {paginatedMovimientos.map((mov, idx) => {
                const isIngreso = mov.tipo === 'ingreso';
                const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={mov.id}
                    className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Number */}
                    <td className="py-2 px-3 text-center font-mono text-slate-400 text-[10px]">
                      {rowNumber}
                    </td>

                    {/* Fecha */}
                    <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-700 dark:text-slate-300 text-[11px] font-semibold">
                      {mov.fecha}
                    </td>

                    {/* Tipo */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {isIngreso ? (
                          <>
                            <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                            Ingreso
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-2.5 h-2.5 stroke-[2.5]" />
                            Egreso
                          </>
                        )}
                      </span>
                    </td>

                    {/* Origen / Fuente */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {mov.id.startsWith('planilla') ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          <FileSpreadsheet className="w-2.5 h-2.5" /> Planilla
                        </span>
                      ) : isIngreso ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <Coins className="w-2.5 h-2.5" /> Aporte Manual
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          <Building2 className="w-2.5 h-2.5" /> Gasto Tesorería
                        </span>
                      )}
                    </td>

                    {/* Concepto & Observación */}
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-[11px] leading-tight">
                        {mov.descripcion}
                      </div>
                      {mov.observacion && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                          Nota: {mov.observacion}
                        </div>
                      )}
                    </td>

                    {/* Período */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {mov.periodo_nombre ? (
                        <span className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          {mov.periodo_nombre}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>

                    {/* Monto */}
                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-black font-mono text-[11px] ${
                          isIngreso
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIngreso ? '+' : '−'}
                        {formatCOP(mov.monto)}
                      </span>
                    </td>

                    {/* Saldo Resultante */}
                    <td className="py-2 px-3 text-right whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px] bg-slate-50/50 dark:bg-slate-900/30">
                      {formatCOP(mov.saldo_resultante)}
                    </td>

                    {/* Acciones para cada movimiento */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. GASTO (EGRESO): Editar, Voucher, Eliminar */}
                        {!isIngreso && (
                          <>
                            {onEditGasto && (
                              <button
                                type="button"
                                onClick={() => handleEditGasto(mov)}
                                title="Editar Gasto"
                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded transition cursor-pointer"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}

                            {onOpenVoucher && (
                              <button
                                type="button"
                                onClick={() => onOpenVoucher(mov)}
                                title="Ver Comprobante / Voucher de Gasto"
                                className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded transition cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                              </button>
                            )}

                            {onDeleteGasto && (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(mov)}
                                title="Eliminar Gasto"
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}

                        {/* 2. INGRESO MANUAL: Eliminar */}
                        {isIngreso && mov.es_manual !== false && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(mov)}
                            disabled={deletingId === mov.id}
                            title="Eliminar este ingreso manual"
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {/* 3. PLANILLA: Protegido */}
                        {isIngreso && mov.es_manual === false && (
                          <span
                            title="Recaudo mensual protegido proveniente de la planilla de iglesias"
                            className="p-1 text-slate-300 dark:text-slate-600 cursor-default"
                          >
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── 5. COMPACT PAGINATION FOOTER BAR ── */}
      {filteredMovimientos.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
            Mostrando {(currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, filteredMovimientos.length)} de{' '}
            <strong className="text-slate-900 dark:text-white">{filteredMovimientos.length}</strong> movimientos
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Primera página"
            >
              <ChevronsLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>

            <span className="px-2 py-0.5 font-bold text-[11px] text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Última página"
            >
              <ChevronsRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
