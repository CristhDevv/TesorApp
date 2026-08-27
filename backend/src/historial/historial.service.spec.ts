import { Test, TestingModule } from '@nestjs/testing';
import { HistorialService } from './historial.service';
import { PrismaService } from '../prisma/prisma.service';
import { EntidadAuditoria, AccionAuditoria } from '@prisma/client';

describe('HistorialService', () => {
  let service: HistorialService;
  let prisma: PrismaService;

  const mockPrismaService = {
    historialCambios: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistorialService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HistorialService>(HistorialService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('debe registrar un evento de auditoría usando el cliente de prisma por defecto', async () => {
      const mockLogResult = { id: 'log-1' };
      mockPrismaService.historialCambios.create.mockResolvedValue(mockLogResult);

      const result = await service.log(null, {
        entidad: EntidadAuditoria.campo_plantilla,
        entidadId: 'c1',
        accion: AccionAuditoria.creacion,
        valorNuevo: { nombre: 'Diezmos' },
        realizadoPor: 'u1',
      });

      expect(result).toEqual(mockLogResult);
      expect(mockPrismaService.historialCambios.create).toHaveBeenCalledWith({
        data: {
          valor_id: null,
          entidad: EntidadAuditoria.campo_plantilla,
          entidad_id: 'c1',
          accion: AccionAuditoria.creacion,
          valor_anterior: null,
          valor_nuevo: { nombre: 'Diezmos' },
          realizado_por: 'u1',
        },
      });
    });

    it('debe usar el cliente de transacción provisto en prismaTx', async () => {
      const mockTx = {
        historialCambios: {
          create: jest.fn().mockResolvedValue({ id: 'tx-log-1' }),
        },
      };

      const result = await service.log(mockTx, {
        entidad: EntidadAuditoria.iglesia,
        entidadId: 'ig1',
        accion: AccionAuditoria.actualizacion,
        valorAnterior: { nombre: 'Antigua' },
        valorNuevo: { nombre: 'Nueva' },
        realizadoPor: 'u1',
      });

      expect(result).toEqual({ id: 'tx-log-1' });
      expect(mockTx.historialCambios.create).toHaveBeenCalled();
      expect(mockPrismaService.historialCambios.create).not.toHaveBeenCalled();
    });
  });

  describe('getHistorial', () => {
    it('debe consultar historial ordenado descendentemente con filtros', async () => {
      mockPrismaService.historialCambios.findMany.mockResolvedValue([{ id: 'h1' }]);

      const result = await service.getHistorial(EntidadAuditoria.iglesia, 'ig1');

      expect(result).toEqual([{ id: 'h1' }]);
      expect(mockPrismaService.historialCambios.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            entidad: EntidadAuditoria.iglesia,
            entidad_id: 'ig1',
          },
          orderBy: { realizado_en: 'desc' },
        }),
      );
    });
  });
});
