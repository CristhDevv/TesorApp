import { Test, TestingModule } from '@nestjs/testing';
import { IglesiasService } from './iglesias.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { EstadoIglesia } from '@prisma/client';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('IglesiasService', () => {
  let service: IglesiasService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    iglesia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: {
      count: jest.fn(),
    },
    valor: {
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    permisoEdicion: {
      deleteMany: jest.fn(),
    },
    camposPorIglesia: {
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
        IglesiasService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<IglesiasService>(IglesiasService);
    prisma = module.get<PrismaService>(PrismaService);
    historial = module.get<HistorialService>(HistorialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('debe filtrar por iglesiaId cuando el rol es iglesia', async () => {
      const mockChurch = [{ id: 'ig-1', nombre: 'Iglesia Central', estado: EstadoIglesia.activa }];
      mockPrismaService.iglesia.findMany.mockResolvedValue(mockChurch);

      const result = await service.findAll('iglesia', 'ig-1');

      expect(result).toEqual(mockChurch);
      expect(mockPrismaService.iglesia.findMany).toHaveBeenCalledWith({
        where: { id: 'ig-1', estado: EstadoIglesia.activa },
        orderBy: { nombre: 'asc' },
      });
    });

    it('debe retornar lista completa para rol tesorero', async () => {
      const mockChurches = [{ id: 'ig-1' }, { id: 'ig-2' }];
      mockPrismaService.iglesia.findMany.mockResolvedValue(mockChurches);

      const result = await service.findAll('tesorero');

      expect(result).toEqual(mockChurches);
      expect(mockPrismaService.iglesia.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('debe lanzar ForbiddenException si usuario iglesia intenta ver otra congregación', async () => {
      await expect(service.findOne('ig-2', 'iglesia', 'ig-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar NotFoundException si no existe la iglesia', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue(null);

      await expect(service.findOne('ig-invalida', 'tesorero')).rejects.toThrow(NotFoundException);
    });

    it('debe retornar los datos de la iglesia', async () => {
      const church = { id: 'ig-1', nombre: 'Iglesia Central' };
      mockPrismaService.iglesia.findUnique.mockResolvedValue(church);

      const result = await service.findOne('ig-1', 'tesorero');
      expect(result).toEqual(church);
    });
  });

  describe('create', () => {
    it('debe lanzar BadRequestException si el nombre está vacío', async () => {
      await expect(service.create({ nombre: '   ' }, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('debe generar identificador correlativo IG-XXX y crear la iglesia', async () => {
      mockPrismaService.iglesia.findMany.mockResolvedValue([
        { identificador_interno: 'IG-001' },
        { identificador_interno: 'IG-002' },
      ]);
      const created = {
        id: 'ig-3',
        nombre: 'Nueva Sede',
        identificador_interno: 'IG-003',
      };
      mockPrismaService.iglesia.create.mockResolvedValue(created);

      const result = await service.create({ nombre: 'Nueva Sede' }, 'u1');

      expect(result).toEqual(created);
      expect(mockPrismaService.iglesia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Nueva Sede',
            identificador_interno: 'IG-003',
          }),
        }),
      );
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'iglesia',
          accion: 'creacion',
        }),
      );
    });
  });

  describe('update & updateEstado', () => {
    it('update debe lanzar NotFoundException si la iglesia no existe', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue(null);

      await expect(service.update('ig-999', { nombre: 'Cambio' }, 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updateEstado debe validar que el estado sea válido y actualizarlo', async () => {
      const original = { id: 'ig-1', estado: EstadoIglesia.activa };
      const updated = { id: 'ig-1', estado: EstadoIglesia.inactiva };
      mockPrismaService.iglesia.findUnique.mockResolvedValue(original);
      mockPrismaService.iglesia.update.mockResolvedValue(updated);

      const result = await service.updateEstado('ig-1', EstadoIglesia.inactiva, 'u1');

      expect(result).toEqual(updated);
      expect(mockPrismaService.iglesia.update).toHaveBeenCalledWith({
        where: { id: 'ig-1' },
        data: { estado: EstadoIglesia.inactiva },
      });
    });
  });

  describe('remove', () => {
    it('debe rechazar eliminación si la iglesia tiene usuarios vinculados', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue({ id: 'ig-1', nombre: 'Sede Norte' });
      mockPrismaService.usuario.count.mockResolvedValue(2);

      await expect(service.remove('ig-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar eliminación si la iglesia cuenta con historial contable registrado', async () => {
      mockPrismaService.iglesia.findUnique.mockResolvedValue({ id: 'ig-1', nombre: 'Sede Norte' });
      mockPrismaService.usuario.count.mockResolvedValue(0);
      mockPrismaService.valor.count.mockResolvedValue(5);

      await expect(service.remove('ig-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('debe eliminar la iglesia si no tiene dependencias activas', async () => {
      const original = { id: 'ig-1', nombre: 'Sede Vacía' };
      mockPrismaService.iglesia.findUnique.mockResolvedValue(original);
      mockPrismaService.usuario.count.mockResolvedValue(0);
      mockPrismaService.valor.count.mockResolvedValue(0);
      mockPrismaService.iglesia.delete.mockResolvedValue(original);

      const result = await service.remove('ig-1', 'u1');

      expect(result.success).toBe(true);
      expect(mockPrismaService.iglesia.delete).toHaveBeenCalledWith({ where: { id: 'ig-1' } });
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'iglesia',
          accion: 'eliminacion',
        }),
      );
    });
  });
});
