import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';

@Injectable()
export class PermisosService {
  constructor(
    private prisma: PrismaService,
    private historial: HistorialService,
  ) {}

  /**
   * Gets the edit permissions for a specific church.
   * Returns all active fields with their permission state.
   */
  async findByIglesia(iglesiaId: string) {
    const iglesia = await this.prisma.iglesia.findUnique({ where: { id: iglesiaId } });
    if (!iglesia) throw new NotFoundException('Iglesia no encontrada');

    // Get all active fields that apply to this church
    const fields = await this.prisma.campoPlantilla.findMany({
      where: {
        activo: true,
        OR: [
          { aplica_a_todas_las_iglesias: true },
          { campos_por_iglesia: { some: { iglesia_id: iglesiaId } } },
        ],
      },
      orderBy: [{ seccion: 'asc' }, { orden: 'asc' }],
    });

    // Get existing permission records
    const permissions = await this.prisma.permisoEdicion.findMany({
      where: { iglesia_id: iglesiaId },
    });

    const permissionsMap = new Map(permissions.map((p) => [p.campo_id, p.editable_por_iglesia]));

    return fields.map((field) => ({
      campo_id: field.id,
      nombre: field.nombre,
      slug: field.slug,
      seccion: field.seccion,
      tipo: field.tipo,
      modo_calculo: field.modo_calculo,
      formula: field.formula,
      orden: field.orden,
      // Default to true for manual visible fields so church can immediately edit without requiring manual authorization
      editable_por_iglesia: permissionsMap.has(field.id)
        ? permissionsMap.get(field.id)
        : (field.modo_calculo === 'manual' && field.visible_para_iglesia !== false),
    }));
  }

  /**
   * Sets the edit permissions for a specific church.
   */
  async updatePermisos(
    iglesiaId: string,
    payload: any,
    realizadoPor: string,
  ) {
    const iglesia = await this.prisma.iglesia.findUnique({ where: { id: iglesiaId } });
    if (!iglesia) throw new NotFoundException('Iglesia no encontrada');

    const permisosList: { campo_id: string; editable_por_iglesia: boolean }[] = 
      Array.isArray(payload) ? payload : (Array.isArray(payload?.permisos) ? payload.permisos : []);

    const existingFields = await this.prisma.campoPlantilla.findMany({
      where: { id: { in: permisosList.map(p => p.campo_id).filter(Boolean) } },
      select: { id: true }
    });
    const validFieldIds = new Set(existingFields.map(f => f.id));

    return this.prisma.$transaction(async (tx) => {
      const updatedPermisos = [];

      for (const p of permisosList) {
        if (!p.campo_id || !validFieldIds.has(p.campo_id)) continue;
        const original = await tx.permisoEdicion.findUnique({
          where: {
            iglesia_id_campo_id: {
              iglesia_id: iglesiaId,
              campo_id: p.campo_id,
            },
          },
        });

        const updated = await tx.permisoEdicion.upsert({
          where: {
            iglesia_id_campo_id: {
              iglesia_id: iglesiaId,
              campo_id: p.campo_id,
            },
          },
          update: { editable_por_iglesia: Boolean(p.editable_por_iglesia) },
          create: {
            iglesia_id: iglesiaId,
            campo_id: p.campo_id,
            editable_por_iglesia: Boolean(p.editable_por_iglesia),
          },
        });

        await this.historial.log(tx, {
          entidad: 'permiso_edicion',
          entidadId: updated.id,
          accion: original ? 'actualizacion' : 'creacion',
          valorAnterior: original,
          valorNuevo: updated,
          realizadoPor,
        });

        updatedPermisos.push(updated);
      }

      return updatedPermisos;
    });
  }
}
