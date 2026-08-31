import { describe, it, expect } from 'vitest';
import { parseNumberFromExcelString, parseExcelClipboard } from './excelPasteParser';

describe('parseNumberFromExcelString', () => {
  it('parses plain numbers correctly', () => {
    expect(parseNumberFromExcelString('150000')).toEqual({ value: 150000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('0')).toEqual({ value: 0, isValid: true, isEmpty: false });
  });

  it('parses Colombian/Latin currency formats with dots for thousands', () => {
    expect(parseNumberFromExcelString('1.500.000')).toEqual({ value: 1500000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('$ 250.000')).toEqual({ value: 250000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('$1.250.000,50')).toEqual({ value: 1250000.5, isValid: true, isEmpty: false });
  });

  it('parses US formats with commas for thousands and dots for decimals', () => {
    expect(parseNumberFromExcelString('1,500,000')).toEqual({ value: 1500000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('$1,250,000.75')).toEqual({ value: 1250000.75, isValid: true, isEmpty: false });
  });

  it('parses negative numbers with minus or parentheses', () => {
    expect(parseNumberFromExcelString('-50000')).toEqual({ value: -50000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('(150.000)')).toEqual({ value: -150000, isValid: true, isEmpty: false });
    expect(parseNumberFromExcelString('($ 200,000.00)')).toEqual({ value: -200000, isValid: true, isEmpty: false });
  });

  it('handles empty, dash, and N/A values', () => {
    expect(parseNumberFromExcelString('')).toEqual({ value: null, isValid: false, isEmpty: true });
    expect(parseNumberFromExcelString('   ')).toEqual({ value: 0, isValid: true, isEmpty: true });
    expect(parseNumberFromExcelString('-')).toEqual({ value: 0, isValid: true, isEmpty: true });
    expect(parseNumberFromExcelString('N/A')).toEqual({ value: 0, isValid: true, isEmpty: true });
  });

  it('handles invalid text strings', () => {
    expect(parseNumberFromExcelString('Texto inválido').isValid).toBe(false);
  });
});

describe('parseExcelClipboard', () => {
  it('parses a multi-line column copied from Excel', () => {
    const raw = '150000\r\n250000\r\n350000\r\n';
    const result = parseExcelClipboard(raw);

    expect(result.rowCount).toBe(3);
    expect(result.isSingleColumn).toBe(true);
    expect(result.totalParsedAmount).toBe(750000);
    expect(result.rows[0].parsedNumber).toBe(150000);
    expect(result.rows[1].parsedNumber).toBe(250000);
    expect(result.rows[2].parsedNumber).toBe(350000);
  });

  it('detects and optionally ignores text headers', () => {
    const raw = 'Diezmos Mensuales\n100000\n200000';
    const result = parseExcelClipboard(raw, { ignoreHeader: true });

    expect(result.hasHeaderRow).toBe(true);
    expect(result.headerCandidate).toBe('Diezmos Mensuales');
    expect(result.rowCount).toBe(2);
    expect(result.rows[0].parsedNumber).toBe(100000);
    expect(result.rows[1].parsedNumber).toBe(200000);
    expect(result.totalParsedAmount).toBe(300000);
  });

  it('handles empty cells as zero when emptyAsZero is true', () => {
    const raw = '100000\n-\n200000';
    const result = parseExcelClipboard(raw, { emptyAsZero: true });

    expect(result.rowCount).toBe(3);
    expect(result.rows[1].parsedNumber).toBe(0);
    expect(result.totalParsedAmount).toBe(300000);
  });
});
