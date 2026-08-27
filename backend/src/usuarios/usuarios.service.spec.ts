import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { HistorialService } from '../historial/historial.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let prisma: PrismaService;
  let historial: HistorialService;

  const mockPrismaService = {
    usuario: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    periodo: {
      updateMany: jest.fn(),
    },
    historialCambios: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
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
    it('findAll debe listar todos los usuarios', async () => {
      mockPrismaService.usuario.findMany.mockResolvedValue([{ id: 'u1', correo: 'a@a.com' }]);
      const res = await service.findAll();
      expect(res).toEqual([{ id: 'u1', correo: 'a@a.com' }]);
    });

    it('findOne debe lanzar NotFoundException si el usuario no existe', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      await expect(service.findOne('u-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debe lanzar BadRequestException si el correo ya está registrado', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue({ id: 'u1', correo: 'a@a.com' });

      await expect(
        service.create(
          {
            nombre_completo: 'Test User',
            correo: 'a@a.com',
            contrasena: '123456',
            rol: Rol.tesorero,
          },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si rol es iglesia y no se asigna congregación', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            nombre_completo: 'Pastor',
            correo: 'pastor@a.com',
            contrasena: '123456',
            rol: Rol.iglesia,
          },
          'admin-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe hashear la contraseña y retornar el usuario creado sin contraseña', async () => {
      mockPrismaService.usuario.findUnique.mockResolvedValue(null);
      jest.spyOn(bcrypt, 'hash').mockImplementation(() => Promise.resolve('hashed-password') as any);
      mockPrismaService.usuario.create.mockResolvedValue({
        id: 'u1',
        nombre_completo: 'Pastor Test',
        correo: 'pastor@tesorapp.com',
        contrasena_hash: 'hashed-password',
        rol: Rol.iglesia,
        iglesia_id: 'ig-1',
      });

      const res = await service.create(
        {
          nombre_completo: 'Pastor Test',
          correo: 'pastor@tesorapp.com',
          contrasena: '123456',
          rol: Rol.iglesia,
          iglesia_id: 'ig-1',
        },
        'admin-id',
      );

      expect(res).not.toHaveProperty('contrasena_hash');
      expect(res.correo).toBe('pastor@tesorapp.com');
      expect(mockHistorialService.log).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe bloquear autoeliminación del usuario autenticado', async () => {
      await expect(service.remove('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('debe limpiar periodos, reasignar autor de auditoría y eliminar usuario', async () => {
      const targetUser = {
        id: 'u2',
        nombre_completo: 'Usuario Antiguo',
        contrasena_hash: 'hash',
      };
      mockPrismaService.usuario.findUnique.mockResolvedValue(targetUser);
      mockPrismaService.usuario.delete.mockResolvedValue(targetUser);

      const res = await service.remove('u2', 'admin-1');

      expect(res.success).toBe(true);
      expect(mockPrismaService.periodo.updateMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.historialCambios.updateMany).toHaveBeenCalledWith({
        where: { realizado_por: 'u2' },
        data: { realizado_por: 'admin-1' },
      });
      expect(mockPrismaService.usuario.delete).toHaveBeenCalledWith({ where: { id: 'u2' } });
      expect(mockHistorialService.log).toHaveBeenCalled();
    });
  });
});
