import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Building2, 
  Sparkles, 
  User, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart as PieChartIcon,
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
  Scale
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
import { HelpTooltip } from '../common/HelpTooltip';

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
  onOpenCopilot: () => void;
  onOpenChurchDetail: (iglesiaId: string) => void;
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
  onOpenCopilot,
  onOpenChurchDetail,
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
    let totalIngresos = 0;
    let totalEgresos = 0;
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
          // If no section defined, check column name
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
      totalIngresos += churchIngresos;
      totalEgresos += churchEgresos;
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

    const totalChurches = rows.length;
    const complianceRate = totalChurches > 0 ? Math.round((reportedChurches / totalChurches) * 100) : 0;
    const balanceNeto = totalIngresos - totalEgresos;
    const balanceNetoPropio = totalIngresos - totalEgresos - totalTransito;

    return {
      totalIngresos,
      totalEgresos,
      totalTransito,
      balanceNeto,
      balanceNetoPropio,
      reportedChurches,
      totalChurches,
      complianceRate,
      countBorrador,
      countEnviado,
      countEnRevision,
      countAprobado,
      countConsolidado,
      churchStats,
    };
  }, [rows, columns, iglesias]);

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
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6 animate-fade-in font-sans">
      {/* ── HEADER EXECUTIVE CONTROLS WITH SCOPE SELECTORS ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 shadow-2xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Tablero de Control Financiero & Salud Contable
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  {isAllTablesSelected ? 'Consolidado General' : currentTableObj?.nombre || 'Tabla'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Métricas gerenciales y estado contable en tiempo real para{' '}
                <span className="font-bold text-slate-800">{currentPeriod?.nombre}</span>
              </p>
            </div>
          </div>

          {/* Action Button: Asistente IA */}
          <div className="flex items-center gap-2">
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
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-3">
            {/* Table Scope Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-600" /> Alcance de Tabla:
              </span>
              <HelpTooltip
                title="Alcance de Tablas"
                text="Permite ver las estadísticas de una tabla en particular o el consolidado global de todas las 32 congregaciones juntas."
                tip="Usa 'Consolidado General' para ver la foto completa del distrito."
              />
              <div className="relative">
                <select
                  className="bg-white border border-slate-300 rounded-xl px-3 pr-8 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:border-slate-400 shadow-2xs"
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
              <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Período:
              </span>
              <HelpTooltip
                title="Período Contable"
                text="Selecciona el mes contable que deseas consultar. Los períodos con candado o cerrados están en modo lectura histórica."
              />
              <div className="relative">
                <select
                  className="bg-white border border-slate-300 rounded-xl px-3 pr-8 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-indigo-600 appearance-none cursor-pointer hover:border-slate-400 shadow-2xs"
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

          <div className="text-xs font-semibold text-slate-500">
            Analizando <span className="font-bold text-slate-900">{rows.length}</span> sedes en este informe
          </div>
        </div>
      </div>

      {/* ── TOP KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Ingresos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Ingresos</span>
              <HelpTooltip
                title="Total Ingresos Recaudados"
                text="Suma total de los ingresos locales (diezmos, ofrendas y recaudos) de todas las congregaciones en este período."
              />
            </div>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> Recaudo
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCOP(metrics.totalIngresos)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isAllTablesSelected ? 'Total recaudado en todas las tablas' : `Total tabla ${currentTableObj?.nombre || ''}`}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* KPI 2: Total Egresos / Aportes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Egresos & Aportes</span>
              <HelpTooltip
                title="Total Egresos & Aportes"
                text="Monto total de salidas registradas: aportes zonales, deducciones por porcentaje y gastos operacionales."
              />
            </div>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" /> Salidas
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">
              {formatCOP(metrics.totalEgresos)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Egresos y deducciones registradas</p>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-rose-500 h-1 rounded-full" style={{ width: metrics.totalIngresos > 0 ? `${Math.min(100, Math.round((metrics.totalEgresos / metrics.totalIngresos) * 100))}%` : '0%' }}></div>
          </div>
        </div>

        {/* KPI 3: Balance Neto en Caja */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {metrics.totalTransito > 0 ? "Saldo Propio Zona 52" : "Balance Neto en Caja"}
              </span>
              <HelpTooltip
                title="Saldo Propio en Caja Zonal"
                text="Saldo real disponible que queda para la tesorería de la Zona 52 (Ingresos menos Egresos menos Fondos en Tránsito hacia Entes Superiores)."
                tip="Los fondos en tránsito no inflan este saldo."
              />
            </div>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-0.5">
              <Scale className="w-3.5 h-3.5" /> Neto
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-indigo-600 font-mono tracking-tight">
              {formatCOP(metrics.totalTransito > 0 ? metrics.balanceNetoPropio : metrics.balanceNeto)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metrics.totalTransito > 0
                ? `Excluye ${formatCOP(metrics.totalTransito)} en tránsito para entes superiores`
                : "Ingresos menos egresos del período"}
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* KPI 4: Cumplimiento de Sedes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cumplimiento de Reportes</span>
              <HelpTooltip
                title="Porcentaje de Cumplimiento"
                text="Mide qué porcentaje de las sedes ya enviaron su informe o completaron el 80% o más de su planilla."
              />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {metrics.complianceRate}%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {metrics.reportedChurches} <span className="text-sm font-semibold text-slate-400">/ {metrics.totalChurches} Sedes</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Sedes con planilla completa o enviada</p>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${metrics.complianceRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* ── WORKFLOW & APPROVAL STATUS SUMMARY ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> Estado de Informes y Aprobación
              </h3>
              <HelpTooltip
                title="Estados del Flujo Contable"
                text="Muestra en qué etapa se encuentra el informe mensual de cada congregación: Borrador (en preparación), Enviado (en espera de revisión), En Revisión (con observaciones del tesorero), o Aprobado (oficial)."
                tip="Haz clic en cualquier estado para filtrar la lista de sedes abajo."
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Resumen del flujo de digitación, recepción y aprobación de las congregaciones
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
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
                ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500/20'
                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-700 font-bold text-xs">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countAprobado}</span>
            </div>
            <p className="text-[10px] text-emerald-600/80 mt-1">Verificados por tesorería</p>
          </button>

          {/* Enviados */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('enviado')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'enviado'
                ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-500/20'
                : 'bg-indigo-50/60 border-indigo-200 hover:bg-indigo-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-indigo-700 font-bold text-xs">
              <span className="flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> Enviados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countEnviado}</span>
            </div>
            <p className="text-[10px] text-indigo-600/80 mt-1">Listos para revisión</p>
          </button>

          {/* En Revisión */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('en_revision')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'en_revision'
                ? 'bg-amber-100 border-amber-500 ring-2 ring-amber-500/20'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-amber-700 font-bold text-xs">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> En Revisión
              </span>
              <span className="font-mono text-sm font-black">{metrics.countEnRevision}</span>
            </div>
            <p className="text-[10px] text-amber-600/80 mt-1">En validación contable</p>
          </button>

          {/* Consolidados */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('consolidado')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'consolidado'
                ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-500/20'
                : 'bg-purple-50/60 border-purple-200 hover:bg-purple-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-purple-700 font-bold text-xs">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Consolidados
              </span>
              <span className="font-mono text-sm font-black">{metrics.countConsolidado}</span>
            </div>
            <p className="text-[10px] text-purple-600/80 mt-1">Cierre definitivo</p>
          </button>

          {/* Borradores / Pendientes */}
          <button
            type="button"
            onClick={() => handleSetWorkflowFilter('borrador')}
            className={`p-3 rounded-xl border text-left transition cursor-pointer ${
              workflowFilter === 'borrador'
                ? 'bg-slate-200 border-slate-400 ring-2 ring-slate-400/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-slate-700 font-bold text-xs">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Borradores
              </span>
              <span className="font-mono text-sm font-black">{metrics.countBorrador}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">En proceso o pendientes</p>
          </button>
        </div>
      </div>

      {/* ── CHARTS ROW: DONUT & TOP BARS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut: Distribución por Secciones */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Distribución por Conceptos
              </h3>
              <HelpTooltip
                title="Distribución de Dinero"
                text="Compara el porcentaje total que representan los Ingresos frente a los Egresos y Deducciones registradas en este período."
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">{currentPeriod?.nombre}</span>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[220px]">
            <Doughnut 
              data={sectionBreakdown} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                }
              }} 
            />
          </div>
        </div>

        {/* Bar: Top 5 Sedes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Top 5 Congregaciones con Mayor Recaudo
              </h3>
              <HelpTooltip
                title="Sedes con Mayor Ingreso"
                text="Muestra las 5 congregaciones que más aportaron o recaudaron en este período."
              />
            </div>
            <span className="text-[10px] text-slate-400 font-semibold">
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
                    grid: { color: '#f1f5f9' },
                    ticks: { callback: (v) => formatCOP(Number(v)) }
                  },
                  x: { grid: { display: false } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* ── SEMÁFORO DE SALUD FINANCIERA & MAPA DE SEDES ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>Semáforo de Salud Financiera de Sedes</span>
                <span className="text-xs font-normal text-slate-400">({filteredChurches.length} congregaciones)</span>
              </h3>
              <HelpTooltip
                title="Semáforo de Salud Contable"
                text="🟢 Verde (Al día): Planilla completa, enviada o aprobada.\n🟡 Amarillo (En proceso): Planilla iniciada pero incompleta (<80%) o devuelta para corrección.\n🔴 Rojo (Retraso): Sede que aún no ha digitado ningún valor este mes."
              />
            </div>
            <p className="text-xs text-slate-500">Monitoreo en tiempo real del estado de reporte y consistencia contable.</p>
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
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 w-48"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => handleSetHealthFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  healthFilter === 'all' && workflowFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => handleSetHealthFilter('green')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'green' ? 'bg-emerald-500 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                🟢 Al día
              </button>
              <button
                onClick={() => handleSetHealthFilter('yellow')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'yellow' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                }`}
              >
                🟡 En proceso
              </button>
              <button
                onClick={() => handleSetHealthFilter('red')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                  healthFilter === 'red' ? 'bg-rose-500 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
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
            <div className="col-span-full text-center py-12 text-xs text-slate-400">
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
                  className="p-4 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition cursor-pointer shadow-2xs hover:shadow-xs group flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-xl mt-0.5 ${
                        isGreen ? 'bg-emerald-100 text-emerald-700' :
                        isYellow ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {ch.identificador_interno && (
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-1 rounded">
                              {ch.identificador_interno}
                            </span>
                          )}
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                            {ch.iglesia_nombre}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          <span>{ch.nombre_pastor || 'Pastor no asignado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        isGreen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        isYellow ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {isGreen ? 'Al día' : isYellow ? 'En proceso' : 'Retraso'}
                      </span>
                      {st !== 'borrador' && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          st === 'aprobado' ? 'bg-emerald-100 text-emerald-800' :
                          st === 'enviado' ? 'bg-indigo-100 text-indigo-800' :
                          st === 'en_revision' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {st === 'en_revision' ? 'En Revisión' : st}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress & Value */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Avance de Planilla:</span>
                      <span className="font-mono font-bold text-slate-700">{ch.completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isGreen ? 'bg-emerald-500' : isYellow ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${ch.completionRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-slate-400">Total Reportado</span>
                      <span className="font-extrabold font-mono text-sm text-slate-900">{formatCOP(ch.total)}</span>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-bold group-hover:underline flex items-center gap-0.5">
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
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
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
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Aportado</span>
                  <span className="text-lg font-extrabold font-mono text-slate-900 mt-1 block">
                    {formatCOP(selectedChurchModal.total)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado de Salud</span>
                  <span className="text-sm font-bold text-slate-800 mt-1 block flex items-center gap-1">
                    {selectedChurchModal.statusReason}
                  </span>
                </div>
              </div>

              {/* Breakdown by column */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Desglose de Conceptos Reportados
                </h4>
                <div className="space-y-1.5 divide-y divide-slate-100">
                  {columns.map((col: any) => {
                    const val = selectedChurchModal.valores?.find((v: any) => v.campo_id === col.id);
                    if (!val) return null;
                    const isCalc = val.modo_calculo === 'calculado';
                    const amount = isCalc ? val.valor_calculado : val.valor_manual;

                    return (
                      <div key={col.id} className="pt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">{col.nombre}</span>
                        <span className="font-mono font-bold text-slate-900">{formatCOP(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedChurchModal(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-300 transition cursor-pointer"
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
