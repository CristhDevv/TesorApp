import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HistorialService } from "../historial/historial.service";

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

    // 2. Fetch all active designated fund fields (es_fondo: true)
    const camposFondo = await this.prisma.campoPlantilla.findMany({
      where: { es_fondo: true, activo: true },
      select: { 
        id: true, 
        nombre: true, 
        slug: true, 
        es_acumulable: true, 
        es_transito: true,
        ente_superior_nombre: true,
        seccion: true, 
        orden: true 
      },
      orderBy: [{ seccion: "asc" }, { orden: "asc" }],
    });

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

    // 5. Current period values
    const currentValores = await this.prisma.valor.groupBy({
      by: ["campo_id"],
      where: { periodo_id: periodoId },
      _sum: { valor_manual: true, valor_calculado: true, valor_acumulado: true },
    });
    const currentValMap = new Map(currentValores.map((v) => [v.campo_id, v]));

    // 6. All prior periods values sum (fallback if valor_acumulado not yet populated)
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
      const fondoPeriodo = Number(curVal?._sum.valor_manual ?? 0) + Number(curVal?._sum.valor_calculado ?? 0);
      const gastosPeriodo = periodGastosMap.get(f.id) || 0;
      const saldoPeriodo = fondoPeriodo - gastosPeriodo;

      // Accumulated calculation:
      // If field is marked es_acumulable, use valor_acumulado from current period or sum across all prior periods
      const recordedAccum = Number(curVal?._sum.valor_acumulado ?? 0);
      const calculatedAccum = priorSumMap.get(f.id) || fondoPeriodo;
      const fondoAcumulado = f.es_acumulable ? (recordedAccum > 0 ? recordedAccum : calculatedAccum) : fondoPeriodo;
      const gastosAcumulados = accumGastosMap.get(f.id) || 0;
      const saldoAcumulado = fondoAcumulado - gastosAcumulados;

      // Effective totals based on whether field is accumulative or period-based
      const totalFondo = f.es_acumulable ? fondoAcumulado : fondoPeriodo;
      const totalGastos = f.es_acumulable ? gastosAcumulados : gastosPeriodo;
      const saldoDisponible = f.es_acumulable ? saldoAcumulado : saldoPeriodo;

      return {
        campo_fondo_id: f.id,
        campo_fondo_nombre: f.nombre,
        campo_fondo_slug: f.slug,
        es_acumulable: f.es_acumulable,
        es_transito: f.es_transito,
        ente_superior_nombre: f.ente_superior_nombre,
        seccion: f.seccion,
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
