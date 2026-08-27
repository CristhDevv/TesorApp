import { Test, TestingModule } from '@nestjs/testing';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';

describe('GastosController', () => {
  let controller: GastosController;
  let service: GastosService;

  const mockGastosService = {
    findAll: jest.fn(),
    getResumen: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GastosController],
      providers: [{ provide: GastosService, useValue: mockGastosService }],
    }).compile();

    controller = module.get<GastosController>(GastosController);
    service = module.get<GastosService>(GastosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio', async () => {
    mockGastosService.findAll.mockResolvedValue([{ id: 'g1' }]);
    const res = await controller.findAll('p1', 'f1');
    expect(res).toEqual([{ id: 'g1' }]);
    expect(service.findAll).toHaveBeenCalledWith('p1', 'f1');
  });

  it('getResumen debe delegar al servicio', async () => {
    mockGastosService.getResumen.mockResolvedValue([{ campo_fondo_id: 'f1' }]);
    const res = await controller.getResumen('p1');
    expect(res).toEqual([{ campo_fondo_id: 'f1' }]);
    expect(service.getResumen).toHaveBeenCalledWith('p1');
  });

  it('findOne debe delegar al servicio', async () => {
    mockGastosService.findOne.mockResolvedValue({ id: 'g1' });
    const res = await controller.findOne('g1');
    expect(res).toEqual({ id: 'g1' });
    expect(service.findOne).toHaveBeenCalledWith('g1');
  });

  it('create debe delegar al servicio con datos de usuario', async () => {
    const body = {
      descripcion: 'Compra',
      monto: 1000,
      fecha: '2026-01-01',
      periodo_id: 'p1',
      campo_fondo_id: 'f1',
    };
    mockGastosService.create.mockResolvedValue({ id: 'g1', ...body });
    const req = { user: { userId: 'u1', rol: 'tesorero' } };

    const res = await controller.create(body, req);
    expect(service.create).toHaveBeenCalledWith(body, 'u1', 'tesorero');
    expect(res).toEqual({ id: 'g1', ...body });
  });

  it('update debe delegar al servicio', async () => {
    const body = { monto: 2000 };
    mockGastosService.update.mockResolvedValue({ id: 'g1', monto: 2000 });
    const req = { user: { userId: 'u1', rol: 'tesorero' } };

    const res = await controller.update('g1', body, req);
    expect(service.update).toHaveBeenCalledWith('g1', body, 'u1', 'tesorero');
    expect(res).toEqual({ id: 'g1', monto: 2000 });
  });

  it('remove debe delegar al servicio', async () => {
    mockGastosService.remove.mockResolvedValue({ id: 'g1' });
    const req = { user: { userId: 'u1', rol: 'tesorero' } };

    const res = await controller.remove('g1', req);
    expect(service.remove).toHaveBeenCalledWith('g1', 'u1', 'tesorero');
    expect(res).toEqual({ id: 'g1' });
  });
});
