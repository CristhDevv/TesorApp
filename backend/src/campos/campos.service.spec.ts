import { Test, TestingModule } from '@nestjs/testing';
import { CamposService } from './campos.service';
import { PrismaService } from '../prisma/prisma.service';
import { FormulasService } from '../formulas/formulas.service';
import { HistorialService } from '../historial/historial.service';
import { ValoresService } from '../valores/valores.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TipoCampo, ModoCalculo } from '@prisma/client';

describe('CamposService', () => {
  let service: CamposService;
  let prisma: PrismaService;
  let formulasService: FormulasService;
  let historialService: HistorialService;
  let valoresService: ValoresService;

  const mockPrismaService = {
    campoPlantilla: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    camposPorIglesia: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    tabla: {
      findMany: jest.fn(),
    },
    camposPorTabla: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockFormulasService = {
    sanitizeFormula: jest.fn((formula) => formula),
    checkCircularDependencies: jest.fn(),
    extractVariables: jest.fn(),
  };

  const mockHistorialService = {
    log: jest.fn(),
  };

  const mockValoresService = {
    recalculateAllOpenPeriods: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CamposService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FormulasService, useValue: mockFormulasService },
        { provide: HistorialService, useValue: mockHistorialService },
        { provide: ValoresService, useValue: mockValoresService },
      ],
    }).compile();

    service = module.get<CamposService>(CamposService);
    prisma = module.get<PrismaService>(PrismaService);
    formulasService = module.get<FormulasService>(FormulasService);
    historialService = module.get<HistorialService>(HistorialService);
    valoresService = module.get<ValoresService>(ValoresService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generateSlug', () => {
    it('debe convertir nombres con acentos y caracteres especiales a slug válido', () => {
      expect(service.generateSlug('Diezmos y Ofrendas')).toBe('diezmos_y_ofrendas');
      expect(service.generateSlug('Fondo Construcción')).toBe('fondo_construccion');
      expect(service.generateSlug('10% Misión')).toBe('c_10_porciento_mision');
    });

    it('debe anteponer c_ si el slug empieza por número', () => {
      expect(service.generateSlug('123 Campo')).toBe('c_123_campo');
    });
  });

  describe('findAll & findOne', () => {
    it('findAll debe retornar lista de campos', async () => {
      const mockFields = [{ id: 'c1', nombre: 'Diezmos' }];
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue(mockFields);

      const result = await service.findAll();
      expect(result).toEqual(mockFields);
    });

    it('findOne debe retornar el campo si existe', async () => {
      const mockField = { id: 'c1', nombre: 'Diezmos' };
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue(mockField);

      const result = await service.findOne('c1');
      expect(result).toEqual(mockField);
    });

    it('findOne debe lanzar NotFoundException si no existe', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalido')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('debe lanzar BadRequestException si el slug ya existe', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue({ id: 'c1', slug: 'diezmos' });

      await expect(
        service.create(
          {
            nombre: 'Diezmos',
            tipo: TipoCampo.moneda,
            modo_calculo: ModoCalculo.manual,
            seccion: 'Ingresos',
            orden: 1,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe validar que campos calculados incluyan fórmula y no tengan dependencias circulares', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            nombre: 'Total Ingresos',
            tipo: TipoCampo.moneda,
            modo_calculo: ModoCalculo.calculado,
            seccion: 'Ingresos',
            orden: 2,
          },
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe crear el campo exitosamente y registrar auditoría', async () => {
      mockPrismaService.campoPlantilla.findUnique.mockResolvedValue(null);
      const createdField = {
        id: 'c1',
        nombre: 'Diezmos',
        slug: 'diezmos',
        tipo: TipoCampo.moneda,
        modo_calculo: ModoCalculo.manual,
      };
      mockPrismaService.campoPlantilla.create.mockResolvedValue(createdField);
      mockPrismaService.tabla.findMany.mockResolvedValue([{ id: 't1' }]);
      mockPrismaService.camposPorTabla.aggregate.mockResolvedValue({ _max: { orden: 0 } });

      const result = await service.create(
        {
          nombre: 'Diezmos',
          tipo: TipoCampo.moneda,
          modo_calculo: ModoCalculo.manual,
          seccion: 'Ingresos',
          orden: 1,
        },
        'user-1',
      );

      expect(result).toEqual(createdField);
      expect(mockHistorialService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          entidad: 'campo_plantilla',
          accion: 'creacion',
        }),
      );
      expect(mockValoresService.recalculateAllOpenPeriods).toHaveBeenCalledWith('user-1');
    });
  });

  describe('remove', () => {
    it('debe lanzar NotFoundException si el campo a eliminar no existe', async () => {
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([]);

      await expect(service.remove('c-999', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si otro campo calculado depende del campo a eliminar', async () => {
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([
        { id: 'c1', nombre: 'Diezmos', slug: 'diezmos', modo_calculo: ModoCalculo.manual },
        {
          id: 'c2',
          nombre: 'Total',
          slug: 'total',
          modo_calculo: ModoCalculo.calculado,
          formula: 'diezmos * 2',
        },
      ]);
      mockFormulasService.extractVariables.mockReturnValue(['diezmos']);

      await expect(service.remove('c1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('debe eliminar el campo y recalcular periodos si no tiene dependencias', async () => {
      const deletedField = { id: 'c1', nombre: 'Diezmos', slug: 'diezmos', modo_calculo: ModoCalculo.manual };
      mockPrismaService.campoPlantilla.findMany.mockResolvedValue([deletedField]);
      mockPrismaService.campoPlantilla.delete.mockResolvedValue(deletedField);

      const result = await service.remove('c1', 'user-1');

      expect(result).toEqual(deletedField);
      expect(mockPrismaService.campoPlantilla.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(mockValoresService.recalculateAllOpenPeriods).toHaveBeenCalledWith('user-1');
    });
  });
});
