import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RateLimitGuard } from '../common/rate-limit.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tesorero', 'secretario', 'presbitero')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('copilot')
  @UseGuards(new RateLimitGuard(30, 60 * 1000, 'ai_copilot'))
  async copilot(
    @Body('userQuery') userQuery: string,
    @Body('history') history: any[],
    @Body('context') context: any
  ) {
    return this.aiService.askCopilot(userQuery || '', history || [], context || {});
  }
}
