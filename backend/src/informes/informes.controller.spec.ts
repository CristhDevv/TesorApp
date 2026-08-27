import { Test, TestingModule } from '@nestjs/testing';
import { InformesController } from './informes.controller';
import { InformesService } from './informes.service';
import { EstadoInforme } from '@prisma/client';

describe('InformesController', () => {
  let controller: InformesController;
  let service: InformesService;

  const mockInformesService = {
    getInforme: jest.fn(),
    getInformesByPeriodo: jest.fn(),
    enviarInforme: jest.fn(),
    cambiarEstado: jest.fn(),
    consolidarTodos: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InformesController],
      providers: [{ provide: InformesService, useValue: mockInformesService }],
    }).compile();

    controller = module.get<InformesController>(InformesController);
    service = module.get<InformesService>(InformesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('getInforme debe delegar al servicio', async () => {
    mockInformesService.getInforme.mockResolvedValue({ id: 'inf-1' });
    const req = { user: { rol: 'tesorero' } };

    const res = await controller.getInforme('ig-1', 'p-1', req);
    expect(res).toEqual({ id: 'inf-1' });
    expect(service.getInforme).toHaveBeenCalledWith('ig-1', 'p-1');
  });

  it('getInformesByPeriodo debe delegar al servicio', async () => {
    mockInformesService.getInformesByPeriodo.mockResolvedValue([{ id: 'inf-1' }]);

    const res = await controller.getInformesByPeriodo('p-1');
    expect(res).toEqual([{ id: 'inf-1' }]);
    expect(service.getInformesByPeriodo).toHaveBeenCalledWith('p-1');
  });

  it('enviarInforme debe delegar al servicio', async () => {
    mockInformesService.enviarInforme.mockResolvedValue({ id: 'inf-1' });
    const req = { user: { userId: 'u-1', rol: 'iglesia', iglesiaId: 'ig-1' } };

    const res = await controller.enviarInforme({ iglesia_id: 'ig-1', periodo_id: 'p-1' }, req);
    expect(res).toEqual({ id: 'inf-1' });
    expect(service.enviarInforme).toHaveBeenCalledWith('ig-1', 'p-1', 'u-1', 'iglesia', 'ig-1');
  });

  it('cambiarEstado debe delegar al servicio', async () => {
    mockInformesService.cambiarEstado.mockResolvedValue({ id: 'inf-1' });
    const req = { user: { userId: 'u-1', rol: 'tesorero' } };

    const res = await controller.cambiarEstado(
      { iglesia_id: 'ig-1', periodo_id: 'p-1', estado: EstadoInforme.aprobado },
      req,
    );
    expect(res).toEqual({ id: 'inf-1' });
    expect(service.cambiarEstado).toHaveBeenCalledWith(
      'ig-1',
      'p-1',
      { estado: EstadoInforme.aprobado, observaciones: undefined },
      'u-1',
      'tesorero',
    );
  });

  it('consolidarTodos debe delegar al servicio', async () => {
    mockInformesService.consolidarTodos.mockResolvedValue({ consolidados: 3 });
    const req = { user: { userId: 'u-1', rol: 'tesorero' } };

    const res = await controller.consolidarTodos({ periodo_id: 'p-1' }, req);
    expect(res).toEqual({ consolidados: 3 });
    expect(service.consolidarTodos).toHaveBeenCalledWith('p-1', 'u-1', 'tesorero');
  });
});
