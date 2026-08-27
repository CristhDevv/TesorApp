import { Test, TestingModule } from '@nestjs/testing';
import { IglesiasController } from './iglesias.controller';
import { IglesiasService } from './iglesias.service';
import { EstadoIglesia } from '@prisma/client';

describe('IglesiasController', () => {
  let controller: IglesiasController;
  let service: IglesiasService;

  const mockIglesiasService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateEstado: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IglesiasController],
      providers: [{ provide: IglesiasService, useValue: mockIglesiasService }],
    }).compile();

    controller = module.get<IglesiasController>(IglesiasController);
    service = module.get<IglesiasService>(IglesiasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio con datos del usuario', async () => {
    mockIglesiasService.findAll.mockResolvedValue([{ id: 'ig-1' }]);
    const req = { user: { rol: 'tesorero', iglesiaId: undefined } };

    const res = await controller.findAll(req);
    expect(res).toEqual([{ id: 'ig-1' }]);
    expect(service.findAll).toHaveBeenCalledWith('tesorero', undefined);
  });

  it('findOne debe delegar al servicio', async () => {
    mockIglesiasService.findOne.mockResolvedValue({ id: 'ig-1' });
    const req = { user: { rol: 'iglesia', iglesiaId: 'ig-1' } };

    const res = await controller.findOne('ig-1', req);
    expect(res).toEqual({ id: 'ig-1' });
    expect(service.findOne).toHaveBeenCalledWith('ig-1', 'iglesia', 'ig-1');
  });

  it('create debe delegar al servicio', async () => {
    const dto = { nombre: 'Iglesia Central' };
    mockIglesiasService.create.mockResolvedValue({ id: 'ig-1', ...dto });
    const req = { user: { userId: 'u1' } };

    const res = await controller.create(dto, req);
    expect(res).toEqual({ id: 'ig-1', ...dto });
    expect(service.create).toHaveBeenCalledWith(dto, 'u1');
  });

  it('update debe delegar al servicio', async () => {
    const dto = { nombre: 'Nombre Editado' };
    mockIglesiasService.update.mockResolvedValue({ id: 'ig-1', ...dto });
    const req = { user: { userId: 'u1' } };

    const res = await controller.update('ig-1', dto, req);
    expect(res).toEqual({ id: 'ig-1', ...dto });
    expect(service.update).toHaveBeenCalledWith('ig-1', dto, 'u1');
  });

  it('updateEstado debe delegar al servicio', async () => {
    mockIglesiasService.updateEstado.mockResolvedValue({ id: 'ig-1', estado: EstadoIglesia.inactiva });
    const req = { user: { userId: 'u1' } };

    const res = await controller.updateEstado('ig-1', { estado: EstadoIglesia.inactiva }, req);
    expect(res).toEqual({ id: 'ig-1', estado: EstadoIglesia.inactiva });
    expect(service.updateEstado).toHaveBeenCalledWith('ig-1', EstadoIglesia.inactiva, 'u1');
  });

  it('remove debe delegar al servicio', async () => {
    mockIglesiasService.remove.mockResolvedValue({ success: true });
    const req = { user: { userId: 'u1' } };

    const res = await controller.remove('ig-1', req);
    expect(res).toEqual({ success: true });
    expect(service.remove).toHaveBeenCalledWith('ig-1', 'u1');
  });
});
