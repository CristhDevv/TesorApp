import { Test, TestingModule } from '@nestjs/testing';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ForbiddenException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

describe('ReportesController', () => {
  let controller: ReportesController;
  let service: ReportesService;

  const mockReportesService = {
    getComparacion: jest.fn(),
    getConsolidado: jest.fn(),
    exportarExcel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [{ provide: ReportesService, useValue: mockReportesService }],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
    service = module.get<ReportesService>(ReportesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('getComparacion debe lanzar ForbiddenException si usuario iglesia consulta otra sede', async () => {
    const req = { user: { rol: 'iglesia', iglesiaId: 'ig-1' } };

    await expect(
      controller.getComparacion('ig-2', 'c1', '2026-01-01', '2026-02-01', req),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getComparacion debe delegar al servicio si tiene acceso', async () => {
    mockReportesService.getComparacion.mockResolvedValue([{ periodo_id: 'p1' }]);
    const req = { user: { rol: 'tesorero', iglesiaId: undefined } };

    const res = await controller.getComparacion('ig-1', 'c1', '2026-01-01', '2026-02-01', req);
    expect(res).toEqual([{ periodo_id: 'p1' }]);
    expect(service.getComparacion).toHaveBeenCalledWith(
      'ig-1',
      'c1',
      '2026-01-01',
      '2026-02-01',
      'tesorero',
      undefined,
    );
  });

  it('getConsolidado debe delegar al servicio', async () => {
    mockReportesService.getConsolidado.mockResolvedValue([{ iglesia_id: 'ig-1' }]);

    const res = await controller.getConsolidado('c1', 'p1');
    expect(res).toEqual([{ iglesia_id: 'ig-1' }]);
    expect(service.getConsolidado).toHaveBeenCalledWith('c1', 'p1');
  });

  it('exportarExcel debe generar y enviar el archivo binario al response', async () => {
    const mockWorkbook = new ExcelJS.Workbook();
    mockWorkbook.addWorksheet('Test');
    mockReportesService.exportarExcel.mockResolvedValue(mockWorkbook);

    const mockRes: any = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    const req = { user: { rol: 'tesorero', iglesiaId: undefined } };

    await controller.exportarExcel('p1', 't1', req, mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(mockRes.send).toHaveBeenCalled();
  });
});
