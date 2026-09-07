import React, { useState, useMemo } from 'react';
import {
  Church,
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Coins,
  Search,
  ChevronRight,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { formatCOP } from '../../utils/formatters';

interface PresbiteroDashboardProps {
  user: any;
  periodos: { id: string; nombre: string; estado: string; fecha_inicio?: string; fecha_fin?: string }[];
  selectedPeriodoId: string;
  onSelectPeriodo: (id: string) => void;
  iglesias: any[];
  gridData: any;
  gastosResumen: any[];
  onNavigateToTab: (tab: 'sheet' | 'reportes' | 'gastos' | 'iglesias') => void;
}

export const PresbiteroDashboard: React.FC<PresbiteroDashboardProps> = ({
  user,
  periodos,
  selectedPeriodoId,
  onSelectPeriodo,
  iglesias,
  gridData,
  gastosResumen,
  onNavigateToTab,
}) => {
  const [churchFilter, setChurchFilter] = useState<'all' | 'al_dia' | 'pendiente'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const selectedPeriodObj = useMemo(() => {
    return periodos.find((p) => p.id === selectedPeriodoId) || periodos[0];
  }, [periodos, selectedPeriodoId]);

  // Calculations for human-friendly KPIs
  const stats = useMemo(() => {
    let totalIngresosZona = 0;
    let totalFondoNacional = 0;
    let iglesiasReportadas = 0;

    if (gridData?.filas && Array.isArray(gridData.filas)) {
      for (const row of gridData.filas) {
        const valores = row.valores || {};
        const ingresoTotal = Number(valores.ingreso_total ?? valores.diezmos ?? 0) + Number(valores.ofrendas ?? 0);
        const fNacional = Number(valores.fondo_nacional ?? 0);

        if (ingresoTotal > 0 || Object.values(valores).some((v: any) => Number(v) > 0)) {
          iglesiasReportadas++;
        }
        totalIngresosZona += ingresoTotal;
        totalFondoNacional += fNacional;
      }
    }

    // Real available cash in local zone funds (non-transit funds)
    const saldoEnCajaZona = gastosResumen
      .filter((f) => !f.es_transito)
      .reduce((sum, f) => sum + Number(f.saldo_disponible ?? f.saldo_acumulado ?? 0), 0);

    const totalIglesias = iglesias.length || 1;
    const porcentajeCumplimiento = Math.round((iglesiasReportadas / totalIglesias) * 100);

    return {
      totalIngresosZona,
      totalFondoNacional,
      saldoEnCajaZona,
      iglesiasReportadas,
      totalIglesias,
      porcentajeCumplimiento,
    };
  }, [gridData, iglesias, gastosResumen]);

  // Churches status list for semaphore
  const churchesStatusList = useMemo(() => {
    const rowsMap = new Map();
    if (gridData?.filas && Array.isArray(gridData.filas)) {
      for (const r of gridData.filas) {
        rowsMap.set(r.iglesia_id, r);
      }
    }

    return iglesias.map((ig) => {
      const row = rowsMap.get(ig.id);
      const valores = row?.valores || {};
      const totalAportado = Number(valores.ingreso_total ?? (Number(valores.diezmos || 0) + Number(valores.ofrendas || 0)));
      const hasData = totalAportado > 0 || Object.values(valores).some((v: any) => Number(v) > 0);

      const status: 'al_dia' | 'pendiente' = hasData ? 'al_dia' : 'pendiente';

      return {
        id: ig.id,
        nombre: ig.nombre,
        codigo: ig.codigo,
        nombre_pastor: ig.nombre_pastor || 'Pastor no asignado',
        telefono: ig.telefono,
        status,
        totalAportado,
        actualizado_en: row?.actualizado_en,
      };
    });
  }, [iglesias, gridData]);

  const filteredChurches = useMemo(() => {
    return churchesStatusList.filter((c) => {
      if (churchFilter !== 'all' && c.status !== churchFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = c.nombre.toLowerCase().includes(term);
        const matchPastor = c.nombre_pastor.toLowerCase().includes(term);
        if (!matchName && !matchPastor) return false;
      }
      return true;
    });
  }, [churchesStatusList, churchFilter, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950 overflow-auto select-text text-slate-900 dark:text-slate-100">
      {/* ── 1. WARM WELCOME PASTORAL HEADER ── */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white px-6 py-5 shrink-0 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">
                  Panel de Supervisión Pastoral — Presbiterio
                </h1>
                <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-200 border border-amber-300/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                  Auditoría Amigable
                </span>
              </div>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Bienvenido, <strong className="text-white">{user?.nombre_completo || 'Presbítero'}</strong>. Consulta y supervisa de manera sencilla y clara las finanzas y el estado de las iglesias.
              </p>
            </div>
          </div>

          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <Calendar className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold text-amber-100">Mes a consultar:</span>
            <select
              value={selectedPeriodoId}
              onChange={(e) => onSelectPeriodo(e.target.value)}
              className="bg-white/10 hover:bg-white/20 text-white font-black text-xs px-2.5 py-1 rounded-lg border border-white/20 focus:outline-none cursor-pointer"
            >
              {periodos.map((p) => (
                <option key={p.id} value={p.id} className="text-slate-900 bg-white">
                  {p.nombre} {p.estado === 'cerrado' ? '(Cerrado)' : '(Activo)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE QUESTIONS & SUMMARY CARDS (IN PLAIN HUMAN LANGUAGE) ── */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Collected */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span>¿Cuánto dinero entró este mes?</span>
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {formatCOP(stats.totalIngresosZona)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 leading-tight">
              Total de diezmos, ofrendas y recaudos recibidos de las iglesias en {selectedPeriodObj?.nombre}.
            </p>
          </div>

          {/* Card 2: National Fund Transfers */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span>¿Cuánto se giró a Fondo Nacional?</span>
                <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">
                {formatCOP(stats.totalFondoNacional)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 leading-tight">
              Recursos transferidos a la Sede Nacional (10%, Fondo Nacional, Misiones).
            </p>
          </div>

          {/* Card 3: Real Cash in Box for Zone */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span>¿Cuánto dinero propio tiene la Zona?</span>
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1 font-mono">
                {formatCOP(stats.saldoEnCajaZona)}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 leading-tight">
              Saldo real disponible en caja para proyectos locales, arriendos y ayudas de la zona.
            </p>
          </div>

          {/* Card 4: Churches Reporting Status */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">
                <span>Cumplimiento de Iglesias</span>
                <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                  {stats.porcentajeCumplimiento}%
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">
                {stats.iglesiasReportadas} <span className="text-sm font-semibold text-slate-400">de {stats.totalIglesias}</span>
              </div>
            </div>
            <div className="mt-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats.porcentajeCumplimiento}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. DIRECT ACTION BUTTONS FOR THE PRESBYTER ── */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-800/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                Auditoría y Supervisión de la Zona
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tu cuenta tiene permisos especiales de solo lectura para auditar cada detalle sin riesgo de alterar datos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('sheet')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Ver Planilla General Completa</span>
            </button>

            <button
              onClick={() => onNavigateToTab('reportes')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Ver Consolidados & Reportes</span>
            </button>
          </div>
        </div>

        {/* ── 4. SEMÁFORO PASTORAL DE CUMPLIMIENTO DE CONGREGACIONES ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400">
                <Church className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Semáforo de Cumplimiento de Congregaciones
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Estado de entrega de informes para el período <strong className="text-slate-700 dark:text-slate-200">{selectedPeriodObj?.nombre}</strong>
                </p>
              </div>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar iglesia o pastor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 w-48 sm:w-56"
                />
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setChurchFilter('all')}
                  className={`px-3 py-1 rounded-lg transition ${
                    churchFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  Todas ({churchesStatusList.length})
                </button>
                <button
                  onClick={() => setChurchFilter('al_dia')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    churchFilter === 'al_dia'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  <span>🟢 Al Día</span>
                  <span>({churchesStatusList.filter((c) => c.status === 'al_dia').length})</span>
                </button>
                <button
                  onClick={() => setChurchFilter('pendiente')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    churchFilter === 'pendiente'
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  <span>🔴 Pendientes</span>
                  <span>({churchesStatusList.filter((c) => c.status === 'pendiente').length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Churches Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">Congregación</th>
                  <th className="py-2.5 px-4">Pastor Encargado</th>
                  <th className="py-2.5 px-4 w-36 text-center">Estado del Informe</th>
                  <th className="py-2.5 px-4 w-36 text-right">Monto Aportado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {filteredChurches.map((church, idx) => (
                  <tr key={church.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {church.nombre}
                      </div>
                      {church.codigo && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Código: {church.codigo}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                      {church.nombre_pastor}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {church.status === 'al_dia' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Al Día
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <Clock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-xs text-slate-900 dark:text-white">
                      {church.totalAportado > 0 ? formatCOP(church.totalAportado) : <span className="text-slate-400 text-xs font-normal">Sin reporte</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5. EXPLAINED LOCAL FUNDS ── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Fondos y Cajas de la Zona Explicados
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Resumen claro de los recursos acumulados en cada rubro y su disponibilidad actual
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab('gastos')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver extractos de movimientos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {gastosResumen.map((fondo) => {
              const saldo = fondo.saldo_disponible ?? fondo.saldo_acumulado ?? 0;
              return (
                <div
                  key={fondo.campo_fondo_id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {fondo.campo_fondo_nombre}
                      </h4>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {fondo.es_manual ? 'Manual' : fondo.es_transito ? 'En Tránsito' : 'Acumulativo'}
                      </span>
                    </div>

                    <div className="mt-2 text-lg font-black font-mono text-slate-900 dark:text-white">
                      {formatCOP(saldo)}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold">
                    <span>Recaudo total: {formatCOP(fondo.fondo_acumulado)}</span>
                    <span className="text-rose-600 dark:text-rose-400">Gastos: −{formatCOP(fondo.gastos_acumulados)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
