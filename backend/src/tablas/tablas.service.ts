import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';

@Injectable()
export class TablasService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  async findAll() {
    return this.prisma.tabla.findMany({
      include: {
        iglesias: {
          select: { id: true, nombre: true, identificador_interno: true, orden: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        campos: {
          orderBy: { orden: 'asc' },
          include: {
            campo: {
              select: { id: true, nombre: true, slug: true, tipo: true, modo_calculo: true, formula: true }
            }
          }
        }
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string, prismaTx?: any) {
    const db = prismaTx || this.prisma;
    const tabla = await db.tabla.findUnique({
      where: { id },
      include: {
        iglesias: {
          select: { id: true, nombre: true, identificador_interno: true, orden: true },
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        campos: {
          orderBy: { orden: 'asc' },
          include: {
            campo: {
              select: { id: true, nombre: true, slug: true, tipo: true, modo_calculo: true, formula: true, es_acumulable: true, seccion: true, orden: true }
            }
          }
        }
      }
    });

    if (!tabla) throw new NotFoundException('Tabla no encontrada');
    return tabla;
  }

  async create(data: { nombre: string; iglesia_ids: string[]; campo_ids: string[] }, realizadoPor: string) {
    // Check name uniqueness
    const existing = await this.prisma.tabla.findUnique({ where: { nombre: data.nombre } });
    if (existing) {
      throw new BadRequestException(`Ya existe una tabla con el nombre "${data.nombre}".`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create table
      const tabla = await tx.tabla.create({
        data: { nombre: data.nombre },
      });

      // 2. Associate churches
      if (data.iglesia_ids && data.iglesia_ids.length > 0) {
        await tx.iglesia.updateMany({
          where: { id: { in: data.iglesia_ids } },
          data: { tabla_id: tabla.id },
        });
      }

      // 3. Associate fields with ordering
      if (data.campo_ids && data.campo_ids.length > 0) {
        const joinRecords = data.campo_ids.map((campoId, index) => ({
          tabla_id: tabla.id,
          campo_id: campoId,
          orden: index,
        }));

        await tx.camposPorTabla.createMany({
          data: joinRecords,
        });
      }

      await this.historial.log(tx, {
        entidad: 'tabla',
        entidadId: tabla.id,
        accion: 'creacion',
        valorNuevo: { nombre: data.nombre, iglesia_ids: data.iglesia_ids, campo_ids: data.campo_ids },
        realizadoPor,
      });

      return this.findOne(tabla.id, tx);
    });
  }

  async update(id: string, data: { nombre?: string; iglesia_ids?: string[]; campo_ids?: string[] }, realizadoPor: string) {
    const original = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Update name if provided
      if (data.nombre && data.nombre !== original.nombre) {
        const existing = await tx.tabla.findFirst({ where: { nombre: data.nombre, NOT: { id } } });
        if (existing) {
          throw new BadRequestException(`Ya existe otra tabla con el nombre "${data.nombre}".`);
        }
        await tx.tabla.update({
          where: { id },
          data: { nombre: data.nombre },
        });
      }

      // 2. Update church associations
      if (data.iglesia_ids !== undefined) {
        // Clear old ones
        await tx.iglesia.updateMany({
          where: { tabla_id: id },
          data: { tabla_id: null },
        });
        // Set new ones
        if (data.iglesia_ids.length > 0) {
          await tx.iglesia.updateMany({
            where: { id: { in: data.iglesia_ids } },
            data: { tabla_id: id },
          });
        }
      }

      // 3. Update field columns
      if (data.campo_ids !== undefined) {
        // Delete old
        await tx.camposPorTabla.deleteMany({
          where: { tabla_id: id },
        });
        // Create new
        if (data.campo_ids.length > 0) {
          const joinRecords = data.campo_ids.map((campoId, index) => ({
            tabla_id: id,
            campo_id: campoId,
            orden: index,
          }));
          await tx.camposPorTabla.createMany({
            data: joinRecords,
          });
        }
      }

      await this.historial.log(tx, {
        entidad: 'tabla',
        entidadId: id,
        accion: 'actualizacion',
        valorAnterior: { nombre: original.nombre, iglesia_ids: original.iglesias.map(i => i.id), campo_ids: original.campos.map(c => c.campo_id) },
        valorNuevo: { nombre: data.nombre ?? original.nombre, iglesia_ids: data.iglesia_ids ?? original.iglesias.map(i => i.id), campo_ids: data.campo_ids ?? original.campos.map(c => c.campo_id) },
        realizadoPor,
      });

      return this.findOne(id, tx);
    });
  }

  async remove(id: string, realizadoPor: string) {
    const original = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Disassociate churches
      await tx.iglesia.updateMany({
        where: { tabla_id: id },
        data: { tabla_id: null },
      });

      // Delete join table fields
      await tx.camposPorTabla.deleteMany({
        where: { tabla_id: id },
      });

      // Delete table
      await tx.tabla.delete({ where: { id } });

      await this.historial.log(tx, {
        entidad: 'tabla',
        entidadId: id,
        accion: 'eliminacion',
        valorAnterior: original,
        realizadoPor,
      });

      return { message: 'Tabla eliminada exitosamente' };
    });
  }
}
