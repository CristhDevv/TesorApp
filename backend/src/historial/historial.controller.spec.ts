import { Test, TestingModule } from '@nestjs/testing';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';
import { EntidadAuditoria } from '@prisma/client';

describe('HistorialController', () => {
  let controller: HistorialController;
  let service: HistorialService;

  const mockHistorialService = {
    getHistorial: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistorialController],
      providers: [{ provide: HistorialService, useValue: mockHistorialService }],
    }).compile();

    controller = module.get<HistorialController>(HistorialController);
    service = module.get<HistorialService>(HistorialService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('getHistorial debe llamar al servicio con los parámetros de consulta', async () => {
    mockHistorialService.getHistorial.mockResolvedValue([{ id: 'h1' }]);

    const result = await controller.getHistorial(EntidadAuditoria.iglesia, 'ig-1');

    expect(result).toEqual([{ id: 'h1' }]);
    expect(service.getHistorial).toHaveBeenCalledWith(EntidadAuditoria.iglesia, 'ig-1');
  });
});
