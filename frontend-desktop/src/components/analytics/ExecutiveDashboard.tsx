import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Building2, 
  Sparkles, 
  User, 
  ArrowUpRight, 
  ArrowDownRight,
  BarChart3,
  Search,
  Layers,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  AlertTriangle,
  Scale,
  BookOpen,
  Coins,
  Wallet,
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { formatCOP } from '../../utils/formatters';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

interface ExecutiveDashboardProps {
  gridData: any;
  periodos: any[];
  selectedPeriodoId: string;
  onSelectPeriodo?: (id: string) => void;
  tablas?: any[];
  selectedTablaId?: string;
  onSelectTabla?: (id: string) => void;
  iglesias: any[];
  gastos?: any[];
  gastosResumen?: any[];
  gastosLoading?: boolean;
  onOpenCopilot: () => void;
  onOpenChurchDetail: (iglesiaId: string) => void;
  onOpenHelp?: () => void;
}

export function ExecutiveDashboard({
  gridData,
  periodos,
  selectedPeriodoId,
  onSelectPeriodo,
  tablas = [],
  selectedTablaId = 'all',
  onSelectTabla,
  iglesias,
  gastos = [],
  gastosResumen = [],
  onOpenCopilot,
  onOpenChurchDetail,
  onOpenHelp,
}: ExecutiveDashboardProps) {
  const [healthFilter, setHealthFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all' | 'borrador' | 'enviado' | 'en_revision' | 'aprobado' | 'consolidado'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChurchModal, setSelectedChurchModal] = useState<any | null>(null);

  const currentPeriod = periodos.find((p) => p.id === selectedPeriodoId);
  const rows = gridData?.filas || [];
  const columns = gridData?.columnas || [];

  const isAllTablesSelected = selectedTablaId === 'all' || !selectedTablaId;
  const currentTableObj = tablas.find((t) => t.id === selectedTablaId);

  // Calculate Metrics
  const metrics = useMemo(() => {
    let totalIngresosGeneral = 0;
    let totalEgresosGeneral = 0;
    let totalTransito = 0;
    let reportedChurches = 0;

    let countBorrador = 0;
    let countEnviado = 0;
    let countEnRevision = 0;
    let countAprobado = 0;
    let countConsolidado = 0;

    const churchStats = rows.map((r: any) => {
      const igDetails = iglesias.find((i) => i.id === r.iglesia_id) || {};
      let churchIngresos = 0;
      let churchEgresos = 0;
      let churchTransito = 0;
      let manualFieldsCount = 0;
      let filledFieldsCount = 0;

      columns.forEach((col: any) => {
        const valObj = r.valores?.find((v: any) => v.campo_id === col.id);
        const isCalc = valObj?.modo_calculo === 'calculado';
        const numVal = Number(isCalc ? (valObj?.valor_calculado || 0) : (valObj?.valor_manual || 0));

        if (!isCalc && col.tipo === 'moneda') {
          manualFieldsCount++;
          if (numVal > 0) filledFieldsCount++;
        }

        if (col.es_transito) {
          churchTransito += numVal;
        }

        const colName = (col.nombre || '').toLowerCase();
        const secName = (col.seccion || '').toLowerCase();
        const secTesorero = (col.seccion_tesorero || '').toLowerCase();

        if (secName === 'ingresos' || secTesorero === 'ingresos') {
          churchIngresos += numVal;
        } else if (secName === 'egresos' || secTesorero === 'egresos') {
          churchEgresos += numVal;
        } else {
          if (colName.includes('ingreso') || colName.includes('diezmo') || colName.includes('ofrenda')) {
            churchIngresos += numVal;
          } else if (colName.includes('egreso') || colName.includes('gasto') || colName.includes('aporte')) {
            churchEgresos += numVal;
          } else {
            churchIngresos += numVal;
          }
        }
      });

      const churchTotal = churchIngresos;
      totalIngresosGeneral += churchIngresos;
      totalEgresosGeneral += churchEgresos;
      totalTransito += churchTransito;

      const completionRate = manualFieldsCount > 0 ? (filledFieldsCount / manualFieldsCount) * 100 : (churchTotal > 0 ? 100 : 0);
      
      const st = r.estado_informe || 'borrador';
      if (st === 'enviado') countEnviado++;
      else if (st === 'en_revision') countEnRevision++;
      else if (st === 'aprobado') countAprobado++;
      else if (st === 'consolidado') countConsolidado++;
      else countBorrador++;

      // Health status calculation
      let status: 'green' | 'yellow' | 'red' = 'green';
      let statusReason = 'Planilla al día con balance óptimo';

      if (st === 'aprobado' || st === 'consolidado') {
        status = 'green';
        statusReason = `Informe ${st === 'aprobado' ? 'Aprobado' : 'Consolidado'} oficialmente`;
        reportedChurches++;
      } else if (st === 'enviado') {
        status = 'green';
        statusReason = 'Informe enviado a tesorería (listo para revisar/aprobar)';
        reportedChurches++;
      } else if (completionRate >= 80) {
        status = 'green';
        statusReason = `Planilla completada (${Math.round(completionRate)}%)`;
        reportedChurches++;
      } else if (completionRate > 0 || churchTotal > 0 || st === 'en_revision') {
        status = 'yellow';
        statusReason = st === 'en_revision' 
          ? 'En revisión por tesorería' 
          : `En digitación (${Math.round(completionRate)}% avance)`;
      } else {
        status = 'red';
        statusReason = 'Sin registrar datos este mes (Pendiente)';
      }

      return {
        ...r,
        ...igDetails,
        total: churchTotal,
        ingresos: churchIngresos,
        egresos: churchEgresos,
        transito: churchTransito,
        completionRate: Math.round(completionRate),
        status,
        statusReason,
      };
    });

    // ── GASTOS & FONDOS REAL-TIME CALCULATION ──
    const fondosList = gastosResumen && gastosResumen.length > 0 ? gastosResumen : [];

    let totalRecaudoFondosPeriodo = 0;
    let totalRecaudoFondosAcumulado = 0;
    let totalGastosPeriodo = 0;
    let totalGastosAcumulado = 0;

    if (fondosList.length > 0) {
      fondosList.forEach((f: any) => {
        totalRecaudoFondosPeriodo += Number(f.fondo_periodo || 0);
        totalRecaudoFondosAcumulado += Number(f.total_fondo ?? f.fondo_acumulado ?? f.fondo_periodo ?? 0);
        totalGastosPeriodo += Number(f.gastos_periodo || 0);
        totalGastosAcumulado += Number(f.total_gastos ?? f.gastos_acumulados ?? f.gastos_periodo ?? 0);
      });
    } else {
      // Fallback from columns marked as fund
      columns.forEach((col: any) => {
        if (col.es_fondo) {
          rows.forEach((r: any) => {
            const valObj = r.valores?.find((v: any) => v.campo_id === col.id);
            const isCalc = valObj?.modo_calculo === 'calculado';
            const numVal = Number(isCalc ? (valObj?.valor_calculado || 0) : (valObj?.valor_manual || 0));
            totalRecaudoFondosPeriodo += numVal;
          });
        }
      });
      totalRecaudoFondosAcumulado = totalRecaudoFondosPeriodo;
      if (gastos && gastos.length > 0) {
        gastos.forEach((g: any) => {
          const monto = Number(g.monto || 0);
          totalGastosAcumulado += monto;
          if (g.periodo_id === selectedPeriodoId) {
            totalGastosPeriodo += monto;
          }
        });
      }
    }

    const saldoRealCajaFondos = totalRecaudoFondosAcumulado - totalGastosAcumulado;
    const saldoPeriodoFondos = totalRecaudoFondosPeriodo - totalGastosPeriodo;

    const totalChurches = rows.length;
    const complianceRate = totalChurches > 0 ? Math.round((reportedChurches / totalChurches) * 100) : 0;

    return {
      totalIngresos: totalRecaudoFondosAcumulado > 0 ? totalRecaudoFondosAcumulado : totalIngresosGeneral,
      totalEgresos: totalGastosAcumulado > 0 ? totalGastosAcumulado : totalEgresosGeneral,
      totalIngresosGeneral,
      totalEgresosGeneral,
      totalTransito,
      totalRecaudoFondosPeriodo,
      totalRecaudoFondosAcumulado,
      totalGastosPeriodo,
      totalGastosAcumulado,
      saldoRealCajaFondos,
      saldoPeriodoFondos,
      reportedChurches,
      totalChurches,
      complianceRate,
      countBorrador,
      countEnviado,
      countEnRevision,
      countAprobado,
      countConsolidado,
      churchStats,
      fondosList,
      gastosList: gastos || [],
    };
  }, [rows, columns, iglesias, gastosResumen, gastos, selectedPeriodoId]);

  // Filtered churches list
  const filteredChurches = useMemo(() => {
    return metrics.churchStats.filter((c: any) => {
      let matches = true;

      if (healthFilter !== 'all') {
        matches = matches && c.status === healthFilter;
      }

      if (workflowFilter !== 'all') {
        matches = matches && (c.estado_informe || 'borrador') === workflowFilter;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          c.iglesia_nombre?.toLowerCase().includes(term) ||
          c.identificador_interno?.toLowerCase().includes(term) ||
          c.nombre_pastor?.toLowerCase().includes(term) ||
          (c.codigo && c.codigo.toLowerCase().includes(term));
        matches = matches && matchesSearch;
      }

      return matches;
    });
  }, [metrics.churchStats, healthFilter, workflowFilter, searchTerm]);

  // Section Breakdown for Dynamic Doughnut Chart
  const sectionBreakdown = useMemo(() => {
    const secTotals: Record<string, number> = {};
    for (const r of rows) {
      for (const col of columns) {
        const valObj = r.valores?.find((v: any) => v.campo_id === col.id);
        const isCalc = valObj?.modo_calculo === 'calculado';
        const numVal = Number(isCalc ? (valObj?.valor_calculado || 0) : (valObj?.valor_manual || 0));
        if (numVal <= 0) continue;

        const sec = col.seccion || col.seccion_tesorero || 'Ingresos Generales';
        secTotals[sec] = (secTotals[sec] || 0) + numVal;
      }
    }

    const labels = Object.keys(secTotals);
    const data = Object.values(secTotals);

    if (labels.length === 0) {
      return {
        labels: ['Ingresos del Período'],
        datasets: [
          {
            data: [metrics.totalIngresos || 1],
            backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6'],
            borderWidth: 0,
          },
        ],
      };
    }

    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    };
  }, [rows, columns, metrics.totalIngresos]);

  // Top 5 contributing churches
  const topChurches = [...metrics.churchStats]
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 5);

  const barData = {
    labels: topChurches.map((c: any) => c.iglesia_nombre || 'Sede'),
    datasets: [
      {
        label: 'Aporte Total ($)',
        data: topChurches.map((c: any) => c.total),
        backgroundColor: '#4f46e5',
        borderRadius: 6,
      },
    ],
  };

  const handleSetHealthFilter = (filter: 'all' | 'green' | 'yellow' | 'red') => {
    setHealthFilter(filter);
    setWorkflowFilter('all');
  };

  const handleSetWorkflowFilter = (wf: 'all' | 'borrador' | 'enviado' | 'en_revision' | 'aprobado' | 'consolidado') => {
    if (workflowFilter === wf) {
      setWorkflowFilter('all');
    } else {
      setWorkflowFilter(wf);
      setHealthFilter('all');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 space-y-6 animate-fade-in font-sans">
      {/* ── HEADER EXECUTIVE CONTROLS WITH SCOPE SELECTORS ── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 shadow-2xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Tablero de Control Financiero & Salud Contable
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {isAllTablesSelected ? 'Consolidado General' : currentTableObj?.nombre || 'Tabla'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Métricas gerenciales y estado contable en tiempo real para{' '}
                <span className="font-bold text-slate-800 dark:text-slate-200">{currentPeriod?.nombre}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons: Guía de Ayuda & Asistente IA */}
          <div className="flex items-center gap-2">
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                title="Abrir Guía y Centro de Ayuda"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Guía del Sistema</span>
              </button>
            )}
            <button
              onClick={onOpenCopilot}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Asistente IA Copilot</span>
            </button>
          </div>
        </div>

        {/* Scope Selectors: Table & Period Navigation */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {/* Table Scope Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Alcance de Tabla:
              </span>
              <div className="relative">
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 pr-8 py-1.5 font-bold text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:border-slate-400 shadow-2xs"
                  value={selectedTablaId || 'all'}
                  onChange={(e) => onSelectTabla && onSelectTabla(e.target.value)}
                >
                  <option value="all">🌐 Consolidado General (Todas las Tablas)</option>
                  {tablas.map((t) => (
                    <option key={t.id} value={t.id}>
                      📁 {t.nombre} ({t.iglesias?.length ?? 0} sedes)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Período:
              </span>
              <div className="relative">
                <select
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 pr-8 py-1.5 font-bold text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:border-slate-400 shadow-2xs"
                  value={selectedPeriodoId}
                  onChange={(e) => onSelectPeriodo && onSelectPeriodo(e.target.value)}
                >
                  {periodos.map((pe) => (
                    <option key={pe.id} value={pe.id}>
                      {pe.nombre} {pe.estado === 'abierto' ? '● Abierto' : '● Cerrado'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Analizando <span className="font-bold text-slate-900 dark:text-white">{rows.length}</span> sedes en este informe
          </div>
        </div>
      </div>

      {/* ── TOP KPI CARDS (Clean, Elegant & Minimalist) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Recaudo Fondos (Ingresos) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recaudo de Fondos</span>
            <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center gap-0.5 border border-emerald-200 dark:border-emerald-800/50">
              <ArrowUpRight className="w-3.5 h-3.5" /> Ingresos
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {formatCOP(metrics.totalRecaudoFondosAcumulado > 0 ? metrics.totalRecaudoFondosAcumulado : metrics.totalRecaudoFondosPeriodo)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Período actual: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCOP(metrics.totalRecaudoFondosPeriodo)}</span>
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* KPI 2: Total Gastos Registrados */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gastos de Tesorería</span>
            <span className="p-1.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg text-xs font-bold flex items-center gap-0.5 border border-rose-200 dark:border-rose-800/50">
              <ArrowDownRight className="w-3.5 h-3.5" /> Salidas
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono tracking-tight">
              {formatCOP(metrics.totalGastosAcumulado > 0 ? metrics.totalGastosAcumulado : metrics.totalGastosPeriodo)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Período actual: <span className="font-semibold text-rose-600 dark:text-rose-400">{formatCOP(metrics.totalGastosPeriodo)}</span> ({metrics.gastosList.length} registrados)
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-rose-500 h-1 rounded-full" 
              style={{ 
                width: metrics.totalRecaudoFondosAcumulado > 0 
                  ? `${Math.min(100, Math.round((metrics.totalGastosAcumulado / metrics.totalRecaudoFondosAcumulado) * 100))}%` 
                  : '0%' 
              }}
            ></div>
          </div>
        </div>

        {/* KPI 3: Saldo Real en Caja */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saldo Real en Caja
            </span>
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-0.5 border border-indigo-200 dark:border-indigo-800/50">
              <Scale className="w-3.5 h-3.5" /> Disponible
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
              {formatCOP(metrics.saldoRealCajaFondos)}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Fondos propios netos disponibles
            </p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* KPI 4: Cumplimiento de Sedes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cumplimiento de Reportes</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
              {metrics.complianceRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
              {metrics.reportedChurches} <span className="text-sm font-semibold text-slate-400">/ {metrics.totalChurches} Sedes</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Sedes con planilla completa o enviada</p>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${metrics.complianceRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* ── CONTROL DE FONDOS Y GASTOS EN TIEMPO REAL ── */}
      {metrics.fondosList.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-800/60">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Control de Fondos de Tesorería
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Saldos reales, recaudos acumulados y egresos por fondo
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
              Total en Caja: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{formatCOP(metrics.saldoRealCajaFondos)}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.fondosList.map((f: any) => {
              const recaudoTotal = Number(f.total_fondo ?? f.fondo_acumulado ?? f.fondo_periodo ?? 0);
              const gastosTotal = Number(f.total_gastos ?? f.gastos_acumulados ?? f.gastos_periodo ?? 0);
              const saldoReal = Number(f.saldo_disponible ?? (recaudoTotal - gastosTotal));
              const pctEgresado = recaudoTotal > 0 ? Math.min(100, Math.round((gastosTotal / recaudoTotal) * 100)) : 0;
              const pctDisponible = 100 - pctEgresado;

              return (
                <div
                  key={f.campo_fondo_id}
                  className="bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {f.es_acumulable ? 'Fondo Acumulativo' : 'Fondo Periódico'}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                        {f.campo_fondo_nombre}
                      </h4>
                    </div>
                    <div className="p-1.5 bg-white dark:bg-slate-700 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-600">
                      <Coins className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Recaudo acumulado total:</span>
                      <span className="font-bold font-mono text-slate-900 dark:text-white">{formatCOP(recaudoTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-rose-600 dark:text-rose-400">Egresos / Giros acumulados:</span>
                      <span className="font-bold font-mono text-rose-600 dark:text-rose-400">-{formatCOP(gastosTotal)}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-[11px] font-extrabold uppercase text-slate-800 dark:text-slate-200">Saldo Real en Caja:</span>
                      <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{formatCOP(saldoReal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                      <span>Movimiento del mes:</span>
                      <span>+{formatCOP(f.fondo_periodo || 0)} / -{formatCOP(f.gastos_periodo || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${pctDisponible}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                      <span>{pctEgresado}% egresado</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Disponible ({pctDisponible}%)</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ── WORKFLOW & APPROVAL STATUS SUMMARY ── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Estado de Informes y Aprobación
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Resumen del flujo de digitación, recepción y aprobación de las congregaciones
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Haz clic para filtrar sedes por estado:
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Aprobados */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('aprobado')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'aprobado'
                ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 font-bold text-xs">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countAprobado}</span>
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Verificados por tesorería</p>
          </button>

          {/* Enviados */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('enviado')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'enviado'
                ? 'bg-indigo-100 dark:bg-indigo-900/60 border-indigo-500 ring-2 ring-indigo-500/20'
                : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-700 dark:text-indigo-300 font-bold text-xs">
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Enviados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countEnviado}</span>
            </div>
            <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-1">Listos para revisión</p>
          </button>

          {/* En Revisión */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('en_revision')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'en_revision'
                ? 'bg-amber-100 dark:bg-amber-900/60 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 font-bold text-xs">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> En Revisión
              </span>
              <span className="font-mono text-sm font-black">{metrics.countEnRevision}</span>
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mt-1">En validación contable</p>
          </button>

          {/* Consolidados */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('consolidado')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'consolidado'
                ? 'bg-purple-100 dark:bg-purple-900/60 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-purple-50/60 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 hover:bg-purple-100/60 dark:hover:bg-purple-900/40'
            }`}
          >
            <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Consolidados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countConsolidado}</span>
            </div>
            <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80 mt-1">Cierre definitivo</p>
          </button>

          {/* Borradores / Pendientes */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('borrador')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'borrador'
                ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300 font-bold text-xs">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Borradores
              </span>
              <span className="font-mono text-sm font-black">{metrics.countBorrador}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">En proceso o pendientes</p>
          </button>
        </div>
      </div>

      {/* ── CHARTS ROW: DONUT & TOP BARS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut: Distribución por Secciones */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
               <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Distribución por Conceptos
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{currentPeriod?.nombre}</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <Doughnut 
              data={sectionBreakdown} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { 
                    position: 'bottom', 
                    labels: { 
                      boxWidth: 10, 
                      font: { size: 10 },
                      color: '#94a3b8'
                    } 
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Bar: Top 5 Sedes */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Top 5 Congregaciones con Mayor Recaudo
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              {isAllTablesSelected ? 'Consolidado General' : currentTableObj?.nombre}
            </span>
          </div>
          <div className="flex-1 min-h-[220px]">
            <Bar 
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { 
                      callback: (v) => formatCOP(Number(v)),
                      color: '#94a3b8'
                    }
                  },
                  x: { 
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* ── SEMÁFORO DE SALUD FINANCIERA & MAPA DE SEDES ── */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Semáforo de Salud Financiera de Sedes</span>
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({filteredChurches.length} congregaciones)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monitoreo en tiempo real del estado de reporte y consistencia contable.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar iglesia o pastor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-600 w-48 placeholder:text-slate-400"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => handleSetHealthFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  healthFilter === 'all' && workflowFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => handleSetHealthFilter('green')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'green' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                🟢 Al día
              </button>
              <button
                onClick={() => handleSetHealthFilter('yellow')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'yellow' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                🟡 En proceso
              </button>
              <button
                onClick={() => handleSetHealthFilter('red')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'red' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                🔴 Retraso
              </button>
            </div>
          </div>
        </div>

        {/* Churches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredChurches.length === 0 ? (
            <div className="col-span-full text-center py-12 text-xs text-slate-400 dark:text-slate-500">
              No se encontraron congregaciones con los filtros aplicados.
            </div>
          ) : (
            filteredChurches.map((ch: any) => {
              const isGreen = ch.status === 'green';
              const isYellow = ch.status === 'yellow';
              const st = ch.estado_informe || 'borrador';

              return (
                <div
                  key={ch.iglesia_id}
                  onClick={() => setSelectedChurchModal(ch)}
                  className="p-4 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600/60 rounded-xl transition cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl mt-0.5 ${
                        isGreen ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' :
                        isYellow ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {ch.identificador_interno && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1 rounded">
                              {ch.identificador_interno}
                            </span>
                          )}
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                            {ch.iglesia_nombre}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          <span>{ch.nombre_pastor || 'Pastor no asignado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isGreen ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                        isYellow ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {isGreen ? 'Al día' : isYellow ? 'En proceso' : 'Retraso'}
                      </span>
                      {st !== 'borrador' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          st === 'aprobado' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200' :
                          st === 'enviado' ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200' :
                          st === 'en_revision' ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' :
                          'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                        }`}>
                          {st === 'en_revision' ? 'En Revisión' : st}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Value */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-500 text-[11px]">Avance de Planilla:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{ch.completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isGreen ? 'bg-emerald-500' : isYellow ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${ch.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Total Reportado</span>
                      <span className="font-extrabold font-mono text-sm text-slate-900 dark:text-white">{formatCOP(ch.total)}</span>
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-0.5">
                      Ver Ficha →
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── MODAL: FICHA EJECUTIVA DE SEDE ── */}
      {selectedChurchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{selectedChurchModal.iglesia_nombre}</h3>
                  <p className="text-xs text-slate-300">
                    Pastor: {selectedChurchModal.nombre_pastor || 'No especificado'} • {selectedChurchModal.identificador_interno}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChurchModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Total Aportado</span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white mt-1 block">
                    {formatCOP(selectedChurchModal.total)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Estado de Salud</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1 block flex items-center gap-1">
                    {selectedChurchModal.statusReason}
                  </span>
                </div>
              </div>

              {/* Breakdown by column */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                  Desglose de Conceptos Reportados
                </h4>
                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {columns.map((col: any) => {
                    const val = selectedChurchModal.valores?.find((v: any) => v.campo_id === col.id);
                    if (!val) return null;
                    const isCalc = val.modo_calculo === 'calculado';
                    const amount = isCalc ? val.valor_calculado : val.valor_manual;

                    return (
                      <div key={col.id} className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{col.nombre}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatCOP(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedChurchModal(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  const id = selectedChurchModal.iglesia_id;
                  setSelectedChurchModal(null);
                  onOpenChurchDetail(id);
                }}
                className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition cursor-pointer"
              >
                Ir a Planilla de Sede →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
