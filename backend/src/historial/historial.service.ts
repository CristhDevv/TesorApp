import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntidadAuditoria, AccionAuditoria } from '@prisma/client';

@Injectable()
export class HistorialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Logs a change inside a Prisma client context (supports transactions).
   */
  async log(
    prismaTx: any,
    params: {
      valorId?: string;
      entidad: EntidadAuditoria;
      entidadId: string;
      accion: AccionAuditoria;
      valorAnterior?: any;
      valorNuevo?: any;
      realizadoPor: string;
    },
  ) {
    const db = prismaTx || this.prisma;
    return db.historialCambios.create({
      data: {
        valor_id: params.valorId || null,
        entidad: params.entidad,
        entidad_id: params.entidadId,
        accion: params.accion,
        valor_anterior: params.valorAnterior || null,
        valor_nuevo: params.valorNuevo || null,
        realizado_por: params.realizadoPor,
      },
    });
  }

  /**
   * Retrieves the audit log for a given entity type and ID.
   */
  async getHistorial(entidad?: EntidadAuditoria, entidadId?: string) {
    return this.prisma.historialCambios.findMany({
      where: {
        ...(entidad && { entidad }),
        ...(entidadId && { entidad_id: entidadId }),
      },
      include: {
        usuario: {
          select: {
            nombre_completo: true,
            correo: true,
          },
        },
      },
      orderBy: {
        realizado_en: 'desc',
      },
    });
  }
}
