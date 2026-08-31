import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  FileText,
  FileSpreadsheet,
  TrendingUp,
  Building2,
  Calendar,
  Wallet,
  Coins,
  BarChart3,
  RefreshCw,
  Layers,
  CheckSquare,
  Square,
  Search,
  DollarSign,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Church,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import { formatCOP } from "../../utils/formatters";
import { generateExcelReport } from "../../utils/excelExporter";
import { generatePDFReport } from "../../utils/pdfReportGenerator";
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

export interface GastoItem {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  campo_fondo_id: string;
  periodo_id: string;
  campo_fondo?: { id: string; nombre: string; slug: string };
  periodo?: { id: string; nombre: string };
  creado_por?: { id: string; nombre_completo: string };
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
  // Main report type
  const [reportType, setReportType] = useState<"planilla" | "gastos" | "fondos" | "comparativo" | "individual">("planilla");
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null);

  // Dynamic Column & Church Selection for Planilla Report
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [selectedChurchIds, setSelectedChurchIds] = useState<string[]>([]);
  const [showColumnFilterModal, setShowColumnFilterModal] = useState<boolean>(false);
  const [showChurchFilterModal, setShowChurchFilterModal] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Gastos Report State
  const [gastosList, setGastosList] = useState<GastoItem[]>([]);
  const [loadingGastos, setLoadingGastos] = useState<boolean>(false);
  const [selectedFondoFilter, setSelectedFondoFilter] = useState<string>("all");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [gastosPeriodoMode, setGastosPeriodoMode] = useState<"periodo" | "rango">("periodo");

  // Comparative report state
  const [selectedChurchForComp, setSelectedChurchForComp] = useState<string>(
    user?.iglesia_id || (iglesias.length > 0 ? iglesias[0].id : "")
  );
  const [selectedFieldForComp, setSelectedFieldForComp] = useState<string>(
    campos.length > 0 ? campos[0].id : ""
  );
  const [comparacionData, setComparacionData] = useState<any[]>([]);
  const [loadingComp, setLoadingComp] = useState<boolean>(false);

  // Individual statement state
  const [selectedChurchForIndiv, setSelectedChurchForIndiv] = useState<string>(
    user?.iglesia_id || (iglesias.length > 0 ? iglesias[0].id : "")
  );

  // Initialize column and church selections when gridData updates
  useEffect(() => {
    if (gridData?.columnas) {
      setSelectedColumnIds(gridData.columnas.map((c) => c.id));
    }
    if (gridData?.filas) {
      setSelectedChurchIds(gridData.filas.map((r) => r.iglesia_id));
    }
  }, [gridData]);

  // Fetch Gastos when switching to gastos report or changing period/filters
  const fetchGastos = async () => {
    setLoadingGastos(true);
    try {
      let url = `${apiBase}/gastos`;
      if (gastosPeriodoMode === "periodo" && selectedPeriodoId) {
        url += `?periodo_id=${selectedPeriodoId}`;
      }
      const res = await axios.get(url);
      setGastosList(res.data || []);
    } catch (err) {
      console.error("Error cargando gastos para reportes", err);
    } finally {
      setLoadingGastos(false);
    }
  };

  useEffect(() => {
    if (reportType === "gastos") {
      fetchGastos();
    }
  }, [reportType, selectedPeriodoId, gastosPeriodoMode]);

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

  // Filtered Gastos
  const filteredGastos = useMemo(() => {
    let list = [...gastosList];

    // Filter by Fondo
    if (selectedFondoFilter !== "all") {
      list = list.filter((g) => g.campo_fondo_id === selectedFondoFilter);
    }

    // Filter by Date Range
    if (gastosPeriodoMode === "rango") {
      if (fechaDesde) {
        list = list.filter((g) => g.fecha >= fechaDesde);
      }
      if (fechaHasta) {
        list = list.filter((g) => g.fecha <= fechaHasta);
      }
    }

    // Filter by Search Query
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      list = list.filter(
        (g) =>
          (g.descripcion && g.descripcion.toLowerCase().includes(term)) ||
          (g.campo_fondo?.nombre && g.campo_fondo.nombre.toLowerCase().includes(term)) ||
          (g.creado_por?.nombre_completo && g.creado_por.nombre_completo.toLowerCase().includes(term))
      );
    }

    return list;
  }, [gastosList, selectedFondoFilter, gastosPeriodoMode, fechaDesde, fechaHasta, searchFilter]);

  const totalGastosFiltrados = useMemo(() => {
    return filteredGastos.reduce((acc, g) => acc + Number(g.monto || 0), 0);
  }, [filteredGastos]);

  // Filtered Planilla Rows & Columns
  const activePlanillaColumns = useMemo(() => {
    if (!gridData?.columnas) return [];
    return gridData.columnas.filter((c) => selectedColumnIds.includes(c.id));
  }, [gridData?.columnas, selectedColumnIds]);

  const activePlanillaRows = useMemo(() => {
    if (!gridData?.filas) return [];
    let list = gridData.filas.filter((r) => selectedChurchIds.includes(r.iglesia_id));
    if (searchFilter.trim()) {
      const term = searchFilter.toLowerCase();
      list = list.filter((r) => r.iglesia_nombre.toLowerCase().includes(term));
    }
    return list;
  }, [gridData?.filas, selectedChurchIds, searchFilter]);

  // Column totals for active filtered rows
  const activeColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!gridData?.columnas) return totals;

    gridData.columnas.forEach((col) => {
      let sum = 0;
      activePlanillaRows.forEach((row) => {
        const vals = Array.isArray(row?.valores) ? row.valores : [];
        const val = vals.find((v) => v.campo_id === col.id);
        const isCalc = col.modo_calculo === "calculado" || val?.modo_calculo === "calculado";
        const isOverridden = isCalc && val?.valor_manual !== null && val?.valor_manual !== undefined;
        const num = Number(
          isCalc ? (isOverridden ? val?.valor_manual : (val?.valor_calculado || 0)) : (val?.valor_manual || 0)
        );
        if (!isNaN(num)) sum += num;
      });
      totals[col.id] = sum;
    });

    return totals;
  }, [gridData?.columnas, activePlanillaRows]);

  const totalPlanillaRecaudo = useMemo(() => {
    if (activePlanillaColumns.length === 0 || activePlanillaRows.length === 0) return 0;
    const totalIngresosCol = activePlanillaColumns.find(
      (c) => c.slug === "total_ingresos" || c.slug === "ingreso_total" || /total\s*(ingreso|general|recaudo)/i.test(c.nombre)
    );
    if (totalIngresosCol && activeColumnTotals[totalIngresosCol.id] !== undefined) {
      return activeColumnTotals[totalIngresosCol.id];
    }
    const incomeCols = activePlanillaColumns.filter((c) => c.seccion !== "Egresos" && c.seccion !== "Totales");
    if (incomeCols.length > 0) {
      return incomeCols.reduce((acc, c) => acc + (activeColumnTotals[c.id] || 0), 0);
    }
    return Object.values(activeColumnTotals).reduce((acc, v) => acc + v, 0);
  }, [activePlanillaColumns, activePlanillaRows, activeColumnTotals]);

  // Current period and church objects
  const currentPeriodObj = periodos.find((p) => p.id === selectedPeriodoId);
  const currentChurchIndiv = iglesias.find((i) => i.id === selectedChurchForIndiv);
  const currentTableObj = tablas.find((t) => t.id === selectedTablaId);
  const periodName = currentPeriodObj?.nombre || "Período Actual";
  const tableName = currentTableObj?.nombre || gridData?.tabla_nombre || "Planilla General";

  // ─── EXPORT DISPATCHERS (Excel & PDF) ──────────────────────────────────
  const handleExportExcel = async () => {
    setDownloading("excel");
    try {
      if (reportType === "planilla") {
        await generateExcelReport(activePlanillaRows, activePlanillaColumns, {
          fileName: `Reporte_Planilla_${tableName.replace(/\s+/g, "_")}_${periodName.replace(/\s+/g, "_")}.xlsx`,
          reportTitle: `PLANILLA CONTABLE — ${tableName.toUpperCase()}`,
          periodName,
          tableName,
          selectedColumnIds: activePlanillaColumns.map((c) => c.id),
          selectedChurchIds: activePlanillaRows.map((r) => r.iglesia_id),
          includeTotalsRow: true,
          includeMetadataHeader: true,
          columnTotals: activeColumnTotals,
        });
      } else if (reportType === "gastos") {
        const dummyCols: any[] = [
          { id: "fecha", nombre: "Fecha", modo_calculo: "manual", tipo: "texto" },
          { id: "descripcion", nombre: "Concepto / Descripción", modo_calculo: "manual", tipo: "texto" },
          { id: "fondo", nombre: "Fondo Deducido", modo_calculo: "manual", tipo: "texto" },
          { id: "periodo", nombre: "Período", modo_calculo: "manual", tipo: "texto" },
          { id: "registrado_por", nombre: "Registrado Por", modo_calculo: "manual", tipo: "texto" },
          { id: "monto", nombre: "Monto ($ COP)", modo_calculo: "manual", tipo: "moneda" },
        ];

        const dummyRows: any[] = filteredGastos.map((g) => ({
          iglesia_id: g.id,
          iglesia_nombre: g.descripcion,
          valores: [
            { campo_id: "fecha", valor_manual: g.fecha },
            { campo_id: "descripcion", valor_manual: g.descripcion },
            { campo_id: "fondo", valor_manual: g.campo_fondo?.nombre || "Fondo General" },
            { campo_id: "periodo", valor_manual: g.periodo?.nombre || periodName },
            { campo_id: "registrado_por", valor_manual: g.creado_por?.nombre_completo || "Administrador" },
            { campo_id: "monto", valor_manual: Number(g.monto || 0) },
          ],
        }));

        await generateExcelReport(dummyRows, dummyCols, {
          fileName: `Reporte_Gastos_${periodName.replace(/\s+/g, "_")}.xlsx`,
          reportTitle: `REPORTE DE CONTROL DE GASTOS Y FONDOS`,
          periodName: gastosPeriodoMode === "rango" ? `Del ${fechaDesde || "Inicio"} al ${fechaHasta || "Fin"}` : periodName,
          tableName: selectedFondoFilter !== "all" ? (campos.find((c) => c.id === selectedFondoFilter)?.nombre || "Fondo") : "Todos los Fondos",
          selectedColumnIds: dummyCols.map((c) => c.id),
          selectedChurchIds: dummyRows.map((r) => r.iglesia_id),
          includeTotalsRow: true,
          includeMetadataHeader: true,
          columnTotals: { monto: totalGastosFiltrados },
        });
      } else if (reportType === "fondos") {
        const dummyCols: any[] = [
          { id: "recaudo", nombre: "Recaudo Histórico / Período", modo_calculo: "manual", tipo: "moneda" },
          { id: "gastos", nombre: "Gastos Deducidos", modo_calculo: "manual", tipo: "moneda" },
          { id: "saldo", nombre: "Saldo Disponible en Caja", modo_calculo: "manual", tipo: "moneda" },
        ];
        const dummyRows: any[] = gastosResumen.map((f) => ({
          iglesia_id: f.campo_fondo_id,
          iglesia_nombre: f.campo_fondo_nombre,
          valores: [
            { campo_id: "recaudo", valor_manual: Number(f.total_fondo || 0) },
            { campo_id: "gastos", valor_manual: Number(f.total_gastos || 0) },
            { campo_id: "saldo", valor_manual: Number(f.saldo_disponible || 0) },
          ],
        }));

        await generateExcelReport(dummyRows, dummyCols, {
          fileName: `Balance_Fondos_${periodName.replace(/\s+/g, "_")}.xlsx`,
          reportTitle: `BALANCE GENERAL Y CONTROL DE FONDOS DE TESORERÍA`,
          periodName,
          tableName: "Resumen de Fondos Estatutarios",
          selectedColumnIds: dummyCols.map((c) => c.id),
          selectedChurchIds: dummyRows.map((r) => r.iglesia_id),
          includeTotalsRow: true,
          includeMetadataHeader: true,
        });
      } else if (reportType === "comparativo") {
        const churchObj = iglesias.find((i) => i.id === selectedChurchForComp);
        const fieldObj = campos.find((c) => c.id === selectedFieldForComp);
        const dummyCols: any[] = [
          { id: "valor", nombre: "Valor del Período", modo_calculo: "manual", tipo: "moneda" },
          { id: "acumulado", nombre: "Valor Acumulado", modo_calculo: "manual", tipo: "moneda" },
          { id: "variacion", nombre: "Variación %", modo_calculo: "manual", tipo: "texto" },
        ];
        const dummyRows: any[] = comparacionData.map((d) => ({
          iglesia_id: d.periodo_id,
          iglesia_nombre: d.periodo_nombre,
          valores: [
            { campo_id: "valor", valor_manual: Number(d.valor || 0) },
            { campo_id: "acumulado", valor_manual: Number(d.valor_acumulado || 0) },
            { campo_id: "variacion", valor_manual: `${d.variacion_porcentual > 0 ? "+" : ""}${d.variacion_porcentual}%` },
          ],
        }));

        await generateExcelReport(dummyRows, dummyCols, {
          fileName: `Evolucion_${(churchObj?.nombre || "Sede").replace(/\s+/g, "_")}_${(fieldObj?.nombre || "Campo").replace(/\s+/g, "_")}.xlsx`,
          reportTitle: `REPORTE COMPARATIVO Y EVOLUCIÓN HISTÓRICA`,
          periodName: "Histórico Multianual",
          tableName: `${churchObj?.nombre || "Sede"} — ${fieldObj?.nombre || "Campo"}`,
          selectedColumnIds: dummyCols.map((c) => c.id),
          selectedChurchIds: dummyRows.map((r) => r.iglesia_id),
          includeTotalsRow: false,
          includeMetadataHeader: true,
        });
      }
    } catch (err) {
      console.error("Error generando reporte Excel:", err);
      alert("No se pudo generar el archivo Excel.");
    } finally {
      setDownloading(null);
    }
  };

  const handleExportPDF = () => {
    setDownloading("pdf");
    try {
      if (reportType === "planilla") {
        const headers = ["#", "CONGREGACIÓN", ...activePlanillaColumns.map((c) => c.nombre)];
        const rows = activePlanillaRows.map((r, idx) => {
          const rowVals = activePlanillaColumns.map((col) => {
            const vals = Array.isArray(r?.valores) ? r.valores : [];
            const val = vals.find((v) => v.campo_id === col.id);
            const isCalc = col.modo_calculo === "calculado" || val?.modo_calculo === "calculado";
            const isOverridden = isCalc && val?.valor_manual !== null && val?.valor_manual !== undefined;
            const num = Number(
              isCalc ? (isOverridden ? val?.valor_manual : (val?.valor_calculado || 0)) : (val?.valor_manual || 0)
            );
            return col.tipo === "moneda" ? formatCOP(num) : num;
          });
          return [(idx + 1).toString(), r.iglesia_nombre, ...rowVals];
        });

        const totalsRow = [
          "Σ",
          `TOTALES (${activePlanillaRows.length} SEDES)`,
          ...activePlanillaColumns.map((col) =>
            col.tipo === "moneda" ? formatCOP(activeColumnTotals[col.id] || 0) : (activeColumnTotals[col.id] || 0)
          ),
        ];

        generatePDFReport({
          title: `PLANILLA CONTABLE — ${tableName.toUpperCase()}`,
          subtitle: `Período Contable: ${periodName}  |  Generado: ${new Date().toLocaleString("es-CO")}`,
          metaInfo: [
            { label: "Planilla / Tabla", value: tableName },
            { label: "Período", value: periodName },
            { label: "Congregaciones", value: `${activePlanillaRows.length} sedes` },
            { label: "Recaudo Total", value: formatCOP(totalPlanillaRecaudo) },
          ],
          headers,
          rows,
          totalsRow,
          orientation: activePlanillaColumns.length > 4 ? "landscape" : "portrait",
          includeSignatures: true,
          fileName: `Planilla_${tableName.replace(/\s+/g, "_")}_${periodName.replace(/\s+/g, "_")}.pdf`,
        });
      } else if (reportType === "gastos") {
        const headers = ["#", "FECHA", "CONCEPTO / DESCRIPCIÓN", "FONDO DEDUCIDO", "PERÍODO", "REGISTRADO POR", "MONTO"];
        const rows = filteredGastos.map((g, idx) => [
          (idx + 1).toString(),
          g.fecha,
          g.descripcion,
          g.campo_fondo?.nombre || "Fondo General",
          g.periodo?.nombre || periodName,
          g.creado_por?.nombre_completo || "Administración",
          formatCOP(Number(g.monto || 0)),
        ]);

        const totalsRow = ["Σ", "TOTAL GENERAL DE GASTOS", "", "", "", `${filteredGastos.length} comprobantes`, formatCOP(totalGastosFiltrados)];

        generatePDFReport({
          title: "REPORTE OFICIAL DE CONTROL DE GASTOS Y FONDOS",
          subtitle: `Filtro: ${selectedFondoFilter !== "all" ? (campos.find((c) => c.id === selectedFondoFilter)?.nombre || "Fondo") : "Todos los Fondos"}  |  Período: ${periodName}`,
          metaInfo: [
            { label: "Total Comprobantes", value: `${filteredGastos.length} gastos` },
            { label: "Fondo Seleccionado", value: selectedFondoFilter !== "all" ? (campos.find((c) => c.id === selectedFondoFilter)?.nombre || "Fondo") : "Todos" },
            { label: "Total Egresos", value: formatCOP(totalGastosFiltrados) },
          ],
          headers,
          rows,
          totalsRow,
          orientation: "landscape",
          includeSignatures: true,
          fileName: `Reporte_Gastos_${periodName.replace(/\s+/g, "_")}.pdf`,
        });
      } else if (reportType === "fondos") {
        const headers = ["#", "FONDO ESTATUTARIO", "TIPO DE FONDO", "RECAUDO ASIGNADO", "GASTOS EJECUTADOS", "SALDO EN CAJA"];
        const rows = gastosResumen.map((f, idx) => [
          (idx + 1).toString(),
          f.campo_fondo_nombre,
          f.es_acumulable ? "Acumulativo" : "Mensual",
          formatCOP(Number(f.total_fondo || 0)),
          formatCOP(Number(f.total_gastos || 0)),
          formatCOP(Number(f.saldo_disponible || 0)),
        ]);

        const totalRecaudoFondos = gastosResumen.reduce((acc, f) => acc + Number(f.total_fondo || 0), 0);
        const totalGastosFondos = gastosResumen.reduce((acc, f) => acc + Number(f.total_gastos || 0), 0);
        const totalSaldoFondos = gastosResumen.reduce((acc, f) => acc + Number(f.saldo_disponible || 0), 0);

        const totalsRow = ["Σ", "TOTAL GENERAL CONSOLIDADO", `${gastosResumen.length} fondos`, formatCOP(totalRecaudoFondos), formatCOP(totalGastosFondos), formatCOP(totalSaldoFondos)];

        generatePDFReport({
          title: "BALANCE CONSOLIDADO Y DISTRIBUCIÓN DE FONDOS",
          subtitle: `Período: ${periodName}  |  Emisión: ${new Date().toLocaleString("es-CO")}`,
          metaInfo: [
            { label: "Fondos Totales", value: `${gastosResumen.length} fondos` },
            { label: "Total Recaudo", value: formatCOP(totalRecaudoFondos) },
            { label: "Total Gastos", value: formatCOP(totalGastosFondos) },
            { label: "Saldo Disponible", value: formatCOP(totalSaldoFondos) },
          ],
          headers,
          rows,
          totalsRow,
          orientation: "landscape",
          includeSignatures: true,
          fileName: `Balance_Fondos_${periodName.replace(/\s+/g, "_")}.pdf`,
        });
      } else if (reportType === "individual") {
        const churchObj = currentChurchIndiv;
        const row = gridData?.filas.find((r) => r.iglesia_id === selectedChurchForIndiv);
        const headers = ["#", "CONCEPTO / RUBRO CONTABLE", "SECCIÓN", "MODALIDAD", "VALOR REPORTADO"];
        
        let subtotal = 0;
        const rows = (gridData?.columnas || []).map((col, idx) => {
          const vals = Array.isArray(row?.valores) ? row.valores : [];
          const val = vals.find((v) => v.campo_id === col.id);
          const isCalc = col.modo_calculo === "calculado";
          const num = Number(isCalc ? (val?.valor_calculado || 0) : (val?.valor_manual || 0));
          if (!isCalc) subtotal += num;
          return [
            (idx + 1).toString(),
            col.nombre,
            col.seccion || "General",
            isCalc ? "Calculado f(x)" : "Manual",
            col.tipo === "moneda" ? formatCOP(num) : num,
          ];
        });

        generatePDFReport({
          title: `CERTIFICADO CONTABLE — ${churchObj?.nombre || "CONGREGACIÓN"}`,
          subtitle: `Pastor: ${churchObj?.nombre_pastor || "No asignado"}  |  Período: ${periodName}`,
          metaInfo: [
            { label: "Sede Eclesiástica", value: churchObj?.nombre || "Sede" },
            { label: "Código", value: churchObj?.codigo || "—" },
            { label: "Período", value: periodName },
            { label: "Total Aporte", value: formatCOP(subtotal) },
          ],
          headers,
          rows,
          totalsRow: ["Σ", "TOTAL DECLARADO", "", "", formatCOP(subtotal)],
          orientation: "portrait",
          includeSignatures: true,
          fileName: `Certificado_${(churchObj?.nombre || "Sede").replace(/\s+/g, "_")}_${periodName.replace(/\s+/g, "_")}.pdf`,
        });
      }
    } catch (err) {
      console.error("Error generando PDF:", err);
      alert("No se pudo generar el archivo PDF.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* ── UNIFIED COMMAND TOOLBAR ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-2xs">
        
        {/* Left: Report Module Switcher */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setReportType("planilla")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "planilla"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Planilla</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType("gastos")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "gastos"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Gastos & Egresos</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType("fondos")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "fondos"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Balance Fondos</span>
            <span className="xs:hidden">Fondos</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType("comparativo")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "comparativo"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Evolución</span>
          </button>

          <button
            type="button"
            onClick={() => setReportType("individual")}
            className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              reportType === "individual"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Extracto Sede</span>
          </button>
        </div>

        {/* Center: Context Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Table Selector */}
          {reportType === "planilla" && tablas.length > 0 && isTesorero && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedTablaId}
                onChange={(e) => setSelectedTablaId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                {tablas.map((t) => (
                  <option key={t.id} value={t.id} className="dark:bg-slate-800 dark:text-white">
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Selector */}
          {periodos.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedPeriodoId}
                onChange={(e) => setSelectedPeriodoId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[120px] truncate"
              >
                {periodos.map((p) => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-800 dark:text-white">
                    {p.nombre} {p.estado === "cerrado" ? "(cerrado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dynamic Column Customizer Button */}
          {reportType === "planilla" && gridData?.columnas && (
            <button
              onClick={() => setShowColumnFilterModal(!showColumnFilterModal)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition cursor-pointer"
              title="Personalizar qué columnas ver y exportar"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Columnas ({activePlanillaColumns.length}/{gridData.columnas.length})</span>
              {showColumnFilterModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Dynamic Church Customizer Button */}
          {reportType === "planilla" && gridData?.filas && (
            <button
              onClick={() => setShowChurchFilterModal(!showChurchFilterModal)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              title="Personalizar qué congregaciones incluir"
            >
              <Church className="w-3.5 h-3.5" />
              <span>Sedes ({activePlanillaRows.length}/{gridData.filas.length})</span>
              {showChurchFilterModal ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Gastos: Fund Filter */}
          {reportType === "gastos" && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs">
              <Wallet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedFondoFilter}
                onChange={(e) => setSelectedFondoFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer max-w-[150px] truncate"
              >
                <option value="all" className="dark:bg-slate-800 dark:text-white">
                  Todos los Fondos
                </option>
                {campos
                  .filter((c) => c.es_fondo || /fondo|mision|templo|arriendo|pastoral/i.test(c.nombre))
                  .map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-800 dark:text-white">
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Search Box */}
          <div className="relative w-32 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar..."
              className="w-full text-xs pl-7 pr-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Right: Export Actions (Excel & PDF) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={downloading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer transform active:scale-95 shrink-0"
            title="Descargar libro Excel (.xlsx) con los campos y filtros seleccionados"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{downloading === "excel" ? "Generando..." : "Descargar Excel"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={downloading !== null}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer transform active:scale-95 shrink-0"
            title="Descargar o Imprimir documento oficial en PDF"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>{downloading === "pdf" ? "Generando..." : "Descargar PDF"}</span>
          </button>
        </div>
      </div>

      {/* ── EXPANDABLE COLUMN SELECTOR DRAWER ── */}
      {showColumnFilterModal && reportType === "planilla" && gridData?.columnas && (
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-indigo-200 dark:border-indigo-900/60 shadow-md animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Seleccionar Columnas a Incluir ({selectedColumnIds.length}/{gridData.columnas.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setSelectedColumnIds(gridData.columnas.map((c) => c.id))}
                className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                Todas
              </button>
              <button
                onClick={() => setSelectedColumnIds([])}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Ninguna
              </button>
              <button
                onClick={() => {
                  const funds = gridData.columnas.filter(
                    (c) => c.es_fondo || /fondo|mision|muser|templo|arriendo|construc|auxilio|ayuda/i.test(c.nombre)
                  );
                  setSelectedColumnIds(funds.map((c) => c.id));
                }}
                className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 cursor-pointer"
              >
                Solo Fondos
              </button>
              <button
                onClick={() => {
                  const incomes = gridData.columnas.filter((c) => c.seccion === "Ingresos" || /diezmo|ofrenda|ingreso|total/i.test(c.nombre));
                  setSelectedColumnIds(incomes.map((c) => c.id));
                }}
                className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              >
                Solo Ingresos
              </button>
              <button
                onClick={() => {
                  const calcs = gridData.columnas.filter((c) => c.modo_calculo === "calculado");
                  setSelectedColumnIds(calcs.map((c) => c.id));
                }}
                className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 cursor-pointer"
              >
                Calculadas
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {gridData.columnas.map((col) => {
              const isChecked = selectedColumnIds.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => {
                    setSelectedColumnIds((prev) =>
                      prev.includes(col.id) ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer select-none ${
                    isChecked
                      ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60"
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{col.nombre}</span>
                  {col.modo_calculo === "calculado" && <span className="text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 rounded">f(x)</span>}
                  {col.es_fondo && <span className="text-[9px] bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 rounded">Fondo</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── EXPANDABLE CHURCH SELECTOR DRAWER ── */}
      {showChurchFilterModal && reportType === "planilla" && gridData?.filas && (
        <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 shadow-md animate-fade-in">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Seleccionar Congregaciones a Incluir ({selectedChurchIds.length}/{gridData.filas.length})
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                onClick={() => setSelectedChurchIds(gridData.filas.map((r) => r.iglesia_id))}
                className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 cursor-pointer"
              >
                Todas ({gridData.filas.length})
              </button>
              <button
                onClick={() => setSelectedChurchIds([])}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Ninguna
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {gridData.filas.map((r) => {
              const isChecked = selectedChurchIds.includes(r.iglesia_id);
              return (
                <button
                  key={r.iglesia_id}
                  onClick={() => {
                    setSelectedChurchIds((prev) =>
                      prev.includes(r.iglesia_id) ? prev.filter((id) => id !== r.iglesia_id) : [...prev, r.iglesia_id]
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer select-none ${
                    isChecked
                      ? "bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold shadow-2xs"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60"
                  }`}
                >
                  {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{r.iglesia_nombre}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        
        {/* ── 1. MODULO PLANILLA & RECAUDO ── */}
        {reportType === "planilla" && (
          <div className="space-y-3">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Total Recaudado
                </span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatCOP(totalPlanillaRecaudo)}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Sedes Filtradas
                </span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {activePlanillaRows.length} de {gridData?.filas.length || 0}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Columnas Visibles
                </span>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                  {activePlanillaColumns.length} de {gridData?.columnas.length || 0}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Período & Tabla
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 truncate block">
                  {periodName} • {tableName}
                </span>
              </div>
            </div>

            {/* Interactive Data Table Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 dark:bg-slate-900 text-white font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 border-r border-slate-700 dark:border-slate-800 w-10 text-center">#</th>
                      <th className="p-2.5 border-r border-slate-700 dark:border-slate-800 min-w-[180px]">Congregación / Sede</th>
                      {activePlanillaColumns.map((col) => (
                        <th key={col.id} className="p-2.5 border-r border-slate-700 dark:border-slate-800 text-right min-w-[120px]">
                          <div>{col.nombre}</div>
                          <span className="text-[9px] font-normal text-slate-300 dark:text-slate-400">
                            {col.modo_calculo === "calculado" ? "Calculado f(x)" : "Manual"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activePlanillaRows.map((row, idx) => (
                      <tr key={row.iglesia_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-2 text-center text-slate-400 font-mono border-r border-slate-100 dark:border-slate-800">
                          {idx + 1}
                        </td>
                        <td className="p-2 font-bold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800">
                          {row.iglesia_nombre}
                        </td>
                        {activePlanillaColumns.map((col) => {
                          const vals = Array.isArray(row?.valores) ? row.valores : [];
                          const val = vals.find((v) => v.campo_id === col.id);
                          const isCalc = col.modo_calculo === "calculado" || val?.modo_calculo === "calculado";
                          const isOverridden = isCalc && val?.valor_manual !== null && val?.valor_manual !== undefined;
                          const num = Number(
                            isCalc ? (isOverridden ? val?.valor_manual : (val?.valor_calculado || 0)) : (val?.valor_manual || 0)
                          );
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
                      {activePlanillaColumns.map((col) => (
                        <td key={col.id} className="p-2.5 text-right font-mono font-black text-indigo-950 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700">
                          {col.tipo === "moneda"
                            ? formatCOP(activeColumnTotals[col.id] || 0)
                            : (activeColumnTotals[col.id] || 0)}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. MODULO CONTROL DE GASTOS & EGRESOS ── */}
        {reportType === "gastos" && (
          <div className="space-y-3">
            {/* Gastos Filter Controls */}
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setGastosPeriodoMode("periodo")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      gastosPeriodoMode === "periodo"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Por Período
                  </button>
                  <button
                    onClick={() => setGastosPeriodoMode("rango")}
                    className={`px-2.5 py-1 rounded-md font-bold transition cursor-pointer ${
                      gastosPeriodoMode === "rango"
                        ? "bg-indigo-600 text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    Rango de Fechas
                  </button>
                </div>

                {gastosPeriodoMode === "rango" && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      title="Fecha Inicial"
                    />
                    <span className="text-slate-400">a</span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                      title="Fecha Final"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Egresos:</span>
                <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                  {formatCOP(totalGastosFiltrados)}
                </span>
              </div>
            </div>

            {/* Gastos Data Table Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto max-h-[calc(100vh-250px)]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 dark:bg-slate-900 text-white font-bold sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[100px]">Fecha</th>
                      <th className="p-2.5 min-w-[200px]">Concepto / Descripción</th>
                      <th className="p-2.5 min-w-[140px]">Fondo Deducido</th>
                      <th className="p-2.5 min-w-[110px]">Período</th>
                      <th className="p-2.5 min-w-[140px]">Registrado Por</th>
                      <th className="p-2.5 text-right min-w-[120px]">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {loadingGastos ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                          Cargando comprobantes de egreso...
                        </td>
                      </tr>
                    ) : filteredGastos.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                          No se encontraron gastos con los filtros especificados.
                        </td>
                      </tr>
                    ) : (
                      filteredGastos.map((g, idx) => (
                        <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-mono text-slate-600 dark:text-slate-400">{g.fecha}</td>
                          <td className="p-2 font-bold text-slate-900 dark:text-white">{g.descripcion}</td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {g.campo_fondo?.nombre || "Fondo General"}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{g.periodo?.nombre || "—"}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{g.creado_por?.nombre_completo || "Administración"}</td>
                          <td className="p-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {formatCOP(Number(g.monto || 0))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredGastos.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white sticky bottom-0 border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider text-xs">
                          Total General de Gastos ({filteredGastos.length} registros):
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                          {formatCOP(totalGastosFiltrados)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. MODULO BALANCE DE FONDOS ── */}
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

        {/* ── 4. MODULO COMPARATIVO & EVOLUCION HISTORICA ── */}
        {reportType === "comparativo" && (
          <div className="space-y-4">
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
                    data={{
                      labels: comparacionData.map((d) => d.periodo_nombre),
                      datasets: [
                        {
                          label: "Valor del Período",
                          data: comparacionData.map((d) => d.valor),
                          borderColor: "rgb(99, 102, 241)",
                          backgroundColor: "rgba(99, 102, 241, 0.12)",
                          borderWidth: 2.5,
                          tension: 0.3,
                          fill: true,
                        },
                        {
                          label: "Valor Acumulado",
                          data: comparacionData.map((d) => d.valor_acumulado),
                          borderColor: "rgb(16, 185, 129)",
                          backgroundColor: "rgba(16, 185, 129, 0.06)",
                          borderWidth: 2,
                          borderDash: [5, 5],
                          tension: 0.2,
                          fill: false,
                        },
                      ],
                    }}
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

        {/* ── 5. MODULO EXTRACTO INDIVIDUAL POR SEDE ── */}
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
                    const vals = Array.isArray(row?.valores) ? row.valores : [];
                    const val = vals.find((v) => v.campo_id === col.id);
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
