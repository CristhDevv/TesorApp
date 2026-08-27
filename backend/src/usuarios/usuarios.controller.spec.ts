import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { Rol } from '@prisma/client';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: UsuariosService;

  const mockUsuariosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockUsuariosService }],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
    service = module.get<UsuariosService>(UsuariosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio', async () => {
    mockUsuariosService.findAll.mockResolvedValue([{ id: 'u1' }]);
    const res = await controller.findAll();
    expect(res).toEqual([{ id: 'u1' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne debe delegar al servicio', async () => {
    mockUsuariosService.findOne.mockResolvedValue({ id: 'u1' });
    const res = await controller.findOne('u1');
    expect(res).toEqual({ id: 'u1' });
    expect(service.findOne).toHaveBeenCalledWith('u1');
  });

  it('create debe delegar al servicio', async () => {
    const body = {
      nombre_completo: 'Admin',
      correo: 'admin@tesorapp.com',
      contrasena: '123456',
      rol: Rol.tesorero,
    };
    mockUsuariosService.create.mockResolvedValue({ id: 'u1', ...body });
    const req = { user: { userId: 'admin-1' } };

    const res = await controller.create(body, req);
    expect(res).toEqual({ id: 'u1', ...body });
    expect(service.create).toHaveBeenCalledWith(body, 'admin-1');
  });

  it('update debe delegar al servicio', async () => {
    const body = { nombre_completo: 'Admin Actualizado' };
    mockUsuariosService.update.mockResolvedValue({ id: 'u1', ...body });
    const req = { user: { userId: 'admin-1' } };

    const res = await controller.update('u1', body, req);
    expect(res).toEqual({ id: 'u1', ...body });
    expect(service.update).toHaveBeenCalledWith('u1', body, 'admin-1');
  });

  it('remove debe delegar al servicio', async () => {
    mockUsuariosService.remove.mockResolvedValue({ success: true });
    const req = { user: { userId: 'admin-1' } };

    const res = await controller.remove('u2', req);
    expect(res).toEqual({ success: true });
    expect(service.remove).toHaveBeenCalledWith('u2', 'admin-1');
  });
});
