import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HistorialService } from "../historial/historial.service";
import { EstadoInforme } from "@prisma/client";

@Injectable()
export class InformesService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  async getInforme(iglesiaId: string, periodoId: string) {
    if (!iglesiaId || !periodoId) {
      throw new BadRequestException("Se requieren iglesiaId y periodoId.");
    }

    const informe = await this.prisma.informePeriodo.findUnique({
      where: {
        iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId },
      },
      include: {
        enviado_por: { select: { id: true, nombre_completo: true, correo: true } },
        revisado_por: { select: { id: true, nombre_completo: true } },
        aprobado_por: { select: { id: true, nombre_completo: true } },
      },
    });

    if (!informe) {
      return {
        id: null,
        iglesia_id: iglesiaId,
        periodo_id: periodoId,
        estado: EstadoInforme.borrador,
        enviado_por: null,
        enviado_en: null,
        revisado_por: null,
        revisado_en: null,
        aprobado_por: null,
        aprobado_en: null,
        observaciones: null,
      };
    }

    return informe;
  }

  async getInformesByPeriodo(periodoId: string) {
    if (!periodoId) throw new BadRequestException("Se requiere periodoId.");

    return this.prisma.informePeriodo.findMany({
      where: { periodo_id: periodoId },
      include: {
        enviado_por: { select: { id: true, nombre_completo: true } },
        revisado_por: { select: { id: true, nombre_completo: true } },
        aprobado_por: { select: { id: true, nombre_completo: true } },
      },
    });
  }

  async enviarInforme(
    iglesiaId: string,
    periodoId: string,
    userId: string,
    userRol: string,
    userIglesiaId?: string,
  ) {
    if (userRol === "iglesia" && userIglesiaId !== iglesiaId) {
      throw new ForbiddenException("No tienes permiso para enviar el informe de otra iglesia.");
    }

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException("Período no encontrado.");
    if (periodo.estado === "cerrado") {
      throw new BadRequestException("No se puede enviar un informe en un período cerrado.");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.informePeriodo.findUnique({
        where: { iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId } },
      });

      if (existing && existing.estado === EstadoInforme.aprobado) {
        throw new BadRequestException("Este informe ya ha sido aprobado por el tesorero.");
      }

      const informe = await tx.informePeriodo.upsert({
        where: { iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId } },
        update: {
          estado: EstadoInforme.enviado,
          enviado_por_id: userId,
          enviado_en: new Date(),
        },
        create: {
          iglesia_id: iglesiaId,
          periodo_id: periodoId,
          estado: EstadoInforme.enviado,
          enviado_por_id: userId,
          enviado_en: new Date(),
        },
        include: {
          enviado_por: { select: { id: true, nombre_completo: true } },
        },
      });

      await this.historial.log(tx, {
        entidad: "informe_periodo",
        entidadId: informe.id,
        accion: existing ? "actualizacion" : "creacion",
        valorAnterior: existing,
        valorNuevo: informe,
        realizadoPor: userId,
      });

      return informe;
    });
  }

  async cambiarEstado(
    iglesiaId: string,
    periodoId: string,
    data: { estado: EstadoInforme; observaciones?: string },
    userId: string,
    userRol: string,
  ) {
    if (userRol !== "tesorero") {
      throw new ForbiddenException("Solo el tesorero puede cambiar el estado de revisión o aprobación de un informe.");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.informePeriodo.findUnique({
        where: { iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId } },
      });

      const updateData: any = {
        estado: data.estado,
        observaciones: data.observaciones !== undefined ? data.observaciones : existing?.observaciones,
      };

      if (data.estado === EstadoInforme.en_revision) {
        updateData.revisado_por_id = userId;
        updateData.revisado_en = new Date();
      } else if (data.estado === EstadoInforme.aprobado) {
        updateData.aprobado_por_id = userId;
        updateData.aprobado_en = new Date();
      } else if (data.estado === EstadoInforme.borrador) {
        // Returned to draft for corrections
        updateData.aprobado_por_id = null;
        updateData.aprobado_en = null;
      }

      const informe = await tx.informePeriodo.upsert({
        where: { iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId } },
        update: updateData,
        create: {
          iglesia_id: iglesiaId,
          periodo_id: periodoId,
          ...updateData,
        },
        include: {
          enviado_por: { select: { id: true, nombre_completo: true } },
          revisado_por: { select: { id: true, nombre_completo: true } },
          aprobado_por: { select: { id: true, nombre_completo: true } },
        },
      });

      await this.historial.log(tx, {
        entidad: "informe_periodo",
        entidadId: informe.id,
        accion: "actualizacion",
        valorAnterior: existing,
        valorNuevo: informe,
        realizadoPor: userId,
      });

      return informe;
    });
  }

  async consolidarTodos(periodoId: string, userId: string, userRol: string) {
    if (userRol !== "tesorero") {
      throw new ForbiddenException("Solo el tesorero puede consolidar informes.");
    }

    const updated = await this.prisma.informePeriodo.updateMany({
      where: {
        periodo_id: periodoId,
        estado: { in: [EstadoInforme.aprobado, EstadoInforme.enviado] },
      },
      data: {
        estado: EstadoInforme.consolidado,
        aprobado_por_id: userId,
        aprobado_en: new Date(),
      },
    });

    return { consolidados: updated.count };
  }
}
