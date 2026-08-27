import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFormulaEvaluation } from './useFormulaEvaluation';
import type { Campo, FilaGrid } from '../types/contabilidad';

describe('useFormulaEvaluation hook', () => {
  const mockFields: Campo[] = [
    {
      id: 'f1',
      nombre: 'Diezmos',
      slug: 'diezmos',
      tipo: 'moneda',
      modo_calculo: 'manual',
      formula: null,
      seccion: 'Ingresos',
      orden: 1,
    } as any,
    {
      id: 'f2',
      nombre: 'Ofrendas',
      slug: 'ofrendas',
      tipo: 'moneda',
      modo_calculo: 'manual',
      formula: null,
      seccion: 'Ingresos',
      orden: 2,
    } as any,
    {
      id: 'f3',
      nombre: 'Total Ingresos',
      slug: 'total_ingresos',
      tipo: 'moneda',
      modo_calculo: 'calculado',
      formula: 'diezmos + ofrendas',
      seccion: 'Ingresos',
      orden: 3,
    } as any,
  ];

  const mockRows: FilaGrid[] = [
    {
      iglesia_id: 'ig-1',
      iglesia_nombre: 'Iglesia Central',
      valores: [
        { campo_id: 'f1', slug: 'diezmos', modo_calculo: 'manual', valor_manual: 1000 },
        { campo_id: 'f2', slug: 'ofrendas', modo_calculo: 'manual', valor_manual: 500 },
        { campo_id: 'f3', slug: 'total_ingresos', modo_calculo: 'calculado', valor_calculado: 1500 },
      ],
    } as any,
  ];

  it('debe evaluar variables y devolver valores calculados', () => {
    const { result } = renderHook(() =>
      useFormulaEvaluation({
        allFields: mockFields,
        rows: mockRows,
      }),
    );

    expect(result.current.getValue('ig-1', 'f1')).toBe(1000);
    expect(result.current.getValue('ig-1', 'f2')).toBe(500);
    expect(result.current.getValue('ig-1', 'f3')).toBe(1500);
  });

  it('debe recalcular campos derivados al aplicar overrides locales', () => {
    const { result } = renderHook(() =>
      useFormulaEvaluation({
        allFields: mockFields,
        rows: mockRows,
        localOverrides: {
          'ig-1__f1': 2000, // diezmó 2000 en vez de 1000
        },
      }),
    );

    expect(result.current.getValue('ig-1', 'f1')).toBe(2000);
    expect(result.current.getValue('ig-1', 'f3')).toBe(2500); // 2000 + 500
  });

  it('debe evaluar fórmulas con max(0, ...) y evitar valores negativos', () => {
    const fieldsWithMax: Campo[] = [
      ...mockFields,
      {
        id: 'f4',
        nombre: 'Deducciones',
        slug: 'deducciones',
        tipo: 'moneda',
        modo_calculo: 'manual',
        formula: null,
      } as any,
      {
        id: 'f5',
        nombre: 'Saldo Neto',
        slug: 'saldo_neto',
        tipo: 'moneda',
        modo_calculo: 'calculado',
        formula: 'max(0, total_ingresos - deducciones)',
        tipo_redondeo: 'arriba',
        multiplo_redondeo: 1000,
      } as any,
    ];

    const rowsWithDeficit: FilaGrid[] = [
      {
        iglesia_id: 'ig-2',
        iglesia_nombre: 'Iglesia Balboa',
        valores: [
          { campo_id: 'f1', slug: 'diezmos', modo_calculo: 'manual', valor_manual: 0 },
          { campo_id: 'f2', slug: 'ofrendas', modo_calculo: 'manual', valor_manual: 0 },
          { campo_id: 'f3', slug: 'total_ingresos', modo_calculo: 'calculado', valor_calculado: 0 },
          { campo_id: 'f4', slug: 'deducciones', modo_calculo: 'manual', valor_manual: 48000 },
          { campo_id: 'f5', slug: 'saldo_neto', modo_calculo: 'calculado', valor_calculado: 0 },
        ],
      } as any,
    ];

    const { result } = renderHook(() =>
      useFormulaEvaluation({
        allFields: fieldsWithMax,
        rows: rowsWithDeficit,
      }),
    );

    // Total ingresos is 0, deducciones is 48000. Saldo neto should be 0 (not negative -48000)
    expect(result.current.getValue('ig-2', 'f5')).toBe(0);
  });

  it('debe respetar overrides en campos calculados', () => {
    const fields: Campo[] = [
      {
        id: 'f_pct',
        nombre: '3%',
        slug: 'c_3_porciento',
        tipo: 'moneda',
        modo_calculo: 'calculado',
        formula: 'diezmos * 0.03',
      } as any,
    ];

    const rows: FilaGrid[] = [
      {
        iglesia_id: 'ig-3',
        iglesia_nombre: 'Iglesia 3',
        valores: [
          { campo_id: 'f_pct', slug: 'c_3_porciento', modo_calculo: 'calculado', valor_manual: 48000, valor_calculado: 48000 },
        ],
      } as any,
    ];

    const { result } = renderHook(() =>
      useFormulaEvaluation({
        allFields: fields,
        rows: rows,
      }),
    );

    expect(result.current.getValue('ig-3', 'f_pct')).toBe(48000);
  });
});
