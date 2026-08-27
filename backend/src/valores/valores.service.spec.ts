import { Test, TestingModule } from '@nestjs/testing';
import { ValoresService } from './valores.service';
import { PrismaService } from '../prisma/prisma.service';
import { FormulasService } from '../formulas/formulas.service';
import { HistorialService } from '../historial/historial.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EstadoPeriodo, ModoCalculo } from '@prisma/client';

describe('ValoresService', () => {
  let service: ValoresService;

  const mockPrismaService = {
    iglesia: { findUnique: jest.fn(), findMany: jest.fn() },
    periodo: { findUnique: jest.fn(), findMany: jest.fn() },
    campoPlantilla: { findMany: jest.fn(), findUnique: jest.fn() },
    valor: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    permisoEdicion: { findMany: jest.fn(), findUnique: jest.fn() },
    informePeriodo: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
    $transaction: jest.fn((ops) => (Array.isArray(ops) ? Promise.all(ops) : ops(mockPrismaService))),
  };

  const mockFormulasService = {
    topologicalSort: jest.fn().mockReturnValue([]),
    evaluate: jest.fn().mockReturnValue(0),
    applyRounding: jest.fn((val) => val),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValoresService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FormulasService, useValue: mockFormulasService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<ValoresService>(ValoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findValues', () => {
    it('debe lanzar ForbiddenException si un usuario iglesia intenta consultar otra iglesia', async () => {
      await expect(
        service.findValues('iglesia-A', 'periodo-1', 'iglesia', 'iglesia-B'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si la iglesia no existe', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue(null);
      await expect(
        service.findValues('iglesia-A', 'periodo-1', 'tesorero'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBatchValues', () => {
    it('debe rechazar edición si el periodo está cerrado y el usuario no es tesorero', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({
        id: 'p1',
        estado: EstadoPeriodo.cerrado,
      });

      await expect(
        service.updateBatchValues('iglesia-1', 'p1', [{ campo_id: 'c1', valor_manual: 100 }], 'u1', 'iglesia', 'iglesia-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar ForbiddenException si la iglesia intenta editar un campo con permiso bloqueado', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({
        id: 'p1',
        estado: EstadoPeriodo.abierto,
      });
      mockPrismaService.permisoEdicion.findMany.mockResolvedValue([
        { iglesia_id: 'iglesia-1', campo_id: 'c1', editable_por_iglesia: false },
      ]);

      await expect(
        service.updateBatchValues('iglesia-1', 'p1', [{ campo_id: 'c1', valor_manual: 100 }], 'u1', 'iglesia', 'iglesia-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
