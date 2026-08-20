import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-uuid-1',
    nombre_completo: 'Pastor Test',
    correo: 'pastor@tesorapp.com',
    contrasena_hash: '$2b$10$hashedpassword',
    rol: 'iglesia',
    iglesia_id: 'iglesia-uuid-1',
    activo: true,
  };

  const mockPrismaService = {
    usuario: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe autenticar exitosamente y retornar token y datos del usuario', async () => {
    mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));

    const result = await service.login('pastor@tesorapp.com', 'password123');

    expect(result).toHaveProperty('access_token', 'mock-jwt-token');
    expect(result.user.correo).toBe('pastor@tesorapp.com');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: mockUser.id,
        rol: mockUser.rol,
      }),
    );
  });

  it('debe lanzar UnauthorizedException si el usuario no existe', async () => {
    mockPrismaService.usuario.findUnique.mockResolvedValue(null);

    await expect(service.login('noexiste@tesorapp.com', '123456')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si el usuario está inactivo', async () => {
    mockPrismaService.usuario.findUnique.mockResolvedValue({ ...mockUser, activo: false });

    await expect(service.login('pastor@tesorapp.com', 'password123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('debe lanzar UnauthorizedException si la contraseña no coincide', async () => {
    mockPrismaService.usuario.findUnique.mockResolvedValue(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

    await expect(service.login('pastor@tesorapp.com', 'passwordIncorrecta')).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
