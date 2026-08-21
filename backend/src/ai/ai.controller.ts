import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('copilot')
  async copilot(
    @Body('userQuery') userQuery: string,
    @Body('history') history: any[],
    @Body('context') context: any
  ) {
    return this.aiService.askCopilot(userQuery || '', history || [], context || {});
  }
}
