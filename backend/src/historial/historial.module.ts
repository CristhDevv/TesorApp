import { Global, Module } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { HistorialController } from './historial.controller';

@Global()
@Module({
  providers: [HistorialService],
  controllers: [HistorialController],
  exports: [HistorialService],
})
export class HistorialModule {}
