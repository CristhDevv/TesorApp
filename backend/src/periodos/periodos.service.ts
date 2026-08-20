import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoPeriodo } from '@prisma/client';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

@Injectable()
export class PeriodosService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  async findAll() {
    return this.prisma.periodo.findMany({
      orderBy: { fecha_inicio: 'desc' },
    });
  }

  async findOne(id: string) {
    const periodo = await this.prisma.periodo.findUnique({ where: { id } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    return periodo;
  }

  /**
   * Closes a period:
   * 1. Validates status.
   * 2. Persists the `valor_acumulado` for all active accumulable fields for all churches.
   * 3. Changes status to CLOSED.
   * 4. Automatically generates the next period.
   */
  async cerrarPeriodo(id: string, cerradoPor: string) {
    return this.prisma.$transaction(async (tx) => {
      const periodo = await tx.periodo.findUnique({ where: { id } });
      if (!periodo) throw new NotFoundException('Periodo no encontrado');
      if (periodo.estado === EstadoPeriodo.cerrado) {
        throw new BadRequestException('El periodo ya está cerrado');
      }

      // Find all churches
      const churches = await tx.iglesia.findMany({ where: { estado: 'activa' } });

      // Find all active fields that are accumulable
      const accumulableFields = await tx.campoPlantilla.findMany({
        where: { activo: true, es_acumulable: true },
      });

      // Find previous period to load base accumulated values
      const prevPeriod = await tx.periodo.findFirst({
        where: { fecha_fin: { lt: periodo.fecha_inicio } },
        orderBy: { fecha_fin: 'desc' },
      });

      // Pre-load all current and previous values in batch
      const [currentValsList, prevValsList] = await Promise.all([
        tx.valor.findMany({
          where: {
            periodo_id: id,
            campo_id: { in: accumulableFields.map((f) => f.id) },
          },
        }),
        prevPeriod
          ? tx.valor.findMany({
              where: {
                periodo_id: prevPeriod.id,
                campo_id: { in: accumulableFields.map((f) => f.id) },
              },
            })
          : Promise.resolve([]),
      ]);

      const currentValMap = new Map<string, any>(
        (currentValsList || []).map((v: any) => [`${v.iglesia_id}_${v.campo_id}`, v]),
      );
      const prevValMap = new Map<string, any>(
        (prevValsList || []).map((v: any) => [`${v.iglesia_id}_${v.campo_id}`, v]),
      );

      // Loop churches and fields to calculate and persist accumulables
      for (const church of churches) {
        for (const field of accumulableFields) {
          const key = `${church.id}_${field.id}`;
          const currentVal = currentValMap.get(key);
          const currentValNum = currentVal
            ? Number(currentVal.valor_manual ?? currentVal.valor_calculado ?? 0)
            : 0;

          let prevAccumNum = 0;
          if (prevPeriod) {
            const prevVal = prevValMap.get(key);
            prevAccumNum = prevVal ? Number(prevVal.valor_acumulado ?? 0) : 0;
          }

          const newAccum = prevAccumNum + currentValNum;

          // Upsert the accumulated value
          await tx.valor.upsert({
            where: {
              iglesia_id_campo_id_periodo_id: {
                iglesia_id: church.id,
                campo_id: field.id,
                periodo_id: id,
              },
            },
            update: { valor_acumulado: newAccum },
            create: {
              iglesia_id: church.id,
              campo_id: field.id,
              periodo_id: id,
              valor_acumulado: newAccum,
              actualizado_por: cerradoPor,
            },
          });
        }
      }

      // Close the period
      const closedPeriod = await tx.periodo.update({
        where: { id },
        data: {
          estado: EstadoPeriodo.cerrado,
          cerrado_por_id: cerradoPor,
          cerrado_en: new Date(),
        },
      });

      // Log closure history
      await this.historial.log(tx, {
        entidad: 'periodo',
        entidadId: id,
        accion: 'cierre_periodo',
        valorAnterior: periodo,
        valorNuevo: closedPeriod,
        realizadoPor: cerradoPor,
      });

      // Automatically generate next period safely
      const nextStartDate = new Date(periodo.fecha_inicio);
      nextStartDate.setDate(1); // Guard against month-end overflow
      nextStartDate.setMonth(nextStartDate.getMonth() + 1);
      
      const nextEndDate = new Date(nextStartDate.getFullYear(), nextStartDate.getMonth() + 1, 0); // Last day of month
      
      const nextNombre = `${MESES[nextStartDate.getMonth()]} ${nextStartDate.getFullYear()}`;

      // Check if next period already exists
      const existingNext = await tx.periodo.findFirst({
        where: {
          fecha_inicio: nextStartDate,
        },
      });

      if (!existingNext) {
        const nextPeriod = await tx.periodo.create({
          data: {
            nombre: nextNombre,
            fecha_inicio: nextStartDate,
            fecha_fin: nextEndDate,
            estado: EstadoPeriodo.abierto,
          },
        });

        await this.historial.log(tx, {
          entidad: 'periodo',
          entidadId: nextPeriod.id,
          accion: 'creacion',
          valorNuevo: nextPeriod,
          realizadoPor: cerradoPor,
        });
      }

      return closedPeriod;
    });
  }

  /**
   * Reopens a closed period.
   */
  async reabrirPeriodo(id: string, reabiertoPor: string) {
    return this.prisma.$transaction(async (tx) => {
      const periodo = await tx.periodo.findUnique({ where: { id } });
      if (!periodo) throw new NotFoundException('Periodo no encontrado');
      if (periodo.estado === EstadoPeriodo.abierto) {
        throw new BadRequestException('El periodo ya está abierto');
      }

      const reabierto = await tx.periodo.update({
        where: { id },
        data: {
          estado: EstadoPeriodo.abierto,
          reabierto_por_id: reabiertoPor,
          reabierto_en: new Date(),
        },
      });

      await this.historial.log(tx, {
        entidad: 'periodo',
        entidadId: id,
        accion: 'reapertura_periodo',
        valorAnterior: periodo,
        valorNuevo: reabierto,
        realizadoPor: reabiertoPor,
      });

      return reabierto;
    });
  }

  /**
   * Creates a period manually (only used for system setup or if custom ranges are needed).
   */
  async create(data: { nombre: string; fecha_inicio: string; fecha_fin: string }, realizadoPor: string) {
    const start = new Date(data.fecha_inicio);
    const end = new Date(data.fecha_fin);

    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin.');
    }

    return this.prisma.$transaction(async (tx) => {
      const newPeriod = await tx.periodo.create({
        data: {
          nombre: data.nombre,
          fecha_inicio: start,
          fecha_fin: end,
          estado: EstadoPeriodo.abierto,
        },
      });

      await this.historial.log(tx, {
        entidad: 'periodo',
        entidadId: newPeriod.id,
        accion: 'creacion',
        valorNuevo: newPeriod,
        realizadoPor,
      });

      return newPeriod;
    });
  }
}
