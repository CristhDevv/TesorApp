import { describe, it, expect } from 'vitest';
import { formatCOP, formatValueByType } from './formatters';

describe('formatters utility', () => {
  describe('formatCOP', () => {
    it('debe retornar $0 para valores null, undefined o NaN', () => {
      expect(formatCOP(null)).toBe('$0');
      expect(formatCOP(undefined)).toBe('$0');
      expect(formatCOP(NaN)).toBe('$0');
    });

    it('debe redondear y formatear correctamente valores en pesos colombianos', () => {
      expect(formatCOP(0)).toBe('$0');
      expect(formatCOP(1000)).toMatch(/^\$1[\.,]000$/);
      expect(formatCOP(1250500.6)).toMatch(/^\$1[\.,]250[\.,]501$/);
    });
  });

  describe('formatValueByType', () => {
    it('debe manejar valores nulos según el tipo', () => {
      expect(formatValueByType(null, 'moneda')).toBe('$0');
      expect(formatValueByType(null, 'porcentaje')).toBe('0');
      expect(formatValueByType(null, 'entero')).toBe('0');
    });

    it('debe formatear tipo moneda', () => {
      expect(formatValueByType(50000, 'moneda')).toMatch(/^\$50[\.,]000$/);
    });

    it('debe formatear tipo porcentaje', () => {
      expect(formatValueByType(15, 'porcentaje')).toBe('15%');
    });

    it('debe formatear tipo entero redondeando', () => {
      expect(formatValueByType(45.8, 'entero')).toBe('46');
    });

    it('debe formatear tipo decimal con hasta 2 decimales', () => {
      expect(formatValueByType(12.345, 'decimal')).toMatch(/^12[\.,]35$/);
    });
  });
});
