import { Test, TestingModule } from '@nestjs/testing';
import { TablasService } from './tablas.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TablasService', () => {
  let service: TablasService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    tabla: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    iglesia: {
      updateMany: jest.fn(),
    },
    camposPorTabla: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<TablasService>(TablasService);
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
    it('findAll debe retornar todas las tablas', async () => {
      mockPrismaService.tabla.findMany.mockResolvedValue([{ id: 't1', nombre: 'Distrito Central' }]);
      const res = await service.findAll();
      expect(res).toEqual([{ id: 't1', nombre: 'Distrito Central' }]);
    });

    it('findOne debe lanzar NotFoundException si no existe', async () => {
      mockPrismaService.tabla.findUnique.mockResolvedValue(null);
      await expect(service.findOne('t-invalida')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debe lanzar BadRequestException si el nombre ya existe', async () => {
      mockPrismaService.tabla.findUnique.mockResolvedValue({ id: 't1', nombre: 'Tabla 1' });

      await expect(
        service.create({ nombre: 'Tabla 1', iglesia_ids: [], campo_ids: [] }, 'u1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear tabla, asociar iglesias y campos, y auditar', async () => {
      mockPrismaService.tabla.findUnique
        .mockResolvedValueOnce(null) // Uniqueness check
        .mockResolvedValueOnce({ id: 't1', nombre: 'Tabla Nueva', iglesias: [], campos: [] }); // findOne inside transaction
      mockPrismaService.tabla.create.mockResolvedValue({ id: 't1', nombre: 'Tabla Nueva' });

      const res = await service.create(
        { nombre: 'Tabla Nueva', iglesia_ids: ['ig-1'], campo_ids: ['c1'] },
        'u1',
      );

      expect(res).toEqual(
        expect.objectContaining({ id: 't1', nombre: 'Tabla Nueva' }),
      );
      expect(mockPrismaService.iglesia.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['ig-1'] } },
        data: { tabla_id: 't1' },
      });
      expect(mockPrismaService.camposPorTabla.createMany).toHaveBeenCalled();
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'tabla',
          accion: 'creacion',
        }),
      );
    });
  });

  describe('update & remove', () => {
    it('update debe reordenar campos y actualizar iglesias asociadas', async () => {
      const existing = {
        id: 't1',
        nombre: 'Tabla Original',
        iglesias: [{ id: 'ig-1' }],
        campos: [{ campo_id: 'c1' }],
      };
      mockPrismaService.tabla.findUnique.mockResolvedValue(existing);
      mockPrismaService.tabla.findFirst.mockResolvedValue(null);

      const res = await service.update(
        't1',
        { nombre: 'Tabla Modificada', iglesia_ids: ['ig-2'], campo_ids: ['c2', 'c1'] },
        'u1',
      );

      expect(mockPrismaService.iglesia.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.camposPorTabla.createMany).toHaveBeenCalledWith({
        data: [
          { tabla_id: 't1', campo_id: 'c2', orden: 0 },
          { tabla_id: 't1', campo_id: 'c1', orden: 1 },
        ],
      });
      expect(mockHistorialService.log).toHaveBeenCalled();
    });

    it('remove debe desasociar iglesias, borrar campos y eliminar tabla', async () => {
      const existing = { id: 't1', nombre: 'Tabla a Borrar', iglesias: [], campos: [] };
      mockPrismaService.tabla.findUnique.mockResolvedValue(existing);

      const res = await service.remove('t1', 'u1');

      expect(res).toEqual({ message: 'Tabla eliminada exitosamente' });
      expect(mockPrismaService.iglesia.updateMany).toHaveBeenCalledWith({
        where: { tabla_id: 't1' },
        data: { tabla_id: null },
      });
      expect(mockPrismaService.tabla.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
      expect(mockHistorialService.log).toHaveBeenCalled();
    });
  });
});
