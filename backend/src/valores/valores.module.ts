import { Module } from '@nestjs/common';
import { ValoresService } from './valores.service';
import { ValoresController } from './valores.controller';

@Module({
  providers: [ValoresService],
  controllers: [ValoresController],
  exports: [ValoresService],
})
export class ValoresModule {}
