import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('askCopilot', () => {
    const mockContext = {
      periodName: 'Enero 2026',
      columns: [
        { id: 'c1', nombre: 'Total Ingresos' },
        { id: 'c2', nombre: 'Misiones' },
      ],
      rows: [
        {
          iglesia_id: 'ig-1',
          iglesia_nombre: 'Sede Central',
          valores: [
            { campo_id: 'c1', valor_manual: 1000000, modo_calculo: 'manual' },
            { campo_id: 'c2', valor_manual: 250000, modo_calculo: 'manual' },
          ],
        },
      ],
    };

    it('debe procesar respuesta exitosa de Gemini API', async () => {
      const mockApiResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: 'Resumen financiero generado por IA.' }],
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      }) as any;

      const result = await service.askCopilot('¿Cuál es el balance?', [], mockContext);

      expect(result.text).toBe('Resumen financiero generado por IA.');
      expect(result.modelUsed).toBe('✨ Google Gemini Pro');
    });

    it('debe usar el fallback analítico si la API externa falla', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure')) as any;

      const result = await service.askCopilot('Hola', [], mockContext);

      expect(result.text).toContain('TesorApp Copilot');
      expect(result.text).toContain('Enero 2026');
      expect(result.modelUsed).toBe('TesorApp Engine');
    });
  });
});
