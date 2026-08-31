import { Test, TestingModule } from '@nestjs/testing';
import { ValoresController } from './valores.controller';
import { ValoresService } from './valores.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('ValoresController', () => {
  let controller: ValoresController;
  let service: ValoresService;

  const mockValoresService = {
    findValues: jest.fn(),
    findTableValues: jest.fn(),
    updateBatchValues: jest.fn(),
    updateMatrixBatch: jest.fn(),
    updateValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ValoresController],
      providers: [{ provide: ValoresService, useValue: mockValoresService }],
    }).compile();

    controller = module.get<ValoresController>(ValoresController);
    service = module.get<ValoresService>(ValoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  describe('updateMatrixBatch', () => {
    it('debe lanzar BadRequestException si valores no es un arreglo', async () => {
      const req = { user: { rol: 'tesorero', userId: 'u1' } };
      await expect(
        controller.updateMatrixBatch('p1', {} as any, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe delegar la actualización matriz al servicio', async () => {
      mockValoresService.updateMatrixBatch.mockResolvedValue({ success: true, total_valores: 2 });
      const req = { user: { rol: 'tesorero', userId: 'u1', iglesiaId: undefined } };

      const res = await controller.updateMatrixBatch(
        'p1',
        {
          valores: [
            { iglesia_id: 'ig-1', campo_id: 'c1', valor_manual: 100 },
            { iglesia_id: 'ig-2', campo_id: 'c1', valor_manual: 200 },
          ],
        },
        req,
      );

      expect(res).toEqual({ success: true, total_valores: 2 });
      expect(service.updateMatrixBatch).toHaveBeenCalledWith(
        'p1',
        [
          { iglesia_id: 'ig-1', campo_id: 'c1', valor_manual: 100 },
          { iglesia_id: 'ig-2', campo_id: 'c1', valor_manual: 200 },
        ],
        'u1',
        'tesorero',
        undefined,
      );
    });
  });

  describe('findValues', () => {
    it('debe lanzar BadRequestException si falta periodo_id', async () => {
      const req = { user: { rol: 'tesorero' } };
      await expect(controller.findValues('ig-1', '', '', 'false', req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe delegar a findTableValues si tabla_id está presente', async () => {
      mockValoresService.findTableValues.mockResolvedValue({ filas: [] });
      const req = { user: { rol: 'tesorero', iglesiaId: undefined } };

      const res = await controller.findValues('', 't1', 'p1', 'false', req);
      expect(res).toEqual({ filas: [] });
      expect(service.findTableValues).toHaveBeenCalledWith('t1', 'p1', 'tesorero', undefined, false);
    });

    it('debe lanzar ForbiddenException si usuario iglesia consulta otra sede', async () => {
      const req = { user: { rol: 'iglesia', iglesiaId: 'ig-1' } };
      await expect(controller.findValues('ig-2', '', 'p1', 'false', req)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe delegar a findValues si iglesia_id está presente', async () => {
      mockValoresService.findValues.mockResolvedValue([]);
      const req = { user: { rol: 'tesorero', iglesiaId: undefined } };

      const res = await controller.findValues('ig-1', '', 'p1', 'false', req);
      expect(res).toEqual([]);
      expect(service.findValues).toHaveBeenCalledWith('ig-1', 'p1', 'tesorero', undefined);
    });
  });

  describe('updateBatchValues', () => {
    it('debe lanzar ForbiddenException si usuario iglesia edita otra iglesia', async () => {
      const req = { user: { rol: 'iglesia', iglesiaId: 'ig-1', userId: 'u1' } };
      await expect(
        controller.updateBatchValues('ig-2', 'p1', { valores: [] }, req),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe delegar actualización por lote al servicio', async () => {
      mockValoresService.updateBatchValues.mockResolvedValue([]);
      const req = { user: { rol: 'tesorero', userId: 'u1', iglesiaId: undefined } };

      const res = await controller.updateBatchValues(
        'ig-1',
        'p1',
        { valores: [{ campo_id: 'c1', valor_manual: 500 }] },
        req,
      );

      expect(res).toEqual([]);
      expect(service.updateBatchValues).toHaveBeenCalledWith(
        'ig-1',
        'p1',
        [{ campo_id: 'c1', valor_manual: 500 }],
        'u1',
        'tesorero',
        undefined,
      );
    });
  });

  describe('updateValue', () => {
    it('debe lanzar BadRequestException si falta valor_manual', async () => {
      const req = { user: { rol: 'tesorero', userId: 'u1', iglesiaId: undefined } };
      await expect(
        controller.updateValue('ig-1', 'c1', 'p1', {} as any, req),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe delegar al servicio', async () => {
      mockValoresService.updateValue.mockResolvedValue([]);
      const req = { user: { rol: 'tesorero', userId: 'u1', iglesiaId: undefined } };

      const res = await controller.updateValue('ig-1', 'c1', 'p1', { valor_manual: 1000 }, req);
      expect(res).toEqual([]);
      expect(service.updateValue).toHaveBeenCalledWith(
        'ig-1',
        'c1',
        'p1',
        1000,
        'u1',
        'tesorero',
        undefined,
      );
    });
  });
});
