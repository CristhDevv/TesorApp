import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ValoresModule } from '../valores/valores.module';
import { GastosModule } from '../gastos/gastos.module';

@Module({
  imports: [PrismaModule, ValoresModule, GastosModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
