import { Test, TestingModule } from '@nestjs/testing';
import { PermisosService } from './permisos.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { NotFoundException } from '@nestjs/common';
import { ModoCalculo, TipoCampo } from '@prisma/client';

describe('PermisosService', () => {
  let service: PermisosService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    iglesia: {
      findUnique: jest.fn(),
    },
    campoPlantilla: {
      findMany: jest.fn(),
    },
    permisoEdicion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<PermisosService>(PermisosService);
    prisma = module.get<PrismaService>(PrismaService);
    historial = module.get<HistorialService>(HistorialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findByIglesia', () => {
    it('debe lanzar NotFoundException si la iglesia no existe', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue(null);

      await expect(service.findByIglesia('ig-999')).rejects.toThrow(NotFoundException);
    });

    it('debe retornar lista de campos con su estado de permiso de edición', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue({ id: 'ig-1' });
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([
        {
          id: 'c1',
          nombre: 'Diezmos',
          slug: 'diezmos',
          seccion: 'Ingresos',
          tipo: TipoCampo.moneda,
          modo_calculo: ModoCalculo.manual,
          formula: null,
          orden: 1,
          visible_para_iglesia: true,
        },
        {
          id: 'c2',
          nombre: 'Total',
          slug: 'total',
          seccion: 'Ingresos',
          tipo: TipoCampo.moneda,
          modo_calculo: ModoCalculo.calculado,
          formula: 'diezmos',
          orden: 2,
          visible_para_iglesia: true,
        },
      ]);
      mockPrismaService.permisoEdicion.findMany.mockResolvedValue([
        { campo_id: 'c1', editable_por_iglesia: false },
      ]);

      const result = await service.findByIglesia('ig-1');

      expect(result).toHaveLength(2);
      expect(result[0].editable_por_iglesia).toBe(false); // Overridden in DB
      expect(result[1].editable_por_iglesia).toBe(false); // Calculated field defaults to false
    });
  });

  describe('updatePermisos', () => {
    it('debe lanzar NotFoundException si la iglesia no existe', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue(null);

      await expect(service.updatePermisos('ig-999', [], 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe guardar permisos y registrar auditoría', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue({ id: 'ig-1' });
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([{ id: 'c1' }]);
      mockPrismaService.permisoEdicion.findUnique.mockResolvedValue(null);
      mockPrismaService.permisoEdicion.upsert.mockResolvedValue({
        id: 'p1',
        iglesia_id: 'ig-1',
        campo_id: 'c1',
        editable_por_iglesia: true,
      });

      const result = await service.updatePermisos(
        'ig-1',
        [{ campo_id: 'c1', editable_por_iglesia: true }],
        'u1',
      );

      expect(result).toHaveLength(1);
      expect(mockPrismaService.permisoEdicion.upsert).toHaveBeenCalled();
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'permiso_edicion',
          accion: 'creacion',
        }),
      );
    });
  });
});
