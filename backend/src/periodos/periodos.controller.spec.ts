import { Test, TestingModule } from '@nestjs/testing';
import { PeriodosController } from './periodos.controller';
import { PeriodosService } from './periodos.service';

describe('PeriodosController', () => {
  let controller: PeriodosController;
  let service: PeriodosService;

  const mockPeriodosService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    cerrarPeriodo: jest.fn(),
    reabrirPeriodo: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeriodosController],
      providers: [{ provide: PeriodosService, useValue: mockPeriodosService }],
    }).compile();

    controller = module.get<PeriodosController>(PeriodosController);
    service = module.get<PeriodosService>(PeriodosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio', async () => {
    mockPeriodosService.findAll.mockResolvedValue([{ id: 'p1' }]);
    const res = await controller.findAll();
    expect(res).toEqual([{ id: 'p1' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne debe delegar al servicio', async () => {
    mockPeriodosService.findOne.mockResolvedValue({ id: 'p1' });
    const res = await controller.findOne('p1');
    expect(res).toEqual({ id: 'p1' });
    expect(service.findOne).toHaveBeenCalledWith('p1');
  });

  it('create debe delegar al servicio con datos y userId', async () => {
    const body = { nombre: 'Enero 2026', fecha_inicio: '2026-01-01', fecha_fin: '2026-01-31' };
    mockPeriodosService.create.mockResolvedValue({ id: 'p1', ...body });
    const req = { user: { userId: 'u1' } };

    const res = await controller.create(body, req);
    expect(res).toEqual({ id: 'p1', ...body });
    expect(service.create).toHaveBeenCalledWith(body, 'u1');
  });

  it('cerrarPeriodo debe delegar al servicio', async () => {
    mockPeriodosService.cerrarPeriodo.mockResolvedValue({ id: 'p1', estado: 'cerrado' });
    const req = { user: { userId: 'u1' } };

    const res = await controller.cerrarPeriodo('p1', req);
    expect(res).toEqual({ id: 'p1', estado: 'cerrado' });
    expect(service.cerrarPeriodo).toHaveBeenCalledWith('p1', 'u1');
  });

  it('reabrirPeriodo debe delegar al servicio', async () => {
    mockPeriodosService.reabrirPeriodo.mockResolvedValue({ id: 'p1', estado: 'abierto' });
    const req = { user: { userId: 'u1' } };

    const res = await controller.reabrirPeriodo('p1', req);
    expect(res).toEqual({ id: 'p1', estado: 'abierto' });
    expect(service.reabrirPeriodo).toHaveBeenCalledWith('p1', 'u1');
  });
});
