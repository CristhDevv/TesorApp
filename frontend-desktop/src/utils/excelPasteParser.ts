/**
 * Utility for parsing clipboard data copied from Microsoft Excel, Google Sheets, LibreOffice Calc, or CSV/TSV.
 */

export interface ParsedPasteRow {
  raw: string;
  rawValue: string;
  parsedNumber: number | null;
  isValidNumber: boolean;
  isEmpty: boolean;
}

export interface ParsedPasteResult {
  rawText: string;
  rowCount: number;
  colCount: number;
  isSingleColumn: boolean;
  hasHeaderRow: boolean;
  headerCandidate: string | null;
  rows: ParsedPasteRow[];
  totalParsedAmount: number;
}

/**
 * Parses a formatted number string into a clean numeric float.
 * Handles Colombian/Latin American formatting (1.500.000,50), US formatting (1,500,000.50),
 * currency signs ($ COP USD), negatives in parentheses (100.000) or minus -100.000.
 */
export function parseNumberFromExcelString(str: string): { value: number | null; isValid: boolean; isEmpty: boolean } {
  if (!str) {
    return { value: null, isValid: false, isEmpty: true };
  }

  const trimmed = str.trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '—' || trimmed === 'N/A' || trimmed === 'n/a') {
    return { value: 0, isValid: true, isEmpty: true };
  }

  // Check for negative in parentheses: (1.500.000) or ($ 1.500.000)
  let isNegative = false;
  let cleanStr = trimmed;

  if (/^\(.*\)$/.test(cleanStr)) {
    isNegative = true;
    cleanStr = cleanStr.slice(1, -1).trim();
  } else if (cleanStr.startsWith('-')) {
    isNegative = true;
    cleanStr = cleanStr.slice(1).trim();
  }

  // Remove currency signs, letters, percent signs, and spaces
  cleanStr = cleanStr.replace(/[$€£¥COP|USD|col|cop|usd|\s%]/gi, '');

  if (cleanStr === '') {
    return { value: 0, isValid: true, isEmpty: true };
  }

  // Check formatting:
  const hasDot = cleanStr.includes('.');
  const hasComma = cleanStr.includes(',');

  let finalNumberStr = cleanStr;

  if (hasDot && hasComma) {
    const lastDot = cleanStr.lastIndexOf('.');
    const lastComma = cleanStr.lastIndexOf(',');
    if (lastComma > lastDot) {
      // e.g. 1.500.000,50 -> dot is thousand, comma is decimal
      finalNumberStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. 1,500,000.50 -> comma is thousand, dot is decimal
      finalNumberStr = cleanStr.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const dotParts = cleanStr.split('.');
    if (dotParts.length > 2) {
      // Multiple dots -> 1.500.000 (thousands separators)
      finalNumberStr = cleanStr.replace(/\./g, '');
    } else if (dotParts.length === 2) {
      // Single dot: e.g. 1.500 (3 digits after dot -> thousand separator in CO)
      // vs 1.50 or 1.5 (1 or 2 digits after dot -> decimal)
      if (dotParts[1].length === 3 && dotParts[0].length <= 3) {
        finalNumberStr = cleanStr.replace('.', '');
      } else {
        finalNumberStr = cleanStr; // normal decimal
      }
    }
  } else if (hasComma && !hasDot) {
    const commaParts = cleanStr.split(',');
    if (commaParts.length > 2) {
      // Multiple commas -> 1,500,000 (thousands separators)
      finalNumberStr = cleanStr.replace(/,/g, '');
    } else if (commaParts.length === 2) {
      if (commaParts[1].length === 3 && commaParts[0].length <= 3) {
        // e.g. 1,500 (thousand)
        finalNumberStr = cleanStr.replace(',', '');
      } else {
        // e.g. 1500,50 (decimal)
        finalNumberStr = cleanStr.replace(',', '.');
      }
    }
  }

  const num = parseFloat(finalNumberStr);
  if (isNaN(num)) {
    return { value: null, isValid: false, isEmpty: false };
  }

  const finalVal = isNegative ? -Math.abs(num) : Math.abs(num);
  return { value: finalVal, isValid: true, isEmpty: false };
}

/**
 * Parses multi-line clipboard text copied from Excel or spreadsheets.
 */
export function parseExcelClipboard(
  rawText: string,
  options?: {
    emptyAsZero?: boolean;
    ignoreHeader?: boolean;
  }
): ParsedPasteResult {
  const { emptyAsZero = true, ignoreHeader = false } = options || {};

  if (!rawText || typeof rawText !== 'string') {
    return {
      rawText: '',
      rowCount: 0,
      colCount: 0,
      isSingleColumn: true,
      hasHeaderRow: false,
      headerCandidate: null,
      rows: [],
      totalParsedAmount: 0,
    };
  }

  // Normalize line endings
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n');

  // Remove trailing blank lines produced by Excel copy
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    return {
      rawText,
      rowCount: 0,
      colCount: 0,
      isSingleColumn: true,
      hasHeaderRow: false,
      headerCandidate: null,
      rows: [],
      totalParsedAmount: 0,
    };
  }

  let maxCols = 1;
  const splitGrid: string[][] = lines.map((line) => {
    // Excel columns are separated by tabs
    const cells = line.split('\t');
    if (cells.length > maxCols) maxCols = cells.length;
    return cells;
  });

  const isSingleColumn = maxCols === 1;

  // Check if first row might be a text header (e.g. "Diezmos", "Total", "Valor")
  let hasHeaderRow = false;
  let headerCandidate: string | null = null;

  if (splitGrid.length > 1) {
    const firstCell = splitGrid[0][0]?.trim() || '';
    const secondCell = splitGrid[1][0]?.trim() || '';
    const firstParsed = parseNumberFromExcelString(firstCell);
    const secondParsed = parseNumberFromExcelString(secondCell);

    if (!firstParsed.isValid && !firstParsed.isEmpty && secondParsed.isValid) {
      hasHeaderRow = true;
      headerCandidate = firstCell;
    }
  }

  const effectiveGrid = (hasHeaderRow && ignoreHeader) ? splitGrid.slice(1) : splitGrid;

  const rows: ParsedPasteRow[] = [];
  let totalParsedAmount = 0;

  for (let i = 0; i < effectiveGrid.length; i++) {
    const rawLine = lines[i + ((hasHeaderRow && ignoreHeader) ? 1 : 0)] || '';
    const cellValue = effectiveGrid[i][0] ?? '';
    const parsed = parseNumberFromExcelString(cellValue);

    let numVal: number | null = parsed.value;
    if (parsed.isEmpty && emptyAsZero) {
      numVal = 0;
    }

    if (numVal !== null && !isNaN(numVal)) {
      totalParsedAmount += numVal;
    }

    rows.push({
      raw: rawLine,
      rawValue: cellValue.trim(),
      parsedNumber: numVal,
      isValidNumber: parsed.isValid || (parsed.isEmpty && emptyAsZero),
      isEmpty: parsed.isEmpty,
    });
  }

  return {
    rawText,
    rowCount: rows.length,
    colCount: maxCols,
    isSingleColumn,
    hasHeaderRow,
    headerCandidate,
    rows,
    totalParsedAmount,
  };
}
