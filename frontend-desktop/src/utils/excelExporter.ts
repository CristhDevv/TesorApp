import ExcelJS from 'exceljs';
import { ColumnaGrid, FilaGrid } from '../types/contabilidad';

export interface ExcelExportOptions {
  fileName?: string;
  reportTitle?: string;
  periodName?: string;
  tableName?: string;
  selectedColumnIds: string[];
  selectedChurchIds: string[];
  includeTotalsRow?: boolean;
  includeMetadataHeader?: boolean;
  columnTotals?: Record<string, number>;
}

export async function generateExcelReport(
  rows: FilaGrid[],
  columns: ColumnaGrid[],
  options: ExcelExportOptions
): Promise<void> {
  const {
    fileName = 'Planilla_Contable.xlsx',
    reportTitle = 'PLANILLA CONTABLE GENERAL',
    periodName = 'Período Actual',
    tableName = 'Todas las Congregaciones',
    selectedColumnIds,
    selectedChurchIds,
    includeTotalsRow = true,
    includeMetadataHeader = true,
    columnTotals = {},
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TesorApp Financial System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Planilla', {
    views: [{ state: 'frozen', ySplit: includeMetadataHeader ? 4 : 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // 1. Filter active columns & rows
  const activeColumns = columns.filter((c) => selectedColumnIds.includes(c.id));
  const activeRows = rows.filter((r) => selectedChurchIds.includes(r.iglesia_id));

  let currentRowIdx = 1;

  // 2. Metadata Header Banner
  if (includeMetadataHeader) {
    const totalCols = Math.max(activeColumns.length + 2, 4); // # + Congregación + columns

    // Title Row
    const titleRow = worksheet.getRow(currentRowIdx);
    titleRow.values = [reportTitle];
    titleRow.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
    titleRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark Slate
    };
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, totalCols);
    titleRow.height = 30;
    currentRowIdx++;

    // Subtitle / Info Row
    const subRow = worksheet.getRow(currentRowIdx);
    subRow.values = [`Planilla: ${tableName}   |   Período: ${periodName}   |   Generado: ${new Date().toLocaleString('es-CO')}`];
    subRow.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFE2E8F0' } };
    subRow.alignment = { vertical: 'middle', horizontal: 'center' };
    subRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    worksheet.mergeCells(currentRowIdx, 1, currentRowIdx, totalCols);
    subRow.height = 20;
    currentRowIdx++;

    // Empty separator row
    worksheet.getRow(currentRowIdx).height = 8;
    currentRowIdx++;
  }

  // 3. Table Column Headers
  const headerRow = worksheet.getRow(currentRowIdx);
  const headerValues: string[] = ['#', 'CONGREGACIÓN'];
  activeColumns.forEach((c) => headerValues.push(c.nombre));

  headerRow.values = headerValues;
  headerRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4338CA' }, // Indigo-700
  };
  headerRow.height = 28;

  // Header border
  for (let c = 1; c <= headerValues.length; c++) {
    const cell = headerRow.getCell(c);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF312E81' } },
      bottom: { style: 'medium', color: { argb: 'FF312E81' } },
      left: { style: 'thin', color: { argb: 'FF6366F1' } },
      right: { style: 'thin', color: { argb: 'FF6366F1' } },
    };
  }
  currentRowIdx++;

  // 4. Data Rows
  activeRows.forEach((row, rIdx) => {
    const dataRow = worksheet.getRow(currentRowIdx);
    const rowValues: (string | number)[] = [rIdx + 1, row.iglesia_nombre];

    activeColumns.forEach((col) => {
      let numVal = 0;
      if (Array.isArray(row.valores)) {
        const valObj = row.valores.find((v: any) => v.campo_id === col.id);
        const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
        const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
        numVal = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0));
      } else if (typeof row.valores === 'object' && row.valores !== null) {
        numVal = Number((row.valores as any)[col.id] || 0);
      }
      if (isNaN(numVal)) numVal = 0;
      rowValues.push(numVal);
    });

    dataRow.values = rowValues;
    dataRow.height = 20;

    // Formatting & striping
    const isEven = rIdx % 2 === 0;
    const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    // Index cell
    const idxCell = dataRow.getCell(1);
    idxCell.alignment = { vertical: 'middle', horizontal: 'center' };
    idxCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
    idxCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF1F5F9' : 'FFE2E8F0' } };
    idxCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    // Church name cell
    const nameCell = dataRow.getCell(2);
    nameCell.alignment = { vertical: 'middle', horizontal: 'left' };
    nameCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    nameCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
    nameCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'medium', color: { argb: 'FFCBD5E1' } },
    };

    // Number cells
    activeColumns.forEach((_col, cIdx) => {
      const cell = dataRow.getCell(cIdx + 3);
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '$#,##0;($#,##0);"-"';
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBgColor } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    currentRowIdx++;
  });

  // 5. Totals Row (Σ)
  if (includeTotalsRow) {
    const totalRow = worksheet.getRow(currentRowIdx);
    const totalValues: (string | number)[] = ['Σ', `TOTAL (${activeRows.length} IGLESIAS)`];

    activeColumns.forEach((col) => {
      let colSum = 0;
      if (columnTotals[col.id] !== undefined) {
        colSum = columnTotals[col.id];
      } else {
        activeRows.forEach((row) => {
          let numVal = 0;
          if (Array.isArray(row.valores)) {
            const valObj = row.valores.find((v: any) => v.campo_id === col.id);
            const isCalc = col.modo_calculo === 'calculado' || valObj?.modo_calculo === 'calculado';
            const isOverridden = isCalc && valObj?.valor_manual !== null && valObj?.valor_manual !== undefined;
            numVal = Number(isCalc ? (isOverridden ? valObj?.valor_manual : (valObj?.valor_calculado || 0)) : (valObj?.valor_manual || 0));
          } else if (typeof row.valores === 'object' && row.valores !== null) {
            numVal = Number((row.valores as any)[col.id] || 0);
          }
          if (!isNaN(numVal)) colSum += numVal;
        });
      }
      totalValues.push(colSum);
    });

    totalRow.values = totalValues;
    totalRow.height = 24;

    for (let c = 1; c <= totalValues.length; c++) {
      const cell = totalRow.getCell(c);
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE2E8F0' }, // Slate-200
      };
      cell.border = {
        top: { style: 'double', color: { argb: 'FF475569' } },
        bottom: { style: 'medium', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };

      if (c === 1) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (c === 2) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '$#,##0;($#,##0);"-"';
      }
    }
  }

  // 6. Auto-fit column widths
  worksheet.columns.forEach((col, i) => {
    if (i === 0) {
      col.width = 6; // Index #
    } else if (i === 1) {
      let maxLen = 22;
      activeRows.forEach((r) => {
        if (r.iglesia_nombre && r.iglesia_nombre.length > maxLen) {
          maxLen = Math.min(r.iglesia_nombre.length + 2, 40);
        }
      });
      col.width = maxLen;
    } else {
      const colDef = activeColumns[i - 2];
      const headerLen = colDef ? colDef.nombre.length + 4 : 16;
      col.width = Math.max(headerLen, 16);
    }
  });

  // 7. Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}
