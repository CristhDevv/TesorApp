import { Test, TestingModule } from '@nestjs/testing';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';
import { ForbiddenException } from '@nestjs/common';

describe('PermisosController', () => {
  let controller: PermisosController;
  let service: PermisosService;

  const mockPermisosService = {
    findByIglesia: jest.fn(),
    updatePermisos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermisosController],
      providers: [{ provide: PermisosService, useValue: mockPermisosService }],
    }).compile();

    controller = module.get<PermisosController>(PermisosController);
    service = module.get<PermisosService>(PermisosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findByIglesia debe lanzar ForbiddenException si usuario iglesia intenta ver otra iglesia', async () => {
    const req = { user: { rol: 'iglesia', iglesiaId: 'ig-1' } };

    await expect(controller.findByIglesia('ig-2', req)).rejects.toThrow(ForbiddenException);
  });

  it('findByIglesia debe delegar al servicio si tiene acceso', async () => {
    mockPermisosService.findByIglesia.mockResolvedValue([{ campo_id: 'c1' }]);
    const req = { user: { rol: 'tesorero' } };

    const res = await controller.findByIglesia('ig-1', req);
    expect(res).toEqual([{ campo_id: 'c1' }]);
    expect(service.findByIglesia).toHaveBeenCalledWith('ig-1');
  });

  it('updatePermisos debe delegar al servicio', async () => {
    const body = [{ campo_id: 'c1', editable_por_iglesia: true }];
    mockPermisosService.updatePermisos.mockResolvedValue(body);
    const req = { user: { userId: 'u1' } };

    const res = await controller.updatePermisos('ig-1', body, req);
    expect(res).toEqual(body);
    expect(service.updatePermisos).toHaveBeenCalledWith('ig-1', body, 'u1');
  });
});
