import { Module } from "@nestjs/common";
import { GastosService } from "./gastos.service";
import { GastosController } from "./gastos.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { HistorialModule } from "../historial/historial.module";

@Module({
  imports: [PrismaModule, HistorialModule],
  controllers: [GastosController],
  providers: [GastosService],
  exports: [GastosService],
})
export class GastosModule {}
