import { Test, TestingModule } from '@nestjs/testing';
import { InformesService } from './informes.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoInforme } from '@prisma/client';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('InformesService', () => {
  let service: InformesService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    informePeriodo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    periodo: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InformesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<InformesService>(InformesService);
    prisma = module.get<PrismaService>(PrismaService);
    historial = module.get<HistorialService>(HistorialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getInforme', () => {
    it('debe retornar estado borrador por defecto si aún no existe informe en la base de datos', async () => {
      mockPrismaService.informePeriodo.findUnique.mockResolvedValue(null);

      const result = await service.getInforme('ig-1', 'p-1');

      expect(result).toEqual({
        id: null,
        iglesia_id: 'ig-1',
        periodo_id: 'p-1',
        estado: EstadoInforme.borrador,
        enviado_por: null,
        enviado_en: null,
        revisado_por: null,
        revisado_en: null,
        aprobado_por: null,
        aprobado_en: null,
        observaciones: null,
      });
    });

    it('debe retornar el informe existente si ya está registrado', async () => {
      const existing = {
        id: 'inf-1',
        iglesia_id: 'ig-1',
        periodo_id: 'p-1',
        estado: EstadoInforme.enviado,
      };
      mockPrismaService.informePeriodo.findUnique.mockResolvedValue(existing);

      const result = await service.getInforme('ig-1', 'p-1');
      expect(result).toEqual(existing);
    });
  });

  describe('enviarInforme', () => {
    it('debe lanzar ForbiddenException si un usuario de iglesia intenta enviar el informe de otra iglesia', async () => {
      await expect(
        service.enviarInforme('ig-1', 'p-1', 'u-1', 'iglesia', 'ig-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el periodo no existe', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue(null);

      await expect(
        service.enviarInforme('ig-1', 'p-999', 'u-1', 'iglesia', 'ig-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si el periodo está cerrado', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p-1', estado: 'cerrado' });

      await expect(
        service.enviarInforme('ig-1', 'p-1', 'u-1', 'iglesia', 'ig-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe marcar el informe como enviado y registrar auditoría', async () => {
      mockPrismaService.periodo.findUnique.mockResolvedValue({ id: 'p-1', estado: 'abierto' });
      mockPrismaService.informePeriodo.findUnique.mockResolvedValue(null);
      const updatedInforme = {
        id: 'inf-1',
        iglesia_id: 'ig-1',
        periodo_id: 'p-1',
        estado: EstadoInforme.enviado,
      };
      mockPrismaService.informePeriodo.upsert.mockResolvedValue(updatedInforme);

      const result = await service.enviarInforme('ig-1', 'p-1', 'u-1', 'iglesia', 'ig-1');

      expect(result).toEqual(updatedInforme);
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'informe_periodo',
          accion: 'creacion',
        }),
      );
    });
  });

  describe('cambiarEstado & consolidarTodos', () => {
    it('cambiarEstado debe denegar acceso a no tesoreros', async () => {
      await expect(
        service.cambiarEstado(
          'ig-1',
          'p-1',
          { estado: EstadoInforme.aprobado },
          'u-1',
          'iglesia',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('consolidarTodos debe actualizar todos los informes aprobados/enviados a consolidado', async () => {
      mockPrismaService.informePeriodo.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.consolidarTodos('p-1', 'u-1', 'tesorero');

      expect(result).toEqual({ consolidados: 5 });
      expect(mockPrismaService.informePeriodo.updateMany).toHaveBeenCalledWith({
        where: {
          periodo_id: 'p-1',
          estado: { in: [EstadoInforme.aprobado, EstadoInforme.enviado] },
        },
        data: expect.objectContaining({
          estado: EstadoInforme.consolidado,
          aprobado_por_id: 'u-1',
        }),
      });
    });
  });
});
