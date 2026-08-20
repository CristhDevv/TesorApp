import { Module } from '@nestjs/common';
import { TablasService } from './tablas.service';
import { TablasController } from './tablas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HistorialModule } from '../historial/historial.module';

@Module({
  imports: [PrismaModule, HistorialModule],
  controllers: [TablasController],
  providers: [TablasService],
  exports: [TablasService],
})
export class TablasModule {}
