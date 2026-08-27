import { Test, TestingModule } from '@nestjs/testing';
import { CamposController } from './campos.controller';
import { CamposService } from './campos.service';
import { TipoCampo, ModoCalculo } from '@prisma/client';

describe('CamposController', () => {
  let controller: CamposController;
  let service: CamposService;

  const mockCamposService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CamposController],
      providers: [{ provide: CamposService, useValue: mockCamposService }],
    }).compile();

    controller = module.get<CamposController>(CamposController);
    service = module.get<CamposService>(CamposService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('findAll debe delegar al servicio', async () => {
    mockCamposService.findAll.mockResolvedValue([{ id: 'c1' }]);
    const res = await controller.findAll();
    expect(res).toEqual([{ id: 'c1' }]);
    expect(service.findAll).toHaveBeenCalled();
  });

  it('findOne debe delegar al servicio', async () => {
    mockCamposService.findOne.mockResolvedValue({ id: 'c1' });
    const res = await controller.findOne('c1');
    expect(res).toEqual({ id: 'c1' });
    expect(service.findOne).toHaveBeenCalledWith('c1');
  });

  it('create debe enviar datos y userId al servicio', async () => {
    const body = {
      nombre: 'Diezmos',
      tipo: TipoCampo.moneda,
      modo_calculo: ModoCalculo.manual,
      seccion: 'Ingresos',
      orden: 1,
    };
    mockCamposService.create.mockResolvedValue({ id: 'c1', ...body });
    const req = { user: { userId: 'u1' } };

    const res = await controller.create(body, req);
    expect(service.create).toHaveBeenCalledWith(body, 'u1');
    expect(res).toEqual({ id: 'c1', ...body });
  });

  it('update debe enviar id, datos y userId al servicio', async () => {
    const body = { nombre: 'Diezmos Actualizados' };
    mockCamposService.update.mockResolvedValue({ id: 'c1', ...body });
    const req = { user: { userId: 'u1' } };

    const res = await controller.update('c1', body, req);
    expect(service.update).toHaveBeenCalledWith('c1', body, 'u1');
    expect(res).toEqual({ id: 'c1', ...body });
  });

  it('remove debe delegar eliminación al servicio', async () => {
    mockCamposService.remove.mockResolvedValue({ id: 'c1' });
    const req = { user: { userId: 'u1' } };

    const res = await controller.remove('c1', req);
    expect(service.remove).toHaveBeenCalledWith('c1', 'u1');
    expect(res).toEqual({ id: 'c1' });
  });
});
