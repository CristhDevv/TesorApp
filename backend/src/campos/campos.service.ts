import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormulasService } from '../formulas/formulas.service';
import { HistorialService } from '../historial/historial.service';
import { ValoresService } from '../valores/valores.service';
import { TipoCampo, ModoCalculo } from '@prisma/client';

@Injectable()
export class CamposService {
  constructor(
    private prisma: PrismaService,
    private formulasService: FormulasService,
    private historial: HistorialService,
    @Inject(forwardRef(() => ValoresService))
    private valoresService: ValoresService,
  ) {}

  generateSlug(nombre: string): string {
    let slug = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/%/g, '_porciento')      // Replace % with _porciento
      .replace(/[^a-z0-9]/g, '_')       // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')             // Merge multiple underscores
      .replace(/^_+|_+$/g, '');        // Trim underscores

    // expr-eval requires variable identifiers to start with a letter (a-z) or underscore
    if (!slug || /^[0-9]/.test(slug)) {
      slug = 'c_' + (slug || 'campo');
    }

    return slug;
  }

  async findAll() {
    return this.prisma.campoPlantilla.findMany({
      include: {
        periodo: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: [{ seccion: 'asc' }, { orden: 'asc' }],
    });
  }

  async findOne(id: string) {
    const campo = await this.prisma.campoPlantilla.findUnique({
      where: { id },
      include: {
        periodo: {
          select: { id: true, nombre: true },
        },
      },
    });
    if (!campo) throw new NotFoundException('Campo no encontrado');
    return campo;
  }

  async create(
    data: {
      nombre: string;
      tipo: TipoCampo;
      modo_calculo: ModoCalculo;
      formula?: string;
      tipo_redondeo?: any;
      multiplo_redondeo?: number;
      es_acumulable?: boolean;
      es_fondo?: boolean;
      es_transito?: boolean;
      ente_superior_nombre?: string | null;
      seccion: string;
      seccion_iglesia?: string;
      seccion_tesorero?: string;
      orden: number;
      aplica_a_todas_las_iglesias?: boolean;
      visible_para_iglesia?: boolean;
      visible_para_tesorero?: boolean;
      es_temporal?: boolean;
      periodo_id?: string | null;
      iglesias_especificas?: string[]; // IDs of churches if applies to specific
    },
    realizadoPor: string,
  ) {
    const slug = this.generateSlug(data.nombre);
    
    // Check slug uniqueness
    const existing = await this.prisma.campoPlantilla.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Ya existe un campo con un nombre similar (slug: "${slug}").`);
    }

    if (data.modo_calculo === 'calculado') {
      if (!data.formula) {
        throw new BadRequestException('Se requiere una fórmula para campos calculados.');
      }
      
      // Fetch all fields to check for cycle and sanitize
      const allFields = await this.prisma.campoPlantilla.findMany();
      data.formula = this.formulasService.sanitizeFormula(data.formula, allFields);

      this.formulasService.checkCircularDependencies(
        'new-field-id', // Temporary id
        slug,
        data.formula,
        allFields,
      );
    }

    const res = await this.prisma.$transaction(async (tx) => {
      const campo = await tx.campoPlantilla.create({
        data: {
          nombre: data.nombre,
          slug,
          tipo: data.tipo,
          modo_calculo: data.modo_calculo,
          formula: data.modo_calculo === 'calculado' ? data.formula : null,
          tipo_redondeo: data.tipo_redondeo || 'ninguno',
          multiplo_redondeo: data.multiplo_redondeo !== undefined ? Number(data.multiplo_redondeo) : 1,
          es_acumulable: data.es_acumulable ?? false,
          es_fondo: data.es_temporal ? false : (data.es_fondo ?? false),
          es_transito: data.es_temporal ? false : (data.es_transito ?? false),
          ente_superior_nombre: !data.es_temporal && data.es_transito ? data.ente_superior_nombre : null,
          seccion: data.seccion,
          seccion_iglesia: data.seccion_iglesia || data.seccion,
          seccion_tesorero: data.seccion_tesorero || data.seccion,
          orden: data.orden,
          aplica_a_todas_las_iglesias: data.aplica_a_todas_las_iglesias ?? true,
          visible_para_iglesia: data.visible_para_iglesia ?? true,
          visible_para_tesorero: data.visible_para_tesorero ?? true,
          es_temporal: data.es_temporal ?? false,
          periodo_id: data.es_temporal && data.periodo_id && data.periodo_id.trim() !== '' ? data.periodo_id : null,
        },
        include: {
          periodo: {
            select: { id: true, nombre: true },
          },
        },
      });

      // Manage specific churches association if not global
      if (!data.aplica_a_todas_las_iglesias && data.iglesias_especificas) {
        for (const iglesiaId of data.iglesias_especificas.filter(Boolean)) {
          await tx.camposPorIglesia.create({
            data: {
              campo_id: campo.id,
              iglesia_id: iglesiaId,
            },
          });
        }
      }

      // Auto-attach new field to all existing tables
      const allTablas = await tx.tabla.findMany({ select: { id: true } });
      for (const t of allTablas) {
        const lastOrder = await tx.camposPorTabla.aggregate({
          where: { tabla_id: t.id },
          _max: { orden: true },
        });
        await tx.camposPorTabla.create({
          data: {
            tabla_id: t.id,
            campo_id: campo.id,
            orden: (lastOrder._max.orden ?? 0) + 1,
          },
        });
      }

      await this.historial.log(tx, {
        entidad: 'campo_plantilla',
        entidadId: campo.id,
        accion: 'creacion',
        valorNuevo: campo,
        realizadoPor,
      });

      return campo;
    });

    try {
      await this.valoresService.recalculateAllOpenPeriods(realizadoPor);
    } catch (err) {
      console.error('Error recalculando periodos abiertos tras crear columna:', err);
    }
    return res;
  }

  async update(
    id: string,
    data: {
      nombre?: string;
      tipo?: TipoCampo;
      modo_calculo?: ModoCalculo;
      formula?: string;
      tipo_redondeo?: any;
      multiplo_redondeo?: number;
      es_acumulable?: boolean;
      es_fondo?: boolean;
      es_transito?: boolean;
      ente_superior_nombre?: string | null;
      seccion?: string;
      seccion_iglesia?: string;
      seccion_tesorero?: string;
      orden?: number;
      aplica_a_todas_las_iglesias?: boolean;
      visible_para_iglesia?: boolean;
      visible_para_tesorero?: boolean;
      es_temporal?: boolean;
      periodo_id?: string | null;
      iglesias_especificas?: string[];
    },
    realizadoPor: string,
  ) {
    const res = await this.prisma.$transaction(async (tx) => {
      const original = await tx.campoPlantilla.findUnique({
        where: { id },
        include: { campos_por_iglesia: true },
      });
      if (!original) throw new NotFoundException('Campo no encontrado');

      const slug = data.nombre ? this.generateSlug(data.nombre) : original.slug;

      if (data.nombre && slug !== original.slug) {
        const existing = await tx.campoPlantilla.findUnique({ where: { slug } });
        if (existing) {
          throw new BadRequestException(`Ya existe un campo con un nombre similar (slug: "${slug}").`);
        }
      }

      const finalModoCalculo = data.modo_calculo ?? original.modo_calculo;
      let finalFormula = finalModoCalculo === 'calculado' ? (data.formula ?? original.formula) : null;

      if (finalModoCalculo === 'calculado') {
        if (!finalFormula) {
          throw new BadRequestException('Se requiere una fórmula para campos calculados.');
        }

        const allFields = await tx.campoPlantilla.findMany({
          where: { id: { not: id } }, // Exclude current field
        });
        
        finalFormula = this.formulasService.sanitizeFormula(finalFormula, allFields);

        this.formulasService.checkCircularDependencies(
          id,
          slug,
          finalFormula,
          allFields,
        );
      }

      const isTemporal = data.es_temporal !== undefined ? data.es_temporal : original.es_temporal;
      const finalPeriodoId = isTemporal 
        ? (data.periodo_id !== undefined ? (data.periodo_id && data.periodo_id.trim() !== '' ? data.periodo_id : null) : original.periodo_id)
        : null;

      const isTransito = data.es_transito !== undefined ? data.es_transito : original.es_transito;

      const campo = await tx.campoPlantilla.update({
        where: { id },
        data: {
          nombre: data.nombre,
          slug,
          tipo: data.tipo,
          modo_calculo: finalModoCalculo,
          formula: finalFormula,
          tipo_redondeo: data.tipo_redondeo !== undefined ? data.tipo_redondeo : original.tipo_redondeo,
          multiplo_redondeo: data.multiplo_redondeo !== undefined ? Number(data.multiplo_redondeo) : original.multiplo_redondeo,
          es_acumulable: data.es_acumulable,
          es_fondo: isTemporal ? false : data.es_fondo,
          es_transito: isTemporal ? false : isTransito,
          ente_superior_nombre: !isTemporal && isTransito ? (data.ente_superior_nombre !== undefined ? data.ente_superior_nombre : original.ente_superior_nombre) : null,
          seccion: data.seccion,
          seccion_iglesia: data.seccion_iglesia,
          seccion_tesorero: data.seccion_tesorero,
          orden: data.orden,
          aplica_a_todas_las_iglesias: data.aplica_a_todas_las_iglesias,
          visible_para_iglesia: data.visible_para_iglesia,
          visible_para_tesorero: data.visible_para_tesorero,
          es_temporal: isTemporal,
          periodo_id: finalPeriodoId,
        },
        include: {
          periodo: {
            select: { id: true, nombre: true },
          },
        },
      });

      // Update specific church associations if toggled
      if (data.aplica_a_todas_las_iglesias === true) {
        await tx.camposPorIglesia.deleteMany({ where: { campo_id: id } });
      } else if (data.aplica_a_todas_las_iglesias === false && data.iglesias_especificas) {
        await tx.camposPorIglesia.deleteMany({ where: { campo_id: id } });
        for (const iglesiaId of data.iglesias_especificas) {
          await tx.camposPorIglesia.create({
            data: {
              campo_id: id,
              iglesia_id: iglesiaId,
            },
          });
        }
      }

      await this.historial.log(tx, {
        entidad: 'campo_plantilla',
        entidadId: campo.id,
        accion: 'actualizacion',
        valorAnterior: original,
        valorNuevo: campo,
        realizadoPor,
      });

      return campo;
    });

    await this.valoresService.recalculateAllOpenPeriods(realizadoPor);
    return res;
  }

  async remove(id: string, realizadoPor: string) {
    const allFields = await this.prisma.campoPlantilla.findMany();
    const campoToDelete = allFields.find((f) => f.id === id);
    if (!campoToDelete) throw new NotFoundException('Campo no encontrado');

    // Check if other fields reference this one in their formula
    for (const f of allFields) {
      if (f.modo_calculo === 'calculado' && f.formula && f.id !== id) {
        const vars = this.formulasService.extractVariables(f.formula);
        if (vars.includes(campoToDelete.slug) || vars.includes(campoToDelete.id)) {
          throw new BadRequestException(
            `No se puede eliminar el campo "${campoToDelete.nombre}" porque el campo calculado "${f.nombre}" depende de él en su fórmula.`,
          );
        }
      }
    }

    const res = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.campoPlantilla.delete({ where: { id } });

      await this.historial.log(tx, {
        entidad: 'campo_plantilla',
        entidadId: id,
        accion: 'eliminacion',
        valorAnterior: deleted,
        realizadoPor,
      });

      return deleted;
    });

    await this.valoresService.recalculateAllOpenPeriods(realizadoPor);
    return res;
  }

  async reorderBatch(
    items: {
      id: string;
      orden: number;
      nombre?: string;
      seccion_iglesia?: string;
      visible_para_iglesia?: boolean;
    }[],
    realizadoPor: string,
  ) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Se requiere una lista de campos para reordenar.');
    }

    const res = await this.prisma.$transaction(async (tx) => {
      const updatedCampos = [];

      for (const item of items) {
        const original = await tx.campoPlantilla.findUnique({ where: { id: item.id } });
        if (!original) continue;

        const dataToUpdate: any = {
          orden: item.orden,
        };

        if (item.nombre && item.nombre.trim() !== '') {
          dataToUpdate.nombre = item.nombre.trim();
        }

        if (item.seccion_iglesia !== undefined) {
          dataToUpdate.seccion_iglesia = item.seccion_iglesia;
        }

        if (item.visible_para_iglesia !== undefined) {
          dataToUpdate.visible_para_iglesia = item.visible_para_iglesia;
        }

        const updated = await tx.campoPlantilla.update({
          where: { id: item.id },
          data: dataToUpdate,
        });

        updatedCampos.push(updated);
      }

      await this.historial.log(tx, {
        entidad: 'campo_plantilla',
        entidadId: items[0]?.id || 'batch-reorder',
        accion: 'actualizacion',
        valorNuevo: { reordered_count: items.length, items },
        realizadoPor,
      });

      return updatedCampos;
    });

    return res;
  }
}
