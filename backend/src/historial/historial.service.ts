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
   * Retrieves the audit log for a given entity type and ID with optional pagination and search.
   */
  async getHistorial(
    entidad?: EntidadAuditoria,
    entidadId?: string,
    page?: number,
    limit?: number,
    search?: string,
  ) {
    const where: any = {
      ...(entidad && { entidad }),
      ...(entidadId && { entidad_id: entidadId }),
    };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { usuario: { nombre_completo: { contains: term, mode: 'insensitive' } } },
        { usuario: { correo: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        this.prisma.historialCambios.findMany({
          where,
          include: {
            usuario: {
              select: {
                nombre_completo: true,
                correo: true,
                rol: true,
              },
            },
            valor: {
              include: {
                iglesia: { select: { id: true, nombre: true, codigo: true } },
                campo: { select: { id: true, nombre: true, slug: true } },
                periodo: { select: { id: true, nombre: true } },
              },
            },
          },
          orderBy: {
            realizado_en: 'desc',
          },
          skip,
          take: limit,
        }),
        this.prisma.historialCambios.count({ where }),
      ]);

      return {
        data: items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    return this.prisma.historialCambios.findMany({
      where,
      include: {
        usuario: {
          select: {
            nombre_completo: true,
            correo: true,
            rol: true,
          },
        },
        valor: {
          include: {
            iglesia: { select: { id: true, nombre: true, codigo: true } },
            campo: { select: { id: true, nombre: true, slug: true } },
            periodo: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: {
        realizado_en: 'desc',
      },
    });
  }
}
