import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HistorialService } from "../historial/historial.service";
import { EntidadAuditoria } from "@prisma/client";

@Injectable()
export class GastosService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  async findAll(periodoId?: string, campoFondoId?: string) {
    return this.prisma.gasto.findMany({
      where: {
        ...(periodoId ? { periodo_id: periodoId } : {}),
        ...(campoFondoId ? { campo_fondo_id: campoFondoId } : {}),
      },
      include: {
        campo_fondo: { select: { id: true, nombre: true, slug: true } },
        periodo: { select: { id: true, nombre: true } },
        creado_por: { select: { id: true, nombre_completo: true } },
      },
      orderBy: [{ periodo_id: "asc" }, { fecha: "desc" }],
    });
  }

  async getResumen(periodoId: string) {
    if (!periodoId) throw new BadRequestException("Se requiere periodo_id.");

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException("Periodo no encontrado.");

    // 1. Fetch all prior and current periods up to this period's end date
    const allPriorPeriods = await this.prisma.periodo.findMany({
      where: { fecha_fin: { lte: periodo.fecha_fin } },
      select: { id: true },
    });
    const priorPeriodIds = allPriorPeriods.map((p) => p.id);
    if (!priorPeriodIds.includes(periodoId)) {
      priorPeriodIds.push(periodoId);
    }

    // 2. Fetch all active designated fund fields (both column funds and standalone manual funds)
    const camposFondo = await this.prisma.campoPlantilla.findMany({
      where: {
        es_fondo: true,
        activo: true,
      },
      select: { 
        id: true, 
        nombre: true, 
        slug: true, 
        modo_calculo: true,
        es_acumulable: true, 
        es_temporal: true,
        es_transito: true,
        ente_superior_nombre: true,
        seccion: true, 
        orden: true,
        visible_para_tesorero: true,
        visible_para_iglesia: true,
      },
      orderBy: [{ seccion: "asc" }, { orden: "asc" }],
    });

    // 2b. Fetch manual fund incomes for current period and prior periods
    const currentIngresos = await this.prisma.ingresoFondo.findMany({
      where: { periodo_id: periodoId },
    });
    const currentIngresosMap = new Map(currentIngresos.map((i) => [i.campo_fondo_id, Number(i.monto)]));

    // Fetch ALL ingresos for manual funds - no period restriction (manual funds have historical dates)
    const allManualIngresos = await this.prisma.ingresoFondo.findMany({
      select: { campo_fondo_id: true, monto: true, fecha: true },
      orderBy: { fecha: "desc" },
    });
    const accumIngresosMap = new Map<string, number>();
    const latestFechaMap = new Map<string, string>();
    for (const i of allManualIngresos) {
      const current = accumIngresosMap.get(i.campo_fondo_id) || 0;
      accumIngresosMap.set(i.campo_fondo_id, current + Number(i.monto));
      if (!latestFechaMap.has(i.campo_fondo_id) && i.fecha) {
        latestFechaMap.set(i.campo_fondo_id, i.fecha.toISOString().split("T")[0]);
      }
    }

    // 3. Gastos in current period
    const periodGastos = await this.prisma.gasto.groupBy({
      by: ["campo_fondo_id"],
      where: { periodo_id: periodoId },
      _sum: { monto: true },
    });
    const periodGastosMap = new Map(periodGastos.map((g) => [g.campo_fondo_id, Number(g._sum.monto ?? 0)]));

    // 4. Accumulated gastos across all periods up to current period
    const accumGastos = await this.prisma.gasto.groupBy({
      by: ["campo_fondo_id"],
      where: { periodo_id: { in: priorPeriodIds } },
      _sum: { monto: true },
    });
    const accumGastosMap = new Map(accumGastos.map((g) => [g.campo_fondo_id, Number(g._sum.monto ?? 0)]));

    // 5. Current period values from planilla
    const currentValores = await this.prisma.valor.groupBy({
      by: ["campo_id"],
      where: { periodo_id: periodoId },
      _sum: { valor_manual: true, valor_calculado: true, valor_acumulado: true },
    });
    const currentValMap = new Map(currentValores.map((v) => [v.campo_id, v]));

    // 6. All prior periods values sum from planilla
    const priorValores = await this.prisma.valor.groupBy({
      by: ["campo_id"],
      where: { periodo_id: { in: priorPeriodIds } },
      _sum: { valor_manual: true, valor_calculado: true },
    });
    const priorSumMap = new Map(
      priorValores.map((v) => [
        v.campo_id,
        Number(v._sum.valor_manual ?? 0) + Number(v._sum.valor_calculado ?? 0),
      ]),
    );

    // 7. Map each fund field to its summary
    return camposFondo.map((f) => {
      const curVal = currentValMap.get(f.id);
      const manualPeriodVal = currentIngresosMap.get(f.id);
      const colPeriodVal = Number(curVal?._sum.valor_manual ?? 0) + Number(curVal?._sum.valor_calculado ?? 0);
      const fondoPeriodo = (manualPeriodVal !== undefined ? manualPeriodVal : 0) + colPeriodVal;

      const gastosPeriodo = periodGastosMap.get(f.id) || 0;
      const saldoPeriodo = fondoPeriodo - gastosPeriodo;

      // Accumulated calculation:
      const recordedAccum = Number(curVal?._sum.valor_acumulado ?? 0);
      const colPriorSum = priorSumMap.get(f.id) ?? 0;
      const manualAccum = accumIngresosMap.get(f.id) ?? 0;
      
      const calculatedAccum = colPriorSum + manualAccum;
      
      const isColumna = f.visible_para_tesorero !== false || f.visible_para_iglesia !== false;
      const isManual = !isColumna || (manualAccum > 0 && colPriorSum === 0);

      const fondoAcumulado = f.es_acumulable || f.es_temporal 
        ? (recordedAccum > 0 && isColumna && manualAccum === 0 ? recordedAccum : calculatedAccum) 
        : (fondoPeriodo > 0 ? fondoPeriodo : calculatedAccum);
        
      const gastosAcumulados = accumGastosMap.get(f.id) || 0;
      const saldoAcumulado = fondoAcumulado - gastosAcumulados;

      // Effective totals: funds preserve accumulated money even when not active in current period planilla
      const totalFondo = fondoAcumulado;
      const totalGastos = gastosAcumulados;
      const saldoDisponible = saldoAcumulado;

      return {
        campo_fondo_id: f.id,
        campo_fondo_nombre: f.nombre,
        campo_fondo_slug: f.slug,
        es_acumulable: f.es_acumulable,
        es_transito: f.es_transito,
        es_manual: isManual,
        es_columna: !isManual,
        ente_superior_nombre: f.ente_superior_nombre,
        seccion: f.seccion,
        fecha_ingreso: latestFechaMap.get(f.id) || null,
        // Período actual
        fondo_periodo: fondoPeriodo,
        gastos_periodo: gastosPeriodo,
        saldo_periodo: saldoPeriodo,
        // Histórico Acumulado
        fondo_acumulado: fondoAcumulado,
        gastos_acumulados: gastosAcumulados,
        saldo_acumulado: saldoAcumulado,
        // Totales efectivos para el fondo
        total_fondo: totalFondo,
        total_gastos: totalGastos,
        saldo_disponible: saldoDisponible,
      };
    });
  }

  async findOne(id: string) {
    const gasto = await this.prisma.gasto.findUnique({
      where: { id },
      include: {
        campo_fondo: { select: { id: true, nombre: true, slug: true } },
        periodo: { select: { id: true, nombre: true } },
        creado_por: { select: { id: true, nombre_completo: true } },
      },
    });
    if (!gasto) throw new NotFoundException("Gasto no encontrado.");
    return gasto;
  }

  async createFondoManual(
    data: {
      nombre: string;
      monto?: number;
      periodo_id?: string;
      fecha?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede crear fondos.");
    if (!data.nombre || !data.nombre.trim()) throw new BadRequestException("El nombre del fondo es requerido.");

    return this.prisma.$transaction(async (tx) => {
      let baseSlug = data.nombre.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "fondo";
      let slug = baseSlug;
      let counter = 1;
      while (await tx.campoPlantilla.findUnique({ where: { slug } })) {
        slug = `${baseSlug}_${counter++}`;
      }

      const campo = await tx.campoPlantilla.create({
        data: {
          nombre: data.nombre.trim(),
          slug,
          tipo: "moneda",
          modo_calculo: "manual",
          es_acumulable: data.es_acumulable ?? true,
          es_fondo: true,
          es_transito: data.es_transito ?? false,
          ente_superior_nombre: data.es_transito ? data.ente_superior_nombre?.trim() || null : null,
          seccion: "Egresos",
          seccion_iglesia: "Egresos",
          seccion_tesorero: "Egresos",
          orden: 999,
          aplica_a_todas_las_iglesias: false,
          visible_para_iglesia: false,
          visible_para_tesorero: false, // NOT a column in the planilla
          es_temporal: false,
          activo: true,
        },
      });

      let targetPeriodoId = data.periodo_id;
      if (!targetPeriodoId && data.fecha) {
        const matchPeriod = await tx.periodo.findFirst({
          where: {
            fecha_inicio: { lte: new Date(data.fecha) },
            fecha_fin: { gte: new Date(data.fecha) },
          },
        });
        targetPeriodoId = matchPeriod?.id;
      }
      if (!targetPeriodoId) {
        const earliest = await tx.periodo.findFirst({ orderBy: { fecha_inicio: "asc" } });
        targetPeriodoId = earliest?.id;
      }

      if (data.monto !== undefined && data.monto !== null && Number(data.monto) > 0) {
        const fechaVal = data.fecha ? new Date(data.fecha) : new Date();
        await tx.ingresoFondo.create({
          data: {
            campo_fondo_id: campo.id,
            periodo_id: targetPeriodoId,
            monto: Number(data.monto) || 0,
            fecha: fechaVal,
            descripcion: "Monto / Recaudo inicial",
          },
        });
      }

      await this.historial.log(tx, {
        entidad: EntidadAuditoria.campo_plantilla,
        entidadId: campo.id,
        accion: "creacion",
        valorNuevo: { ...campo, monto_inicial: data.monto, fecha_ingreso: data.fecha, periodo_id: targetPeriodoId },
        realizadoPor,
      });

      return campo;
    });
  }

  async updateFondoManual(
    id: string,
    data: {
      nombre?: string;
      monto?: number;
      periodo_id?: string;
      fecha?: string;
      es_transito?: boolean;
      ente_superior_nombre?: string;
      es_acumulable?: boolean;
    },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede modificar fondos.");

    return this.prisma.$transaction(async (tx) => {
      const campo = await tx.campoPlantilla.findUnique({ where: { id } });
      if (!campo) throw new NotFoundException("Fondo no encontrado.");

      const updatedData: any = {};
      if (data.nombre && data.nombre.trim()) updatedData.nombre = data.nombre.trim();
      if (data.es_transito !== undefined) updatedData.es_transito = data.es_transito;
      if (data.ente_superior_nombre !== undefined) updatedData.ente_superior_nombre = data.ente_superior_nombre;
      if (data.es_acumulable !== undefined) updatedData.es_acumulable = data.es_acumulable;

      const updatedCampo = await tx.campoPlantilla.update({
        where: { id },
        data: updatedData,
      });

      let targetPeriodoId = data.periodo_id;
      if (!targetPeriodoId && data.fecha) {
        const matchPeriod = await tx.periodo.findFirst({
          where: {
            fecha_inicio: { lte: new Date(data.fecha) },
            fecha_fin: { gte: new Date(data.fecha) },
          },
        });
        targetPeriodoId = matchPeriod?.id;
      }
      if (!targetPeriodoId) {
        const earliest = await tx.periodo.findFirst({ orderBy: { fecha_inicio: "asc" } });
        targetPeriodoId = earliest?.id;
      }

      if (data.monto !== undefined && data.monto !== null) {
        const fechaVal = data.fecha ? new Date(data.fecha) : new Date();
        const existing = await tx.ingresoFondo.findFirst({
          where: { campo_fondo_id: id },
        });

        if (existing) {
          await tx.ingresoFondo.update({
            where: { id: existing.id },
            data: {
              monto: Number(data.monto) || 0,
              fecha: fechaVal,
              ...(targetPeriodoId ? { periodo_id: targetPeriodoId } : {}),
            },
          });
        } else if (targetPeriodoId) {
          await tx.ingresoFondo.create({
            data: {
              campo_fondo_id: id,
              periodo_id: targetPeriodoId,
              monto: Number(data.monto) || 0,
              fecha: fechaVal,
            },
          });
        }
      }

      await this.historial.log(tx, {
        entidad: EntidadAuditoria.campo_plantilla,
        entidadId: id,
        accion: "actualizacion",
        valorAnterior: campo,
        valorNuevo: { ...updatedCampo, monto_actualizado: data.monto, fecha_ingreso: data.fecha, periodo_id: targetPeriodoId },
        realizadoPor,
      });

      return updatedCampo;
    });
  }

  async setMontoFondo(
    id: string,
    data: { monto: number; periodo_id?: string; fecha?: string; observacion?: string; descripcion?: string },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede actualizar montos de fondos.");

    let targetPeriodoId = data.periodo_id;
    if (!targetPeriodoId && data.fecha) {
      const matchPeriod = await this.prisma.periodo.findFirst({
        where: {
          fecha_inicio: { lte: new Date(data.fecha) },
          fecha_fin: { gte: new Date(data.fecha) },
        },
      });
      targetPeriodoId = matchPeriod?.id;
    }
    if (!targetPeriodoId) {
      const earliest = await this.prisma.periodo.findFirst({ orderBy: { fecha_inicio: "asc" } });
      targetPeriodoId = earliest?.id;
    }

    const fechaVal = data.fecha ? new Date(data.fecha) : new Date();

    const existing = await this.prisma.ingresoFondo.findFirst({
      where: { campo_fondo_id: id },
    });

    if (existing) {
      return this.prisma.ingresoFondo.update({
        where: { id: existing.id },
        data: {
          monto: Number(data.monto) || 0,
          fecha: fechaVal,
          descripcion: data.descripcion || data.observacion || null,
          observacion: data.observacion || null,
          ...(targetPeriodoId ? { periodo_id: targetPeriodoId } : {}),
        },
      });
    }

    return this.prisma.ingresoFondo.create({
      data: {
        campo_fondo_id: id,
        periodo_id: targetPeriodoId,
        monto: Number(data.monto) || 0,
        fecha: fechaVal,
        descripcion: data.descripcion || data.observacion || null,
        observacion: data.observacion || null,
      },
    });
  }

  async addIngresoFondo(
    campoFondoId: string,
    data: { monto: number; fecha?: string; descripcion?: string; observacion?: string; periodo_id?: string },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede registrar ingresos a fondos.");
    if (!data.monto || Number(data.monto) <= 0) throw new BadRequestException("El monto debe ser mayor a 0.");

    const campo = await this.prisma.campoPlantilla.findUnique({ where: { id: campoFondoId } });
    if (!campo) throw new NotFoundException("Fondo no encontrado.");

    let targetPeriodoId = data.periodo_id;
    if (!targetPeriodoId && data.fecha) {
      const matchPeriod = await this.prisma.periodo.findFirst({
        where: {
          fecha_inicio: { lte: new Date(data.fecha) },
          fecha_fin: { gte: new Date(data.fecha) },
        },
      });
      targetPeriodoId = matchPeriod?.id;
    }
    if (!targetPeriodoId) {
      const earliest = await this.prisma.periodo.findFirst({ orderBy: { fecha_inicio: "asc" } });
      targetPeriodoId = earliest?.id;
    }

    const fechaVal = data.fecha ? new Date(data.fecha) : new Date();

    const ingreso = await this.prisma.ingresoFondo.create({
      data: {
        campo_fondo_id: campoFondoId,
        periodo_id: targetPeriodoId,
        monto: Number(data.monto),
        fecha: fechaVal,
        descripcion: data.descripcion?.trim() || null,
        observacion: data.observacion?.trim() || null,
      },
    });

    await this.historial.log(this.prisma, {
      entidad: EntidadAuditoria.campo_plantilla,
      entidadId: campoFondoId,
      accion: "actualizacion",
      valorNuevo: {
        tipo_accion: "nuevo_ingreso_fondo",
        ingreso_id: ingreso.id,
        monto: data.monto,
        fecha: data.fecha,
        descripcion: data.descripcion,
      },
      realizadoPor,
    });

    return ingreso;
  }

  async updateIngresoFondo(
    ingresoId: string,
    data: { monto?: number; fecha?: string; descripcion?: string; observacion?: string },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede modificar ingresos.");

    const existing = await this.prisma.ingresoFondo.findUnique({ where: { id: ingresoId } });
    if (!existing) throw new NotFoundException("Ingreso no encontrado.");

    const updatedData: any = {};
    if (data.monto !== undefined) updatedData.monto = Number(data.monto);
    if (data.fecha) updatedData.fecha = new Date(data.fecha);
    if (data.descripcion !== undefined) updatedData.descripcion = data.descripcion?.trim() || null;
    if (data.observacion !== undefined) updatedData.observacion = data.observacion?.trim() || null;

    const updated = await this.prisma.ingresoFondo.update({
      where: { id: ingresoId },
      data: updatedData,
    });

    await this.historial.log(this.prisma, {
      entidad: EntidadAuditoria.campo_plantilla,
      entidadId: existing.campo_fondo_id,
      accion: "actualizacion",
      valorAnterior: existing,
      valorNuevo: updated,
      realizadoPor,
    });

    return updated;
  }

  async deleteIngresoFondo(ingresoId: string, realizadoPor: string, userRol: string) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede eliminar ingresos.");

    const existing = await this.prisma.ingresoFondo.findUnique({ where: { id: ingresoId } });
    if (!existing) throw new NotFoundException("Ingreso no encontrado.");

    await this.prisma.ingresoFondo.delete({ where: { id: ingresoId } });

    await this.historial.log(this.prisma, {
      entidad: EntidadAuditoria.campo_plantilla,
      entidadId: existing.campo_fondo_id,
      accion: "eliminacion",
      valorAnterior: existing,
      realizadoPor,
    });

    return { success: true, message: "Ingreso eliminado correctamente." };
  }

  async getMovimientosFondo(campoFondoId: string) {
    const campo = await this.prisma.campoPlantilla.findUnique({
      where: { id: campoFondoId },
    });
    if (!campo) throw new NotFoundException("Fondo no encontrado.");

    const [ingresos, gastos, planillaValores, periodos] = await Promise.all([
      this.prisma.ingresoFondo.findMany({
        where: { campo_fondo_id: campoFondoId },
        include: {
          periodo: { select: { id: true, nombre: true } },
        },
        orderBy: [{ fecha: "asc" }, { creado_en: "asc" }],
      }),
      this.prisma.gasto.findMany({
        where: { campo_fondo_id: campoFondoId },
        include: {
          periodo: { select: { id: true, nombre: true } },
          creado_por: { select: { id: true, nombre_completo: true } },
        },
        orderBy: [{ fecha: "asc" }, { creado_en: "asc" }],
      }),
      this.prisma.valor.groupBy({
        by: ["periodo_id"],
        where: { campo_id: campoFondoId },
        _sum: {
          valor_manual: true,
          valor_calculado: true,
        },
      }),
      this.prisma.periodo.findMany({
        orderBy: { fecha_inicio: "asc" },
      }),
    ]);

    const periodoMap = new Map(periodos.map((p) => [p.id, p]));

    // Format all items into unified ledger entries
    const items: Array<{
      id: string;
      tipo: 'ingreso' | 'egreso';
      fecha: string;
      monto: number;
      descripcion: string;
      observacion?: string | null;
      periodo_nombre?: string | null;
      creado_por_nombre?: string | null;
      creado_en: Date;
      es_manual: boolean;
    }> = [];

    // 1. Planilla monthly collections
    for (const pv of planillaValores) {
      const montoTotal = Number(pv._sum.valor_manual ?? 0) + Number(pv._sum.valor_calculado ?? 0);
      if (montoTotal > 0) {
        const per = periodoMap.get(pv.periodo_id);
        const fechaStr = per?.fecha_inicio
          ? per.fecha_inicio.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        items.push({
          id: `planilla-${pv.periodo_id}`,
          tipo: 'ingreso',
          fecha: fechaStr,
          monto: montoTotal,
          descripcion: `Recaudo mensual planilla (${per?.nombre || 'Período'})`,
          observacion: 'Recaudado automáticamente desde los informes de las congregaciones',
          periodo_nombre: per?.nombre || null,
          creado_por_nombre: 'Planilla Contable',
          creado_en: per?.fecha_inicio ? new Date(per.fecha_inicio) : new Date(),
          es_manual: false,
        });
      }
    }

    // 2. Manual Incomes
    for (const ing of ingresos) {
      items.push({
        id: ing.id,
        tipo: 'ingreso',
        fecha: ing.fecha ? ing.fecha.toISOString().split('T')[0] : ing.creado_en.toISOString().split('T')[0],
        monto: Number(ing.monto),
        descripcion: ing.descripcion || ing.observacion || 'Aporte / Ingreso al fondo',
        observacion: ing.observacion,
        periodo_nombre: ing.periodo?.nombre || null,
        creado_por_nombre: 'Tesorero',
        creado_en: ing.creado_en,
        es_manual: true,
      });
    }

    // 3. Expenses
    for (const gst of gastos) {
      items.push({
        id: gst.id,
        tipo: 'egreso',
        fecha: gst.fecha ? gst.fecha.toISOString().split('T')[0] : gst.creado_en.toISOString().split('T')[0],
        monto: Number(gst.monto),
        descripcion: gst.descripcion,
        observacion: null,
        periodo_nombre: gst.periodo?.nombre || null,
        creado_por_nombre: gst.creado_por?.nombre_completo || null,
        creado_en: gst.creado_en,
        es_manual: true,
      });
    }

    // Sort chronologically (oldest to newest):
    // Incomes before expenses on the same date
    items.sort((a, b) => {
      const dateCmp = a.fecha.localeCompare(b.fecha);
      if (dateCmp !== 0) return dateCmp;
      if (a.tipo !== b.tipo) return a.tipo === 'ingreso' ? -1 : 1;
      return new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime();
    });

    // Calculate running balance
    let runningBalance = 0;
    let totalIngresos = 0;
    let totalEgresos = 0;

    const movimientos = items.map((item) => {
      if (item.tipo === 'ingreso') {
        runningBalance += item.monto;
        totalIngresos += item.monto;
      } else {
        runningBalance -= item.monto;
        totalEgresos += item.monto;
      }
      return {
        ...item,
        saldo_resultante: runningBalance,
      };
    });

    return {
      campo_fondo: {
        id: campo.id,
        nombre: campo.nombre,
        slug: campo.slug,
        es_acumulable: campo.es_acumulable,
        es_transito: campo.es_transito,
        ente_superior_nombre: campo.ente_superior_nombre,
      },
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      saldo_actual: runningBalance,
      movimientos: movimientos.reverse(), // Return newest first for UI display
    };
  }

  async removeFondo(id: string, realizadoPor: string, userRol: string) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede eliminar fondos.");

    return this.prisma.$transaction(async (tx) => {
      const campo = await tx.campoPlantilla.findUnique({ where: { id } });
      if (!campo) throw new NotFoundException("Fondo no encontrado.");

      // Check if there are associated expenses
      const gastosCount = await tx.gasto.count({ where: { campo_fondo_id: id } });
      if (gastosCount > 0) {
        // Soft delete to preserve historical expense relations
        await tx.campoPlantilla.update({
          where: { id },
          data: { activo: false, es_fondo: false },
        });
      } else {
        await tx.campoPlantilla.delete({ where: { id } });
      }

      await this.historial.log(tx, {
        entidad: EntidadAuditoria.campo_plantilla,
        entidadId: id,
        accion: "eliminacion",
        valorAnterior: campo,
        realizadoPor,
      });

      return { success: true, message: "Fondo eliminado exitosamente." };
    });
  }

  async create(
    data: { descripcion: string; monto: number; fecha: string; periodo_id: string; campo_fondo_id: string },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede registrar gastos.");

    const periodo = await this.prisma.periodo.findUnique({ where: { id: data.periodo_id } });
    if (!periodo) throw new NotFoundException("Periodo no encontrado.");
    if (periodo.estado === "cerrado") throw new BadRequestException("No se pueden registrar gastos en un periodo cerrado.");

    const campo = await this.prisma.campoPlantilla.findUnique({ where: { id: data.campo_fondo_id } });
    if (!campo) throw new NotFoundException("Campo fondo no encontrado.");
    if (!campo.es_fondo) throw new BadRequestException("La columna seleccionada no está configurada como un fondo de tesorería.");

    if (data.monto <= 0) throw new BadRequestException("El monto del gasto debe ser mayor a cero.");

    return this.prisma.$transaction(async (tx) => {
      const gasto = await tx.gasto.create({
        data: {
          descripcion: data.descripcion,
          monto: data.monto,
          fecha: new Date(data.fecha),
          periodo_id: data.periodo_id,
          campo_fondo_id: data.campo_fondo_id,
          creado_por_id: realizadoPor,
        },
        include: {
          campo_fondo: { select: { id: true, nombre: true, slug: true } },
          periodo: { select: { id: true, nombre: true } },
          creado_por: { select: { id: true, nombre_completo: true } },
        },
      });

      await this.historial.log(tx, {
        entidad: "gasto",
        entidadId: gasto.id,
        accion: "creacion",
        valorNuevo: gasto,
        realizadoPor,
      });

      return gasto;
    });
  }

  async update(
    id: string,
    data: { descripcion?: string; monto?: number; fecha?: string; campo_fondo_id?: string },
    realizadoPor: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede editar gastos.");

    return this.prisma.$transaction(async (tx) => {
      const original = await tx.gasto.findUnique({ where: { id } });
      if (!original) throw new NotFoundException("Gasto no encontrado.");

      if (data.campo_fondo_id) {
        const campo = await tx.campoPlantilla.findUnique({ where: { id: data.campo_fondo_id } });
        if (!campo) throw new NotFoundException("Campo fondo no encontrado.");
        if (!campo.es_fondo) throw new BadRequestException("La columna seleccionada no está configurada como un fondo de tesorería.");
      }

      if (data.monto !== undefined && data.monto <= 0) throw new BadRequestException("El monto debe ser mayor a cero.");

      const gasto = await tx.gasto.update({
        where: { id },
        data: {
          descripcion: data.descripcion,
          monto: data.monto,
          fecha: data.fecha ? new Date(data.fecha) : undefined,
          campo_fondo_id: data.campo_fondo_id,
        },
        include: {
          campo_fondo: { select: { id: true, nombre: true, slug: true } },
          periodo: { select: { id: true, nombre: true } },
          creado_por: { select: { id: true, nombre_completo: true } },
        },
      });

      await this.historial.log(tx, {
        entidad: "gasto",
        entidadId: id,
        accion: "actualizacion",
        valorAnterior: original,
        valorNuevo: gasto,
        realizadoPor,
      });

      return gasto;
    });
  }

  async remove(id: string, realizadoPor: string, userRol: string) {
    if (userRol !== "tesorero") throw new ForbiddenException("Solo el tesorero puede eliminar gastos.");

    return this.prisma.$transaction(async (tx) => {
      const original = await tx.gasto.findUnique({ where: { id } });
      if (!original) throw new NotFoundException("Gasto no encontrado.");

      await tx.gasto.delete({ where: { id } });

      await this.historial.log(tx, {
        entidad: "gasto",
        entidadId: id,
        accion: "eliminacion",
        valorAnterior: original,
        realizadoPor,
      });

      return original;
    });
  }
}

