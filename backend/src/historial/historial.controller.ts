import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HistorialService } from './historial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EntidadAuditoria } from '@prisma/client';

@Controller('historial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('tesorero')
export class HistorialController {
  constructor(private historialService: HistorialService) {}

  @Get()
  async getHistorial(
    @Query('entidad') entidad?: EntidadAuditoria,
    @Query('entidad_id') entidadId?: string,
  ) {
    return this.historialService.getHistorial(entidad, entidadId);
  }
}
