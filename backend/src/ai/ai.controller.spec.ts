import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  const mockAiService = {
    askCopilot: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: mockAiService }],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  it('debe estar definido', () => {
    expect(controller).toBeDefined();
  });

  it('copilot debe delegar consulta a askCopilot', async () => {
    mockAiService.askCopilot.mockResolvedValue({ text: 'Respuesta AI', modelUsed: 'Gemini' });

    const result = await controller.copilot('Hola', [], { periodName: 'Enero 2026' });

    expect(result).toEqual({ text: 'Respuesta AI', modelUsed: 'Gemini' });
    expect(service.askCopilot).toHaveBeenCalledWith('Hola', [], { periodName: 'Enero 2026' });
  });
});
