import { Test, TestingModule } from '@nestjs/testing';
import { ReportesService } from './reportes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ReportesService', () => {
  let service: ReportesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    campoPlantilla: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    periodo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    iglesia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    valor: {
      findMany: jest.fn(),
    },
    camposPorIglesia: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportesService>(ReportesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getComparacion', () => {
    it('debe lanzar ForbiddenException si usuario iglesia consulta otra sede', async () => {
      await expect(
        service.getComparacion('ig-1', 'c1', '2026-01-01', '2026-03-31', 'iglesia', 'ig-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el campo no existe', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue(null);

      await expect(
        service.getComparacion('ig-1', 'c-invalido', '2026-01-01', '2026-03-31', 'tesorero'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe calcular la evolución y variación porcentual interperiódica', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'c1', nombre: 'Diezmos' });
      mockPrismaService.periodo.findMany.mockResolvedValue([
        { id: 'p1', nombre: 'Enero 2026', fecha_inicio: new Date('2026-01-01') },
        { id: 'p2', nombre: 'Febrero 2026', fecha_inicio: new Date('2026-02-01') },
      ]);
      mockPrismaService.valor.findMany.mockResolvedValue([
        { periodo_id: 'p1', valor_manual: 1000, valor_acumulado: 1000 },
        { periodo_id: 'p2', valor_manual: 1500, valor_acumulado: 2500 },
      ]);

      const result = await service.getComparacion(
        'ig-1',
        'c1',
        '2026-01-01',
        '2026-02-28',
        'tesorero',
      );

      expect(result).toHaveLength(2);
      expect(result[0].valor).toBe(1000);
      expect(result[0].variacion_porcentual).toBe(0); // Primer periodo
      expect(result[1].valor).toBe(1500);
      expect(result[1].variacion_porcentual).toBe(50); // ((1500-1000)/1000)*100 = 50%
    });
  });

  describe('getConsolidado', () => {
    it('debe retornar lista consolidada de iglesias activas', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrismaService.iglesia.findMany.mockResolvedValue([
        { id: 'ig-1', nombre: 'Iglesia Central', identificador_interno: 'IG-001' },
      ]);
      mockPrismaService.valor.findMany.mockResolvedValue([
        { iglesia_id: 'ig-1', valor_manual: 5000, valor_acumulado: 10000 },
      ]);

      const result = await service.getConsolidado('c1', 'p1');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        iglesia_id: 'ig-1',
        iglesia_nombre: 'Iglesia Central',
        identificador_interno: 'IG-001',
        valor: 5000,
        valor_acumulado: 10000,
      });
    });
  });

  describe('exportarExcel', () => {
    it('debe generar un libro de trabajo Excel con hojas formateadas', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1', nombre: 'Enero 2026' });
      mockPrismaService.iglesia.findMany.mockResolvedValue([
        { id: 'ig-1', nombre: 'Iglesia Central', identificador_interno: 'IG-001' },
      ]);
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Diezmos', modo_calculo: 'manual', aplica_a_todas_las_iglesias: true },
      ]);
      mockPrismaService.camposPorIglesia.findMany.mockResolvedValue([]);
      mockPrismaService.valor.findMany.mockResolvedValue([
        { iglesia_id: 'ig-1', campo_id: 'c1', valor_manual: 1000, valor_acumulado: 1000 },
      ]);

      const workbook = await service.exportarExcel('p1', 'tesorero');

      expect(workbook).toBeDefined();
      expect(workbook.worksheets.length).toBeGreaterThan(0);
    });
  });
});
