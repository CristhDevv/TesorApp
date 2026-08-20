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

    // 1. Get churches that the user can access
    let churches = [];
    if (userRol === 'iglesia') {
      if (!userIglesiaId) throw new ForbiddenException('No tiene una iglesia asignada');
      const iglesia = await this.prisma.iglesia.findUnique({ where: { id: userIglesiaId } });
      if (!iglesia || iglesia.estado === 'inactiva') throw new NotFoundException('Iglesia no encontrada o inactiva');
      churches = [iglesia];
    } else {
      if (tablaId) {
        churches = await this.prisma.iglesia.findMany({
          where: { estado: 'activa', tabla_id: tablaId },
          orderBy: { nombre: 'asc' },
        });
      } else {
        churches = await this.prisma.iglesia.findMany({
          where: { estado: 'activa' },
          orderBy: { nombre: 'asc' },
        });
      }
    }

    // 2. Fetch all active fields and pre-fetch relations & values in batch
    const [fields, allRelations, allPeriodValues] = await Promise.all([
      this.prisma.campoPlantilla.findMany({
        where: { activo: true },
        orderBy: [{ seccion: 'asc' }, { orden: 'asc' }],
      }),
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

    for (const church of churches) {
      const sheetName = church.nombre.substring(0, 31); // Excel tab names must be <= 31 chars
      const sheet = workbook.addWorksheet(sheetName);

      // Styles & Styling tokens
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
        fgColor: { argb: 'FF1F4E79' }, // Navy blue headers
      };
      sheet.getRow(1).height = 40;

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
      headerRow.height = 25;
      
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

      // Fetch values for this church from pre-loaded Map
      const valuesMap = valuesMapByChurch.get(church.id) || new Map();

      // Populate Table Rows
      let currentRow = 8;
      for (const field of fields) {
        // Verify if specific field applies to this church using pre-loaded Set
        if (!field.aplica_a_todas_las_iglesias) {
          if (!relationsSet.has(`${field.id}_${church.id}`)) continue; // Skip if does not apply
        }

        const valRec = valuesMap.get(field.id);
        const valPeriodo = valRec ? Number(valRec.valor_manual ?? valRec.valor_calculado ?? 0) : 0;
        const valAcumulado = valRec ? Number(valRec.valor_acumulado ?? 0) : 0;

        const row = sheet.getRow(currentRow);
        row.getCell(1).value = field.seccion;
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

        // Zebra striping
        if (currentRow % 2 === 0) {
          const zebraFill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF2F2F2' },
          } as const;
          for (let c = 1; c <= 5; c++) {
            row.getCell(c).fill = zebraFill;
          }
        }

        currentRow++;
      }

      // Autofit Column Widths
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
