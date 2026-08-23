import { useState, useMemo } from "react";
import {
  Plus,
  TrendingDown,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  History,
  Coins,
  FileText,
} from "lucide-react";
import { formatCOP } from "../../utils/formatters";

interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  fecha: string;
  campo_fondo: { id: string; nombre: string; slug: string };
  periodo: { id: string; nombre: string };
  creado_por: { id: string; nombre_completo: string };
}

export interface ResumenFondo {
  campo_fondo_id: string;
  campo_fondo_nombre: string;
  campo_fondo_slug: string;
  es_acumulable: boolean;
  seccion?: string;
  // Período actual
  fondo_periodo: number;
  gastos_periodo: number;
  saldo_periodo: number;
  // Histórico Acumulado
  fondo_acumulado: number;
  gastos_acumulados: number;
  saldo_acumulado: number;
  // Totales efectivos
  total_fondo: number;
  total_gastos: number;
  saldo_disponible: number;
}

interface GastosPanelProps {
  gastos: Gasto[];
  resumen: ResumenFondo[];
  loading: boolean;
  onNew: () => void;
  onEdit: (gasto: Gasto) => void;
  onDelete: (gasto: Gasto) => void;
  onOpenVoucher?: (gasto: Gasto) => void;
  selectedPeriodoNombre: string;
  isPeriodOpen: boolean;
}

function SaldoBadge({ saldo, total }: { saldo: number; total: number }) {
  if (total === 0 && saldo === 0) return <span className="text-xs text-slate-400">Sin fondos</span>;
  const pct = total > 0 ? Math.round((saldo / total) * 100) : 0;
  if (saldo < 0)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3" /> Sobregirado
      </span>
    );
  if (pct < 20)
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
        Saldo bajo ({pct}%)
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="w-3 h-3" /> Disponible ({pct}%)
    </span>
  );
}

export function GastosPanel({
  gastos,
  resumen,
  loading,
  onNew,
  onEdit,
  onDelete,
  onOpenVoucher,
  selectedPeriodoNombre,
  isPeriodOpen,
}: GastosPanelProps) {
  const [filterType, setFilterType] = useState<"all" | "acumulable" | "periodo">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Filtered funds
  const filteredResumen = useMemo(() => {
    return resumen.filter((r) => {
      if (filterType === "acumulable" && !r.es_acumulable) return false;
      if (filterType === "periodo" && r.es_acumulable) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          r.campo_fondo_nombre.toLowerCase().includes(term) ||
          r.campo_fondo_slug.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [resumen, filterType, searchTerm]);

  // Group gastos by campo_fondo
  const gastosByFondo = useMemo(() => {
    const map = new Map<string, Gasto[]>();
    for (const g of gastos) {
      const key = g.campo_fondo.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return map;
  }, [gastos]);

  // Overall KPIs
  const totalGastosPeriodo = gastos.reduce((sum, g) => sum + Number(g.monto), 0);

  const totalSaldoAcumuladoTesorería = useMemo(() => {
    return resumen
      .filter((r) => r.es_acumulable)
      .reduce((sum, r) => sum + (r.saldo_acumulado ?? r.saldo_disponible ?? 0), 0);
  }, [resumen]);

  const totalSaldoPeriodoActual = useMemo(() => {
    return resumen.reduce((sum, r) => sum + (r.saldo_periodo ?? 0), 0);
  }, [resumen]);

  const countAcumulables = resumen.filter((r) => r.es_acumulable).length;
  const countPeriodo = resumen.filter((r) => !r.es_acumulable).length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-100 rounded-xl">
            <TrendingDown className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Gastos y Control de Fondos</h1>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                Fondos Acumulables
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Período activo: <span className="font-semibold text-slate-800">{selectedPeriodoNombre}</span>
              {!isPeriodOpen && (
                <span className="ml-2 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Período cerrado (solo lectura)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isPeriodOpen && (
            <button
              type="button"
              onClick={onNew}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Registrar Gasto
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Saldo Acumulado en Tesorería */}
          <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-4 shadow-md border border-indigo-700/50">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-700/60 rounded-xl">
                <Coins className="w-5 h-5 text-indigo-200" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
                Multiperíodo
              </span>
            </div>
            <p className="text-xs text-indigo-200 font-medium mt-3">Saldo Acumulado en Fondos (Tesorería)</p>
            <p className="text-2xl font-black text-white mt-0.5 tracking-tight">
              {formatCOP(totalSaldoAcumuladoTesorería)}
            </p>
            <p className="text-[11px] text-indigo-300/80 mt-1 flex items-center gap-1">
              <History className="w-3 h-3" /> Fondos permanentes acumulados de todos los períodos
            </p>
          </div>

          {/* Card 2: Saldo del Período Actual */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <Wallet className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Este Período
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3">Flujo Neto del Período Actual</p>
            <p className={`text-2xl font-black mt-0.5 tracking-tight ${totalSaldoPeriodoActual >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatCOP(totalSaldoPeriodoActual)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Ingresos del mes menos gastos del mes
            </p>
          </div>

          {/* Card 3: Gastos del Período Actual */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-rose-100 rounded-xl">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                {gastos.length} Registro{gastos.length !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-3">Total Gastos en {selectedPeriodoNombre}</p>
            <p className="text-2xl font-black text-rose-600 mt-0.5 tracking-tight">
              −{formatCOP(totalGastosPeriodo)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Deducidos automáticamente de sus fondos
            </p>
          </div>
        </div>

        {/* Section Header with Tabs and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos los Fondos ({resumen.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("acumulable")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                filterType === "acumulable"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Fondos Acumulativos ({countAcumulables})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("periodo")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterType === "periodo"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fondos de Período ({countPeriodo})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar fondo o columna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 w-56"
            />
          </div>
        </div>

        {/* Funds Cards Grid */}
        {filteredResumen.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResumen.map((r) => {
              const isAcumulable = r.es_acumulable;
              const displayTotalFondo = isAcumulable ? r.fondo_acumulado : r.fondo_periodo;
              const displayTotalGastos = isAcumulable ? r.gastos_acumulados : r.gastos_periodo;
              const displaySaldo = isAcumulable ? r.saldo_acumulado : r.saldo_periodo;

              const pct =
                displayTotalFondo > 0
                  ? Math.min(100, Math.round((displayTotalGastos / displayTotalFondo) * 100))
                  : 0;

              const barColor =
                displaySaldo < 0
                  ? "bg-rose-500"
                  : pct >= 80
                  ? "bg-amber-500"
                  : "bg-emerald-500";

              return (
                <div
                  key={r.campo_fondo_id}
                  className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                    isAcumulable
                      ? "border-indigo-200 ring-1 ring-indigo-500/10"
                      : "border-slate-200"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isAcumulable ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Coins className="w-3 h-3 text-indigo-600" /> Fondo Acumulativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              ⚡ Fondo de Período
                            </span>
                          )}
                          {r.seccion && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {r.seccion}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 truncate" title={r.campo_fondo_nombre}>
                          {r.campo_fondo_nombre}
                        </h3>
                      </div>
                      <div className={`p-2 rounded-xl flex-shrink-0 ${isAcumulable ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
                        <Wallet className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {isAcumulable ? (
                        <>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 font-medium">
                              <History className="w-3 h-3 text-indigo-500" /> Recaudo acumulado total
                            </span>
                            <span className="font-bold text-slate-800">{formatCOP(r.fondo_acumulado)}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-600">
                            <span className="flex items-center gap-1 font-medium">
                              <ArrowDownRight className="w-3 h-3" /> Gastos acumulados deducidos
                            </span>
                            <span className="font-bold">−{formatCOP(r.gastos_acumulados)}</span>
                          </div>
                          <div className="h-px bg-slate-200/80 my-1" />
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-wide">
                              Saldo Real en Caja
                            </span>
                            <span className={`font-black text-sm ${displaySaldo < 0 ? "text-rose-600" : "text-indigo-700"}`}>
                              {formatCOP(displaySaldo)}
                            </span>
                          </div>
                          {/* Period info pill */}
                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500 font-medium">
                            <span>Movimiento del mes:</span>
                            <span>
                              +{formatCOP(r.fondo_periodo)} / <span className="text-rose-600 font-semibold">−{formatCOP(r.gastos_periodo)}</span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="flex items-center gap-1 font-medium">
                              <ArrowUpRight className="w-3 h-3 text-emerald-500" /> Recaudo del período
                            </span>
                            <span className="font-bold text-slate-800">{formatCOP(r.fondo_periodo)}</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-600">
                            <span className="flex items-center gap-1 font-medium">
                              <ArrowDownRight className="w-3 h-3" /> Gastos del período
                            </span>
                            <span className="font-bold">−{formatCOP(r.gastos_periodo)}</span>
                          </div>
                          <div className="h-px bg-slate-200/80 my-1" />
                          <div className="flex justify-between items-center pt-0.5">
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-wide">
                              Saldo del período
                            </span>
                            <span className={`font-black text-sm ${displaySaldo < 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              {formatCOP(displaySaldo)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress & Badge */}
                  <div className="mt-3 pt-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <span className="text-[10px] text-slate-400 font-medium">{pct}% egresado</span>
                      <SaldoBadge saldo={displaySaldo} total={displayTotalFondo} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              {resumen.length === 0
                ? "No hay columnas configuradas como Fondos de Tesorería"
                : "No se encontraron fondos con el filtro de búsqueda"}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
              {resumen.length === 0
                ? "Para designar qué columnas funcionarán como fondos para registrar gastos y controlar saldos, dirígete al menú «Columnas & Fórmulas», abre la columna que desees y activa la opción «Habilitar como Fondo de Tesorería»."
                : "Intenta cambiar el filtro o el término de búsqueda para ver otros fondos."}
            </p>
          </div>
        )}

        {/* Gastos List Section */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Historial de Gastos del Período ({selectedPeriodoNombre})</h2>
              <p className="text-xs text-slate-500">Salidas de dinero registradas contra fondos de tesorería</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : gastos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-2xl text-center">
              <div className="p-4 bg-slate-50 rounded-2xl mb-3 border border-slate-100">
                <TrendingDown className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">Sin gastos registrados en este período</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {isPeriodOpen
                  ? "Haz clic en «Registrar Gasto» para descontar fondos de cualquier columna de tesorería."
                  : "Este período está cerrado."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from(gastosByFondo.entries()).map(([fondoId, gList]) => {
                const matchedFondo = resumen.find((r) => r.campo_fondo_id === fondoId);
                const fondoNombre = gList[0]?.campo_fondo?.nombre ?? "Fondo de Tesorería";
                const isAcum = matchedFondo?.es_acumulable;
                const totalFondoGastos = gList.reduce((sum, g) => sum + Number(g.monto), 0);

                return (
                  <div key={fondoId} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    {/* Header for group */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {isAcum ? (
                          <span className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Coins className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="p-1 bg-slate-100 text-slate-600 rounded-lg">
                            <Wallet className="w-4 h-4" />
                          </span>
                        )}
                        <div>
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            {fondoNombre}
                          </span>
                          {isAcum && (
                            <span className="ml-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              Fondo Acumulativo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-600">
                          Total egresos: −{formatCOP(totalFondoGastos)}
                        </span>
                      </div>
                    </div>

                    {/* Gastos list */}
                    <div className="space-y-2">
                      {gList.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center gap-4 bg-slate-50/70 border border-slate-200/70 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition group"
                        >
                          <div className="p-2 bg-rose-100/70 text-rose-600 rounded-lg flex-shrink-0">
                            <ArrowDownRight className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{g.descripcion}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {new Date(g.fecha).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              · Por {g.creado_por?.nombre_completo || "Tesorero"}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black text-rose-600">−{formatCOP(Number(g.monto))}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenVoucher && onOpenVoucher(g)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-200 shadow-2xs"
                              title="Ver Comprobante de Egreso / Enviar por WhatsApp / Imprimir PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Voucher</span>
                            </button>
                            {isPeriodOpen && (
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                <button
                                  type="button"
                                  onClick={() => onEdit(g)}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(g)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
