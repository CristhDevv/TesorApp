import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormulasService } from '../formulas/formulas.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoPeriodo, ModoCalculo } from '@prisma/client';

@Injectable()
export class ValoresService {
  constructor(
    private prisma: PrismaService,
    private formulasService: FormulasService,
    private historial: HistorialService,
  ) {}

  /**
   * Gets all values for a church in a specific period, merging them with their template definition.
   */
  async findValues(iglesiaId: string, periodoId: string, userRol: string, userIglesiaId?: string) {
    // Access control
    if (userRol === 'iglesia' && userIglesiaId !== iglesiaId) {
      throw new ForbiddenException('Acceso denegado a esta iglesia.');
    }

    const iglesia = await this.prisma.iglesia.findUnique({ where: { id: iglesiaId } });
    if (!iglesia) throw new NotFoundException('Iglesia no encontrada');

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    // Get all active fields that apply to this church and this period
    const fields = await this.prisma.campoPlantilla.findMany({
      where: {
        activo: true,
        AND: [
          {
            OR: [
              { aplica_a_todas_las_iglesias: true },
              { campos_por_iglesia: { some: { iglesia_id: iglesiaId } } },
            ],
          },
          {
            OR: [
              { es_temporal: false },
              { es_temporal: true, periodo_id: periodoId },
            ],
          },
        ],
      },
      orderBy: [{ seccion: 'asc' }, { orden: 'asc' }],
    });

    const displayFields = fields.filter((f) => {
      if (userRol === 'iglesia') return f.visible_para_iglesia !== false;
      return true;
    });

    // Get existing value records for this church and period
    const values = await this.prisma.valor.findMany({
      where: { iglesia_id: iglesiaId, periodo_id: periodoId },
    });

    const valuesMap = new Map(values.map((v) => [v.campo_id, v]));

    // Get edit permissions for this church
    const permissions = await this.prisma.permisoEdicion.findMany({
      where: { iglesia_id: iglesiaId },
    });
    const permissionsMap = new Map(permissions.map((p) => [p.campo_id, p.editable_por_iglesia]));

    const result = displayFields.map((f) => {
      const valRec = valuesMap.get(f.id);
      const hasPerm = permissionsMap.has(f.id)
        ? permissionsMap.get(f.id)
        : (f.modo_calculo === ModoCalculo.manual && f.visible_para_iglesia !== false);
      
      const isPeriodOpen = periodo.estado === EstadoPeriodo.abierto;
      const isEditable =
        f.modo_calculo === ModoCalculo.manual &&
        isPeriodOpen &&
        (userRol === 'tesorero' || hasPerm);

      return {
        campo_id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        tipo: f.tipo,
        modo_calculo: f.modo_calculo,
        formula: f.formula,
        es_acumulable: f.es_acumulable,
        es_temporal: f.es_temporal,
        periodo_id: f.periodo_id,
        seccion: userRol === 'iglesia' ? (f.seccion_iglesia || f.seccion) : (f.seccion_tesorero || f.seccion),
        seccion_iglesia: f.seccion_iglesia || f.seccion,
        seccion_tesorero: f.seccion_tesorero || f.seccion,
        orden: f.orden,
        visible_para_iglesia: f.visible_para_iglesia,
        visible_para_tesorero: f.visible_para_tesorero,
        tipo_redondeo: (f as any).tipo_redondeo || 'ninguno',
        multiplo_redondeo: (f as any).multiplo_redondeo ? Number((f as any).multiplo_redondeo) : 1,
        valor_manual: valRec ? Number(valRec.valor_manual ?? 0) : 0,
        valor_calculado: valRec ? Number(valRec.valor_calculado ?? 0) : 0,
        valor_acumulado: valRec ? Number(valRec.valor_acumulado ?? 0) : 0,
        actualizado_en: valRec ? valRec.actualizado_en : null,
        editable: isEditable,
      };
    });

    return result;
  }

  /**
   * Updates multiple manual values at once for a church (e.g. from paper report digitizing),
   * and triggers recalculation.
   */
  /**
   * Updates multiple manual values at once for a church (e.g. from paper report digitizing),
   * and triggers recalculation.
   */
  async updateBatchValues(
    iglesiaId: string,
    periodoId: string,
    valoresList: { campo_id: string; valor_manual: number }[],
    realizadoPor: string,
    userRol: string,
    userIglesiaId?: string,
  ) {
    if (userRol === 'iglesia' && userIglesiaId !== iglesiaId) {
      throw new ForbiddenException('Acceso denegado a esta iglesia.');
    }
    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    if (periodo.estado === EstadoPeriodo.cerrado && userRol !== 'tesorero') {
      throw new BadRequestException('El periodo está cerrado y no se puede editar.');
    }

    // Check permission if user is iglesia
    if (userRol === 'iglesia') {
      const blockedPerms = await this.prisma.permisoEdicion.findMany({
        where: {
          iglesia_id: iglesiaId,
          campo_id: { in: valoresList.map((v) => v.campo_id) },
          editable_por_iglesia: false,
        },
      });
      if (blockedPerms.length > 0) {
        throw new ForbiddenException('Uno o más campos están bloqueados por la tesorería.');
      }
    }

    // 1. Fetch metadata in parallel
    const [allFields, currentVals] = await Promise.all([
      this.prisma.campoPlantilla.findMany({
        where: {
          activo: true,
          OR: [
            { aplica_a_todas_las_iglesias: true },
            { campos_por_iglesia: { some: { iglesia_id: iglesiaId } } },
          ],
        },
      }),
      this.prisma.valor.findMany({
        where: { iglesia_id: iglesiaId, periodo_id: periodoId },
        include: { campo: true },
      }),
    ]);

    const variablesMap: Record<string, number> = {};
    for (const cv of currentVals) {
      const val = Number(cv.valor_manual ?? cv.valor_calculado ?? 0);
      variablesMap[cv.campo.slug] = val;
      variablesMap[cv.campo_id] = val;
    }

    const ops: any[] = [];

    const explicitCampoIds = new Set(valoresList.map((v) => v.campo_id));

    // 2. Prepare manual value upserts and update in-memory map
    for (const item of valoresList) {
      if (!item.campo_id) continue;
      const numVal = Number(item.valor_manual || 0);
      const matchedField = allFields.find((f) => f.id === item.campo_id);
      if (matchedField) {
        variablesMap[matchedField.slug] = numVal;
      }
      variablesMap[item.campo_id] = numVal;

      ops.push(
        this.prisma.valor.upsert({
          where: {
            iglesia_id_campo_id_periodo_id: {
              iglesia_id: iglesiaId,
              campo_id: item.campo_id,
              periodo_id: periodoId,
            },
          },
          update: {
            valor_manual: numVal,
            valor_calculado: matchedField?.modo_calculo === ModoCalculo.calculado ? numVal : undefined,
            actualizado_por: realizadoPor,
          },
          create: {
            iglesia_id: iglesiaId,
            campo_id: item.campo_id,
            periodo_id: periodoId,
            valor_manual: numVal,
            valor_calculado: matchedField?.modo_calculo === ModoCalculo.calculado ? numVal : null,
            actualizado_por: realizadoPor,
          },
        }),
      );
    }

    // 3. Cascade recalculation of calculated fields
    const orderOfEvaluation = this.formulasService.topologicalSort(allFields);

    for (const fId of orderOfEvaluation) {
      // If the treasurer explicitly entered a value for this calculated field, preserve it
      if (userRol === 'tesorero' && explicitCampoIds.has(fId)) {
        continue;
      }

      const fieldDef = allFields.find((f) => f.id === fId);
      if (!fieldDef || fieldDef.modo_calculo !== ModoCalculo.calculado || !fieldDef.formula) continue;

      const rawCalculated = this.formulasService.evaluate(fieldDef.formula, variablesMap, allFields);
      const calculatedVal = this.formulasService.applyRounding(
        rawCalculated,
        (fieldDef as any).tipo_redondeo,
        (fieldDef as any).multiplo_redondeo ? Number((fieldDef as any).multiplo_redondeo) : 1,
      );
      variablesMap[fieldDef.slug] = calculatedVal;
      variablesMap[fieldDef.id] = calculatedVal;

      ops.push(
        this.prisma.valor.upsert({
          where: {
            iglesia_id_campo_id_periodo_id: {
              iglesia_id: iglesiaId,
              campo_id: fId,
              periodo_id: periodoId,
            },
          },
          update: {
            valor_calculado: calculatedVal,
            actualizado_por: realizadoPor,
          },
          create: {
            iglesia_id: iglesiaId,
            campo_id: fId,
            periodo_id: periodoId,
            valor_calculado: calculatedVal,
            actualizado_por: realizadoPor,
          },
        }),
      );
    }

    // Execute all upserts in a single ultra-fast pipeline
    if (ops.length > 0) {
      await this.prisma.$transaction(ops);
    }

    // 4. Propagate accumulators if needed
    const accumulableFields = allFields.filter((f) => f.es_acumulable);
    for (const f of accumulableFields) {
      await this.propagateAccumulatedValues(iglesiaId, f.id, periodo.fecha_inicio, realizadoPor);
    }

    return this.findValues(iglesiaId, periodoId, userRol, userIglesiaId);
  }

  /**
   * Saves/Updates a manual value, and triggers a cascade recalculation of calculated fields.
   * If any modified field is accumulable, it propagates the changes forward.
   */
  async updateValue(
    iglesiaId: string,
    campoId: string,
    periodoId: string,
    valorManual: number,
    realizadoPor: string,
    userRol: string,
    userIglesiaId?: string,
  ) {
    return this.updateBatchValues(
      iglesiaId,
      periodoId,
      [{ campo_id: campoId, valor_manual: valorManual }],
      realizadoPor,
      userRol,
      userIglesiaId,
    );
  }

  /**
   * Recalculates and propagates accumulated values forward chronologically starting from a given date.
   */
  private async propagateAccumulatedValues(
    iglesiaId: string,
    campoId: string,
    startDate: Date,
    realizadoPor: string,
  ) {
    const allPeriods = await this.prisma.periodo.findMany({
      orderBy: { fecha_inicio: 'asc' },
    });

    const periods = allPeriods.filter((p) => new Date(p.fecha_inicio) >= new Date(startDate));
    if (periods.length === 0) return;

    // Fetch all existing values for this church and field once
    const allVals = await this.prisma.valor.findMany({
      where: {
        iglesia_id: iglesiaId,
        campo_id: campoId,
      },
    });
    const valMap = new Map<string, any>(allVals.map((v: any) => [v.periodo_id, v]));

    for (const p of periods) {
      // Find previous period in memory from pre-sorted array
      const prevPeriod = [...allPeriods]
        .filter((other) => new Date(other.fecha_fin) < new Date(p.fecha_inicio))
        .sort((a, b) => new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime())[0];

      let prevAccum = 0;
      if (prevPeriod) {
        const prevVal = valMap.get(prevPeriod.id);
        prevAccum = prevVal ? Number(prevVal.valor_acumulado ?? 0) : 0;
      }

      const currentVal = valMap.get(p.id);
      const currentValNum = currentVal
        ? Number(currentVal.valor_manual ?? currentVal.valor_calculado ?? 0)
        : 0;

      const newAccum = prevAccum + currentValNum;

      const saved = await this.prisma.valor.upsert({
        where: {
          iglesia_id_campo_id_periodo_id: {
            iglesia_id: iglesiaId,
            campo_id: campoId,
            periodo_id: p.id,
          },
        },
        update: { valor_acumulado: newAccum },
        create: {
          iglesia_id: iglesiaId,
          campo_id: campoId,
          periodo_id: p.id,
          valor_acumulado: newAccum,
          actualizado_por: realizadoPor,
        },
      });

      valMap.set(p.id, saved);
    }
  }

  /**
   * Recalculates all calculated fields for all churches across all open periods.
   * Called whenever a formula is created, edited or removed.
   */
  async recalculateAllOpenPeriods(realizadoPor: string) {
    const openPeriods = await this.prisma.periodo.findMany({
      where: { estado: EstadoPeriodo.abierto },
      select: { id: true },
    });
    if (openPeriods.length === 0) return;
    const openPeriodIds = openPeriods.map((p) => p.id);

    const churches = await this.prisma.iglesia.findMany({
      where: { estado: 'activa' },
      select: { id: true },
    });
    if (churches.length === 0) return;
    const churchIds = churches.map((c) => c.id);

    const allFields = await this.prisma.campoPlantilla.findMany({
      where: { activo: true },
    });
    const orderOfEvaluation = this.formulasService.topologicalSort(allFields);
    const calculatedFieldDefs = orderOfEvaluation
      .map((id) => allFields.find((f) => f.id === id))
      .filter((f) => f && f.modo_calculo === ModoCalculo.calculado && f.formula);

    if (calculatedFieldDefs.length === 0) return;

    // Fetch all existing values for all churches and open periods in ONE single query
    const existingValues = await this.prisma.valor.findMany({
      where: {
        periodo_id: { in: openPeriodIds },
        iglesia_id: { in: churchIds },
      },
    });

    // Create a fast in-memory map: "periodoId_churchId_campoId" -> Valor
    const valuesMap = new Map<string, any>();
    for (const v of existingValues) {
      valuesMap.set(`${v.periodo_id}_${v.iglesia_id}_${v.campo_id}`, v);
    }

    // Build the list of values to persist
    const updates: {
      iglesia_id: string;
      campo_id: string;
      periodo_id: string;
      valor_calculado: number;
    }[] = [];

    for (const periodoId of openPeriodIds) {
      for (const churchId of churchIds) {
        const variablesMap: Record<string, number> = {};

        // Populate initial variables for this church & period
        for (const field of allFields) {
          const valRec = valuesMap.get(`${periodoId}_${churchId}_${field.id}`);
          const num = Number(valRec?.valor_manual ?? valRec?.valor_calculado ?? 0);
          variablesMap[field.slug] = num;
          variablesMap[field.id] = num;
        }

        // Evaluate calculated fields in topological order
        for (const fieldDef of calculatedFieldDefs) {
          if (!fieldDef || !fieldDef.formula) continue;

          const rawCalculated = this.formulasService.evaluate(fieldDef.formula, variablesMap, allFields);
          const calculatedVal = this.formulasService.applyRounding(
            rawCalculated,
            (fieldDef as any).tipo_redondeo,
            (fieldDef as any).multiplo_redondeo ? Number((fieldDef as any).multiplo_redondeo) : 1,
          );

          variablesMap[fieldDef.slug] = calculatedVal;
          variablesMap[fieldDef.id] = calculatedVal;

          updates.push({
            iglesia_id: churchId,
            campo_id: fieldDef.id,
            periodo_id: periodoId,
            valor_calculado: calculatedVal,
          });
        }
      }
    }

    // Batch upsert in chunks to prevent database transaction limits
    const CHUNK_SIZE = 100;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      await this.prisma.$transaction(
        chunk.map((u) =>
          this.prisma.valor.upsert({
            where: {
              iglesia_id_campo_id_periodo_id: {
                iglesia_id: u.iglesia_id,
                campo_id: u.campo_id,
                periodo_id: u.periodo_id,
              },
            },
            update: {
              valor_calculado: u.valor_calculado,
              actualizado_por: realizadoPor,
            },
            create: {
              iglesia_id: u.iglesia_id,
              campo_id: u.campo_id,
              periodo_id: u.periodo_id,
              valor_calculado: u.valor_calculado,
              actualizado_por: realizadoPor,
            },
          }),
        ),
      );
    }
  }

  /**
   * Gets all values for all churches assigned to a specific table group and period, formatted in rows/columns.
   */
  async findTableValues(
    tablaId: string,
    periodoId: string,
    userRol: string,
    userIglesiaId?: string,
    mostrarTodos?: boolean,
  ) {
    // 1. Fetch table configuration
    const tabla = await this.prisma.tabla.findUnique({
      where: { id: tablaId },
      include: {
        iglesias: true,
        campos: {
          orderBy: { orden: 'asc' },
          include: { campo: true },
        },
      },
    });
    if (!tabla) throw new NotFoundException('Tabla no encontrada');

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    // 2. Filter churches based on user role (if 'iglesia', only return their own church)
    let activeChurches = tabla.iglesias;
    if (userRol === 'iglesia') {
      activeChurches = activeChurches.filter((c) => c.id === userIglesiaId);
      if (activeChurches.length === 0 && userIglesiaId) {
        const myChurch = await this.prisma.iglesia.findUnique({
          where: { id: userIglesiaId },
        });
        if (myChurch) {
          activeChurches = [myChurch];
        }
      }
    }

    const churchIds = activeChurches.map((c) => c.id);

    // 3. Fetch all values for these churches and period
    const values = await this.prisma.valor.findMany({
      where: {
        iglesia_id: { in: churchIds },
        periodo_id: periodoId,
      },
    });

    // Fetch all edit permissions for these churches
    const permissions = await this.prisma.permisoEdicion.findMany({
      where: { iglesia_id: { in: churchIds } },
    });

    // Create value lookup map: churchId_fieldId -> value record
    const valuesMap = new Map<string, any>();
    for (const v of values) {
      valuesMap.set(`${v.iglesia_id}_${v.campo_id}`, v);
    }

    // Create permission lookup map: churchId_fieldId -> editable_por_iglesia
    const permissionsMap = new Map<string, boolean>();
    for (const p of permissions) {
      permissionsMap.set(`${p.iglesia_id}_${p.campo_id}`, p.editable_por_iglesia);
    }

    // Separate logic: Iglesia role always sees their full church form fields, while Tesorero sees their configured table columns
    let rawFields: any[] = [];
    if (userRol === 'iglesia') {
      const churchId = userIglesiaId || (churchIds.length > 0 ? churchIds[0] : null);
      rawFields = await this.prisma.campoPlantilla.findMany({
        where: {
          activo: true,
          AND: [
            {
              OR: [
                { aplica_a_todas_las_iglesias: true },
                ...(churchId ? [{ campos_por_iglesia: { some: { iglesia_id: churchId } } }] : []),
              ],
            },
            {
              OR: [
                { es_temporal: false },
                { es_temporal: true, periodo_id: periodoId },
              ],
            },
          ],
        },
        orderBy: [{ seccion: 'asc' }, { orden: 'asc' }],
      });
    } else {
      rawFields = tabla.campos.map((ct) => ct.campo);
    }

    const fields = rawFields.filter((f) => {
      // Temporal validity: permanent fields apply everywhere; temporal fields only apply in their assigned period
      if (f.es_temporal && f.periodo_id && f.periodo_id !== periodoId) {
        return false;
      }
      if (userRol === 'tesorero') {
        return true;
      }
      if (userRol === 'iglesia') {
        return f.visible_para_iglesia !== false;
      }
      return true;
    });

    // 4. Construct matrix
    const rows = activeChurches.map((church) => {
      const rowValues = fields.map((f) => {
        const key = `${church.id}_${f.id}`;
        const valRec = valuesMap.get(key);
        const hasPerm = permissionsMap.has(key)
          ? permissionsMap.get(key)
          : (f.modo_calculo === ModoCalculo.manual && f.visible_para_iglesia !== false);

        const isPeriodOpen = periodo.estado === EstadoPeriodo.abierto;
        const isEditable =
          f.modo_calculo === ModoCalculo.manual &&
          isPeriodOpen &&
          (userRol === 'tesorero' || hasPerm);

        return {
          campo_id: f.id,
          slug: f.slug,
          modo_calculo: f.modo_calculo,
          valor_manual: valRec ? Number(valRec.valor_manual ?? 0) : 0,
          valor_calculado: valRec ? Number(valRec.valor_calculado ?? 0) : 0,
          valor_acumulado: valRec ? Number(valRec.valor_acumulado ?? 0) : 0,
          editable: isEditable,
        };
      });

      return {
        iglesia_id: church.id,
        iglesia_nombre: church.nombre,
        identificador_interno: church.identificador_interno,
        valores: rowValues,
      };
    });

    return {
      tabla_id: tabla.id,
      tabla_nombre: tabla.nombre,
      columnas: fields.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        slug: f.slug,
        tipo: f.tipo,
        modo_calculo: f.modo_calculo,
        formula: f.formula,
        tipo_redondeo: (f as any).tipo_redondeo || 'ninguno',
        multiplo_redondeo: (f as any).multiplo_redondeo ? Number((f as any).multiplo_redondeo) : 1,
        es_acumulable: f.es_acumulable,
        es_temporal: f.es_temporal,
        periodo_id: f.periodo_id,
        seccion: userRol === 'iglesia' ? (f.seccion_iglesia || f.seccion) : (f.seccion_tesorero || f.seccion),
        seccion_iglesia: f.seccion_iglesia || f.seccion,
        seccion_tesorero: f.seccion_tesorero || f.seccion,
        visible_para_iglesia: f.visible_para_iglesia,
        visible_para_tesorero: f.visible_para_tesorero,
      })),
      filas: rows,
    };
  }
}
