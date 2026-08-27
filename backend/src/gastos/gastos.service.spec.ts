import { Test, TestingModule } from '@nestjs/testing';
import { GastosService } from './gastos.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('GastosService', () => {
  let service: GastosService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    gasto: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    periodo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    campoPlantilla: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    valor: {
      groupBy: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GastosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<GastosService>(GastosService);
    prisma = module.get<PrismaService>(PrismaService);
    historial = module.get<HistorialService>(HistorialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll & findOne', () => {
    it('findAll debe consultar gastos con filtros opcionales', async () => {
      mockPrismaService.gasto.findMany.mockResolvedValue([{ id: 'g1', monto: 50000 }]);

      const result = await service.findAll('p1', 'f1');
      expect(result).toEqual([{ id: 'g1', monto: 50000 }]);
      expect(mockPrismaService.gasto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { periodo_id: 'p1', campo_fondo_id: 'f1' },
        }),
      );
    });

    it('findOne debe retornar gasto si existe', async () => {
      mockPrismaService.gasto.findUnique.mockResolvedValue({ id: 'g1', monto: 50000 });

      const result = await service.findOne('g1');
      expect(result).toEqual({ id: 'g1', monto: 50000 });
    });

    it('findOne debe lanzar NotFoundException si no existe', async () => {
      mockPrismaService.gasto.findUnique.mockResolvedValue(null);

      await expect(service.findOne('g999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getResumen', () => {
    it('debe lanzar BadRequestException si falta periodoId', async () => {
      await expect(service.getResumen('')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si periodo no existe', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue(null);
      await expect(service.getResumen('p-invalido')).rejects.toThrow(NotFoundException);
    });

    it('debe calcular resumen de fondos, gastos y saldos por periodo y acumulado', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({
        id: 'p1',
        fecha_fin: new Date(2026, 0, 31),
      });
      mockPrismaService.periodo.findMany.mockResolvedValue([{ id: 'p1' }]);
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([
        {
          id: 'f1',
          nombre: 'Fondo Templo',
          slug: 'fondo_templo',
          es_acumulable: true,
          es_transito: false,
          ente_superior_nombre: null,
          seccion: 'Fondos',
          orden: 1,
        },
      ]);
      mockPrismaService.gasto.groupBy
        .mockResolvedValueOnce([{ campo_fondo_id: 'f1', _sum: { monto: 20000 } }]) // periodGastos
        .mockResolvedValueOnce([{ campo_fondo_id: 'f1', _sum: { monto: 20000 } }]); // accumGastos
      mockPrismaService.valor.groupBy
        .mockResolvedValueOnce([
          {
            campo_id: 'f1',
            _sum: { valor_manual: 100000, valor_calculado: 0, valor_acumulado: 100000 },
          },
        ]) // currentValores
        .mockResolvedValueOnce([
          { campo_id: 'f1', _sum: { valor_manual: 100000, valor_calculado: 0 } },
        ]); // priorValores

      const resumen = await service.getResumen('p1');

      expect(resumen).toHaveLength(1);
      expect(resumen[0]).toEqual(
        expect.objectContaining({
          campo_fondo_id: 'f1',
          fondo_periodo: 100000,
          gastos_periodo: 20000,
          saldo_periodo: 80000,
          fondo_acumulado: 100000,
          gastos_acumulados: 20000,
          saldo_disponible: 80000,
        }),
      );
    });
  });

  describe('create', () => {
    it('debe denegar creación si el rol no es tesorero', async () => {
      await expect(
        service.create(
          {
            descripcion: 'Reparación techo',
            monto: 50000,
            fecha: '2026-01-15',
            periodo_id: 'p1',
            campo_fondo_id: 'f1',
          },
          'u1',
          'iglesia',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar creación si el periodo está cerrado', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1', estado: 'cerrado' });

      await expect(
        service.create(
          {
            descripcion: 'Reparación',
            monto: 50000,
            fecha: '2026-01-15',
            periodo_id: 'p1',
            campo_fondo_id: 'f1',
          },
          'u1',
          'tesorero',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar creación si el campo no está configurado como fondo', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1', estado: 'abierto' });
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'c1', es_fondo: false });

      await expect(
        service.create(
          {
            descripcion: 'Reparación',
            monto: 50000,
            fecha: '2026-01-15',
            periodo_id: 'p1',
            campo_fondo_id: 'c1',
          },
          'u1',
          'tesorero',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar creación si el monto es menor o igual a cero', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1', estado: 'abierto' });
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'f1', es_fondo: true });

      await expect(
        service.create(
          {
            descripcion: 'Reparación',
            monto: 0,
            fecha: '2026-01-15',
            periodo_id: 'p1',
            campo_fondo_id: 'f1',
          },
          'u1',
          'tesorero',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear gasto y registrar auditoría exitosamente', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p1', estado: 'abierto' });
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'f1', es_fondo: true });
      const createdGasto = { id: 'g1', monto: 50000, descripcion: 'Reparación' };
      mockPrismaService.gasto.create.mockResolvedValue(createdGasto);

      const res = await service.create(
        {
          descripcion: 'Reparación',
          monto: 50000,
          fecha: '2026-01-15',
          periodo_id: 'p1',
          campo_fondo_id: 'f1',
        },
        'u1',
        'tesorero',
      );

      expect(res).toEqual(createdGasto);
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'gasto',
          accion: 'creacion',
        }),
      );
    });
  });

  describe('update & remove', () => {
    it('update debe denegar acceso a no tesoreros', async () => {
      await expect(service.update('g1', { monto: 1000 }, 'u1', 'iglesia')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('remove debe eliminar gasto y auditar', async () => {
      const original = { id: 'g1', monto: 50000 };
      mockPrismaService.gasto.findUnique.mockResolvedValue(original);
      mockPrismaService.gasto.delete.mockResolvedValue(original);

      const res = await service.remove('g1', 'u1', 'tesorero');
      expect(res).toEqual(original);
      expect(mockPrismaService.gasto.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'gasto',
          accion: 'eliminacion',
        }),
      );
    });
  });
});
