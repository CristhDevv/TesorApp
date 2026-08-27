import { Test, TestingModule } from '@nestjs/testing';
import { TablasController } from './tablas.controller';
import { TablasService } from './tablas.service';

describe('TablasController', () => {
  let controller: TablasController;
  let service: TablasService;

  const mockTablasService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablasController],
      providers: [{ provide: TablasService, useValue: mockTablasService }],
    }).compile();

    controller = module.get<TablasController>(TablasController);
    service = module.get<TablasService>(TablasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio', async () => {
    mockTablasService.findAll.mockResolvedValue([{ id: 't1' }]);
    const res = await controller.findAll();
    expect(res).toEqual([{ id: 't1' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne debe delegar al servicio', async () => {
    mockTablasService.findOne.mockResolvedValue({ id: 't1' });
    const res = await controller.findOne('t1');
    expect(res).toEqual({ id: 't1' });
    expect(service.findOne).toHaveBeenCalledWith('t1');
  });

  it('create debe delegar al servicio', async () => {
    const body = { nombre: 'Tabla 1', iglesia_ids: [], campo_ids: [] };
    mockTablasService.create.mockResolvedValue({ id: 't1', ...body });
    const req = { user: { userId: 'u1' } };

    const res = await controller.create(body, req);
    expect(res).toEqual({ id: 't1', ...body });
    expect(service.create).toHaveBeenCalledWith(body, 'u1');
  });

  it('update debe delegar al servicio', async () => {
    const body = { nombre: 'Tabla Editada' };
    mockTablasService.update.mockResolvedValue({ id: 't1', ...body });
    const req = { user: { userId: 'u1' } };

    const res = await controller.update('t1', body, req);
    expect(res).toEqual({ id: 't1', ...body });
    expect(service.update).toHaveBeenCalledWith('t1', body, 'u1');
  });

  it('remove debe delegar al servicio', async () => {
    mockTablasService.remove.mockResolvedValue({ message: 'OK' });
    const req = { user: { userId: 'u1' } };

    const res = await controller.remove('t1', req);
    expect(res).toEqual({ message: 'OK' });
    expect(service.remove).toHaveBeenCalledWith('t1', 'u1');
  });
});
