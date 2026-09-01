import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FormulasService } from '../formulas/formulas.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoPeriodo, ModoCalculo, EstadoInforme } from '@prisma/client';

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
  async findValues(
    iglesiaId: string,
    periodoId: string,
    userRol: string,
    userIglesiaId?: string,
  ) {
    // Access control
    if (userRol === 'iglesia' && userIglesiaId !== iglesiaId) {
      throw new ForbiddenException('Acceso denegado a esta iglesia.');
    }

    const iglesia = await this.prisma.iglesia.findUnique({
      where: { id: iglesiaId },
      include: { tabla: true },
    });
    if (!iglesia) throw new NotFoundException('Iglesia no encontrada');

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    // 1. Load all active template fields configured for this church and period
    const fields = await this.prisma.campoPlantilla.findMany({
      where: {
        activo: true,
        NOT: {
          AND: [
            { es_fondo: true },
            { visible_para_tesorero: false },
            { visible_para_iglesia: false },
          ],
        },
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
              {
                es_temporal: true,
                OR: [
                  { periodo_id: periodoId },
                  { campos_por_periodo: { some: { periodo_id: periodoId } } },
                ],
              },
            ],
          },
        ],
      },
      orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }],
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

    // Return ALL fields (visible AND hidden) so formula dependencies work.
    // The frontend uses visible_para_iglesia to decide what to show in the form.
    // Hidden calculated fields (visible_para_iglesia=false) are still needed for
    // calculations like EMOLUMENTOS that depend on "Total Emolumentos" etc.
    const result = fields.map((f) => {
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
        valor_manual: valRec && valRec.valor_manual !== null && valRec.valor_manual !== undefined
          ? Number(valRec.valor_manual)
          : (f.modo_calculo === ModoCalculo.manual ? 0 : null),
        valor_calculado: valRec ? Number(valRec.valor_calculado ?? 0) : 0,
        valor_acumulado: valRec ? Number(valRec.valor_acumulado ?? 0) : 0,
        actualizado_en: valRec ? valRec.actualizado_en : null,
        editable: isEditable,
      };
    });

    return result;
  }


  /**
   * Updates a batch of values across multiple churches and fields (e.g. from pasting an Excel column/matrix),
   * grouping by church and recalculating formulas and accumulators in a single ultra-fast query pipeline.
   */
  async updateMatrixBatch(
    periodoId: string,
    valoresList: { iglesia_id: string; campo_id: string; valor_manual: number }[],
    realizadoPor: string,
    userRol: string,
    userIglesiaId?: string,
  ) {
    if (!periodoId) throw new BadRequestException('Se requiere periodo_id.');
    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');
    if (periodo.estado === EstadoPeriodo.cerrado && userRol !== 'tesorero') {
      throw new BadRequestException('El periodo está cerrado y no se puede editar.');
    }

    if (userRol === 'iglesia') {
      const unauthorized = valoresList.some((v) => v.iglesia_id !== userIglesiaId);
      if (unauthorized) {
        throw new ForbiddenException('No tiene permisos para modificar otras congregaciones.');
      }
    }

    // Group incoming values by iglesia_id
    const groupedByChurch = new Map<string, { campo_id: string; valor_manual: number }[]>();
    for (const item of valoresList) {
      if (!item.iglesia_id || !item.campo_id) continue;
      if (!groupedByChurch.has(item.iglesia_id)) {
        groupedByChurch.set(item.iglesia_id, []);
      }
      groupedByChurch.get(item.iglesia_id)!.push({
        campo_id: item.campo_id,
        valor_manual: item.valor_manual,
      });
    }

    const churchIds = Array.from(groupedByChurch.keys());
    if (churchIds.length === 0) {
      return { success: true, total_valores: 0, iglesias_actualizadas: 0 };
    }

    // 1. Fetch ALL metadata in parallel in ONE single batch query!
    const [allFields, allCurrentVals] = await Promise.all([
      this.prisma.campoPlantilla.findMany({
        where: { activo: true },
      }),
      this.prisma.valor.findMany({
        where: {
          iglesia_id: { in: churchIds },
          periodo_id: periodoId,
        },
        include: { campo: true },
      }),
    ]);

    // Index current values: "churchId" -> array of values
    const churchValuesMap = new Map<string, any[]>();
    for (const cv of allCurrentVals) {
      if (!churchValuesMap.has(cv.iglesia_id)) {
        churchValuesMap.set(cv.iglesia_id, []);
      }
      churchValuesMap.get(cv.iglesia_id)!.push(cv);
    }

    const orderOfEvaluation = this.formulasService.topologicalSort(allFields);
    const allOps: any[] = [];
    const affectedAccumulableFields = new Set<string>();

    for (const [iglesiaId, incomingVals] of groupedByChurch.entries()) {
      const churchCurrentVals = churchValuesMap.get(iglesiaId) || [];
      const variablesMap: Record<string, number> = {};
      const manualOverridesMap = new Map<string, number>();

      for (const cv of churchCurrentVals) {
        if (cv.valor_manual !== null && cv.valor_manual !== undefined) {
          manualOverridesMap.set(cv.campo_id, Number(cv.valor_manual));
        }
        const val = Number(cv.valor_manual ?? cv.valor_calculado ?? 0);
        variablesMap[cv.campo.slug] = val;
        variablesMap[cv.campo_id] = val;
      }

      const explicitCampoIds = new Set(incomingVals.map((v) => v.campo_id));

      // Prepare upserts for incoming manual values
      for (const item of incomingVals) {
        const numVal = Number(item.valor_manual || 0);
        const matchedField = allFields.find((f) => f.id === item.campo_id);
        if (matchedField) {
          variablesMap[matchedField.slug] = numVal;
          if (matchedField.es_acumulable) {
            affectedAccumulableFields.add(matchedField.id);
          }
        }
        variablesMap[item.campo_id] = numVal;
        manualOverridesMap.set(item.campo_id, numVal);

        allOps.push(
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

      // Cascade recalculation for this church
      for (const fId of orderOfEvaluation) {
        if (userRol === 'tesorero' && explicitCampoIds.has(fId)) {
          continue;
        }

        const fieldDef = allFields.find((f) => f.id === fId);
        if (!fieldDef || fieldDef.modo_calculo !== ModoCalculo.calculado || !fieldDef.formula) continue;

        if (userRol === 'tesorero' && manualOverridesMap.has(fId)) {
          const overriddenVal = manualOverridesMap.get(fId)!;
          variablesMap[fieldDef.slug] = overriddenVal;
          variablesMap[fieldDef.id] = overriddenVal;
          continue;
        }

        const rawCalculated = this.formulasService.evaluate(fieldDef.formula, variablesMap, allFields);
        const calculatedVal = this.formulasService.applyRounding(
          rawCalculated,
          (fieldDef as any).tipo_redondeo,
          (fieldDef as any).multiplo_redondeo ? Number((fieldDef as any).multiplo_redondeo) : 1,
        );
        variablesMap[fieldDef.slug] = calculatedVal;
        variablesMap[fieldDef.id] = calculatedVal;

        if (fieldDef.es_acumulable) {
          affectedAccumulableFields.add(fieldDef.id);
        }

        allOps.push(
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
    }

    // 2. Execute all upserts in chunks of 50 in parallel transactions
    const CHUNK_SIZE = 50;
    for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
      await this.prisma.$transaction(allOps.slice(i, i + CHUNK_SIZE));
    }

    // 3. Ultra-fast bulk accumulator propagation
    if (affectedAccumulableFields.size > 0) {
      const allPeriods = await this.prisma.periodo.findMany({
        orderBy: { fecha_inicio: 'asc' },
      });
      const futurePeriods = allPeriods.filter((p) => new Date(p.fecha_inicio) >= new Date(periodo.fecha_inicio));

      if (futurePeriods.length > 0) {
        const allAccumVals = await this.prisma.valor.findMany({
          where: {
            iglesia_id: { in: churchIds },
            campo_id: { in: Array.from(affectedAccumulableFields) },
          },
        });

        const accumValMap = new Map<string, any>();
        for (const v of allAccumVals) {
          accumValMap.set(`${v.iglesia_id}_${v.campo_id}_${v.periodo_id}`, v);
        }

        const accumOps: any[] = [];
        for (const fieldId of affectedAccumulableFields) {
          for (const iglesiaId of churchIds) {
            for (const p of futurePeriods) {
              const prevPeriod = [...allPeriods]
                .filter((other) => new Date(other.fecha_fin) < new Date(p.fecha_inicio))
                .sort((a, b) => new Date(b.fecha_fin).getTime() - new Date(a.fecha_fin).getTime())[0];

              let prevAccum = 0;
              if (prevPeriod) {
                const prevKey = `${iglesiaId}_${fieldId}_${prevPeriod.id}`;
                const prevVal = accumValMap.get(prevKey);
                prevAccum = prevVal ? Number(prevVal.valor_acumulado ?? 0) : 0;
              }

              const currKey = `${iglesiaId}_${fieldId}_${p.id}`;
              const currentVal = accumValMap.get(currKey);
              const currentValNum = currentVal
                ? Number(currentVal.valor_manual ?? currentVal.valor_calculado ?? 0)
                : 0;

              const newAccum = prevAccum + currentValNum;
              accumValMap.set(currKey, { ...(currentVal || {}), valor_acumulado: newAccum });

              accumOps.push(
                this.prisma.valor.upsert({
                  where: {
                    iglesia_id_campo_id_periodo_id: {
                      iglesia_id: iglesiaId,
                      campo_id: fieldId,
                      periodo_id: p.id,
                    },
                  },
                  update: { valor_acumulado: newAccum },
                  create: {
                    iglesia_id: iglesiaId,
                    campo_id: fieldId,
                    periodo_id: p.id,
                    valor_acumulado: newAccum,
                    actualizado_por: realizadoPor,
                  },
                }),
              );
            }
          }
        }

        for (let i = 0; i < accumOps.length; i += CHUNK_SIZE) {
          await this.prisma.$transaction(accumOps.slice(i, i + CHUNK_SIZE));
        }
      }
    }

    return {
      success: true,
      total_valores: valoresList.length,
      iglesias_actualizadas: churchIds.length,
    };
  }

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
      const informe = await this.prisma.informePeriodo.findUnique({
        where: { iglesia_id_periodo_id: { iglesia_id: iglesiaId, periodo_id: periodoId } },
      });
      if (informe && informe.estado !== EstadoInforme.borrador) {
        throw new ForbiddenException(
          'El informe de este período ya fue enviado a tesorería y se encuentra bloqueado para edición.',
        );
      }

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

    // 1. Fetch metadata in parallel: Load ALL active fields so hidden fields remain fully evaluated in formulas
    const [allFields, currentVals] = await Promise.all([
      this.prisma.campoPlantilla.findMany({
        where: {
          activo: true,
        },
      }),
      this.prisma.valor.findMany({
        where: { iglesia_id: iglesiaId, periodo_id: periodoId },
        include: { campo: true },
      }),
    ]);

    const variablesMap: Record<string, number> = {};
    const manualOverridesMap = new Map<string, number>();

    for (const cv of currentVals) {
      if (cv.valor_manual !== null && cv.valor_manual !== undefined) {
        manualOverridesMap.set(cv.campo_id, Number(cv.valor_manual));
      }
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
      manualOverridesMap.set(item.campo_id, numVal);

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
      // If the treasurer explicitly entered a value in this request for this calculated field, preserve it
      if (userRol === 'tesorero' && explicitCampoIds.has(fId)) {
        continue;
      }

      const fieldDef = allFields.find((f) => f.id === fId);
      if (!fieldDef || fieldDef.modo_calculo !== ModoCalculo.calculado || !fieldDef.formula) continue;

      // If this calculated field already had an explicit manual override, preserve it!
      if (userRol === 'tesorero' && manualOverridesMap.has(fId)) {
        const overriddenVal = manualOverridesMap.get(fId)!;
        variablesMap[fieldDef.slug] = overriddenVal;
        variablesMap[fieldDef.id] = overriddenVal;
        continue;
      }

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

    // Ensure realizadoPor is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let safeUserId = realizadoPor && uuidRegex.test(realizadoPor) ? realizadoPor : null;
    if (!safeUserId) {
      const fallbackUser = await this.prisma.usuario.findFirst({ select: { id: true } });
      safeUserId = fallbackUser?.id || '00000000-0000-0000-0000-000000000000';
    }

    // Build the list of operations ONLY for values that actually changed or are missing
    const updateOps: any[] = [];
    const createOps: any[] = [];

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

          const valRec = valuesMap.get(`${periodoId}_${churchId}_${fieldDef.id}`);
          const hasManualOverride = valRec?.valor_manual !== null && valRec?.valor_manual !== undefined;

          let calculatedVal: number;
          if (hasManualOverride) {
            calculatedVal = Number(valRec.valor_manual);
          } else {
            const rawCalculated = this.formulasService.evaluate(fieldDef.formula, variablesMap, allFields);
            calculatedVal = this.formulasService.applyRounding(
              rawCalculated,
              (fieldDef as any).tipo_redondeo,
              (fieldDef as any).multiplo_redondeo ? Number((fieldDef as any).multiplo_redondeo) : 1,
            );
          }

          variablesMap[fieldDef.slug] = calculatedVal;
          variablesMap[fieldDef.id] = calculatedVal;

          // Only write to DB if the value changed or is missing
          if (valRec) {
            if (Number(valRec.valor_calculado) !== calculatedVal) {
              updateOps.push(
                this.prisma.valor.update({
                  where: { id: valRec.id },
                  data: {
                    valor_calculado: calculatedVal,
                    actualizado_por: safeUserId,
                  },
                }),
              );
            }
          } else {
            createOps.push({
              iglesia_id: churchId,
              campo_id: fieldDef.id,
              periodo_id: periodoId,
              valor_calculado: calculatedVal,
              actualizado_por: safeUserId,
            });
          }
        }
      }
    }

    if (createOps.length > 0) {
      await this.prisma.valor.createMany({
        data: createOps,
        skipDuplicates: true,
      });
    }

    if (updateOps.length > 0) {
      const BATCH_SIZE = 25;
      for (let i = 0; i < updateOps.length; i += BATCH_SIZE) {
        await Promise.all(updateOps.slice(i, i + BATCH_SIZE));
      }
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
    const isAllTables = tablaId === 'all' || tablaId === 'todas' || tablaId === 'consolidado';

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    let tabla: any = null;
    let activeChurches: any[] = [];

    // 1. Fetch table configuration or all churches if consolidated
    if (isAllTables) {
      activeChurches = await this.prisma.iglesia.findMany({
        where: { estado: 'activa' },
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      });
      tabla = {
        id: 'all',
        nombre: 'Consolidado General (Todas las Tablas)',
        iglesias: activeChurches,
        campos: [],
      };
    } else {
      tabla = await this.prisma.tabla.findUnique({
        where: { id: tablaId },
        include: {
          iglesias: {
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
          },
          campos: {
            orderBy: { orden: 'asc' },
            include: {
              campo: {
                include: { campos_por_periodo: true },
              },
            },
          },
        },
      });
      if (!tabla) throw new NotFoundException('Tabla no encontrada');
      activeChurches = tabla.iglesias;
    }

    // 2. Filter churches based on user role (if 'iglesia', only return their own church)
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

    // Field resolution: Iglesia role sees ALL active church template fields; Consolidated sees all fields; Specific table sees table columns
    let rawFields: any[] = [];
    if (userRol === 'iglesia') {
      const churchId = userIglesiaId || (churchIds.length > 0 ? churchIds[0] : null);
      rawFields = await this.prisma.campoPlantilla.findMany({
        where: {
          activo: true,
          NOT: {
            AND: [
              { es_fondo: true },
              { visible_para_tesorero: false },
              { visible_para_iglesia: false },
            ],
          },
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
                {
                  es_temporal: true,
                  OR: [
                    { periodo_id: periodoId },
                    { campos_por_periodo: { some: { periodo_id: periodoId } } },
                  ],
                },
              ],
            },
          ],
        },
        include: {
          campos_por_periodo: true,
        },
        orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }],
      });
    } else if (isAllTables || mostrarTodos) {
      rawFields = await this.prisma.campoPlantilla.findMany({
        where: {
          activo: true,
          NOT: {
            AND: [
              { es_fondo: true },
              { visible_para_tesorero: false },
              { visible_para_iglesia: false },
            ],
          },
          AND: [
            {
              OR: [
                { es_temporal: false },
                {
                  es_temporal: true,
                  OR: [
                    { periodo_id: periodoId },
                    { campos_por_periodo: { some: { periodo_id: periodoId } } },
                  ],
                },
              ],
            },
          ],
        },
        include: {
          campos_por_periodo: true,
        },
        orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }],
      });
    } else {
      rawFields = tabla.campos.map((ct: any) => ct.campo).filter((f: any) => f.activo);
    }

    const fields = rawFields.filter((f) => {
      // Manual funds are not planilla columns
      if (f.es_fondo && f.visible_para_tesorero === false && f.visible_para_iglesia === false) {
        return false;
      }
      // Temporal validity: permanent fields apply everywhere; temporal fields only apply in their assigned periods
      if (f.es_temporal) {
        const matchesPrimary = f.periodo_id === periodoId;
        const matchesMulti = f.campos_por_periodo?.some((p: any) => p.periodo_id === periodoId);
        if (!matchesPrimary && !matchesMulti) {
          return false;
        }
      }
      if (userRol === 'iglesia') {
        return f.visible_para_iglesia !== false;
      }
      if (userRol === 'tesorero') {
        return f.visible_para_tesorero !== false;
      }
      return true;
    });

    // 4. Fetch all reports status for these churches and period
    const informes = await this.prisma.informePeriodo.findMany({
      where: {
        iglesia_id: { in: churchIds },
        periodo_id: periodoId,
      },
      include: {
        enviado_por: { select: { id: true, nombre_completo: true } },
        revisado_por: { select: { id: true, nombre_completo: true } },
        aprobado_por: { select: { id: true, nombre_completo: true } },
      },
    });
    const informeMap = new Map(informes.map((inf) => [inf.iglesia_id, inf]));

    // 5. Construct matrix
    const rows = activeChurches.map((church) => {
      const inf = informeMap.get(church.id);
      const isReportLockedForChurch = userRol === 'iglesia' && inf && inf.estado !== EstadoInforme.borrador;

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
          !isReportLockedForChurch &&
          (userRol === 'tesorero' || hasPerm);

        return {
          campo_id: f.id,
          slug: f.slug,
          modo_calculo: f.modo_calculo,
          valor_manual: valRec && valRec.valor_manual !== null && valRec.valor_manual !== undefined
            ? Number(valRec.valor_manual)
            : (f.modo_calculo === ModoCalculo.manual ? 0 : null),
          valor_calculado: valRec ? Number(valRec.valor_calculado ?? 0) : 0,
          valor_acumulado: valRec ? Number(valRec.valor_acumulado ?? 0) : 0,
          actualizado_por: valRec ? valRec.actualizado_por : null,
          actualizado_en: valRec ? valRec.actualizado_en : null,
          editable: isEditable,
        };
      });

      return {
        iglesia_id: church.id,
        iglesia_nombre: church.nombre,
        identificador_interno: church.identificador_interno,
        codigo: (church as any).codigo || null,
        nombre_pastor: (church as any).nombre_pastor || null,
        estado_informe: inf?.estado || EstadoInforme.borrador,
        informe_meta: inf
          ? {
              id: inf.id,
              enviado_en: inf.enviado_en,
              enviado_por: inf.enviado_por?.nombre_completo || null,
              revisado_en: inf.revisado_en,
              revisado_por: inf.revisado_por?.nombre_completo || null,
              aprobado_en: inf.aprobado_en,
              aprobado_por: inf.aprobado_por?.nombre_completo || null,
              observaciones: inf.observaciones || null,
            }
          : null,
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
