import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('debe llamar a authService.login con correo y contrasena', async () => {
      const loginResult = {
        access_token: 'test-token',
        user: { id: 'u1', correo: 'admin@tesorapp.com', rol: 'tesorero' },
      };
      mockAuthService.login.mockResolvedValue(loginResult);

      const result = await controller.login({
        correo: 'admin@tesorapp.com',
        contrasena: 'password123',
      });

      expect(authService.login).toHaveBeenCalledWith('admin@tesorapp.com', 'password123');
      expect(result).toEqual(loginResult);
    });
  });

  describe('logout', () => {
    it('debe retornar mensaje de cierre de sesión exitoso', async () => {
      const result = await controller.logout();
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('getProfile', () => {
    it('debe retornar el usuario contenido en la solicitud', async () => {
      const req = {
        user: {
          userId: 'u1',
          correo: 'pastor@tesorapp.com',
          rol: 'iglesia',
          iglesiaId: 'ig-1',
        },
      };

      const result = await controller.getProfile(req);
      expect(result).toEqual(req.user);
    });
  });
});
