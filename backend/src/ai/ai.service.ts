import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ValoresService } from '../valores/valores.service';
import { GastosService } from '../gastos/gastos.service';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatCOP(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private valoresService: ValoresService,
    private gastosService: GastosService,
  ) {}

  async askCopilot(userQuery: string, history: any[] = [], context: any = {}) {
    const qNorm = normalizeText(userQuery);

    // 1. Fetch All Periods, Tables, and Churches from Database
    const [allPeriods, allTables, allChurches, allGastos, allIngresosFondos] = await Promise.all([
      this.prisma.periodo.findMany({
        orderBy: { fecha_inicio: 'asc' },
      }),
      this.prisma.tabla.findMany({
        orderBy: { nombre: 'asc' },
      }),
      this.prisma.iglesia.findMany({
        include: { tabla: true },
        orderBy: { orden: 'asc' },
      }),
      this.prisma.gasto.findMany({
        include: {
          periodo: { select: { id: true, nombre: true } },
          campo_fondo: { select: { id: true, nombre: true } },
          creado_por: { select: { id: true, nombre_completo: true } },
        },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.ingresoFondo.findMany({
        include: {
          periodo: { select: { id: true, nombre: true } },
          campo_fondo: { select: { id: true, nombre: true } },
          creado_por: { select: { id: true, nombre_completo: true } },
        },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    if (allPeriods.length === 0 || allTables.length === 0) {
      return {
        text: '⚠️ No hay períodos o tablas contables configuradas en la base de datos.',
        modelUsed: 'TesorApp Engine',
      };
    }

    // 2. Determine Period Range (Multi-period vs Single period)
    let startMonthIdx = -1;
    let endMonthIdx = -1;

    // Detect range patterns: "de enero hasta agosto", "enero a agosto", "primer semestre", etc.
    for (let i = 0; i < MONTH_NAMES.length; i++) {
      const m1 = MONTH_NAMES[i];
      if (qNorm.includes(m1)) {
        if (startMonthIdx === -1) {
          startMonthIdx = i;
        } else {
          endMonthIdx = i;
        }
      }
    }

    if (qNorm.includes('primer semestre') || qNorm.includes('1er semestre') || qNorm.includes('semestre 1')) {
      startMonthIdx = 0; // Enero
      endMonthIdx = 5; // Junio
    } else if (qNorm.includes('segundo semestre') || qNorm.includes('2do semestre') || qNorm.includes('semestre 2')) {
      startMonthIdx = 6; // Julio
      endMonthIdx = 11; // Diciembre
    } else if (
      qNorm.includes('anual') ||
      qNorm.includes('ano') ||
      qNorm.includes('todo el ano') ||
      qNorm.includes('historico') ||
      qNorm.includes('acumulado') ||
      qNorm.includes('todos los meses') ||
      qNorm.includes('consolidado') ||
      (qNorm.includes('informe') && startMonthIdx === -1 && endMonthIdx === -1) ||
      (qNorm.includes('reporte') && startMonthIdx === -1 && endMonthIdx === -1)
    ) {
      // Full year / all available periods
      startMonthIdx = 0;
      endMonthIdx = allPeriods.length - 1;
    }

    // If single month matched without explicit range
    if (startMonthIdx !== -1 && endMonthIdx === -1) {
      if (qNorm.includes('hasta') || qNorm.includes(' a ') || qNorm.includes('-') || qNorm.includes('al')) {
        // e.g. "hasta agosto" -> from beginning up to August
        endMonthIdx = startMonthIdx;
        startMonthIdx = 0;
      } else {
        endMonthIdx = startMonthIdx;
      }
    }

    // Filter target periods
    let targetPeriods = allPeriods;
    if (startMonthIdx !== -1 && endMonthIdx !== -1) {
      const minIdx = Math.min(startMonthIdx, endMonthIdx);
      const maxIdx = Math.max(startMonthIdx, endMonthIdx);

      targetPeriods = allPeriods.filter((p) => {
        const pMonthIdx = new Date(p.fecha_inicio).getUTCMonth();
        return pMonthIdx >= minIdx && pMonthIdx <= maxIdx;
      });
      if (targetPeriods.length === 0) targetPeriods = allPeriods;
    }

    // 3. Compile Financial Data Across ALL Target Periods and ALL Tables
    const isMultiPeriod = targetPeriods.length > 1;
    const periodRangeTitle = isMultiPeriod
      ? `${targetPeriods[0].nombre} — ${targetPeriods[targetPeriods.length - 1].nombre}`
      : targetPeriods[0].nombre;

    interface MonthSummary {
      period: any;
      periodName: string;
      totalConsolidado: number;
      tableTotals: Record<string, { tableName: string; total: number; activeChurches: number; totalChurches: number }>;
      columnTotals: Record<string, { name: string; slug: string; total: number; isFund: boolean }>;
      activeChurchesCount: number;
      totalChurchesCount: number;
      churchTotals: Record<string, { name: string; total: number; hasValues: boolean; details: string[] }>;
    }

    const monthlySummaries: MonthSummary[] = [];
    const globalTableTotals: Record<string, { name: string; total: number; activeCount: number; churchCount: number }> = {};
    const globalColumnTotals: Record<string, { name: string; slug: string; total: number; isFund: boolean }> = {};
    const globalChurchTotals: Record<string, { name: string; tableName: string; total: number; monthsActive: number }> = {};

    allTables.forEach((t) => {
      globalTableTotals[t.id] = { name: t.nombre, total: 0, activeCount: 0, churchCount: 0 };
    });

    let grandTotalRecaudo = 0;

    for (const p of targetPeriods) {
      let monthTotal = 0;
      let monthActiveChurches = 0;
      let monthTotalChurches = 0;
      const monthTableTotals: Record<string, { tableName: string; total: number; activeChurches: number; totalChurches: number }> = {};
      const monthColumnTotals: Record<string, { name: string; slug: string; total: number; isFund: boolean }> = {};
      const monthChurchTotals: Record<string, { name: string; total: number; hasValues: boolean; details: string[] }> = {};

      for (const t of allTables) {
        let tableData: any = null;
        try {
          tableData = await this.valoresService.findTableValues(t.id, p.id, 'tesorero', undefined, true);
        } catch {
          tableData = { columnas: [], filas: [] };
        }

        const columns = tableData?.columnas || [];
        const rows = tableData?.filas || [];

        const totalIngresosCol = columns.find(
          (c: any) => c.slug === 'total_ingresos' || c.slug === 'ingreso_total' || (c.nombre && /total\s*(ingreso|general|recaudo)/i.test(c.nombre))
        );
        const inputCols = columns.filter(
          (c: any) => c.seccion !== 'Egresos' && c.seccion !== 'Totales' && c.id !== totalIngresosCol?.id
        );

        let tableSum = 0;
        let tableActive = 0;

        rows.forEach((r: any) => {
          const churchName = r.iglesia_nombre || r.iglesia?.nombre || 'Sede';
          let churchTotal = 0;
          let hasValues = false;
          const details: string[] = [];

          columns.forEach((col: any) => {
            const valObj = Array.isArray(r.valores) ? r.valores.find((v: any) => v.campo_id === col.id) : null;
            const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
            const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
            const num = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0)) || 0;

            if (num > 0) {
              hasValues = true;
              details.push(`${col.nombre}: ${formatCOP(num)}`);

              // Accumulate in monthColumnTotals & globalColumnTotals
              const colKey = col.slug || col.id;
              const isFund = col.es_fondo === true || (col.nombre && /fondo|mision|muser|templo|arriendo|construc|auxilio|ayuda|pastoral|regional/i.test(col.nombre));

              if (!monthColumnTotals[colKey]) {
                monthColumnTotals[colKey] = { name: col.nombre, slug: col.slug || '', total: 0, isFund };
              }
              monthColumnTotals[colKey].total += num;

              if (!globalColumnTotals[colKey]) {
                globalColumnTotals[colKey] = { name: col.nombre, slug: col.slug || '', total: 0, isFund };
              }
              globalColumnTotals[colKey].total += num;
            }
          });

          if (totalIngresosCol) {
            const valObj = Array.isArray(r.valores) ? r.valores.find((v: any) => v.campo_id === totalIngresosCol.id) : null;
            churchTotal = Number(valObj?.valor_calculado ?? valObj?.valor_manual ?? 0) || 0;
          } else {
            inputCols.forEach((col: any) => {
              const valObj = Array.isArray(r.valores) ? r.valores.find((v: any) => v.campo_id === col.id) : null;
              const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
              const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
              const num = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0)) || 0;
              churchTotal += num;
            });
          }

          if (hasValues) {
            tableActive++;
            monthActiveChurches++;
          }

          tableSum += churchTotal;

          monthChurchTotals[r.iglesia_id] = {
            name: churchName,
            total: churchTotal,
            hasValues,
            details,
          };

          // Global church aggregation
          if (!globalChurchTotals[r.iglesia_id]) {
            globalChurchTotals[r.iglesia_id] = {
              name: churchName,
              tableName: t.nombre,
              total: 0,
              monthsActive: 0,
            };
          }
          globalChurchTotals[r.iglesia_id].total += churchTotal;
          if (hasValues) globalChurchTotals[r.iglesia_id].monthsActive++;
        });

        monthTotal += tableSum;
        monthTotalChurches += rows.length;

        monthTableTotals[t.id] = {
          tableName: t.nombre,
          total: tableSum,
          activeChurches: tableActive,
          totalChurches: rows.length,
        };

        globalTableTotals[t.id].total += tableSum;
        globalTableTotals[t.id].churchCount = rows.length;
        if (tableActive > 0) globalTableTotals[t.id].activeCount++;
      }

      grandTotalRecaudo += monthTotal;

      monthlySummaries.push({
        period: p,
        periodName: p.nombre,
        totalConsolidado: monthTotal,
        tableTotals: monthTableTotals,
        columnTotals: monthColumnTotals,
        activeChurchesCount: monthActiveChurches,
        totalChurchesCount: monthTotalChurches,
        churchTotals: monthChurchTotals,
      });
    }

    // 4. Check for Specific Inquiries in the query
    // A. Specific Fund Inquiry across the period range
    const globalColsList = Object.values(globalColumnTotals);
    const matchedFund = globalColsList.find((col) => {
      const colNorm = normalizeText(col.name);
      const slugNorm = normalizeText(col.slug);
      if (qNorm.includes(colNorm) || (slugNorm && qNorm.includes(slugNorm))) return true;
      if ((qNorm.includes('muser') || qNorm.includes('mision')) && (colNorm.includes('mision') || colNorm.includes('muser'))) return true;
      if ((qNorm.includes('arriendo') || qNorm.includes('misionero de zona')) && (colNorm.includes('arriendo') || colNorm.includes('misionero'))) return true;
      if (qNorm.includes('templo') && colNorm.includes('templo')) return true;
      if (qNorm.includes('regional') && colNorm.includes('regional')) return true;
      if (qNorm.includes('nacional') && (colNorm.includes('nacional') || colNorm.includes('10%') || colNorm.includes('10 porciento'))) return true;
      if (qNorm.includes('diezmo') && colNorm.includes('diezmo')) return true;
      if (qNorm.includes('emolumento') && colNorm.includes('emolumento')) return true;
      return false;
    });

    if (matchedFund && (qNorm.includes('cuanto') || qNorm.includes('total') || qNorm.includes('fondo') || qNorm.includes('rubro'))) {
      const monthlyFundEvolution = monthlySummaries.map((m) => {
        const found = Object.values(m.columnTotals).find(
          (c) => normalizeText(c.name) === normalizeText(matchedFund.name) || (c.slug && c.slug === matchedFund.slug)
        );
        return {
          month: m.periodName,
          total: found?.total || 0,
        };
      });

      return {
        text: `🏛️ **INFORME OFICIAL DE CONSOLIDACIÓN: ${matchedFund.name.toUpperCase()}**\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📅 **Período Consultado:** **${periodRangeTitle}** (${targetPeriods.length} ${targetPeriods.length === 1 ? 'mes' : 'meses'})\n` +
          `📋 **Alcance:** **Todas las Tablas** (${allTables.map((t) => t.nombre).join(' + ')})\n` +
          `💰 **Total Recaudado en este Concepto:** **${formatCOP(matchedFund.total)}**\n\n` +
          `### 📊 Evolución Mes a Mes (${matchedFund.name}):\n` +
          `| Período | Aporte del Mes | % del Total Acumulado |\n` +
          `|:---|:---|:---|\n` +
          monthlyFundEvolution.map((mf) => `| ${mf.month} | ${formatCOP(mf.total)} | ${matchedFund.total > 0 ? ((mf.total / matchedFund.total) * 100).toFixed(1) : '0'}% |`).join('\n') +
          `\n| **TOTAL ACUMULADO** | **${formatCOP(matchedFund.total)}** | **100%** |\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print) | [👉 Ver Planilla Contable](#tab:sheet) | [👉 Ver Fondos y Gastos](#tab:gastos)`,
        modelUsed: 'TesorApp Engine (Consolidado Multi-Tabla)',
      };
    }

    // B. Specific Church Inquiry across the period range
    const allChurchesList = Object.values(globalChurchTotals);
    const matchedChurch = allChurchesList.find((c) => {
      const cNorm = normalizeText(c.name);
      return qNorm.includes(cNorm) || cNorm.split(' ').some((part) => part.length > 3 && qNorm.includes(part));
    });

    if (matchedChurch && (qNorm.includes('iglesia') || qNorm.includes('sede') || qNorm.includes('congregacion') || qNorm.includes(normalizeText(matchedChurch.name)))) {
      const monthlyChurchEvolution = monthlySummaries.map((m) => {
        const ch = Object.entries(m.churchTotals).find(([id, obj]) => normalizeText(obj.name) === normalizeText(matchedChurch.name));
        return {
          month: m.periodName,
          total: ch ? ch[1].total : 0,
          hasValues: ch ? ch[1].hasValues : false,
          details: ch ? ch[1].details : [],
        };
      });

      return {
        text: `🏛️ **INFORME HISTÓRICO DE CONGREGACIÓN**\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `⛪ **Congregación:** **${matchedChurch.name}**\n` +
          `📋 **Tabla / Planilla:** **${matchedChurch.tableName}**\n` +
          `📅 **Rango de Períodos:** **${periodRangeTitle}** (${targetPeriods.length} ${targetPeriods.length === 1 ? 'mes' : 'meses'})\n` +
          `💰 **Total Aportado Acumulado:** **${formatCOP(matchedChurch.total)}**\n` +
          `📊 **Meses con Informe Diligenciado:** **${matchedChurch.monthsActive} de ${targetPeriods.length} meses**\n\n` +
          `### 📋 Desglose Mes a Mes:\n` +
          `| Mes | Estado | Total Aportado |\n` +
          `|:---|:---|:---|\n` +
          monthlyChurchEvolution.map((me) => `| ${me.month} | ${me.hasValues ? '✅ Al día' : '⏳ Pendiente'} | ${formatCOP(me.total)} |`).join('\n') +
          `\n| **TOTAL ACUMULADO** | | **${formatCOP(matchedChurch.total)}** |\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print) | [👉 Ver Planilla Contable](#tab:sheet)`,
        modelUsed: 'TesorApp Engine (Consolidado Multi-Tabla)',
      };
    }

    // 5. Build Complete, Multi-Period & Multi-Table Consolidated Report
    const tableNamesList = allTables.map((t) => t.nombre);
    const topChurchesGlobal = [...allChurchesList].sort((a, b) => b.total - a.total).slice(0, 8);

    // Build Evolution Table Rows
    const evolutionTableRows = monthlySummaries.map((m) => {
      const tableCells = allTables.map((t) => formatCOP(m.tableTotals[t.id]?.total || 0)).join(' | ');
      const pct = m.totalChurchesCount > 0 ? Math.round((m.activeChurchesCount / m.totalChurchesCount) * 100) : 0;
      return `| ${m.periodName} | ${tableCells} | **${formatCOP(m.totalConsolidado)}** | ${m.activeChurchesCount}/${m.totalChurchesCount} (${pct}%) |`;
    });

    const tableHeaders = allTables.map((t) => `Tabla ${t.nombre}`).join(' | ');
    const tableSeparators = allTables.map(() => ':---').join(' | ');
    const tableFooterTotals = allTables.map((t) => `**${formatCOP(globalTableTotals[t.id].total)}**`).join(' | ');

    // Filter main financial concepts/funds
    const topFunds = globalColsList
      .filter((c) => c.total > 0 && c.slug !== 'total_ingresos' && c.slug !== 'ingreso_total')
      .sort((a, b) => b.total - a.total);

    // Sum of expenses and direct incomes in target periods
    const targetPeriodIds = new Set(targetPeriods.map((p) => p.id));
    const periodGastos = allGastos.filter((g) => targetPeriodIds.has(g.periodo_id));
    const totalGastosMonto = periodGastos.reduce((sum, g) => sum + Number(g.monto || 0), 0);

    const periodIngresosFondos = allIngresosFondos.filter((ing) => !ing.periodo_id || targetPeriodIds.has(ing.periodo_id));
    const totalIngresosFondosMonto = periodIngresosFondos.reduce((sum, ing) => sum + Number(ing.monto || 0), 0);

    const fullReportText = `🏛️ **INFORME OFICIAL Y CONSOLIDADO DE TESORERÍA**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📅 **Período de Análisis:** **${periodRangeTitle}** (${targetPeriods.length} ${targetPeriods.length === 1 ? 'mes' : 'meses auditados'})\n` +
      `📋 **Tablas / Planillas Incluidas:** **${tableNamesList.join(' y ')}** (100% de la Zona)\n` +
      `💰 **Recaudo Total Consolidado:** **${formatCOP(grandTotalRecaudo)}**\n` +
      `📊 **Promedio Mensual:** **${formatCOP(targetPeriods.length > 0 ? grandTotalRecaudo / targetPeriods.length : 0)}**\n\n` +
      `### 📈 1. Evolución Mensual del Recaudo por Tablas:\n\n` +
      `| Período | ${tableHeaders} | Total Consolidado | Cumplimiento |\n` +
      `|:---| ${tableSeparators} |:---|:---|\n` +
      evolutionTableRows.join('\n') +
      `\n| **TOTAL ACUMULADO** | ${tableFooterTotals} | **${formatCOP(grandTotalRecaudo)}** | **Consolidado** |\n\n` +
      `### 🏛️ 2. Aportes por Tablas / Planillas:\n` +
      allTables
        .map((t) => {
          const tot = globalTableTotals[t.id]?.total || 0;
          const share = grandTotalRecaudo > 0 ? ((tot / grandTotalRecaudo) * 100).toFixed(1) : '0';
          const churchCount = globalTableTotals[t.id]?.churchCount || 0;
          return `• **Tabla ${t.nombre}** (${churchCount} congregaciones): **${formatCOP(tot)}** (*${share}% del recaudo total*)`;
        })
        .join('\n') +
      `\n\n### 💼 3. Consolidado Acumulado por Conceptos y Fondos:\n` +
      topFunds
        .map((f) => {
          const share = grandTotalRecaudo > 0 ? `*(${((f.total / grandTotalRecaudo) * 100).toFixed(1)}%)*` : '';
          return `• **${f.name}:** **${formatCOP(f.total)}** ${share}`;
        })
        .join('\n') +
      `\n\n### 💰 4. Movimientos y Ejecución de Fondos de Tesorería:\n` +
      `• **Recaudo Total por Planilla:** ${formatCOP(grandTotalRecaudo)}\n` +
      `• **Ingresos y Aportes Directos a Fondos:** +${formatCOP(totalIngresosFondosMonto)}\n` +
      `• **Egresos y Gastos Ejecutados:** −${formatCOP(totalGastosMonto)} (${periodGastos.length} gastos registrados)\n` +
      `• **Saldo Neto en Caja de Fondos:** **${formatCOP(grandTotalRecaudo + totalIngresosFondosMonto - totalGastosMonto)}**\n\n` +
      `### 🏆 5. Principales Congregaciones Aportantes (${periodRangeTitle}):\n` +
      topChurchesGlobal
        .map((c, idx) => {
          const share = grandTotalRecaudo > 0 ? `(${((c.total / grandTotalRecaudo) * 100).toFixed(1)}%)` : '';
          return `${idx + 1}. **${c.name}** *(${c.tableName})*: **${formatCOP(c.total)}** ${share} | ${c.monthsActive}/${targetPeriods.length} meses al día`;
        })
        .join('\n') +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `*Certificación emitida con base en los registros contables oficiales del sistema TesorApp para las tablas ${tableNamesList.join(', ')}.*\n\n` +
      `👉 [🖨️ Imprimir / Guardar este Informe en PDF](#action:print) | [👉 Ver Planilla Contable](#tab:sheet) | [👉 Ver Fondos y Gastos](#tab:gastos)`;

    return {
      text: fullReportText,
      modelUsed: 'TesorApp Engine (Consolidado Multi-Tabla & Multi-Periodo)',
    };
  }
}


