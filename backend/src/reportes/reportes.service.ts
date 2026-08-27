import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Comparison report: evolution of a field over multiple periods for a church.
   */
  async getComparacion(iglesiaId: string, campoId: string, desdeStr: string, hastaStr: string, userRol: string, userIglesiaId?: string) {
    if (userRol === 'iglesia' && userIglesiaId !== iglesiaId) {
      throw new ForbiddenException('No tiene acceso a esta iglesia.');
    }

    const campo = await this.prisma.campoPlantilla.findUnique({ where: { id: campoId } });
    if (!campo) throw new NotFoundException('Campo no encontrado');

    const desde = new Date(desdeStr);
    const hasta = new Date(hastaStr);

    const periods = await this.prisma.periodo.findMany({
      where: {
        fecha_inicio: { gte: desde, lte: hasta },
      },
      orderBy: { fecha_inicio: 'asc' },
    });

    const periodIds = periods.map((p) => p.id);

    const values = await this.prisma.valor.findMany({
      where: {
        iglesia_id: iglesiaId,
        campo_id: campoId,
        periodo_id: { in: periodIds },
      },
    });

    const valuesMap = new Map(values.map((v) => [v.periodo_id, v]));

    const result = [];
    let previousValue = 0;

    for (const p of periods) {
      const valRec = valuesMap.get(p.id);
      const valNum = valRec ? Number(valRec.valor_manual ?? valRec.valor_calculado ?? 0) : 0;
      const accumNum = valRec ? Number(valRec.valor_acumulado ?? 0) : 0;

      let variacionPorcentual = 0;
      if (previousValue !== 0) {
        variacionPorcentual = ((valNum - previousValue) / previousValue) * 100;
      }

      result.push({
        periodo_id: p.id,
        periodo_nombre: p.nombre,
        fecha_inicio: p.fecha_inicio,
        valor: valNum,
        valor_acumulado: accumNum,
        variacion_porcentual: Math.round(variacionPorcentual * 100) / 100, // Round to 2 decimals
      });

      previousValue = valNum;
    }

    return result;
  }

  /**
   * Consolidated report: value of a field in a period across all active churches.
   */
  async getConsolidado(campoId: string, periodoId: string) {
    const campo = await this.prisma.campoPlantilla.findUnique({ where: { id: campoId } });
    if (!campo) throw new NotFoundException('Campo no encontrado');

    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    const activeChurches = await this.prisma.iglesia.findMany({
      where: { estado: 'activa' },
      orderBy: { nombre: 'asc' },
    });

    const values = await this.prisma.valor.findMany({
      where: {
        campo_id: campoId,
        periodo_id: periodoId,
      },
    });

    const valuesMap = new Map(values.map((v) => [v.iglesia_id, v]));

    return activeChurches.map((c) => {
      const valRec = valuesMap.get(c.id);
      return {
        iglesia_id: c.id,
        iglesia_nombre: c.nombre,
        identificador_interno: c.identificador_interno,
        valor: valRec ? Number(valRec.valor_manual ?? valRec.valor_calculado ?? 0) : 0,
        valor_acumulado: valRec ? Number(valRec.valor_acumulado ?? 0) : 0,
      };
    });
  }

  /**
   * Exports period data to Excel workbook.
   */
  async exportarExcel(periodoId: string, userRol: string, userIglesiaId?: string, tablaId?: string) {
    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Periodo no encontrado');

    const isAllTables = !tablaId || tablaId === 'all' || tablaId === 'todas' || tablaId === 'undefined' || tablaId === 'null' || tablaId.trim() === '';

    // 1. Get churches that the user can access
    let churches: any[] = [];
    if (userRol === 'iglesia') {
      if (!userIglesiaId) throw new ForbiddenException('No tiene una iglesia asignada');
      const iglesia = await this.prisma.iglesia.findUnique({ where: { id: userIglesiaId } });
      if (!iglesia) throw new NotFoundException('Iglesia no encontrada');
      churches = [iglesia];
    } else {
      if (!isAllTables) {
        churches = await this.prisma.iglesia.findMany({
          where: { estado: 'activa', tabla_id: tablaId },
          orderBy: { nombre: 'asc' },
        });
      }
      if (churches.length === 0) {
        churches = await this.prisma.iglesia.findMany({
          where: { estado: 'activa' },
          orderBy: { nombre: 'asc' },
        });
      }
    }

    if (churches.length === 0) {
      churches = await this.prisma.iglesia.findMany({ take: 20 });
    }

    // 2. Fetch active fields based on user role and period
    const fields = await this.prisma.campoPlantilla.findMany({
      where: {
        activo: true,
        AND: [
          {
            OR: [
              { es_temporal: false },
              { es_temporal: true, periodo_id: periodoId },
            ],
          },
        ],
      },
      orderBy: [{ orden: 'asc' }, { creado_en: 'asc' }],
    });

    const displayFields = fields.filter((f) => {
      if (userRol === 'iglesia') return f.visible_para_iglesia !== false;
      return f.visible_para_tesorero !== false;
    });

    // 3. Pre-fetch all relations & values in batch
    const [allRelations, allPeriodValues] = await Promise.all([
      this.prisma.camposPorIglesia.findMany(),
      this.prisma.valor.findMany({
        where: {
          periodo_id: periodoId,
          iglesia_id: { in: churches.map((c) => c.id) },
        },
      }),
    ]);

    const relationsSet = new Set(
      allRelations.map((r) => `${r.campo_id}_${r.iglesia_id}`),
    );
    const valuesMapByChurch = new Map<string, Map<string, any>>();
    for (const v of allPeriodValues) {
      if (!valuesMapByChurch.has(v.iglesia_id)) {
        valuesMapByChurch.set(v.iglesia_id, new Map());
      }
      valuesMapByChurch.get(v.iglesia_id)!.set(v.campo_id, v);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TesorApp';
    workbook.created = new Date();

    // Sheet 1: Consolidado General (for Treasurer)
    if (userRol === 'tesorero' && churches.length > 0) {
      const summarySheet = workbook.addWorksheet('Consolidado General');
      summarySheet.views = [{ showGridLines: true }];

      // Sheet Title
      const lastColIndex = Math.max(displayFields.length + 2, 5);
      summarySheet.mergeCells(1, 1, 1, lastColIndex);
      const titleCell = summarySheet.getCell('A1');
      titleCell.value = `CONSOLIDADO GENERAL - PERIODO: ${periodo.nombre.toUpperCase()}`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
      summarySheet.getRow(1).height = 36;

      // Table Headers
      const headers = ['#', 'Congregación / Sede', ...displayFields.map((f) => f.nombre)];
      const headerRow = summarySheet.getRow(3);
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.height = 26;

      for (let col = 1; col <= headers.length; col++) {
        const cell = headerRow.getCell(col);
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2F5597' },
        };
        cell.alignment = { vertical: 'middle', horizontal: col >= 3 ? 'right' : 'left' };
      }

      // Populate Church Rows
      let rIdx = 4;
      const columnSums: number[] = new Array(displayFields.length).fill(0);

      for (let i = 0; i < churches.length; i++) {
        const church = churches[i];
        const vMap = valuesMapByChurch.get(church.id) || new Map();
        const row = summarySheet.getRow(rIdx);
        row.getCell(1).value = i + 1;
        row.getCell(2).value = church.nombre;

        for (let fIdx = 0; fIdx < displayFields.length; fIdx++) {
          const field = displayFields[fIdx];
          const valRec = vMap.get(field.id);
          const valNum = valRec ? Number(valRec.valor_manual ?? valRec.valor_calculado ?? 0) : 0;
          columnSums[fIdx] += valNum;

          const cell = row.getCell(fIdx + 3);
          cell.value = valNum;
          cell.numFmt = '"$"#,##0;("$"#,##0);"-"';
          cell.alignment = { horizontal: 'right' };
        }

        if (rIdx % 2 === 0) {
          for (let c = 1; c <= headers.length; c++) {
            row.getCell(c).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            };
          }
        }
        rIdx++;
      }

      // Totals Row
      const totalRow = summarySheet.getRow(rIdx);
      totalRow.getCell(2).value = 'TOTALES GENERALES:';
      totalRow.getCell(2).font = { bold: true };
      totalRow.height = 24;

      for (let fIdx = 0; fIdx < displayFields.length; fIdx++) {
        const cell = totalRow.getCell(fIdx + 3);
        cell.value = columnSums[fIdx];
        cell.numFmt = '"$"#,##0;("$"#,##0);"-"';
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'right' };
      }

      for (let c = 1; c <= headers.length; c++) {
        totalRow.getCell(c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE5E7EB' },
        };
      }

      summarySheet.columns.forEach((column) => {
        let maxLen = 14;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellVal = cell.value ? cell.value.toString() : '';
          if (cellVal.length > maxLen) {
            maxLen = cellVal.length;
          }
        });
        column.width = maxLen + 3;
      });
    }

    // Individual church detailed sheets (up to 40 sheets to keep file lightweight)
    const detailedChurches = churches.slice(0, 40);
    for (const church of detailedChurches) {
      // Excel tab names cannot contain invalid chars \ / ? * : [ ] and max 31 chars
      const sanitizedName = church.nombre.replace(/[\\/?*:[\]]/g, '').substring(0, 30);
      const sheet = workbook.addWorksheet(sanitizedName);

      sheet.views = [{ showGridLines: true }];

      // Sheet Title
      sheet.mergeCells('A1:E1');
      const titleCell = sheet.getCell('A1');
      titleCell.value = `REPORTE FINANCIERO - ${church.nombre.toUpperCase()}`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
      sheet.getRow(1).height = 36;

      // Meta info
      sheet.getCell('A3').value = 'Periodo:';
      sheet.getCell('A3').font = { bold: true };
      sheet.getCell('B3').value = periodo.nombre;

      sheet.getCell('A4').value = 'Identificador:';
      sheet.getCell('A4').font = { bold: true };
      sheet.getCell('B4').value = church.identificador_interno || 'N/A';

      sheet.getCell('A5').value = 'Generado el:';
      sheet.getCell('A5').font = { bold: true };
      sheet.getCell('B5').value = new Date().toLocaleDateString('es-CO');

      // Table Headers
      const headerRow = sheet.getRow(7);
      headerRow.values = ['Sección', 'Nombre del Campo', 'Modo Cálculo', 'Valor del Periodo', 'Valor Acumulado'];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.height = 24;

      const headerFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F5597' },
      } as const;

      for (let col = 1; col <= 5; col++) {
        const cell = headerRow.getCell(col);
        cell.fill = headerFill;
        cell.alignment = { vertical: 'middle', horizontal: col >= 4 ? 'right' : 'left' };
      }

      const valuesMap = valuesMapByChurch.get(church.id) || new Map();

      let currentRow = 8;
      for (const field of displayFields) {
        if (!field.aplica_a_todas_las_iglesias) {
          if (!relationsSet.has(`${field.id}_${church.id}`)) continue;
        }

        const valRec = valuesMap.get(field.id);
        const valPeriodo = valRec ? Number(valRec.valor_manual ?? valRec.valor_calculado ?? 0) : 0;
        const valAcumulado = valRec ? Number(valRec.valor_acumulado ?? 0) : 0;

        const row = sheet.getRow(currentRow);
        row.getCell(1).value = userRol === 'iglesia' ? (field.seccion_iglesia || field.seccion) : (field.seccion_tesorero || field.seccion);
        row.getCell(2).value = field.nombre;
        row.getCell(3).value = field.modo_calculo === 'manual' ? 'Manual' : 'Calculado';

        const cellPeriod = row.getCell(4);
        cellPeriod.value = valPeriodo;
        cellPeriod.numFmt = '"$"#,##0;("$"#,##0);"-"';
        cellPeriod.alignment = { horizontal: 'right' };

        const cellAccum = row.getCell(5);
        cellAccum.value = valAcumulado;
        cellAccum.numFmt = '"$"#,##0;("$"#,##0);"-"';
        cellAccum.alignment = { horizontal: 'right' };

        if (currentRow % 2 === 0) {
          for (let c = 1; c <= 5; c++) {
            row.getCell(c).fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9FAFB' },
            };
          }
        }

        currentRow++;
      }

      sheet.columns.forEach((column) => {
        let maxLen = 15;
        column.eachCell({ includeEmpty: false }, (cell) => {
          const cellVal = cell.value ? cell.value.toString() : '';
          if (cellVal.length > maxLen) {
            maxLen = cellVal.length;
          }
        });
        column.width = maxLen + 3;
      });
    }

    return workbook;
  }
}
