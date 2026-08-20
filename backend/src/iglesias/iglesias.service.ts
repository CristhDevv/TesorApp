import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoIglesia, Iglesia } from '@prisma/client';

export interface CreateIglesiaDto {
  nombre: string;
  identificador_interno?: string;
  nombre_pastor?: string;
  direccion?: string;
  codigo?: string;
  telefono?: string;
  correo?: string;
  tabla_id?: string;
}

export interface UpdateIglesiaDto {
  nombre?: string;
  identificador_interno?: string;
  nombre_pastor?: string;
  direccion?: string;
  codigo?: string;
  telefono?: string;
  correo?: string;
  tabla_id?: string;
}

@Injectable()
export class IglesiasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly historial: HistorialService,
  ) {}

  /**
   * Obtiene la lista de congregaciones/iglesias filtradas según el rol del usuario autenticado.
   */
  async findAll(userRol: string, userIglesiaId?: string): Promise<Iglesia[]> {
    try {
      if (userRol === 'iglesia') {
        if (!userIglesiaId) {
          return [];
        }
        return await this.prisma.iglesia.findMany({
          where: {
            id: userIglesiaId,
            estado: EstadoIglesia.activa,
          },
          orderBy: { nombre: 'asc' },
        });
      }

      return await this.prisma.iglesia.findMany({
        orderBy: { nombre: 'asc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al consultar las iglesias registradas.');
    }
  }

  /**
   * Obtiene los detalles de una iglesia por su ID con control de acceso por rol.
   */
  async findOne(id: string, userRol: string, userIglesiaId?: string): Promise<Iglesia> {
    if (userRol === 'iglesia' && userIglesiaId !== id) {
      throw new ForbiddenException('No tiene permisos para acceder a esta congregación.');
    }

    try {
      const iglesia = await this.prisma.iglesia.findUnique({
        where: { id },
      });

      if (!iglesia) {
        throw new NotFoundException(`Iglesia con ID "${id}" no encontrada.`);
      }

      return iglesia;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException('Error al consultar la información de la iglesia.');
    }
  }

  /**
   * Genera el siguiente identificador interno correlativo (ej. IG-001, IG-002...)
   */
  private async generateNextIdentificadorInterno(tx: any): Promise<string> {
    const iglesias = await tx.iglesia.findMany({
      select: { identificador_interno: true },
    });

    let maxNum = 0;
    for (const ig of iglesias) {
      if (ig.identificador_interno) {
        const numMatch = ig.identificador_interno.match(/\d+/);
        if (numMatch) {
          const val = parseInt(numMatch[0], 10);
          if (val > maxNum) maxNum = val;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `IG-${String(nextNum).padStart(3, '0')}`;
  }

  /**
   * Crea una nueva congregación con ID interno correlativo auto-generado.
   */
  async create(data: CreateIglesiaDto, realizadoPor: string): Promise<Iglesia> {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new BadRequestException('El nombre de la iglesia es obligatorio.');
    }

    return this.prisma.$transaction(async (tx) => {
      try {
        const autoIdentificador = await this.generateNextIdentificadorInterno(tx);

        const iglesia = await tx.iglesia.create({
          data: {
            nombre: data.nombre.trim(),
            identificador_interno: autoIdentificador,
            nombre_pastor: data.nombre_pastor?.trim() || null,
            direccion: data.direccion?.trim() || null,
            codigo: data.codigo?.trim() || null,
            telefono: data.telefono?.trim() || null,
            correo: data.correo?.trim() || null,
            tabla_id: data.tabla_id || null,
          },
        });

        await this.historial.log(tx, {
          entidad: 'iglesia',
          entidadId: iglesia.id,
          accion: 'creacion',
          valorNuevo: iglesia,
          realizadoPor,
        });

        return iglesia;
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        throw new InternalServerErrorException('Error durante la creación de la iglesia.');
      }
    });
  }

  /**
   * Actualiza los datos de una iglesia existente registrando el cambio en auditoría.
   * El identificador interno del sistema es inmutable y no se puede modificar.
   */
  async update(id: string, data: UpdateIglesiaDto, realizadoPor: string): Promise<Iglesia> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.iglesia.findUnique({ where: { id } });
      if (!original) {
        throw new NotFoundException(`Iglesia con ID "${id}" no encontrada.`);
      }

      const updatePayload: { [key: string]: any } = {};

      if (data.nombre !== undefined) {
        if (data.nombre.trim() === '') {
          throw new BadRequestException('El nombre de la iglesia no puede estar vacío.');
        }
        updatePayload.nombre = data.nombre.trim();
      }
      if (data.nombre_pastor !== undefined) {
        updatePayload.nombre_pastor = data.nombre_pastor?.trim() || null;
      }
      if (data.direccion !== undefined) {
        updatePayload.direccion = data.direccion?.trim() || null;
      }
      if (data.codigo !== undefined) {
        updatePayload.codigo = data.codigo?.trim() || null;
      }
      if (data.telefono !== undefined) {
        updatePayload.telefono = data.telefono?.trim() || null;
      }
      if (data.correo !== undefined) {
        updatePayload.correo = data.correo?.trim() || null;
      }
      if (data.tabla_id !== undefined) {
        updatePayload.tabla_id = data.tabla_id || null;
      }

      try {
        const iglesia = await tx.iglesia.update({
          where: { id },
          data: updatePayload,
        });

        await this.historial.log(tx, {
          entidad: 'iglesia',
          entidadId: iglesia.id,
          accion: 'actualizacion',
          valorAnterior: original,
          valorNuevo: iglesia,
          realizadoPor,
        });

        return iglesia;
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        throw new InternalServerErrorException('Error al actualizar los datos de la iglesia.');
      }
    });
  }

  /**
   * Cambia el estado (activa/inactiva) de una iglesia registrando la acción en auditoría.
   */
  async updateEstado(id: string, estado: EstadoIglesia, realizadoPor: string): Promise<Iglesia> {
    if (!estado || !Object.values(EstadoIglesia).includes(estado)) {
      throw new BadRequestException(`Estado "${estado}" no es válido.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const original = await tx.iglesia.findUnique({ where: { id } });
      if (!original) {
        throw new NotFoundException(`Iglesia con ID "${id}" no encontrada.`);
      }

      try {
        const iglesia = await tx.iglesia.update({
          where: { id },
          data: { estado },
        });

        await this.historial.log(tx, {
          entidad: 'iglesia',
          entidadId: iglesia.id,
          accion: 'actualizacion',
          valorAnterior: original,
          valorNuevo: iglesia,
          realizadoPor,
        });

        return iglesia;
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof NotFoundException) {
          throw error;
        }
        throw new InternalServerErrorException('Error al actualizar el estado de la iglesia.');
      }
    });
  }

  /**
   * Elimina una iglesia siempre y cuando no tenga registros contables o usuarios asociados.
   */
  async remove(id: string, realizadoPor: string): Promise<{ success: boolean; message: string }> {
    return this.prisma.$transaction(async (tx) => {
      const original = await tx.iglesia.findUnique({ where: { id } });
      if (!original) {
        throw new NotFoundException(`Iglesia con ID "${id}" no encontrada.`);
      }

      // 1. Verificar si tiene usuarios asignados
      const usuariosCount = await tx.usuario.count({
        where: { iglesia_id: id },
      });
      if (usuariosCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar la iglesia "${original.nombre}" porque tiene ${usuariosCount} usuario(s) asignado(s). Reasigne o elimine los usuarios primero.`,
        );
      }

      // 2. Verificar si tiene registros financieros o valores en planillas con montos reales
      const valoresConDatos = await tx.valor.count({
        where: {
          iglesia_id: id,
          OR: [
            { valor_manual: { not: null, gt: 0 } },
            { valor_calculado: { not: null, gt: 0 } },
            { valor_acumulado: { not: null, gt: 0 } },
          ],
        },
      });

      if (valoresConDatos > 0) {
        throw new BadRequestException(
          `No se puede eliminar la iglesia "${original.nombre}" porque ya cuenta con historial contable registrado en las planillas. Para darla de baja sin romper la base de datos, cambie su estado a "Inactiva".`,
        );
      }

      // 3. Limpiar relaciones huérfanas de configuración (permisos y asignación a campos/valores vacíos)
      await tx.permisoEdicion.deleteMany({ where: { iglesia_id: id } });
      await tx.camposPorIglesia.deleteMany({ where: { iglesia_id: id } });
      await tx.valor.deleteMany({ where: { iglesia_id: id } });

      // 4. Eliminar la congregación
      await tx.iglesia.delete({ where: { id } });

      // 5. Registrar en historial de auditoría
      await this.historial.log(tx, {
        entidad: 'iglesia',
        entidadId: id,
        accion: 'eliminacion',
        valorAnterior: original,
        realizadoPor,
      });

      return {
        success: true,
        message: `Iglesia "${original.nombre}" eliminada exitosamente.`,
      };
    });
  }
}
