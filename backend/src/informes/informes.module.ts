import { Module } from "@nestjs/common";
import { InformesService } from "./informes.service";
import { InformesController } from "./informes.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { HistorialModule } from "../historial/historial.module";

@Module({
  imports: [PrismaModule, HistorialModule],
  providers: [InformesService],
  controllers: [InformesController],
  exports: [InformesService],
})
export class InformesModule {}
