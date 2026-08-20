import { Test, TestingModule } from '@nestjs/testing';
import { PeriodosService } from './periodos.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoPeriodo } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PeriodosService', () => {
  let service: PeriodosService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    periodo: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where?.id || 'mock-id', ...args.data })),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-created-id', ...args.data })),
      findMany: jest.fn(),
    },
    iglesia: {
      findMany: jest.fn(),
    },
    campoPlantilla: {
      findMany: jest.fn(),
    },
    valor: {
      findUnique: jest.fn(),
      upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'mock-upsert-id', ...args.create })),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<PeriodosService>(PeriodosService);
    prisma = module.get<PrismaService>(PrismaService);
    historial = module.get<HistorialService>(HistorialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cerrarPeriodo', () => {
    it('should throw NotFoundException if period does not exist', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue(null);

      await expect(service.cerrarPeriodo('invalid-id', 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if period is already closed', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({
        id: 'period-id',
        estado: EstadoPeriodo.cerrado,
      });

      await expect(service.cerrarPeriodo('period-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should close the period, calculate accumulated values, and create the next period', async () => {
      const activePeriod = {
        id: 'period-january',
        nombre: 'Enero 2026',
        fecha_inicio: new Date(2026, 0, 1),
        fecha_fin: new Date(2026, 0, 31),
        estado: EstadoPeriodo.abierto,
      };

      mockPrismaService.periodo.findUnique.mockResolvedValue(activePeriod);
      mockPrismaService.iglesia.findMany.mockResolvedValue([{ id: 'church-1', nombre: 'Iglesia Central' }]);
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([
        { id: 'field-1', nombre: 'Diezmos', es_acumulable: true },
      ]);

      // Previous period query finds nothing (no previous accumulated values)
      mockPrismaService.periodo.findFirst.mockResolvedValue(null);
      
      // Current value for field-1 in january is 1000
      mockPrismaService.valor.findMany.mockResolvedValue([
        {
          iglesia_id: 'church-1',
          campo_id: 'field-1',
          valor_manual: 1000,
          valor_calculado: null,
        },
      ]);
      mockPrismaService.valor.findUnique.mockResolvedValue({
        campo_id: 'field-1',
        valor_manual: 1000,
        valor_calculado: null,
      });

      mockPrismaService.periodo.update.mockResolvedValue({
        ...activePeriod,
        estado: EstadoPeriodo.cerrado,
      });

      await service.cerrarPeriodo('period-january', 'user-123');

      // Check transaction closed period
      expect(mockPrismaService.periodo.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'period-january' },
        data: expect.objectContaining({ estado: EstadoPeriodo.cerrado }),
      }));

      // Check accumulable was upserted (0 prev + 1000 current = 1000)
      expect(mockPrismaService.valor.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          iglesia_id_campo_id_periodo_id: {
            iglesia_id: 'church-1',
            campo_id: 'field-1',
            periodo_id: 'period-january',
          },
        },
        update: { valor_acumulado: 1000 },
      }));

      // Check next period was auto-created (Febrero 2026 starts on 2026-02-01)
      expect(mockPrismaService.periodo.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          nombre: 'Febrero 2026',
          fecha_inicio: new Date(2026, 1, 1),
          estado: EstadoPeriodo.abierto,
        }),
      }));
    });
  });

  describe('reabrirPeriodo', () => {
    it('should throw BadRequestException if period is already open', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({
        id: 'period-id',
        estado: EstadoPeriodo.abierto,
      });

      await expect(service.reabrirPeriodo('period-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should open the period and log audit trail', async () => {
      const closedPeriod = {
        id: 'period-id',
        nombre: 'Enero 2026',
        estado: EstadoPeriodo.cerrado,
      };

      mockPrismaService.periodo.findUnique.mockResolvedValue(closedPeriod);
      mockPrismaService.periodo.update.mockResolvedValue({
        ...closedPeriod,
        estado: EstadoPeriodo.abierto,
      });

      await service.reabrirPeriodo('period-id', 'user-123');

      expect(mockPrismaService.periodo.update).toHaveBeenCalledWith({
        where: { id: 'period-id' },
        data: expect.objectContaining({
          estado: EstadoPeriodo.abierto,
          reabierto_por_id: 'user-123',
        }),
      });

      expect(mockHistorialService.log).toHaveBeenCalled();
    });
  });
});
