import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Download,
  TrendingUp,
  Building2,
  Calendar,
  Wallet,
  Coins,
  BarChart3,
  RefreshCw,
  Layers,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import { formatCOP } from "../../utils/formatters";
import type { GridData, Iglesia, Periodo, Campo } from "../../types/contabilidad";
import type { ResumenFondo } from "../tesorero/GastosPanel";

interface ReportsPanelProps {
  apiBase: string;
  gridData: GridData | null;
  periodos: Periodo[];
  selectedPeriodoId: string;
  setSelectedPeriodoId: (id: string) => void;
  tablas: any[];
  selectedTablaId: string;
  setSelectedTablaId: (id: string) => void;
  iglesias: Iglesia[];
  campos: Campo[];
  gastosResumen: ResumenFondo[];
  isTesorero: boolean;
  user: any;
}

export function ReportsPanel({
  apiBase,
  gridData,
  periodos,
  selectedPeriodoId,
  setSelectedPeriodoId,
  tablas,
  selectedTablaId,
  setSelectedTablaId,
  iglesias,
  campos,
  gastosResumen,
  isTesorero,
  user,
}: ReportsPanelProps) {
  const [reportType, setReportType] = useState<"consolidado" | "comparativo" | "fondos" | "individual">("consolidado");
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // State for Comparative report
  const [selectedChurchForComp, setSelectedChurchForComp] = useState<string>(
    user?.iglesia_id || (iglesias.length > 0 ? iglesias[0].id : "")
  );
  const [selectedFieldForComp, setSelectedFieldForComp] = useState<string>(
    campos.length > 0 ? campos[0].id : ""
  );
  const [comparacionData, setComparacionData] = useState<any[]>([]);
  const [loadingComp, setLoadingComp] = useState(false);

  // State for Individual statement
  const [selectedChurchForIndiv, setSelectedChurchForIndiv] = useState<string>(
    user?.iglesia_id || (iglesias.length > 0 ? iglesias[0].id : "")
  );

  // Auto-set default field/church when available
  useEffect(() => {
    if (!selectedChurchForComp && iglesias.length > 0) {
      setSelectedChurchForComp(user?.iglesia_id || iglesias[0].id);
    }
    if (!selectedChurchForIndiv && iglesias.length > 0) {
      setSelectedChurchForIndiv(user?.iglesia_id || iglesias[0].id);
    }
    if (!selectedFieldForComp && campos.length > 0) {
      const mon = campos.find((c) => c.tipo === "moneda");
      setSelectedFieldForComp(mon ? mon.id : campos[0].id);
    }
  }, [iglesias, campos, user]);

  // Fetch comparative data
  const fetchComparacion = async () => {
    if (!selectedChurchForComp || !selectedFieldForComp || periodos.length === 0) return;
    setLoadingComp(true);
    try {
      const sortedPeriods = [...periodos].sort(
        (a, b) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime()
      );
      const desde = sortedPeriods[0]?.fecha_inicio || "2020-01-01";
      const hasta = sortedPeriods[sortedPeriods.length - 1]?.fecha_fin || "2030-12-31";

      const res = await axios.get(
        `${apiBase}/reportes/comparacion?iglesia_id=${selectedChurchForComp}&campo_id=${selectedFieldForComp}&desde=${desde}&hasta=${hasta}`
      );
      setComparacionData(res.data || []);
    } catch (err) {
      console.error("Error cargando reporte comparativo", err);
    } finally {
      setLoadingComp(false);
    }
  };

  useEffect(() => {
    if (reportType === "comparativo") {
      fetchComparacion();
    }
  }, [reportType, selectedChurchForComp, selectedFieldForComp, periodos]);

  // Export Excel handler
  const handleExportExcel = async () => {
    if (!selectedPeriodoId) return;
    setDownloadingExcel(true);
    try {
      const response = await axios.get(
        `${apiBase}/reportes/exportar?periodo_id=${selectedPeriodoId}&tabla_id=${selectedTablaId || ""}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const periodName = periodos.find((p) => p.id === selectedPeriodoId)?.nombre || "Periodo";
      link.setAttribute("download", `Reporte_Financiero_${periodName.replace(/\s+/g, "_")}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Error descargando Excel", err);
      alert("No se pudo generar el archivo Excel.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Current selected church and period objects
  const currentPeriodObj = periodos.find((p) => p.id === selectedPeriodoId);
  const currentChurchIndiv = iglesias.find((i) => i.id === selectedChurchForIndiv);

  // Column totals for consolidated view
  const consolidatedTotals = useMemo(() => {
    if (!gridData) return {};
    const totals: Record<string, number> = {};
    for (const col of gridData.columnas) {
      let sum = 0;
      for (const row of gridData.filas) {
        const val = row.valores.find((v) => v.campo_id === col.id);
        const num = val?.modo_calculo === "calculado" ? (val.valor_calculado || 0) : (val?.valor_manual || 0);
        sum += Number(num || 0);
      }
      totals[col.id] = sum;
    }
    return totals;
  }, [gridData]);

  // Chart data for comparative report
  const chartData = useMemo(() => {
    const labels = comparacionData.map((d) => d.periodo_nombre);
    const values = comparacionData.map((d) => d.valor);
    const accumValues = comparacionData.map((d) => d.valor_acumulado);

    return {
      labels,
      datasets: [
        {
          label: "Valor del Período",
          data: values,
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          borderWidth: 2.5,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Valor Acumulado",
          data: accumValues,
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.06)",
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.2,
          fill: false,
        },
      ],
    };
  }, [comparacionData]);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* ── SINGLE COMPACT UNIFIED TOOLBAR (Height ~ 44px) ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Left: Compact Sub-Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setReportType("consolidado")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "consolidado"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            Consolidado
          </button>

          <button
            type="button"
            onClick={() => setReportType("comparativo")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "comparativo"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Evolución
          </button>

          <button
            type="button"
            onClick={() => setReportType("fondos")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "fondos"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Coins className="w-3 h-3" />
            Fondos
          </button>

          <button
            type="button"
            onClick={() => setReportType("individual")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "individual"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-3 h-3" />
            Extracto Sede
          </button>
        </div>

        {/* Center: Compact Context Selectors */}
        <div className="flex items-center gap-2">
          {tablas.length > 0 && isTesorero && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs">
              <Layers className="w-3 h-3 text-slate-400" />
              <select
                value={selectedTablaId}
                onChange={(e) => setSelectedTablaId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {tablas.map((t) => (
                  <option key={t.id} value={t.id} className="dark:bg-slate-800 dark:text-white">
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodos.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs">
              <Calendar className="w-3 h-3 text-slate-400" />
              <select
                value={selectedPeriodoId}
                onChange={(e) => setSelectedPeriodoId(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                {periodos.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-800 dark:text-white">
                    {p.nombre} {p.estado === "cerrado" ? "(cerrado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right: Compact Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={downloadingExcel || !selectedPeriodoId}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer active:scale-95"
            title="Descargar libro Excel oficial"
          >
            <Download className="w-3 h-3" />
            <span>{downloadingExcel ? "Exportando..." : "Excel"}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {/* ── 1. REPORTE CONSOLIDADO POR PERÍODO ── */}
        {reportType === "consolidado" && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-140px)]">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-800 dark:bg-slate-900 text-white font-bold sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5 border-r border-slate-700 dark:border-slate-800 w-10 text-center">#</th>
                    <th className="p-2.5 border-r border-slate-700 dark:border-slate-800 min-w-[180px]">Congregación / Sede</th>
                    {gridData?.columnas.map((col) => (
                      <th key={col.id} className="p-2.5 border-r border-slate-700 dark:border-slate-800 text-right min-w-[120px]">
                        <div>{col.nombre}</div>
                        <span className="text-[9px] font-normal text-slate-300 dark:text-slate-400">
                          {col.modo_calculo === "calculado" ? "Calculado" : "Manual"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {gridData?.filas.map((row, idx) => (
                    <tr key={row.iglesia_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-100 dark:border-slate-800">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                        {row.iglesia_nombre}
                      </td>
                      {gridData.columnas.map((col) => {
                        const val = row.valores.find((v) => v.campo_id === col.id);
                        const isCalc = col.modo_calculo === "calculado";
                        const num = isCalc ? (val?.valor_calculado || 0) : (val?.valor_manual || 0);
                        return (
                          <td
                            key={col.id}
                            className={`p-2 text-right font-mono border-r border-slate-100 dark:border-slate-800 ${
                              isCalc ? "font-bold text-indigo-900 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/40" : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {col.tipo === "moneda" ? formatCOP(num) : num}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                {/* Totals Footer */}
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white sticky bottom-0 border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td colSpan={2} className="p-2.5 text-right uppercase tracking-wider text-xs border-r border-slate-200 dark:border-slate-700">
                      Totales Generales:
                    </td>
                    {gridData?.columnas.map((col) => (
                      <td key={col.id} className="p-2.5 text-right font-mono font-black text-indigo-950 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700">
                        {col.tipo === "moneda"
                          ? formatCOP(consolidatedTotals[col.id] || 0)
                          : (consolidatedTotals[col.id] || 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── 2. REPORTE COMPARATIVO & EVOLUCIÓN HISTÓRICA ── */}
        {reportType === "comparativo" && (
          <div className="space-y-4">
            {/* Inline Filter Controls */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center gap-3">
              {isTesorero && (
                <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Sede:</span>
                  <select
                    value={selectedChurchForComp}
                    onChange={(e) => setSelectedChurchForComp(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                  >
                    {iglesias.map((i) => (
                      <option key={i.id} value={i.id} className="dark:bg-slate-800 dark:text-white">
                        {i.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <span className="text-[10px] font-black text-slate-400 uppercase">Campo:</span>
                <select
                  value={selectedFieldForComp}
                  onChange={(e) => setSelectedFieldForComp(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                >
                  {campos.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800 dark:text-white">
                      {c.nombre} ({c.seccion})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={fetchComparacion}
                disabled={loadingComp}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingComp ? "animate-spin" : ""}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {/* Evolution Chart */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="h-60 w-full">
                {comparacionData.length > 0 ? (
                  <Line
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top", labels: { color: "#94a3b8" } },
                      },
                      scales: {
                        y: {
                          ticks: {
                            color: "#94a3b8",
                            callback: (val) => `$ ${Number(val).toLocaleString("es-CO")}`,
                          },
                          grid: { color: "rgba(148, 163, 184, 0.1)" },
                        },
                        x: {
                          ticks: { color: "#94a3b8" },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                    Sin datos suficientes para graficar
                  </div>
                )}
              </div>
            </div>

            {/* Evolution Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-2.5">Período</th>
                    <th className="p-2.5 text-right">Valor Reportado</th>
                    <th className="p-2.5 text-right">Valor Acumulado</th>
                    <th className="p-2.5 text-right">Variación vs. Anterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {comparacionData.map((d) => (
                    <tr key={d.periodo_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-2.5 font-sans font-bold text-slate-800 dark:text-slate-200">{d.periodo_nombre}</td>
                      <td className="p-2.5 text-right font-bold text-indigo-950 dark:text-indigo-300">{formatCOP(d.valor)}</td>
                      <td className="p-2.5 text-right text-slate-600 dark:text-slate-400">{formatCOP(d.valor_acumulado)}</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            d.variacion_porcentual > 0
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : d.variacion_porcentual < 0
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {d.variacion_porcentual > 0 ? "+" : ""}
                          {d.variacion_porcentual}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 3. REPORTE DE FONDOS Y GASTOS DE TESORERÍA ── */}
        {reportType === "fondos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {gastosResumen.map((f) => (
              <div
                key={f.campo_fondo_id}
                className={`bg-white dark:bg-slate-900 rounded-xl border p-3.5 shadow-2xs ${
                  f.es_acumulable ? "border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-500/10" : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      f.es_acumulable
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {f.es_acumulable ? "🏛️ Fondo Acumulativo" : "⚡ Fondo de Período"}
                  </span>
                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{f.campo_fondo_nombre}</h4>

                <div className="mt-2 space-y-1 text-xs bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800 font-mono">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 text-[11px]">
                    <span className="font-sans">{f.es_acumulable ? "Recaudo Histórico:" : "Recaudo Período:"}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCOP(f.total_fondo)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 text-[11px]">
                    <span className="font-sans">Gastos deducidos:</span>
                    <span className="font-bold">−{formatCOP(f.total_gastos)}</span>
                  </div>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5" />
                  <div className="flex justify-between font-black text-slate-900 dark:text-white text-xs pt-0.5">
                    <span className="font-sans">Saldo Disponible:</span>
                    <span className={f.saldo_disponible < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {formatCOP(f.saldo_disponible)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 4. EXTRACTO INDIVIDUAL POR IGLESIA ── */}
        {reportType === "individual" && (
          <div className="space-y-3">
            {isTesorero && (
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Congregación:</span>
                <select
                  value={selectedChurchForIndiv}
                  onChange={(e) => setSelectedChurchForIndiv(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                >
                  {iglesias.map((i) => (
                    <option key={i.id} value={i.id} className="dark:bg-slate-800 dark:text-white">
                      {i.nombre} ({i.codigo || "Sede"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">{currentChurchIndiv?.nombre}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pastor: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentChurchIndiv?.nombre_pastor || "No asignado"}</span> · Tel: {currentChurchIndiv?.telefono || "—"}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                  <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>{currentPeriodObj?.nombre || "Período"}</span>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Rubros del Informe
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {gridData?.columnas.map((col) => {
                    const row = gridData.filas.find((r) => r.iglesia_id === selectedChurchForIndiv);
                    const val = row?.valores.find((v) => v.campo_id === col.id);
                    const isCalc = col.modo_calculo === "calculado";
                    const num = isCalc ? (val?.valor_calculado || 0) : (val?.valor_manual || 0);

                    return (
                      <div
                        key={col.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{col.nombre}</p>
                          <span className="text-[9px] text-slate-400 capitalize">{col.seccion || "General"}</span>
                        </div>
                        <div className="text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {col.tipo === "moneda" ? formatCOP(num) : num}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
