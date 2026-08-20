import { Test, TestingModule } from '@nestjs/testing';
import { FormulasService } from './formulas.service';
import { BadRequestException } from '@nestjs/common';
import { ModoCalculo } from '@prisma/client';

describe('FormulasService', () => {
  let service: FormulasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FormulasService],
    }).compile();

    service = module.get<FormulasService>(FormulasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractVariables', () => {
    it('should extract variables from a simple formula', () => {
      const vars = service.extractVariables('diezmos + ofrendas');
      expect(vars).toContain('diezmos');
      expect(vars).toContain('ofrendas');
      expect(vars.length).toBe(2);
    });

    it('should handle complex mathematical operators', () => {
      const vars = service.extractVariables('(total_ingresos - egresos) * 0.1');
      expect(vars).toContain('total_ingresos');
      expect(vars).toContain('egresos');
      expect(vars.length).toBe(2);
    });

    it('should throw BadRequestException for invalid formulas', () => {
      expect(() => service.extractVariables('diezmos +')).toThrow(BadRequestException);
    });
  });

  describe('evaluate', () => {
    it('should evaluate simple addition', () => {
      const result = service.evaluate('diezmos + ofrendas', {
        diezmos: 1000,
        ofrendas: 500,
      });
      expect(result).toBe(1500);
    });

    it('should default missing variables to 0', () => {
      const result = service.evaluate('diezmos + ofrendas', {
        diezmos: 1000,
      });
      expect(result).toBe(1000);
    });

    it('should handle operations with constants', () => {
      const result = service.evaluate('ingresos * 0.9 - egresos', {
        ingresos: 2000,
        egresos: 200,
      });
      expect(result).toBe(1600);
    });

    it('should return 0 on division by zero instead of Infinity/NaN', () => {
      const result = service.evaluate('ingresos / cero', {
        ingresos: 100,
        cero: 0,
      });
      expect(result).toBe(0);
    });

    it('should support ceil and redondear_arriba in formulas', () => {
      const res1 = service.evaluate('ceil(12.2)', {});
      expect(res1).toBe(13);

      const res2 = service.evaluate('redondear_arriba(125430 * 0.03, 1000)', {});
      // 125430 * 0.03 = 3762.9 -> ceil to 1000 is 4000
      expect(res2).toBe(4000);

      const res3 = service.evaluate('redondear_arriba(125430 * 0.03, 100)', {});
      // 3762.9 -> ceil to 100 is 3800
      expect(res3).toBe(3800);
    });

    it('should support floor and redondear_abajo in formulas', () => {
      const res1 = service.evaluate('floor(12.9)', {});
      expect(res1).toBe(12);

      const res2 = service.evaluate('redondear_abajo(125850 * 0.03, 1000)', {});
      // 125850 * 0.03 = 3775.5 -> floor to 1000 is 3000
      expect(res2).toBe(3000);

      const res3 = service.evaluate('redondear_abajo(125850 * 0.03, 100)', {});
      // 3775.5 -> floor to 100 is 3700
      expect(res3).toBe(3700);
    });

    it('should support round and redondear in formulas', () => {
      const res1 = service.evaluate('round(12.5)', {});
      expect(res1).toBe(13);

      const res2 = service.evaluate('redondear(125430 * 0.03, 1000)', {});
      // 3762.9 -> round to 1000 is 4000
      expect(res2).toBe(4000);

      const res3 = service.evaluate('redondear(125100 * 0.03, 1000)', {});
      // 125100 * 0.03 = 3753 -> round to 1000 is 4000, 3400 -> 3000
      const res4 = service.evaluate('redondear(100000 * 0.034, 1000)', {});
      // 3400 -> round to 1000 is 3000
      expect(res4).toBe(3000);
    });
  });

  describe('applyRounding', () => {
    it('should apply ceil rounding correctly', () => {
      expect(service.applyRounding(1234.56, 'arriba', 1000)).toBe(2000);
      expect(service.applyRounding(1234.56, 'arriba', 100)).toBe(1300);
      expect(service.applyRounding(1234.56, 'arriba', 1)).toBe(1235);
    });

    it('should apply floor rounding correctly', () => {
      expect(service.applyRounding(1890.56, 'abajo', 1000)).toBe(1000);
      expect(service.applyRounding(1890.56, 'abajo', 100)).toBe(1800);
      expect(service.applyRounding(1890.56, 'abajo', 1)).toBe(1890);
    });

    it('should apply standard rounding correctly', () => {
      expect(service.applyRounding(1499, 'estandar', 1000)).toBe(1000);
      expect(service.applyRounding(1500, 'estandar', 1000)).toBe(2000);
      expect(service.applyRounding(1450, 'estandar', 100)).toBe(1500);
    });

    it('should return untouched value when tipoRedondeo is ninguno or null', () => {
      expect(service.applyRounding(1234.56, 'ninguno', 1000)).toBe(1234.56);
      expect(service.applyRounding(1234.56, null, 1000)).toBe(1234.56);
    });
  });

  describe('sanitizeFormula', () => {
    it('should convert percentage notations to valid identifier slugs', () => {
      expect(service.sanitizeFormula('diezmos + 10% + 3%')).toBe('diezmos + c_10_porciento + c_3_porciento');
      expect(service.sanitizeFormula('ingreso_total - (revistas + 10% + 3%)')).toBe('ingreso_total - (revistas + c_10_porciento + c_3_porciento)');
    });

    it('should convert field names if allFields provided', () => {
      const allFields = [
        { id: '1', nombre: '10%', slug: 'c_10_porciento' },
        { id: '2', nombre: '3%', slug: 'c_3_porciento' },
        { id: '3', nombre: 'Diezmos', slug: 'diezmos' },
      ];
      expect(service.sanitizeFormula('Diezmos + 10% + 3%', allFields)).toBe('diezmos + c_10_porciento + c_3_porciento');
    });

    it('should correctly evaluate formulas containing percentage variables', () => {
      const res = service.evaluate('diezmos + 10% + 3%', {
        diezmos: 100000,
        c_10_porciento: 10000,
        c_3_porciento: 3000,
      });
      expect(res).toBe(113000);
    });
  });

  describe('checkCircularDependencies', () => {
    const allFields = [
      { id: '1', slug: 'diezmos', formula: null, modo_calculo: ModoCalculo.manual },
      { id: '2', slug: 'ofrendas', formula: null, modo_calculo: ModoCalculo.manual },
      { id: '3', slug: 'total_ingresos', formula: 'diezmos + ofrendas', modo_calculo: ModoCalculo.calculado },
    ];

    it('should not throw when there are no cycles', () => {
      expect(() => {
        service.checkCircularDependencies('4', 'saldo_neto', 'total_ingresos - 100', allFields);
      }).not.toThrow();
    });

    it('should throw BadRequestException when a direct circular reference is detected (A depends on A)', () => {
      expect(() => {
        service.checkCircularDependencies('4', 'saldo_neto', 'saldo_neto + 100', allFields);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when an indirect cycle is detected (A -> B -> A)', () => {
      const fieldListWithB = [
        ...allFields,
        { id: '4', slug: 'field_b', formula: 'field_a + 10', modo_calculo: ModoCalculo.calculado },
      ];

      expect(() => {
        service.checkCircularDependencies('5', 'field_a', 'field_b * 2', fieldListWithB);
      }).toThrow(BadRequestException);
    });
  });

  describe('topologicalSort', () => {
    it('should sort fields so dependencies are evaluated first', () => {
      const fields = [
        { id: '3', slug: 'saldo_neto', formula: 'total_ingresos - gastos', modo_calculo: ModoCalculo.calculado },
        { id: '1', slug: 'diezmos', formula: null, modo_calculo: ModoCalculo.manual },
        { id: '2', slug: 'total_ingresos', formula: 'diezmos + 50', modo_calculo: ModoCalculo.calculado },
        { id: '4', slug: 'gastos', formula: null, modo_calculo: ModoCalculo.manual },
      ];

      const sorted = service.topologicalSort(fields);
      
      const idxDiezmos = sorted.indexOf('1');
      const idxTotalIngresos = sorted.indexOf('2');
      const idxSaldoNeto = sorted.indexOf('3');
      const idxGastos = sorted.indexOf('4');

      // Diezmos and Gastos must be evaluated before TotalIngresos and SaldoNeto
      expect(idxDiezmos).toBeLessThan(idxTotalIngresos);
      expect(idxTotalIngresos).toBeLessThan(idxSaldoNeto);
      expect(idxGastos).toBeLessThan(idxSaldoNeto);
    });
  });
});
